import type { RpgPlayerState, RpgGatherResult, RpgEnvironmentTickResult, RpgContentSnapshot } from "$lib/domain/rpg-types";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { loadLocalData, saveLocalData } from "./local-db";

/**
 * Root structure for the unified local save.
 */
interface GlobalSave {
  playerStates: Record<string, RpgPlayerState>;
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
    if (!save.playerStates[userId]) {
      save.playerStates[userId] = createDefaultPlayerState();
    }
    return save.playerStates[userId];
  },

  async savePlayerState(userId: string, state: RpgPlayerState): Promise<void> {
    const save = await getGlobalSave();
    save.playerStates[userId] = state;
    await persistGlobalSave();
  },

  async gather(
    userId: string,
    action: "mine" | "forest" | "pickup" | "refuel",
    locationId: string,
    pickupId?: string
  ): Promise<any> {
    const playerState = JSON.parse(JSON.stringify(await this.getPlayerState(userId))) as RpgPlayerState;

    if (action === "pickup") {
      const drop = locationId; // e.g. "oak_wood" or "stone"
      const slots = { ...playerState.inventory.slots };
      const existing = slots[drop];
      const currentQty = existing && "qty" in existing ? existing.qty : 0;
      slots[drop] = { qty: currentQty + 1 };
      
      (playerState as any).inventory = { slots };

      if (pickupId) {
        const profile = playerState.profile as any;
        if (!profile.gatheredPickups) {
          profile.gatheredPickups = [];
        }
        if (!profile.gatheredPickups.includes(pickupId)) {
          profile.gatheredPickups.push(pickupId);
        }
      }

      await this.savePlayerState(userId, playerState);

      return {
        materialsGained: [{ id: drop, quantity: 1 }],
        toolBroken: false,
        playerState,
      };
    }

    if (action === "refuel") {
      const slots = { ...playerState.inventory.slots };
      const woodQty = slots.oak_wood && "qty" in slots.oak_wood ? slots.oak_wood.qty : 0;
      if (woodQty >= 5) {
        const newWood = woodQty - 5;
        if (newWood <= 0) {
          delete slots.oak_wood;
        } else {
          slots.oak_wood = { qty: newWood };
        }
      }
      (playerState as any).inventory = { slots };

      await this.savePlayerState(userId, playerState);

      return {
        materialsGained: [],
        toolBroken: false,
        playerState,
      };
    }

    // Normal gather (mine/forest)
    const drop = action === "forest" ? "oak_wood" : "stone";
    const slots = { ...playerState.inventory.slots };
    const existing = slots[drop];
    const currentQty = existing && "qty" in existing ? existing.qty : 0;
    slots[drop] = { qty: currentQty + 1 };
    
    (playerState as any).inventory = { slots };

    let toolBroken = false;
    const weapon = playerState.profile.loadout.weapon;
    if (weapon && typeof weapon === "object" && "durability" in weapon) {
      const newDurability = weapon.durability - 5;
      if (newDurability <= 0) {
        toolBroken = true;
        (playerState as any).profile = {
          ...playerState.profile,
          loadout: {
            ...playerState.profile.loadout,
            weapon: null
          }
        };
      } else {
        (playerState as any).profile = {
          ...playerState.profile,
          loadout: {
            ...playerState.profile.loadout,
            weapon: {
              ...weapon,
              durability: newDurability
            }
          }
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
    const playerState = JSON.parse(JSON.stringify(await this.getPlayerState(userId))) as RpgPlayerState;

    if (!itemId) {
      (playerState.profile.loadout as any).weapon = null;
    } else {
      const slots = playerState.inventory.slots;
      const exists = slots[itemId] && ("qty" in slots[itemId] ? (slots[itemId] as any).qty > 0 : true);
      if (!exists) {
        throw new Error("Item not in inventory");
      }
      (playerState.profile.loadout as any).weapon = {
        instanceId: `standalone_${itemId}_${Date.now()}`,
        itemId,
        durability: 100,
      };
    }

    await this.savePlayerState(userId, playerState);
    return playerState;
  },

  async environmentTick(
    userId: string,
    env: { temperature: number; humidity: number; toxins: number }
  ): Promise<RpgEnvironmentTickResult> {
    const playerState = JSON.parse(JSON.stringify(await this.getPlayerState(userId))) as RpgPlayerState;
    let mutated = false;
    const reactions: any[] = [];

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
      (playerState as any).inventory = { slots: nextSlots };
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
