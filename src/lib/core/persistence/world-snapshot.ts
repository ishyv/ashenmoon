import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { StorageKeys } from "$lib/domain/game-events";
import type { StationProcessRuntime } from "$lib/domain/systems/station-process";
import type { WorldActionRuntime } from "$lib/domain/world-action-runtime";
import { loadSlice, saveSlice, clearSlice } from "$lib/state/persistence/save-load";

export const WORLD_SNAPSHOT_SCHEMA_VERSION = 1;

export interface ConstructionRuntimeSnapshot {
  buildingId: string;
  nextStage: number;
  timer: number;
  duration: number;
  cost: Record<string, number>;
}

export interface ActiveProcessSnapshotEntry {
  readonly stationEntityId: string;
  readonly runtime: StationProcessRuntime;
}

export interface WorldResourcesSnapshot {
  readonly interaction: {
    /** One entry per busy station — stations persist independently. */
    readonly activeProcesses: readonly ActiveProcessSnapshotEntry[];
    readonly activeWorldAction: WorldActionRuntime | null;
    readonly activeWorldActionPrecision: boolean;
  };
  readonly construction: ConstructionRuntimeSnapshot | null;
}

export type PersistedEntityComponentKey =
  | "position"
  | "collider"
  | "playerControlled"
  | "interactable"
  | "resource"
  | "pickup"
  | "station"
  | "campfire"
  | "campStructure"
  | "animal"
  | "carcass"
  | "health"
  | "knockback"
  | "bleed"
  | "mover"
  | "ai"
  | "melee"
  | "loot"
  | "landmark"
  | "building"
  | "trap"
  | "needs"
  | "home"
  | "nest"
  | "pack"
  | "follower"
  | "mudCoat";

export type DerivedEntityComponentKey = "emitter" | "senses";

export const PERSISTED_ENTITY_COMPONENT_KEYS = [
  "position",
  "collider",
  "playerControlled",
  "interactable",
  "resource",
  "pickup",
  "station",
  "campfire",
  "campStructure",
  "animal",
  "carcass",
  "health",
  "knockback",
  "bleed",
  "mover",
  "ai",
  "melee",
  "loot",
  "landmark",
  "building",
  "trap",
  "needs",
  "home",
  "nest",
  "pack",
  "follower",
  "mudCoat",
] as const satisfies readonly PersistedEntityComponentKey[];

export const DERIVED_ENTITY_COMPONENT_KEYS = ["emitter", "senses"] as const satisfies readonly DerivedEntityComponentKey[];

const ENTITY_BASE_KEYS = ["id"] as const;
const ALL_CLASSIFIED_ENTITY_KEYS = new Set<string>([
  ...ENTITY_BASE_KEYS,
  ...PERSISTED_ENTITY_COMPONENT_KEYS,
  ...DERIVED_ENTITY_COMPONENT_KEYS,
]);

export type PersistedEntitySnapshot = Pick<Entity, "id"> & Partial<Pick<Entity, PersistedEntityComponentKey>>;

export interface WorldSnapshot {
  readonly schemaVersion: typeof WORLD_SNAPSHOT_SCHEMA_VERSION;
  readonly savedAt: number;
  readonly worldSeed: number | null;
  readonly scenarioId: string | null;
  readonly entities: readonly PersistedEntitySnapshot[];
  readonly resources: WorldResourcesSnapshot;
}

