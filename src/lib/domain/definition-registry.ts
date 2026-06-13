import { BUILDING_SPECS, validateBuildingSpecs, type BuildingSpec } from "$lib/domain/building-specs";
import {
  CollisionFootprints,
  isValidCollisionFootprint,
  type CollisionShape,
} from "$lib/domain/collision";
import {
  CRAFT_RECIPES,
  validateCraftRecipes,
  type CraftRecipe,
} from "$lib/domain/crafting/recipes";
import {
  GATHERABLE_DEFINITIONS,
  type GatherableDefinition,
  type GatherableRenderKind,
  type GatherableSolidKind,
} from "$lib/domain/gathering/gatherables";
import { isInteractionId, type InteractionId } from "$lib/domain/interactions";
import {
  ITEM_DEFINITIONS,
  validateItemRegistryProblems,
  type ItemDefinition,
} from "$lib/domain/items";
import { STATION_PROCESSES, validateStationProcesses, type StationProcess } from "$lib/domain/systems/station-process";
import { STATION_DEFINITIONS, type StationDefinition, type StationId } from "$lib/domain/stations";
import { STATUS_DEFINITIONS, type StatusDefinition } from "$lib/domain/systems/status-types";

export type PrefabComponentSpec =
  | { type: "position" }
  | { type: "resource"; gatherableId: string }
  | { type: "pickup"; gatherableId: string }
  | { type: "collider"; solidKind: GatherableSolidKind }
  | { type: "building"; buildingType: string }
  | { type: "station"; stationId: StationId }
  | { type: "hazard"; hazardType: string }
  | { type: "enemy"; archetypeId: string };

export interface PrefabDefinition {
  id: string;
  displayName: string;
  components: readonly PrefabComponentSpec[];
  render: {
    kind: GatherableRenderKind | "building" | "station" | "enemy" | "hazard";
  };
  interaction?: {
    kind: InteractionId;
  };
  persistence?: {
    syncAction?: string;
    syncLocationId?: string;
  };
  collision?: CollisionShape;
  feedback?: {
    spawn?: string;
    interact?: string;
  };
}

export interface DefinitionRegistry {
  items: Readonly<Record<string, ItemDefinition>>;
  gatherables: Readonly<Record<string, GatherableDefinition>>;
  recipes: readonly CraftRecipe[];
  buildings: Readonly<Record<string, BuildingSpec>>;
  stations: Readonly<Record<string, StationDefinition>>;
  stationProcesses: readonly StationProcess[];
  statuses: Readonly<Record<string, StatusDefinition>>;
  prefabs: Readonly<Record<string, PrefabDefinition>>;
  commands: readonly string[];
}

const COMMAND_IDS = [
  "world.position",
  "world.teleport",
  "world.spawn",
  "player.speed.set",
  "player.noclip.toggle",
  "interaction.trigger",
  "debug.gatherSpeed.set",
  "debug.shakeScale.set",
  "debug.particleCount.set",
  "audio.play",
  "audio.enabled.set",
  "stamina.inspect",
  "stamina.set",
  "stamina.max.set",
  "stamina.regen.set",
  "stamina.spend",
  "thirst.inspect",
  "thirst.set",
  "thirst.max.set",
  "thirst.rate.set",
  "status.list",
  "status.apply",
  "status.clear",
  "status.clearAll",
  "rpg.inspect",
  "rpg.equip",
  "rpg.give",
  "rpg.hp.set",
  "rpg.reset",
  "skill.inspect",
  "skill.addXp",
  "skill.level.set",
  "cooldown.inspect",
  "cooldown.zero.set",
  "cooldown.reset",
  "collision.list",
  "collision.show",
  "collision.get",
  "collision.set",
  "collision.reset",
  "focused.start",
] as const;

function interactionForGatherable(def: GatherableDefinition): PrefabDefinition["interaction"] {
  if (def.interactionKind === "repeated_action") return { kind: "gather" };
  return { kind: def.interactionKind };
}

function gatherablePrefab(def: GatherableDefinition): PrefabDefinition {
  const components: PrefabComponentSpec[] = [
    { type: "position" },
    { type: "resource", gatherableId: def.id },
  ];
  if (def.interactionKind === "pickup") {
    components.push({ type: "pickup", gatherableId: def.id });
  }
  if (def.solidKind !== "none") {
    components.push({ type: "collider", solidKind: def.solidKind });
  }

  const persistence: { syncAction?: string; syncLocationId?: string } | undefined =
    def.syncAction || def.syncLocationId
      ? {
          ...(def.syncAction !== undefined ? { syncAction: def.syncAction } : {}),
          ...(def.syncLocationId !== undefined ? { syncLocationId: def.syncLocationId } : {}),
        }
      : undefined;
  const interaction = interactionForGatherable(def);

  return {
    id: def.id,
    displayName: def.displayName,
    components,
    render: { kind: def.renderKind },
    ...(interaction !== undefined ? { interaction } : {}),
    collision: def.collision ?? { solid: def.solidKind !== "none" },
    ...(persistence !== undefined ? { persistence } : {}),
    feedback: {
      spawn: `${def.displayName} appears.`,
      interact: def.feedback.start,
    },
  };
}

