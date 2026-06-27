import { getBuildingSpec, BUILDING_SPECS } from "$lib/domain/building-specs";
import { chooseFuelOption, fuelInventoryFromSlots } from "$lib/domain/camp/fuel";
import { resolveCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { getGatherableBySyncLocation } from "$lib/domain/gathering/gatherables";
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import { resolveStudyBlueprint } from "$lib/domain/systems/study-system";
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
  | { type: "equipTool"; itemId: string | null; auto?: boolean }
  | {
      type: "equipGear";
      itemId: string | null;
      slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace";
    }
  | { type: "pickup"; itemId: string; pickupId: string; quantity?: number }
  | { type: "gather"; action: "mine" | "forest"; locationId: string }
  | { type: "refuel" }
  | { type: "craft"; recipeId: string; context: CraftContext }
  | { type: "studyBlueprint"; itemId: string }
  | { type: "build"; buildingType: string; x: number; y: number; sourceItemId?: string }
  | { type: "destroyBuilding"; buildingId: string }
  | { type: "upgradeBuilding"; buildingId: string }
  | { type: "placeItem"; itemId: string; quantity?: number; x?: number; y?: number }
  | { type: "environmentTick"; environment: { temperature: number; humidity: number; toxins: number } };

export type MaterialGain = { id: string; quantity: number };

export interface GatherSync {
  playerState: RpgPlayerState;
  materialsGained: MaterialGain[];
  toolBroken: boolean;
}

export interface StudySync {
  playerState: RpgPlayerState;
  learnedRecipeId: string;
}

export type RpgReducerResult =
  | { playerState: RpgPlayerState }
  | GatherSync
  | StudySync
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
  const drop = gatherable?.yieldTable[0]?.itemId ?? (command.action === "forest" ? "wood" : "stone");
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

  const def = ITEM_DEFINITIONS[command.itemId];
  const visual = def ? traitOf(def, "equippable_visuals") : undefined;

  // If two-handed weapon/tool, unequip shield
  if (visual && visual.handUsage === "two-handed") {
    const shield = playerState.profile.loadout.shield;
    if (shield) {
      const shieldItemId = typeof shield === "string" ? shield : shield.itemId;
      addQty(playerState.inventory.slots, shieldItemId, 1);
      playerState.profile.loadout.shield = null;
    }
  }

  playerState.profile.loadout.weapon = {
    instanceId: `standalone_${command.itemId}_${options.now?.() ?? Date.now()}`,
    itemId: command.itemId,
    durability: 100,
  };
  return { playerState };
}

const SLOT_MAPPING: Record<string, string> = {
  helmet: "head",
  chest: "body",
  boots: "feet",
  shield: "hands",
  pants: "legs",
};

function getExpectedWearableSlot(slot: string): string | null {
  return SLOT_MAPPING[slot] ?? null;
}

function equipGear(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "equipGear" }>,
  options: RpgReducerOptions,
): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const slotKey = command.slot;

  // 1. Unequip current gear if present
  const current = playerState.profile.loadout[slotKey];
  if (current) {
    const currentItemId = typeof current === "string" ? current : current.itemId;
    addQty(playerState.inventory.slots, currentItemId, 1);
    playerState.profile.loadout[slotKey] = null;
  }

  // 2. If itemId is null, we are just unequipping
  if (!command.itemId) {
    return { playerState };
  }

  // 3. Equip the new gear
  const itemId = command.itemId;
  const slotVal = playerState.inventory.slots[itemId];
  const exists = slotVal && ("qty" in slotVal ? slotVal.qty > 0 : slotVal.instances.length > 0);
  if (!exists) throw new Error("Item not in inventory");

  const def = ITEM_DEFINITIONS[itemId];
  if (!def) throw new Error("Unknown item");

  const wearable = traitOf(def, "wearable");
  if (!wearable) throw new Error("Item is not wearable");

  const expectedSlot = getExpectedWearableSlot(slotKey);
  if (!expectedSlot || wearable.slot !== expectedSlot) {
    throw new Error(`Item ${itemId} cannot be equipped in slot ${slotKey}`);
  }

  // --- Hand usage & Multi-slot constraint checks ---
  const visual = traitOf(def, "equippable_visuals");

  // A. If equipping a shield, check if currently equipped weapon is two-handed
  if (slotKey === "shield") {
    const equippedWeapon = playerState.profile.loadout.weapon;
    if (equippedWeapon) {
      const weaponId = typeof equippedWeapon === "string" ? equippedWeapon : equippedWeapon.itemId;
      const weaponDef = ITEM_DEFINITIONS[weaponId];
      const weaponVisual = weaponDef ? traitOf(weaponDef, "equippable_visuals") : undefined;
      if (weaponVisual && weaponVisual.handUsage === "two-handed") {
        addQty(playerState.inventory.slots, weaponId, 1);
        playerState.profile.loadout.weapon = null; // Unequip weapon
      }
    }
  }

  // B. Check if this slot is currently blocked by a multi-slot item equipped in another slot
  for (const otherSlotKey of Object.keys(playerState.profile.loadout) as (keyof typeof playerState.profile.loadout)[]) {
    if (otherSlotKey === slotKey) continue;
    const otherEquipped = playerState.profile.loadout[otherSlotKey];
    if (otherEquipped) {
      const otherItemId = typeof otherEquipped === "string" ? otherEquipped : otherEquipped.itemId;
      const otherDef = ITEM_DEFINITIONS[otherItemId];
      const otherVisual = otherDef ? traitOf(otherDef, "equippable_visuals") : undefined;
      if (otherVisual && otherVisual.slots.includes(slotKey as any)) {
        throw new Error(`Slot ${slotKey} is blocked by equipped ${otherItemId}`);
      }
    }
  }

  // C. If this item covers multiple slots, unequip any items in those slots
  if (visual && visual.slots.length > 1) {
    for (const coveredSlot of visual.slots) {
      if (coveredSlot === slotKey) continue;
      const itemInCoveredSlot = playerState.profile.loadout[coveredSlot];
      if (itemInCoveredSlot) {
        const coveredItemId = typeof itemInCoveredSlot === "string" ? itemInCoveredSlot : itemInCoveredSlot.itemId;
        addQty(playerState.inventory.slots, coveredItemId, 1);
        playerState.profile.loadout[coveredSlot] = null;
      }
    }
  }
  // ------------------------------------------------------

  // Deduct from inventory
  removeQty(playerState.inventory.slots, itemId, 1);

  // Set loadout
  playerState.profile.loadout[slotKey] = {
    instanceId: `gear_${itemId}_${options.now?.() ?? Date.now()}`,
    itemId,
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
  if (!options.freeBuilding && command.sourceItemId) {
    const slots = { ...playerState.inventory.slots };
    const sourceItem = ITEM_DEFINITIONS[command.sourceItemId];
    const placeable = traitOf(sourceItem, "placeable");
    if (!sourceItem || placeable?.prefabId !== command.buildingType) {
      throw new Error(`Invalid building kit for ${command.buildingType}`);
    }
    if (getQty(slots[command.sourceItemId]) < 1) throw new Error(`Insufficient ${command.sourceItemId}`);
    removeQty(slots, command.sourceItemId, 1);
    playerState.inventory = { slots };
  } else if (!options.freeBuilding) {
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
      ...(command.sourceItemId ? { sourceItemId: command.sourceItemId } : {}),
      ...(spec.isMultiStage ? { stage: 0 } : {}),
    },
  ];
  return { playerState };
}

