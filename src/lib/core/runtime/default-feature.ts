import type { ComponentFactory, GameFeature } from "$lib/core/runtime/runtime";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { DEFINITION_REGISTRY } from "$lib/domain/definition-registry";

const TILE_SIZE = 64;

const position: ComponentFactory = ({ gx, gy }) => {
  const x = gx * TILE_SIZE;
  const y = gy * TILE_SIZE;
  return { position: { x, y, targetX: x, targetY: y } };
};

const resource: ComponentFactory = ({ component }) => {
  if (component.type !== "resource") return {};
  const def = getGatherableDefinition(component.gatherableId);
  if (!def) throw new Error(`unknown gatherable: ${component.gatherableId}`);
  const drop = def.yieldTable[0];
  return {
    resource: {
      hp: def.depletion?.hp ?? 15,
      maxHp: def.depletion?.hp ?? 15,
      drop: drop?.itemId ?? "stick",
      gatherableId: def.id,
      rpgAction: def.syncAction,
      rpgLocationId: def.syncLocationId,
    },
    interactable: { name: def.displayName, action: def.interactionKind === "repeated_action" ? "gather" : "pickup" },
  };
};

const pickup: ComponentFactory = ({ component }) => {
  if (component.type !== "pickup") return {};
  const def = getGatherableDefinition(component.gatherableId);
  if (!def) throw new Error(`unknown gatherable: ${component.gatherableId}`);
  const drop = def.yieldTable[0];
  return {
    collider: { isSolid: false },
    pickup: {
      itemId: drop?.itemId ?? "stick",
      qty: drop?.quantity ?? 1,
      gatherableId: def.id,
    },
  };
};

const collider: ComponentFactory = ({ component }) => {
  if (component.type !== "collider") return {};
  return { collider: { isSolid: component.solidKind !== "none" } };
};

const building: ComponentFactory = ({ component }) => {
  if (component.type !== "building") return {};
  const spec = getBuildingSpec(component.buildingType);
  return {
    collider: { isSolid: true },
    interactable: spec.stationId
      ? { name: spec.displayName, action: "process" }
      : { name: spec.displayName, action: "gather" },
    ...(spec.stationId ? { station: { stationId: spec.stationId } } : {}),
  };
};

const station: ComponentFactory = ({ component }) => {
  if (component.type !== "station") return {};
  return { station: { stationId: component.stationId } };
};

const noopComponent: ComponentFactory = () => ({});

export const defaultRuntimeFeature: GameFeature = {
  id: "ash.default-runtime",
  components: {
    position,
    resource,
    pickup,
    collider,
    building,
    station,
    hazard: noopComponent,
    enemy: noopComponent,
  },
  prefabs: Object.values(DEFINITION_REGISTRY.prefabs),
  interactions: [
    { id: "gather", handle: () => undefined },
    { id: "pickup", handle: () => undefined },
    { id: "harvest", handle: () => undefined },
    { id: "liquid", handle: () => undefined },
    { id: "build", handle: () => undefined },
    { id: "process", handle: () => undefined },
    { id: "combat", handle: () => undefined },
    { id: "refuel", handle: () => undefined },
    { id: "talk", handle: () => undefined },
  ],
};
