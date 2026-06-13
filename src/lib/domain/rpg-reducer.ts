import { getBuildingSpec, BUILDING_SPECS } from "$lib/domain/building-specs";
import { chooseFuelOption, fuelInventoryFromSlots } from "$lib/domain/camp/fuel";
import { resolveCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { getGatherableBySyncLocation } from "$lib/domain/gathering/gatherables";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import type {
  RpgEnvironmentTickResult,
  RpgInventorySlot,
  RpgPlayerState,
  RpgReactionTriggered,
} from "$lib/domain/rpg-types";

const GATHER_DURABILITY_LOSS = 5;
const STORAGE_PILE_STASH_BONUS = 20;
const BUILDING_RECLAIM_RATIO = 0.5;
const DEFAULT_DECAY_RESULT = "volatile_ash";

export type RpgReducerCommand =
  | { type: "equipTool"; itemId: string | null }
  | { type: "pickup"; itemId: string; pickupId: string; quantity?: number }
  | { type: "gather"; action: "mine" | "forest"; locationId: string }
  | { type: "refuel" }
  | { type: "craft"; recipeId: string; context: CraftContext }
  | { type: "build"; buildingType: string; x: number; y: number }
  | { type: "destroyBuilding"; buildingId: string }
  | { type: "placeItem"; itemId: string; quantity?: number }
  | { type: "environmentTick"; environment: { temperature: number; humidity: number; toxins: number } };

export type MaterialGain = { id: string; quantity: number };

export interface GatherSync {
  playerState: RpgPlayerState;
  materialsGained: MaterialGain[];
  toolBroken: boolean;
}

export type RpgReducerResult =
  | { playerState: RpgPlayerState }
  | GatherSync
  | RpgEnvironmentTickResult;

export interface RpgReducerOptions {
  freeBuilding?: boolean;
  now?: () => number;
}

function clonePlayerState(state: RpgPlayerState): RpgPlayerState {
  return structuredClone(state);
}

function getQty(slot: RpgInventorySlot | undefined): number {
  return slot && "qty" in slot ? slot.qty : 0;
}

function addQty(slots: RpgPlayerState["inventory"]["slots"], itemId: string, qty: number): void {
  slots[itemId] = { qty: getQty(slots[itemId]) + qty };
}

function removeQty(slots: RpgPlayerState["inventory"]["slots"], itemId: string, qty: number): void {
  const remaining = getQty(slots[itemId]) - qty;
  if (remaining <= 0) {
    delete slots[itemId];
  } else {
    slots[itemId] = { qty: remaining };
  }
}

function isKnownBuildable(type: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILDING_SPECS, type);
}

function pickup(state: RpgPlayerState, command: Extract<RpgReducerCommand, { type: "pickup" }>): GatherSync {
  const playerState = clonePlayerState(state);
  const pickupQuantity = Math.max(1, Math.floor(command.quantity ?? 1));
  const slots = { ...playerState.inventory.slots };
  addQty(slots, command.itemId, pickupQuantity);
  playerState.inventory = { slots };
  if (command.pickupId && !playerState.profile.gatheredPickups?.includes(command.pickupId)) {
    playerState.profile.gatheredPickups = [...(playerState.profile.gatheredPickups ?? []), command.pickupId];
  }
  return {
    materialsGained: [{ id: command.itemId, quantity: pickupQuantity }],
    toolBroken: false,
    playerState,
  };
}

function refuel(state: RpgPlayerState): GatherSync {
  const playerState = clonePlayerState(state);
  const slots = { ...playerState.inventory.slots };
  const fuel = chooseFuelOption(fuelInventoryFromSlots(slots));
  if (!fuel) throw new Error("Insufficient fuel");
  removeQty(slots, fuel.itemId, fuel.qty);
  playerState.inventory = { slots };
  return { materialsGained: [{ id: "fuel", quantity: 1 }], toolBroken: false, playerState };
}

function gather(state: RpgPlayerState, command: Extract<RpgReducerCommand, { type: "gather" }>): GatherSync {
  const playerState = clonePlayerState(state);
  const gatherable = getGatherableBySyncLocation(command.locationId);
  const drop = gatherable?.yieldTable[0]?.itemId ?? (command.action === "forest" ? "oak_wood" : "stone");
  const slots = { ...playerState.inventory.slots };
  addQty(slots, drop, 1);
  playerState.inventory = { slots };

  let toolBroken = false;
  const weapon = playerState.profile.loadout.weapon;
  if (weapon && typeof weapon === "object") {
    const newDurability = weapon.durability - GATHER_DURABILITY_LOSS;
      if (newDurability <= 0) {
        toolBroken = true;
        playerState.profile.loadout.weapon = null;
      } else {
        playerState.profile.loadout.weapon = { ...weapon, durability: newDurability };
      }
    }

  return { materialsGained: [{ id: drop, quantity: 1 }], toolBroken, playerState };
}

function equipTool(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "equipTool" }>,
  options: RpgReducerOptions,
): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  if (!command.itemId) {
    playerState.profile.loadout.weapon = null;
    return { playerState };
  }
  const slot = playerState.inventory.slots[command.itemId];
  const exists = slot && ("qty" in slot ? slot.qty > 0 : slot.instances.length > 0);
  if (!exists) throw new Error("Item not in inventory");
  playerState.profile.loadout.weapon = {
    instanceId: `standalone_${command.itemId}_${options.now?.() ?? Date.now()}`,
    itemId: command.itemId,
    durability: 100,
  };
  return { playerState };
}

