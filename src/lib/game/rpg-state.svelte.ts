import type { RpgPlayerState } from "$shared/bridge-types";
import { StorageKeys } from "./game-events";

export interface RpgState {
  profile: RpgPlayerState["profile"] | null;
  inventory: RpgPlayerState["inventory"] | null;
  skills: RpgPlayerState["skills"] | null;
}

export const rpgState = $state<RpgState>({
  profile: null,
  inventory: null,
  skills: null,
});

type WeaponSlot = RpgPlayerState["profile"]["loadout"]["weapon"];

/**
 * Fresh baseline skills (all level 1). A factory, not a shared constant, so two
 * profiles never alias the same skill sub-objects.
 */
export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    superGather: { level: 1, xp: 0, nextXp: 100 },
  };
}

/** Minimal profile stub used by dev helpers before a real profile loads. */
export function createDefaultProfile(opts?: {
  hpCurrent?: number;
  weapon?: WeaponSlot;
}): RpgPlayerState["profile"] {
  return {
    hpCurrent: opts?.hpCurrent ?? 100,
    stashSize: 20,
    loadout: {
      weapon: opts?.weapon ?? null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
  };
}

export const activeEnvironment = $state<{ temperature: number; humidity: number; toxins: number }>({
  temperature: 20,
  humidity: 40,
  toxins: 0,
});

export function setRpgState(state: RpgPlayerState | null): void {
  if (!state) return;
  rpgState.profile = state.profile;
  rpgState.inventory = state.inventory;
  rpgState.skills = state.skills ?? createDefaultSkills();
}

export interface UiPreferences {
  minimalHud: boolean;
  dynamicEnvironment: boolean;
  equipOnlyWithStash: boolean;
}

export const cooldownsState = $state<{ evade: number; evadeMax: number; superGather: number; superGatherMax: number }>({
  evade: 0,
  evadeMax: 1,
  superGather: 0,
  superGatherMax: 2,
});

export const debugConfig = $state<{ zeroCooldowns: boolean }>({
  zeroCooldowns: false,
});

export const uiPreferences = $state<UiPreferences>({
  minimalHud: true,
  dynamicEnvironment: true,
  equipOnlyWithStash: true,
});

export function loadUiPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(StorageKeys.uiPreferences);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.minimalHud === "boolean") uiPreferences.minimalHud = parsed.minimalHud;
        if (typeof parsed.dynamicEnvironment === "boolean")
          uiPreferences.dynamicEnvironment = parsed.dynamicEnvironment;
        if (typeof parsed.equipOnlyWithStash === "boolean")
          uiPreferences.equipOnlyWithStash = parsed.equipOnlyWithStash;
      }
    }
  } catch (e) {
    console.error("Failed to load UI preferences:", e);
  }
}

export function saveUiPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.uiPreferences, JSON.stringify(uiPreferences));
  } catch (e) {
    console.error("Failed to save UI preferences:", e);
  }
}

export interface ItemMetadata {
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  category: "mineral" | "timber" | "tool" | "component" | "herb" | "reagent";
  flammable?: { ignitionTemp: number; burnDurationSec: number; transformsInto: string };
  temperatureSensitive?: {
    maxSafeTemp: number;
    minSafeTemp: number;
    onExceeded: "melt" | "spoil" | "ignite";
    transformsInto?: string;
  };
  decayable?: { lifespanSec: number; transformsInto: string };
}

// ---------------------------------------------------------------------------
// Dev helpers — manipulate local rpgState without hitting the server
// ---------------------------------------------------------------------------

/** Force-equip a weapon by item ID. Creates a minimal profile stub if none loaded yet. */
export function devEquip(itemId: string | null): void {
  const weapon = itemId
    ? { instanceId: `dev_${Date.now()}`, itemId, durability: 100 }
    : null;
  if (!rpgState.skills) {
    rpgState.skills = createDefaultSkills();
  }
  if (rpgState.profile) {
    rpgState.profile = {
      ...rpgState.profile,
      loadout: { ...rpgState.profile.loadout, weapon },
    };
  } else {
    rpgState.profile = createDefaultProfile({ weapon });
  }
}

/** Add items directly to the local inventory (stackable items only; tools use qty=1 per instance). */
export function devGiveItem(itemId: string, qty: number): void {
  const existing = rpgState.inventory?.slots[itemId];
  const current = existing && "qty" in existing ? existing.qty : 0;
  rpgState.inventory = {
    slots: {
      ...(rpgState.inventory?.slots ?? {}),
      [itemId]: { qty: current + qty },
    },
  };
}

/** Deduct items directly from the local inventory (stackable items). Returns true if successful. */
export function devDeductItem(itemId: string, qty: number): boolean {
  if (!rpgState.inventory) return false;
  const existing = rpgState.inventory.slots[itemId];
  if (!existing || !("qty" in existing)) return false;
  if (existing.qty < qty) return false;

  const newQty = existing.qty - qty;
  const newSlots = { ...rpgState.inventory.slots };
  if (newQty <= 0) {
    delete newSlots[itemId];
  } else {
    newSlots[itemId] = { qty: newQty };
  }
  rpgState.inventory = { slots: newSlots };
  return true;
}

/** Set HP directly on the local profile stub (creates profile if absent). */
export function devSetHp(hp: number): void {
  if (!rpgState.skills) {
    rpgState.skills = createDefaultSkills();
  }
  if (rpgState.profile) {
    rpgState.profile = { ...rpgState.profile, hpCurrent: hp };
  } else {
    rpgState.profile = createDefaultProfile({ hpCurrent: hp });
  }
}

