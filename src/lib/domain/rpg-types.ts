/**
 * Core type definitions for the Ashenmoon standalone RPG engine.
 */

export interface RpgContentSnapshot {
  items: Record<string, unknown>;
  materials: Record<string, unknown>;
  locations: Record<string, unknown>;
  tools: Record<string, unknown>;
  craftingRecipes: Record<string, unknown>;
  processingRecipes: Record<string, unknown>;
}

export interface RpgSkillState {
  level: number;
  xp: number;
  nextXp: number;
}

/** Crafting quality tier rolled at craft time; absent means the item was never tiered (untiered recipe, or pre-feature save). */
export type CraftTier = "sloppy" | "robust" | "pristine" | "masterwork" | "fable" | "divine";

/** Per-instance data rolled onto a tiered craft. All optional: untiered items carry none of this. */
export interface RpgItemInstanceTierData {
  tier?: CraftTier;
  /** Per-stat rolled values, e.g. `{ damage: 62 }`. Stored this phase; combat/gathering math does not read it yet. */
  rolledStats?: Record<string, number>;
  cursed?: boolean;
  /** 1..N, only meaningful when `cursed` is true. */
  curseLevel?: number;
  curseEffectIds?: readonly string[];
  /** Key into the hand-authored Divine outcome pool; only set when `tier === "divine"`. */
  divineId?: string;
}

export interface RpgDurableEquipment extends RpgItemInstanceTierData {
  instanceId: string;
  itemId: string;
  durability: number;
}

export type RpgWeaponSlot = RpgDurableEquipment | string | null;
export type RpgEquipmentSlot = RpgDurableEquipment | string | null;
export interface RpgItemInstance extends RpgItemInstanceTierData {
  instanceId: string;
  durability: number;
}
export type RpgInventorySlot =
  | { qty: number }
  | {
      instances: RpgItemInstance[];
    };

export interface RpgPlayerState {
  profile: {
    hpCurrent: number;
    /** character level 1..18; absent on old saves, read with ?? 1. */
    characterLevel?: number;
    /** xp toward the next character level; absent on old saves, read with ?? 0. */
    characterXp?: number;
    /** seed used to generate the world map layout; generated on new game. */
    worldSeed?: number;
    stashSize: number;
    loadout: {
      weapon: RpgWeaponSlot;
      shield: RpgEquipmentSlot;
      helmet: RpgEquipmentSlot;
      chest: RpgEquipmentSlot;
      pants: RpgEquipmentSlot;
      boots: RpgEquipmentSlot;
      ring: RpgEquipmentSlot;
      necklace: RpgEquipmentSlot;
    };
    buildings?: {
      id: string;
      type: string;
      x: number;
      y: number;
      sourceItemId?: string;
      stage?: number;
    }[];
    worldEntities?: RpgWorldEntity[];
    gatheredPickups?: string[];
    depletedNodes?: Record<string, number>;
    hotbar?: (string | null)[]; // ItemId[] length 9, null = empty slot
  };
  inventory: {
    slots: Record<string, RpgInventorySlot>;
  };
  skills: {
    lumberjacking: RpgSkillState;
    mining: RpgSkillState;
    evade: RpgSkillState;
    combat?: RpgSkillState;
    fellSweep?: RpgSkillState;
    kiteCombo?: RpgSkillState;
    vigilance?: RpgSkillState;
    woodcraft?: RpgSkillState;
    craftsmanship?: RpgSkillState;
  };
  runSettings?: {
    deathMode: string;
  };
}

export type RpgWorldEntity =
  | {
      id: string;
      kind: "placed_item";
      itemId: string;
      x: number;
      y: number;
      quantity: number;
    };

export interface RpgGatherResult {
  userId: string;
  locationId: string;
  locationName: string;
  tier: number;
  toolId: string;
  materialsGained: { id: string; quantity: number }[];
  remainingDurability: number;
  toolBroken: boolean;
  playerState: RpgPlayerState;
}

/** Describes a single triggered reaction event in the player environment. */
export interface RpgReactionTriggered {
  itemId: string;
  event: "ignited" | "melted" | "rotted";
  resultItemId: string;
  quantity: number;
  equippedSlot?: string;
}

/** State payload returned after processing an environmental tick. */
export interface RpgEnvironmentTickResult {
  mutated: boolean;
  reactions: RpgReactionTriggered[];
  playerState: RpgPlayerState;
}