export interface WorldSnapshotInput {
  readonly worldSeed: number | null;
  readonly scenarioId: string | null;
  readonly resources: WorldResourcesSnapshot;
  readonly now?: number;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function unclassifiedEntityComponentKeys(entity: Entity): string[] {
  return Object.keys(entity).filter((key) => !ALL_CLASSIFIED_ENTITY_KEYS.has(key));
}

export function assertEntityPersistenceClassified(entity: Entity): void {
  const unclassified = unclassifiedEntityComponentKeys(entity);
  if (unclassified.length > 0) {
    throw new Error(`unclassified entity component(s) on ${entity.id}: ${unclassified.join(", ")}`);
  }
}

export function serializeEntity(entity: Entity): PersistedEntitySnapshot {
  assertEntityPersistenceClassified(entity);

  const snapshot: PersistedEntitySnapshot = { id: entity.id };
  for (const key of PERSISTED_ENTITY_COMPONENT_KEYS) {
    const value = entity[key];
    if (value !== undefined) {
      (snapshot as unknown as Record<string, unknown>)[key] = clone(value);
    }
  }
  return snapshot;
}

export function hydrateEntitySnapshot(snapshot: PersistedEntitySnapshot): Entity {
  const entity: Entity = { id: snapshot.id };
  for (const key of PERSISTED_ENTITY_COMPONENT_KEYS) {
    const value = snapshot[key];
    if (value !== undefined) {
      (entity as unknown as Record<string, unknown>)[key] = clone(value);
    }
  }
  return entity;
}

/** Accepts the current array shape, or migrates a pre-per-station single-runtime save. */
function normalizeActiveProcesses(interaction: Record<string, unknown>): readonly ActiveProcessSnapshotEntry[] {
  if (Array.isArray(interaction.activeProcesses)) {
    return interaction.activeProcesses.filter(isRecord).flatMap((entry) => {
      if (typeof entry.stationEntityId !== "string" || !isRecord(entry.runtime)) return [];
      return [{ stationEntityId: entry.stationEntityId, runtime: entry.runtime as unknown as StationProcessRuntime }];
    });
  }
  const legacySingle = interaction.activeProcess;
  if (isRecord(legacySingle) && typeof legacySingle.targetEntityId === "string") {
    return [{ stationEntityId: legacySingle.targetEntityId, runtime: legacySingle as unknown as StationProcessRuntime }];
  }
  return [];
}

function normalizeResources(value: unknown): WorldResourcesSnapshot {
  if (!isRecord(value)) return emptyWorldResourcesSnapshot();
  const interaction = isRecord(value.interaction) ? value.interaction : {};
  return {
    interaction: {
      activeProcesses: normalizeActiveProcesses(interaction),
      activeWorldAction: (interaction.activeWorldAction ?? null) as WorldActionRuntime | null,
      activeWorldActionPrecision: interaction.activeWorldActionPrecision === true,
    },
    construction: (isRecord(value.construction) ? value.construction : null) as ConstructionRuntimeSnapshot | null,
  };
}

export function emptyWorldResourcesSnapshot(): WorldResourcesSnapshot {
  return {
    interaction: {
      activeProcesses: [],
      activeWorldAction: null,
      activeWorldActionPrecision: false,
    },
    construction: null,
  };
}

export function serializeWorld(ecsWorld: World<Entity>, input: WorldSnapshotInput): WorldSnapshot {
  return {
    schemaVersion: WORLD_SNAPSHOT_SCHEMA_VERSION,
    savedAt: input.now ?? Date.now(),
    worldSeed: input.worldSeed,
    scenarioId: input.scenarioId,
    entities: ecsWorld.entities.map(serializeEntity),
    resources: clone(input.resources),
  };
}

export function normalizeWorldSnapshot(raw: unknown): WorldSnapshot | null {
  if (!isRecord(raw)) return null;
  const entities = Array.isArray(raw.entities)
    ? raw.entities.filter(isRecord).flatMap((entity) => {
        if (typeof entity.id !== "string") return [];
        return [hydrateEntitySnapshot(entity as PersistedEntitySnapshot)];
      }).map(serializeEntity)
    : [];

  return {
    schemaVersion: WORLD_SNAPSHOT_SCHEMA_VERSION,
    savedAt: typeof raw.savedAt === "number" && Number.isFinite(raw.savedAt) ? raw.savedAt : Date.now(),
    worldSeed: typeof raw.worldSeed === "number" && Number.isFinite(raw.worldSeed) ? raw.worldSeed : null,
    scenarioId: typeof raw.scenarioId === "string" ? raw.scenarioId : null,
    entities,
    resources: normalizeResources(raw.resources),
  };
}

export function loadWorldSnapshot(): WorldSnapshot | null {
  return normalizeWorldSnapshot(loadSlice<unknown>(StorageKeys.world, null));
}

export function saveWorldSnapshot(snapshot: WorldSnapshot): void {
  saveSlice(StorageKeys.world, normalizeWorldSnapshot(snapshot));
}

export function clearWorldSnapshot(): void {
  clearSlice(StorageKeys.world);
}