function buildingPrefab(id: string, spec: BuildingSpec): PrefabDefinition {
  return {
    id: `building:${id}`,
    displayName: spec.displayName,
    components: [
      { type: "position" },
      { type: "building", buildingType: id },
      ...(spec.stationId ? [{ type: "station" as const, stationId: spec.stationId }] : []),
      { type: "collider", solidKind: "rock" },
    ],
    render: { kind: "building" },
    interaction: spec.stationId ? { kind: "process" } : { kind: "build" },
    collision: { solid: true, footprint: CollisionFootprints.building },
    feedback: { spawn: `${spec.displayName} placed.` },
  };
}

export function createDefinitionRegistry(): DefinitionRegistry {
  const gatherablePrefabs = Object.fromEntries(
    Object.values(GATHERABLE_DEFINITIONS).map((def) => [def.id, gatherablePrefab(def)]),
  );
  const buildingPrefabs = Object.fromEntries(
    Object.entries(BUILDING_SPECS).map(([id, spec]) => [`building:${id}`, buildingPrefab(id, spec)]),
  );

  return {
    items: ITEM_DEFINITIONS,
    gatherables: GATHERABLE_DEFINITIONS,
    recipes: CRAFT_RECIPES,
    buildings: BUILDING_SPECS,
    stations: STATION_DEFINITIONS,
    stationProcesses: STATION_PROCESSES,
    statuses: STATUS_DEFINITIONS,
    prefabs: { ...gatherablePrefabs, ...buildingPrefabs },
    commands: COMMAND_IDS,
  };
}

export const DEFINITION_REGISTRY = createDefinitionRegistry();

export function getPrefabDefinition(id: string): PrefabDefinition | undefined {
  return DEFINITION_REGISTRY.prefabs[id];
}

export function validateDefinitionRegistry(registry: DefinitionRegistry = DEFINITION_REGISTRY): string[] {
  const problems: string[] = [];
  const itemIds = new Set(Object.keys(registry.items));
  const stationIds = new Set(Object.keys(registry.stations));

  problems.push(...validateItemRegistryProblems(registry.items));
  problems.push(...validateCraftRecipes(registry.recipes, itemIds));
  problems.push(...validateBuildingSpecs(registry.buildings));
  problems.push(...validateStationProcesses(registry.stationProcesses, registry.stations, registry.items));

  for (const [id, def] of Object.entries(registry.gatherables)) {
    if (id !== def.id) problems.push(`gatherable key ${id} does not match id ${def.id}`);
    if (!def.displayName.trim()) problems.push(`gatherable ${id} has no displayName`);
    if (def.baseDurationSec < 0) problems.push(`gatherable ${id} has negative baseDurationSec`);
    if (def.yieldTable.length === 0) problems.push(`gatherable ${id} has no yield`);
    if (!def.feedback.start || !def.feedback.success) problems.push(`gatherable ${id} is missing feedback`);
    if (def.collision?.footprint && !isValidCollisionFootprint(def.collision.footprint)) {
      problems.push(`gatherable ${id} has invalid collision footprint`);
    }
    for (const yieldEntry of def.yieldTable) {
      if (!itemIds.has(yieldEntry.itemId)) {
        problems.push(`gatherable ${id} yields unknown item ${yieldEntry.itemId}`);
      }
      if (!Number.isFinite(yieldEntry.quantity) || yieldEntry.quantity <= 0) {
        problems.push(`gatherable ${id} yield ${yieldEntry.itemId} must be positive`);
      }
    }
    for (const risk of def.risks ?? []) {
      if (risk.chance < 0 || risk.chance > 1) problems.push(`gatherable ${id} risk chance must be 0..1`);
      if (risk.durationSec <= 0) problems.push(`gatherable ${id} risk duration must be positive`);
      if (risk.knowledgeItemId && !itemIds.has(risk.knowledgeItemId)) {
        problems.push(`gatherable ${id} risk knowledge references unknown item ${risk.knowledgeItemId}`);
      }
    }
  }

  for (const [id, prefab] of Object.entries(registry.prefabs)) {
    if (id !== prefab.id) problems.push(`prefab key ${id} does not match id ${prefab.id}`);
    if (!prefab.displayName.trim()) problems.push(`prefab ${id} has no displayName`);
    if (prefab.components.length === 0) problems.push(`prefab ${id} has no components`);
    if (!prefab.feedback?.spawn && !prefab.feedback?.interact) problems.push(`prefab ${id} has no feedback`);
    if (prefab.interaction && !isInteractionId(prefab.interaction.kind)) {
      problems.push(`prefab ${id} uses unsupported interaction ${prefab.interaction.kind}`);
    }
    if (prefab.collision?.footprint && !isValidCollisionFootprint(prefab.collision.footprint)) {
      problems.push(`prefab ${id} has invalid collision footprint`);
    }

    for (const component of prefab.components) {
      if ((component.type === "resource" || component.type === "pickup") && !registry.gatherables[component.gatherableId]) {
        problems.push(`prefab ${id} references unknown gatherable ${component.gatherableId}`);
      }
      if (component.type === "building" && !registry.buildings[component.buildingType]) {
        problems.push(`prefab ${id} references unknown building ${component.buildingType}`);
      }
      if (component.type === "station" && !stationIds.has(component.stationId)) {
        problems.push(`prefab ${id} references unknown station ${component.stationId}`);
      }
    }
  }

  return problems;
}
