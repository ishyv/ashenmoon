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

export interface RpgDurableEquipment {
  instanceId: string;
  itemId: string;
  durability: number;
}

export type RpgWeaponSlot = RpgDurableEquipment | string | null;
export type RpgEquipmentSlot = RpgDurableEquipment | string | null;
export type RpgInventorySlot =
  | { qty: number }
  | {
      instances: {
        instanceId: string;
        durability: number;
      }[];
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
    gatheredPickups?: string[];
  };
  inventory: {
    slots: Record<string, RpgInventorySlot>;
  };
  skills: {
    lumberjacking: RpgSkillState;
    mining: RpgSkillState;
    evade: RpgSkillState;
    fellSweep?: RpgSkillState;
    kiteCombo?: RpgSkillState;
  };
  runSettings?: {
    deathMode: string;
  };
}

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