function upgradeBuilding(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "upgradeBuilding" }>,
  options: RpgReducerOptions,
): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const building = playerState.profile.buildings?.find((b) => b.id === command.buildingId);
  if (!building) throw new Error("Building not found");

  const spec = getBuildingSpec(building.type);
  if (!spec.isMultiStage || !spec.constructionStages) {
    throw new Error("Building is not multi-stage");
  }

  const currentStage = building.stage ?? 0;
  if (currentStage >= 5) {
    throw new Error("Building already fully constructed");
  }

  const nextStage = currentStage + 1;
  const stageSpec = spec.constructionStages.find((s) => s.stage === nextStage);
  if (!stageSpec) {
    throw new Error(`Invalid next construction stage ${nextStage}`);
  }

  if (!options.freeBuilding) {
    const slots = { ...playerState.inventory.slots };
    for (const [itemId, reqQty] of Object.entries(stageSpec.cost)) {
      if (getQty(slots[itemId]) < reqQty) throw new Error(`Insufficient ${itemId}`);
    }
    for (const [itemId, reqQty] of Object.entries(stageSpec.cost)) {
      removeQty(slots, itemId, reqQty);
    }
    playerState.inventory = { slots };
  }

  building.stage = nextStage;
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

function placeItem(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "placeItem" }>,
  options: RpgReducerOptions,
): { playerState: RpgPlayerState } {
  const playerState = clonePlayerState(state);
  const placeQuantity = Math.max(1, Math.floor(command.quantity ?? 1));
  const slots = { ...playerState.inventory.slots };
  if (getQty(slots[command.itemId]) < placeQuantity) throw new Error(`Insufficient ${command.itemId} in inventory`);
  removeQty(slots, command.itemId, placeQuantity);
  playerState.inventory = { slots };

  if (typeof command.x === "number" && typeof command.y === "number") {
    const now = options.now?.() ?? Date.now();
    playerState.profile.worldEntities = [
      ...(playerState.profile.worldEntities ?? []),
      {
        id: `world_item_${command.itemId}_${now}`,
        kind: "placed_item",
        itemId: command.itemId,
        x: command.x,
        y: command.y,
        quantity: placeQuantity,
      },
    ];
  }

  return { playerState };
}

function studyBlueprint(
  state: RpgPlayerState,
  command: Extract<RpgReducerCommand, { type: "studyBlueprint" }>,
): StudySync {
  const playerState = clonePlayerState(state);
  const result = resolveStudyBlueprint(playerState.inventory.slots, command.itemId);
  if (!result.ok) throw new Error(result.reason);
  playerState.inventory = { slots: result.slots };
  return { playerState, learnedRecipeId: result.recipeId };
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
    case "equipGear":
      return equipGear(state, command, options);
    case "pickup":
      return pickup(state, command);
    case "gather":
      return gather(state, command);
    case "refuel":
      return refuel(state);
    case "craft":
      return craft(state, command);
    case "studyBlueprint":
      return studyBlueprint(state, command);
    case "build":
      return build(state, command, options);
    case "destroyBuilding":
      return destroyBuilding(state, command);
    case "upgradeBuilding":
      return upgradeBuilding(state, command, options);
    case "placeItem":
      return placeItem(state, command, options);
    case "environmentTick":
      return environmentTick(state, command);
  }
}