export const ITEM_METADATA: Record<string, ItemMetadata> = {
  stone: {
    name: "Stone",
    description: "A raw chunk of stone. Rough and heavy.",
    rarity: "common",
    category: "mineral",
  },
  copper_ore: {
    name: "Copper Ore",
    description: "Veins of copper running through rock.",
    rarity: "common",
    category: "mineral",
  },
  iron_ore: {
    name: "Iron Ore",
    description: "Deep-vein iron with crystalline structure.",
    rarity: "uncommon",
    category: "mineral",
  },
  silver_ore: {
    name: "Silver Ore",
    description: "Shining silver ore, cool to the touch.",
    rarity: "rare",
    category: "mineral",
  },
  oak_wood: {
    name: "Oak Wood",
    description: "A sturdy log of raw oak timber.",
    rarity: "common",
    category: "timber",
    flammable: { ignitionTemp: 120, burnDurationSec: 15, transformsInto: "charcoal" },
  },
  spruce_wood: {
    name: "Spruce Wood",
    description: "Softwood log, smells of mountain pine.",
    rarity: "uncommon",
    category: "timber",
  },
  palm_wood: {
    name: "Palm Wood",
    description: "Fibrous timber from tropical shores.",
    rarity: "rare",
    category: "timber",
  },
  pine_wood: {
    name: "Pine Wood",
    description: "Dense hardwood from ancient pinelands.",
    rarity: "legendary",
    category: "timber",
  },
  stone_block: {
    name: "Stone Block",
    description: "Refined block of cut stone.",
    rarity: "common",
    category: "component",
  },
  copper_ingot: {
    name: "Copper Ingot",
    description: "A pure bar of smelted copper.",
    rarity: "common",
    category: "component",
  },
  iron_ingot: {
    name: "Iron Ingot",
    description: "A solid bar of refined iron.",
    rarity: "uncommon",
    category: "component",
  },
  silver_ingot: {
    name: "Silver Ingot",
    description: "A glistening bar of sterling silver.",
    rarity: "rare",
    category: "component",
  },
  oak_plank: {
    name: "Oak Plank",
    description: "Smooth plank of sawed oak wood.",
    rarity: "common",
    category: "component",
  },
  spruce_plank: {
    name: "Spruce Plank",
    description: "Clean plank of sawed spruce wood.",
    rarity: "uncommon",
    category: "component",
  },
  palm_plank: {
    name: "Palm Plank",
    description: "Flexible plank of sawed palm wood.",
    rarity: "rare",
    category: "component",
  },
  pine_plank: {
    name: "Pine Plank",
    description: "Resilient plank of sawed pine wood.",
    rarity: "legendary",
    category: "component",
  },
  starter_pickaxe: {
    name: "Starter Pickaxe",
    description: "A tired pickaxe with a worn iron head.",
    rarity: "common",
    category: "tool",
  },
  starter_axe: {
    name: "Starter Axe",
    description: "A simple hand axe with a notched blade.",
    rarity: "common",
    category: "tool",
  },
  stone_pickaxe: {
    name: "Stone Pickaxe",
    description: "A pickaxe bound with flint and twine.",
    rarity: "uncommon",
    category: "tool",
  },
  stone_axe: {
    name: "Stone Axe",
    description: "A heavy axe with a polished stone head.",
    rarity: "uncommon",
    category: "tool",
  },
  flint_pickaxe: {
    name: "Flint Pickaxe",
    description: "A pickaxe bound with flint and twine.",
    rarity: "uncommon",
    category: "tool",
  },
  flint_axe: {
    name: "Flint Axe",
    description: "A simple axe made of sharp flint stone and wood.",
    rarity: "uncommon",
    category: "tool",
  },
  copper_pickaxe: {
    name: "Copper Pickaxe",
    description: "Malleable copper pickaxe. Gleams brightly.",
    rarity: "rare",
    category: "tool",
  },
  copper_axe: {
    name: "Copper Axe",
    description: "A copper woodsman axe with a sharp edge.",
    rarity: "rare",
    category: "tool",
  },
  iron_pickaxe: {
    name: "Iron Pickaxe",
    description: "A heavy, professional iron mining tool.",
    rarity: "legendary",
    category: "tool",
  },
  iron_axe: {
    name: "Iron Axe",
    description: "Tempered iron head on a sturdy oak shaft.",
    rarity: "legendary",
    category: "tool",
  },

  // Environment test items
  ice_block: {
    name: "Ice Block",
    description: "A solid, freezing block of glacial ice. Melts rapidly in warm areas.",
    rarity: "uncommon",
    category: "mineral",
    temperatureSensitive: {
      maxSafeTemp: 0,
      minSafeTemp: -100,
      onExceeded: "melt",
      transformsInto: "clean_water",
    },
  },
  ghost_lily: {
    name: "Ghost Lily",
    description: "Translucent white flower found near Blight zones. Wilts within hours of picking.",
    rarity: "rare",
    category: "herb",
    decayable: { lifespanSec: 60, transformsInto: "volatile_ash" },
  },
  charcoal: {
    name: "Charcoal",
    description: "Slow-burned wood. Hotter and cleaner than coal.",
    rarity: "common",
    category: "component",
  },
  volatile_ash: {
    name: "Volatile Ash",
    description: "Grey, inert ash residue from failed Crucible synthesis or decay.",
    rarity: "common",
    category: "reagent",
  },
  clean_water: {
    name: "Clean Water",
    description: "Water that has been boiled and condensed to remove essence taint.",
    rarity: "common",
    category: "component",
  },
};