function build(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "build" }>,
  options: RpgReducerOptions,
): { playerState: RpgPlayerState } {
  const spec = getBuildingSpec(command.buildingType);
  if (!isKnownBuildable(command.buildingType) || !spec.cost) throw new Error("Invalid building type");
  if (!Number.isFinite(command.x) || !Number.isFinite(command.y)) throw new Error("Missing coordinates");

  const playerState = clonePlayerState(state);
  if (!options.freeBuilding) {
    const slots = { ...playerState.inventory.slots };
    for (const [itemId, reqQty] of Object.entries(spec.cost ?? {})) {
      if (getQty(slots[itemId]) < reqQty) throw new Error(`Insufficient ${itemId}`);
    }
    for (const [itemId, reqQty] of Object.entries(spec.cost ?? {})) {
      removeQty(slots, itemId, reqQty);
    }
    playerState.inventory = { slots };
  }
  if (command.buildingType === "storage_pile") playerState.profile.stashSize += STORAGE_PILE_STASH_BONUS;
  playerState.profile.buildings = [
    ...(playerState.profile.buildings ?? []),
    {
      id: `building_${command.buildingType}_${options.now?.() ?? Date.now()}`,
      type: command.buildingType,
      x: command.x,
      y: command.y,
    },
  ];
  return { playerState };
}

function destroyBuilding(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "destroyBuilding" }>,
): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const building = playerState.profile.buildings?.find((b) => b.id === command.buildingId);
  if (!building) return { playerState };
  const spec = getBuildingSpec(building.type);
  const slots = { ...playerState.inventory.slots };
  for (const [itemId, qty] of Object.entries(spec.cost ?? {})) {
    addQty(slots, itemId, Math.ceil(qty * BUILDING_RECLAIM_RATIO));
  }
  playerState.profile.buildings = playerState.profile.buildings?.filter((b) => b.id !== command.buildingId) ?? [];
  playerState.inventory = { slots };
  return { playerState };
}

function craft(state: RpgPlayerState, command: Extract<RpgReducerCommand, { type: "craft" }>): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const result = resolveCraft(playerState.inventory.slots, command.recipeId, command.context);
  if (!result.ok) throw new Error(result.reason);
  playerState.inventory = { slots: result.slots };
  return { playerState };
}

function environmentTick(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "environmentTick" }>,
): RpgEnvironmentTickResult {
  const playerState = clonePlayerState(state);
  let mutated = false;
  const reactions: RpgReactionTriggered[] = [];
  const nextSlots = { ...playerState.inventory.slots };

  for (const [itemId, slot] of Object.entries(playerState.inventory.slots)) {
    if (!slot || !("qty" in slot) || slot.qty <= 0) continue;
    const definition = ITEM_DEFINITIONS[itemId];
    const trait = definition?.traits.find((t) => t.kind === "temperature_sensitive");
    if (!trait || trait.kind !== "temperature_sensitive") continue;

    const tooHot = command.environment.temperature > trait.maxSafeTemp;
    const tooCold = command.environment.temperature < trait.minSafeTemp;
    if (!tooHot && !tooCold) continue;

    mutated = true;
    const effect = trait.effect;
    if (effect.kind === "transform") {
      const qty = slot.qty;
      delete nextSlots[itemId];
      const target = nextSlots[effect.into];
      nextSlots[effect.into] = target && "qty" in target ? { qty: target.qty + qty } : { qty };
      reactions.push({ itemId, event: tooHot ? "ignited" : "melted", resultItemId: effect.into, quantity: qty });
    } else if (effect.kind === "destroy") {
      delete nextSlots[itemId];
      reactions.push({ itemId, event: "rotted", resultItemId: DEFAULT_DECAY_RESULT, quantity: slot.qty });
    }
  }

  if (mutated) playerState.inventory = { slots: nextSlots };
  return { mutated, reactions, playerState };
}

function placeItem(state: RpgPlayerState, command: Extract<RpgReducerCommand, { type: "placeItem" }>): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const placeQuantity = Math.max(1, Math.floor(command.quantity ?? 1));
  const slots = { ...playerState.inventory.slots };
  if (getQty(slots[command.itemId]) < placeQuantity) throw new Error(`Insufficient ${command.itemId} in inventory`);
  removeQty(slots, command.itemId, placeQuantity);
  playerState.inventory = { slots };
  return { playerState };
}

/**
 * Pure RPG transaction reducer.
 *
 * It never reads reactive state and never persists. Controllers own ordering,
 * persistence, and UI synchronization; this function owns only gameplay rules.
 */
export function reduceRpgCommand(
  state: RpgPlayerState,
  command: RpgReducerCommand,
  options: RpgReducerOptions = {},
): RpgReducerResult {
  switch (command.type) {
    case "equipTool":
      return equipTool(state, command, options);
    case "pickup":
      return pickup(state, command);
    case "gather":
      return gather(state, command);
    case "refuel":
      return refuel(state);
    case "craft":
      return craft(state, command);
    case "build":
      return build(state, command, options);
    case "destroyBuilding":
      return destroyBuilding(state, command);
    case "placeItem":
      return placeItem(state, command);
    case "environmentTick":
      return environmentTick(state, command);
  }
}
