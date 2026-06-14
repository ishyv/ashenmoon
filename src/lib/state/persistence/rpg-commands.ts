import { BUILDING_SPECS, getBuildingSpec } from "$lib/domain/building-specs";
import { chooseFuelOption, fuelInventoryFromSlots } from "$lib/domain/camp/fuel";
import { resolveCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { resolveExperiment } from "$lib/domain/crafting/experimental";
import { StorageKeys } from "$lib/domain/game-events";
import { getGatherableBySyncLocation } from "$lib/domain/gathering/gatherables";
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import type {
  RpgEnvironmentTickResult,
  RpgEquipmentSlot,
  RpgGatherResult,
  RpgInventorySlot,
  RpgPlayerState,
  RpgReactionTriggered,
} from "$lib/domain/rpg-types";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";
import { devFlags } from "$lib/state/dev-flags.svelte";

export type MaterialGain = { id: string; quantity: number };

export interface GatherSync {
  playerState: RpgPlayerState;
  materialsGained: MaterialGain[];
  toolBroken: boolean;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlots(value: unknown): RpgPlayerState["inventory"]["slots"] {
  if (!isRecord(value)) return {};
  const slots: RpgPlayerState["inventory"]["slots"] = {};
  for (const [itemId, slot] of Object.entries(value)) {
    if (!isRecord(slot)) continue;
    const qty = slot.qty;
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) {
      slots[itemId] = { qty };
      continue;
    }
    const instances = slot.instances;
    if (Array.isArray(instances)) {
      const normalizedInstances = instances
        .filter(isRecord)
        .map((instance) => ({
          instanceId: typeof instance.instanceId === "string" ? instance.instanceId : "",
          durability: typeof instance.durability === "number" ? instance.durability : 100,
        }))
        .filter((instance) => instance.instanceId.length > 0);
      if (normalizedInstances.length > 0) {
        slots[itemId] = { instances: normalizedInstances };
      }
    }
  }
  return slots;
}

export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    fellSweep: { level: 1, xp: 0, nextXp: 100 },
    kiteCombo: { level: 1, xp: 0, nextXp: 100 },
  };
}

function normalizeSkills(value: unknown): RpgPlayerState["skills"] {
  const defaults = createDefaultSkills();
  if (!isRecord(value)) return defaults;
  for (const key of Object.keys(defaults) as (keyof RpgPlayerState["skills"])[]) {
    const skill = value[key];
    const defaultVal = defaults[key];
    if (!isRecord(skill) || !defaultVal) continue;
    const level = typeof skill.level === "number" && Number.isFinite(skill.level) ? skill.level : defaultVal.level;
    const xp = typeof skill.xp === "number" && Number.isFinite(skill.xp) ? skill.xp : defaultVal.xp;
    const nextXp = typeof skill.nextXp === "number" && Number.isFinite(skill.nextXp) ? skill.nextXp : defaultVal.nextXp;
    defaults[key] = { level, xp, nextXp };
  }
  return defaults;
}

function normalizeWeapon(value: unknown): RpgPlayerState["profile"]["loadout"]["weapon"] {
  if (value === null || typeof value === "string") return value;
  if (!isRecord(value)) return null;
  if (typeof value.itemId !== "string") return null;
  return {
    instanceId: typeof value.instanceId === "string" ? value.instanceId : `repaired_${value.itemId}`,
    itemId: value.itemId,
    durability: typeof value.durability === "number" && Number.isFinite(value.durability) ? value.durability : 100,
  };
}

function normalizeEquipmentSlot(value: unknown): RpgEquipmentSlot {
  if (value === null || typeof value === "string") return value;
  if (!isRecord(value)) return null;
  if (typeof value.itemId !== "string") return null;
  return {
    instanceId: typeof value.instanceId === "string" ? value.instanceId : `repaired_${value.itemId}`,
    itemId: value.itemId,
    durability: typeof value.durability === "number" && Number.isFinite(value.durability) ? value.durability : 100,
  };
}

