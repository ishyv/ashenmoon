import { BUILDING_SPECS, getBuildingSpec } from "$lib/domain/building-specs";
import { resolveCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { getGatherableBySyncLocation } from "$lib/domain/gathering/gatherables";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import type {
  RpgContentSnapshot,
  RpgEnvironmentTickResult,
  RpgGatherResult,
  RpgInventorySlot,
  RpgPlayerState,
  RpgReactionTriggered,
} from "$lib/domain/rpg-types";
import { loadLocalData, saveLocalData } from "./local-db";

/**
 * Root structure for the unified local save.
 */
interface GlobalSave {
  playerStates: Record<string, unknown>;
  rpgContent?: RpgContentSnapshot;
}

// In-memory cache for fast access, backed by local-db.
let globalSaveCache: GlobalSave | null = null;

async function getGlobalSave(): Promise<GlobalSave> {
  if (!globalSaveCache) {
    try {
      const data = await loadLocalData<GlobalSave>();
      globalSaveCache = data ?? { playerStates: {} };
      if (!globalSaveCache.playerStates) {
        globalSaveCache.playerStates = {};
      }
    } catch (err) {
      console.warn("RPG Service: Failed to load save file, falling back to empty state.", err);
      globalSaveCache = { playerStates: {} };
    }
  }
  return globalSaveCache;
}

async function persistGlobalSave(): Promise<void> {
  if (globalSaveCache) {
    await saveLocalData(globalSaveCache);
  }
}

export function resetRpgServiceCacheForTests(): void {
  globalSaveCache = null;
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

function normalizeSkills(value: unknown): RpgPlayerState["skills"] {
  const defaults = createDefaultSkills();
  if (!isRecord(value)) return defaults;
  for (const key of Object.keys(defaults) as (keyof RpgPlayerState["skills"])[]) {
    const skill = value[key];
    if (!isRecord(skill)) continue;
    const level = typeof skill.level === "number" && Number.isFinite(skill.level) ? skill.level : defaults[key].level;
    const xp = typeof skill.xp === "number" && Number.isFinite(skill.xp) ? skill.xp : defaults[key].xp;
    const nextXp = typeof skill.nextXp === "number" && Number.isFinite(skill.nextXp) ? skill.nextXp : defaults[key].nextXp;
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
          return [{ id: building.id, type: building.type, x: building.x, y: building.y }];
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
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
    buildings,
    gatheredPickups,
  };
}

export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    superGather: { level: 1, xp: 0, nextXp: 100 },
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

export function createDefaultPlayerState(): RpgPlayerState {
  return {
    profile: createDefaultProfile(),
    inventory: { slots: {} },
    skills: createDefaultSkills(),
  };
}

export function normalizePlayerState(input: unknown): RpgPlayerState {
  const candidate = isRecord(input) && isRecord(input.rpg) ? input.rpg : input;
  if (!isRecord(candidate)) return createDefaultPlayerState();

  return {
    profile: normalizeProfile(candidate.profile),
    inventory: {
      slots: normalizeSlots(isRecord(candidate.inventory) ? candidate.inventory.slots : undefined),
    },
    skills: normalizeSkills(candidate.skills),
  };
}

let activeRpgContentSnapshot: RpgContentSnapshot = {
  items: {},
  materials: {},
  locations: {},
  tools: {},
  craftingRecipes: {},
  processingRecipes: {},
};

export const rpgService = {
  async getPlayerState(userId: string): Promise<RpgPlayerState> {
    const save = await getGlobalSave();
    const normalized = normalizePlayerState(save.playerStates[userId]);
    save.playerStates[userId] = normalized;
    return normalized;
  },

  async savePlayerState(userId: string, state: unknown): Promise<void> {
    const save = await getGlobalSave();
    save.playerStates[userId] = normalizePlayerState(state);
    await persistGlobalSave();
  },

  async gather(
    userId: string,
    action: "mine" | "forest" | "pickup" | "refuel",
    locationId: string,
    pickupId?: string,
    quantity = 1
  ): Promise<Omit<RpgGatherResult, "userId" | "locationId" | "locationName" | "tier" | "toolId" | "remainingDurability">> {
    const playerState = clonePlayerState(await this.getPlayerState(userId));

    if (action === "pickup") {
      const drop = locationId; // e.g. "oak_wood" or "stone"
      const pickupQuantity = Math.max(1, Math.floor(quantity));
      const slots = { ...playerState.inventory.slots };
      addQty(slots, drop, pickupQuantity);
      playerState.inventory = { slots };

      if (pickupId) {
        if (!playerState.profile.gatheredPickups) {
          playerState.profile.gatheredPickups = [];
        }
        if (!playerState.profile.gatheredPickups.includes(pickupId)) {
          playerState.profile.gatheredPickups.push(pickupId);
        }
      }

      await this.savePlayerState(userId, playerState);

      return {
        materialsGained: [{ id: drop, quantity: pickupQuantity }],
        toolBroken: false,
        playerState,
      };
    }

    if (action === "refuel") {
      const slots = { ...playerState.inventory.slots };
      if (getQty(slots.oak_wood) >= 5) {
        removeQty(slots, "oak_wood", 5);
      }
      playerState.inventory = { slots };

      await this.savePlayerState(userId, playerState);

      return {
        materialsGained: [],
        toolBroken: false,
        playerState,
      };
    }

    // Normal gather (mine/forest). The route still posts the historical
    // location id, but drops now resolve through gatherable definitions.
    const gatherable = getGatherableBySyncLocation(locationId);
    const drop = gatherable?.yieldTable[0]?.itemId ?? (action === "forest" ? "oak_wood" : "stone");
    const slots = { ...playerState.inventory.slots };
    addQty(slots, drop, 1);
    playerState.inventory = { slots };

    let toolBroken = false;
    const weapon = playerState.profile.loadout.weapon;
    if (weapon && typeof weapon === "object") {
      const newDurability = weapon.durability - 5;
      if (newDurability <= 0) {
        toolBroken = true;
        playerState.profile.loadout.weapon = null;
      } else {
        playerState.profile.loadout.weapon = {
          ...weapon,
          durability: newDurability
        };
      }
    }

    await this.savePlayerState(userId, playerState);

    return {
      materialsGained: [{ id: drop, quantity: 1 }],
      toolBroken,
      playerState,
    };
  },

  async equipTool(userId: string, itemId: string | null): Promise<RpgPlayerState> {
    const playerState = clonePlayerState(await this.getPlayerState(userId));

    if (!itemId) {
      playerState.profile.loadout.weapon = null;
    } else {
      const slots = playerState.inventory.slots;
      const slot = slots[itemId];
      const exists = slot && ("qty" in slot ? slot.qty > 0 : slot.instances.length > 0);
      if (!exists) {
        throw new Error("Item not in inventory");
      }
      playerState.profile.loadout.weapon = {
        instanceId: `standalone_${itemId}_${Date.now()}`,
        itemId,
        durability: 100,
      };
    }

    await this.savePlayerState(userId, playerState);
    return playerState;
  },

  async build(userId: string, type: string, x: number, y: number): Promise<RpgPlayerState> {
    const spec = getBuildingSpec(type);
    if (!isKnownBuildable(type) || !spec.cost) {
      throw new Error("Invalid building type");
    }
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error("Missing coordinates");
    }

    const playerState = clonePlayerState(await this.getPlayerState(userId));
    const slots = { ...playerState.inventory.slots };
    for (const [itemId, reqQty] of Object.entries(spec.cost)) {
      if (getQty(slots[itemId]) < reqQty) {
        throw new Error(`Insufficient ${itemId}`);
      }
    }
    for (const [itemId, reqQty] of Object.entries(spec.cost)) {
      removeQty(slots, itemId, reqQty);
    }

    playerState.inventory = { slots };
    if (type === "storage_pile") {
      playerState.profile.stashSize += 20;
    }
    playerState.profile.buildings ??= [];
    playerState.profile.buildings.push({
      id: `building_${type}_${Date.now()}`,
      type,
      x,
      y,
    });

    await this.savePlayerState(userId, playerState);
    return playerState;
  },

  async craft(userId: string, recipeId: string, ctx: CraftContext): Promise<RpgPlayerState> {
    const playerState = clonePlayerState(await this.getPlayerState(userId));
    const result = resolveCraft(playerState.inventory.slots, recipeId, ctx);
    if (!result.ok) {
      throw new Error(result.reason);
    }

    playerState.inventory = { slots: result.slots };
    await this.savePlayerState(userId, playerState);
    return playerState;
  },

  async environmentTick(
    userId: string,
    env: { temperature: number; humidity: number; toxins: number }
  ): Promise<RpgEnvironmentTickResult> {
    const playerState = clonePlayerState(await this.getPlayerState(userId));
    let mutated = false;
    const reactions: RpgReactionTriggered[] = [];

    const slots = playerState.inventory.slots;
    const nextSlots = { ...slots };

    // Process temperature sensitive reactions
    for (const [itemId, slot] of Object.entries(slots)) {
      if (!slot || !("qty" in slot) || slot.qty <= 0) continue;

      const definition = ITEM_DEFINITIONS[itemId];
      if (!definition) continue;

      const trait = definition.traits.find((t) => t.kind === "temperature_sensitive");
      if (!trait || trait.kind !== "temperature_sensitive") continue;

      const tooHot = env.temperature > trait.maxSafeTemp;
      const tooCold = env.temperature < trait.minSafeTemp;
      if (!tooHot && !tooCold) continue;

      // React!
      mutated = true;
      const effect = trait.effect;
      if (effect.kind === "transform") {
        const qty = slot.qty;
        delete nextSlots[itemId];
        const target = nextSlots[effect.into];
        if (target && "qty" in target) {
          nextSlots[effect.into] = { qty: target.qty + qty };
        } else {
          nextSlots[effect.into] = { qty };
        }

        reactions.push({
          itemId,
          event: env.temperature > trait.maxSafeTemp ? "ignited" : "melted",
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
      playerState.inventory = { slots: nextSlots };
      await this.savePlayerState(userId, playerState);
    }

    return {
      mutated,
      reactions,
      playerState,
    };
  },

  async getRpgContent(): Promise<RpgContentSnapshot> {
    const save = await getGlobalSave();
    return save.rpgContent ?? activeRpgContentSnapshot;
  },

  async saveRpgContent(snapshot: RpgContentSnapshot): Promise<RpgContentSnapshot> {
    const save = await getGlobalSave();
    save.rpgContent = snapshot;
    await persistGlobalSave();
    return snapshot;
  },
};