export function createDefaultProfile(): RpgPlayerState["profile"] {
  return {
    hpCurrent: 100,
    stashSize: 20,
    loadout: {
      weapon: null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
    buildings: [],
    gatheredPickups: [],
  };
}

function normalizeProfile(value: unknown): RpgPlayerState["profile"] {
  const defaults = createDefaultProfile();
  if (!isRecord(value)) return defaults;
  const loadout = isRecord(value.loadout) ? value.loadout : {};
  const buildings = Array.isArray(value.buildings)
    ? value.buildings.filter(isRecord).flatMap((building) => {
        if (
          typeof building.id === "string" &&
          typeof building.type === "string" &&
          typeof building.x === "number" &&
          typeof building.y === "number"
        ) {
          return [{
            id: building.id,
            type: building.type,
            x: building.x,
            y: building.y,
            ...(typeof building.sourceItemId === "string" ? { sourceItemId: building.sourceItemId } : {}),
          }];
        }
        return [];
      })
    : defaults.buildings;
  const gatheredPickups = Array.isArray(value.gatheredPickups)
    ? value.gatheredPickups.filter((id): id is string => typeof id === "string")
    : defaults.gatheredPickups;

  return {
    hpCurrent: typeof value.hpCurrent === "number" && Number.isFinite(value.hpCurrent) ? value.hpCurrent : defaults.hpCurrent,
    stashSize: typeof value.stashSize === "number" && Number.isFinite(value.stashSize) ? value.stashSize : defaults.stashSize,
    loadout: {
      weapon: normalizeWeapon(loadout.weapon),
      shield: normalizeEquipmentSlot(loadout.shield),
      helmet: normalizeEquipmentSlot(loadout.helmet),
      chest: normalizeEquipmentSlot(loadout.chest),
      pants: normalizeEquipmentSlot(loadout.pants),
      boots: normalizeEquipmentSlot(loadout.boots),
      ring: normalizeEquipmentSlot(loadout.ring),
      necklace: normalizeEquipmentSlot(loadout.necklace),
    },
    ...(buildings !== undefined ? { buildings } : {}),
    ...(gatheredPickups !== undefined ? { gatheredPickups } : {}),
    ...(typeof value.characterLevel === "number" && Number.isFinite(value.characterLevel)
      ? { characterLevel: value.characterLevel }
      : {}),
    ...(typeof value.characterXp === "number" && Number.isFinite(value.characterXp)
      ? { characterXp: value.characterXp }
      : {}),
  };
}

export function createDefaultPlayerState(): RpgPlayerState {
  return {
    profile: createDefaultProfile(),
    inventory: { slots: {} },
    skills: createDefaultSkills(),
    runSettings: { deathMode: "respawn" },
  };
}

export function normalizePlayerState(input: unknown): RpgPlayerState {
  const candidate = isRecord(input) && isRecord(input.rpg) ? input.rpg : input;
  if (!isRecord(candidate)) return createDefaultPlayerState();

  const runSettingsInput = isRecord(candidate.runSettings) ? candidate.runSettings : null;
  const deathMode = runSettingsInput && typeof runSettingsInput.deathMode === "string"
    ? runSettingsInput.deathMode
    : "respawn";

  return {
    profile: normalizeProfile(candidate.profile),
    inventory: {
      slots: normalizeSlots(isRecord(candidate.inventory) ? candidate.inventory.slots : undefined),
    },
    skills: normalizeSkills(candidate.skills),
    runSettings: { deathMode },
  };
}

export function getLocalRpgState(): RpgPlayerState {
  return normalizePlayerState(loadSlice<unknown>(StorageKeys.rpg, createDefaultPlayerState()));
}

export function saveLocalRpgState(state: unknown): RpgPlayerState {
  const normalized = normalizePlayerState(state);
  saveSlice(StorageKeys.rpg, normalized);
  return normalized;
}

function mutateAndSave(mutator: (playerState: RpgPlayerState) => void): RpgPlayerState {
  const playerState = clonePlayerState(getLocalRpgState());
  mutator(playerState);
  return saveLocalRpgState(playerState);
}

function pickup(itemId: string, pickupId: string, quantity = 1): GatherSync {
  const pickupQuantity = Math.max(1, Math.floor(quantity));
  const playerState = mutateAndSave((state) => {
    const slots = { ...state.inventory.slots };
    addQty(slots, itemId, pickupQuantity);
    state.inventory = { slots };
    if (pickupId && !state.profile.gatheredPickups?.includes(pickupId)) {
      state.profile.gatheredPickups = [...(state.profile.gatheredPickups ?? []), pickupId];
    }
  });

  return {
    materialsGained: [{ id: itemId, quantity: pickupQuantity }],
    toolBroken: false,
    playerState,
  };
}

function refuel(): GatherSync {
  let consumed = false;
  const playerState = mutateAndSave((state) => {
    const slots = { ...state.inventory.slots };
    const fuel = chooseFuelOption(fuelInventoryFromSlots(slots));
    if (!fuel) {
      throw new Error("Insufficient fuel");
    }
    removeQty(slots, fuel.itemId, fuel.qty);
    consumed = true;
    state.inventory = { slots };
  });
  return { materialsGained: consumed ? [{ id: "fuel", quantity: 1 }] : [], toolBroken: false, playerState };
}

function gather(action: "mine" | "forest", locationId: string): GatherSync {
  let materialsGained: MaterialGain[] = [];
  let toolBroken = false;
  const playerState = mutateAndSave((state) => {
    const gatherable = getGatherableBySyncLocation(locationId);
    const drop = gatherable?.yieldTable[0]?.itemId ?? (action === "forest" ? "wood" : "stone");
    const slots = { ...state.inventory.slots };
    addQty(slots, drop, 1);
    state.inventory = { slots };
    materialsGained = [{ id: drop, quantity: 1 }];

    const weapon = state.profile.loadout.weapon;
    if (weapon && typeof weapon === "object") {
      const newDurability = weapon.durability - 5;
      if (newDurability <= 0) {
        toolBroken = true;
        state.profile.loadout.weapon = null;
      } else {
        state.profile.loadout.weapon = { ...weapon, durability: newDurability };
      }
    }
  });

  return { materialsGained, toolBroken, playerState };
}

function equipTool(itemId: string | null): RpgPlayerState {
  return mutateAndSave((state) => {
    if (!itemId) {
      state.profile.loadout.weapon = null;
      return;
    }
    const slot = state.inventory.slots[itemId];
    const exists = slot && ("qty" in slot ? slot.qty > 0 : slot.instances.length > 0);
    if (!exists) {
      throw new Error("Item not in inventory");
    }
    state.profile.loadout.weapon = {
      instanceId: `standalone_${itemId}_${Date.now()}`,
      itemId,
      durability: 100,
    };
  });
}

function equipGear(
  itemId: string | null,
  slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace",
): RpgPlayerState {
  const SLOT_MAPPING_LOCAL: Record<string, string> = {
    helmet: "head",
    chest: "body",
    boots: "feet",
    shield: "hands",
    pants: "legs",
  };
  return mutateAndSave((state) => {
    // 1. Unequip current gear if present
    const current = state.profile.loadout[slot];
    if (current) {
      const currentItemId = typeof current === "string" ? current : current.itemId;
      addQty(state.inventory.slots, currentItemId, 1);
      state.profile.loadout[slot] = null;
    }

    // 2. If itemId is null, we are just unequipping
    if (!itemId) {
      return;
    }

    // 3. Equip the new gear
    const slotVal = state.inventory.slots[itemId];
    const exists = slotVal && ("qty" in slotVal ? slotVal.qty > 0 : slotVal.instances.length > 0);
    if (!exists) throw new Error("Item not in inventory");

    const def = ITEM_DEFINITIONS[itemId];
    if (!def) throw new Error("Unknown item");

    const wearable = traitOf(def, "wearable");
    if (!wearable) throw new Error("Item is not wearable");

    const expectedSlot = SLOT_MAPPING_LOCAL[slot];
    if (!expectedSlot || wearable.slot !== expectedSlot) {
      throw new Error(`Item ${itemId} cannot be equipped in slot ${slot}`);
    }

    // Deduct from inventory
    removeQty(state.inventory.slots, itemId, 1);

    // Set loadout
    state.profile.loadout[slot] = {
      instanceId: `gear_${itemId}_${Date.now()}`,
      itemId,
      durability: 100,
    };
  });
}

function build(type: string, x: number, y: number, sourceItemId?: string): RpgPlayerState {
  const spec = getBuildingSpec(type);
  if (!isKnownBuildable(type) || !spec.cost) {
    throw new Error("Invalid building type");
  }
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error("Missing coordinates");
  }

  return mutateAndSave((state) => {
    if (!devFlags.freeBuildingEnabled && sourceItemId) {
      const slots = { ...state.inventory.slots };
      const sourceItem = ITEM_DEFINITIONS[sourceItemId];
      const placeable = traitOf(sourceItem, "placeable");
      if (!sourceItem || placeable?.prefabId !== type) {
        throw new Error(`Invalid building kit for ${type}`);
      }
      if (getQty(slots[sourceItemId]) < 1) {
        throw new Error(`Insufficient ${sourceItemId}`);
      }
      removeQty(slots, sourceItemId, 1);
      state.inventory = { slots };
    } else if (!devFlags.freeBuildingEnabled) {
      const slots = { ...state.inventory.slots };
      for (const [itemId, reqQty] of Object.entries(spec.cost ?? {})) {
        if (getQty(slots[itemId]) < reqQty) {
          throw new Error(`Insufficient ${itemId}`);
        }
      }
      for (const [itemId, reqQty] of Object.entries(spec.cost ?? {})) {
        removeQty(slots, itemId, reqQty);
      }
      state.inventory = { slots };
    }
    if (type === "storage_pile") {
      state.profile.stashSize += 20;
    }
    state.profile.buildings = [
      ...(state.profile.buildings ?? []),
      { id: `building_${type}_${Date.now()}`, type, x, y, ...(sourceItemId ? { sourceItemId } : {}) },
    ];
  });
}

function destroyBuilding(buildingId: string): RpgPlayerState {
  return mutateAndSave((state) => {
    const building = state.profile.buildings?.find((b) => b.id === buildingId);
    if (!building) return;
    const spec = getBuildingSpec(building.type);
    const slots = { ...state.inventory.slots };
    for (const [itemId, qty] of Object.entries(spec.cost ?? {})) {
      addQty(slots, itemId, Math.ceil(qty * 0.5));
    }
    state.profile.buildings = state.profile.buildings?.filter((b) => b.id !== buildingId) ?? [];
    state.inventory = { slots };
  });
}

function craft(recipeId: string, ctx: CraftContext): RpgPlayerState {
  return mutateAndSave((state) => {
    const result = resolveCraft(state.inventory.slots, recipeId, ctx);
    if (!result.ok) {
      throw new Error(result.reason);
    }
    state.inventory = { slots: result.slots };
  });
}

function environmentTick(env: { temperature: number; humidity: number; toxins: number }): RpgEnvironmentTickResult {
  const state = clonePlayerState(getLocalRpgState());
  let mutated = false;
  const reactions: RpgReactionTriggered[] = [];
  const nextSlots = { ...state.inventory.slots };

  for (const [itemId, slot] of Object.entries(state.inventory.slots)) {
    if (!slot || !("qty" in slot) || slot.qty <= 0) continue;
    const definition = ITEM_DEFINITIONS[itemId];
    const trait = definition?.traits.find((t) => t.kind === "temperature_sensitive");
    if (!trait || trait.kind !== "temperature_sensitive") continue;

    const tooHot = env.temperature > trait.maxSafeTemp;
    const tooCold = env.temperature < trait.minSafeTemp;
    if (!tooHot && !tooCold) continue;

    mutated = true;
    const effect = trait.effect;
    if (effect.kind === "transform") {
      const qty = slot.qty;
      delete nextSlots[itemId];
      const target = nextSlots[effect.into];
      nextSlots[effect.into] = target && "qty" in target ? { qty: target.qty + qty } : { qty };
      reactions.push({
        itemId,
        event: tooHot ? "ignited" : "melted",
        resultItemId: effect.into,
        quantity: qty,
      });
    } else if (effect.kind === "destroy") {
      delete nextSlots[itemId];
      reactions.push({
        itemId,
        event: "rotted",
        resultItemId: "volatile_ash",
        quantity: slot.qty,
      });
    }
  }

  if (mutated) {
    state.inventory = { slots: nextSlots };
    return { mutated, reactions, playerState: saveLocalRpgState(state) };
  }

  return { mutated, reactions, playerState: state };
}

function placeItem(itemId: string, qty = 1): RpgPlayerState {
  const placeQuantity = Math.max(1, Math.floor(qty));
  return mutateAndSave((state) => {
    const slots = { ...state.inventory.slots };
    if (getQty(slots[itemId]) < placeQuantity) {
      throw new Error(`Insufficient ${itemId} in inventory`);
    }
    removeQty(slots, itemId, placeQuantity);
    state.inventory = { slots };
  });
}

export interface ExperimentSync {
  playerState: RpgPlayerState;
  success: boolean;
  recipeId?: string | undefined;
  reason?: string | undefined;
}

function experiment(inputs: Record<string, number>, ctx: CraftContext): ExperimentSync {
  let success = false;
  let recipeId: string | undefined;
  let reason: string | undefined;

  const playerState = mutateAndSave((state) => {
    const result = resolveExperiment(state.inventory.slots, inputs, ctx);
    if (result.slots) {
      state.inventory = { slots: result.slots };
    }
    if (result.ok) {
      success = true;
      recipeId = result.recipe.id;
    } else {
      if (result.reason === "requires_campfire" || result.reason === "insufficient_materials") {
        throw new Error(result.reason);
      }
      success = false;
      reason = result.reason;
    }
  });

  return { playerState, success, recipeId, reason };
}

export const localRpgCommands = {
  getPlayerState: getLocalRpgState,
  savePlayerState: saveLocalRpgState,
  pickup,
  refuel,
  gather,
  equipTool,
  equipGear,
  build,
  destroyBuilding,
  craft,
  experiment,
  environmentTick,
  placeItem,
};

export type LocalRpgCommandResult = Omit<
  RpgGatherResult,
  "userId" | "locationId" | "locationName" | "tier" | "toolId" | "remainingDurability"
>;
