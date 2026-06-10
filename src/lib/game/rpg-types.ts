/**
 * Core type definitions for the Ashenmoon standalone RPG engine.
 */

export interface RpgContentSnapshot {
  readonly items: Readonly<Record<string, unknown>>;
  readonly materials: Readonly<Record<string, unknown>>;
  readonly locations: Readonly<Record<string, unknown>>;
  readonly tools: Readonly<Record<string, unknown>>;
  readonly craftingRecipes: Readonly<Record<string, unknown>>;
  readonly processingRecipes: Readonly<Record<string, unknown>>;
}

export interface RpgSkillState {
  readonly level: number;
  readonly xp: number;
  readonly nextXp: number;
}

export interface RpgPlayerState {
  readonly profile: {
    readonly hpCurrent: number;
    readonly stashSize: number;
    readonly loadout: {
      readonly weapon:
        | {
            readonly instanceId: string;
            readonly itemId: string;
            readonly durability: number;
          }
        | string
        | null;
      readonly shield: any;
      readonly helmet: any;
      readonly chest: any;
      readonly pants: any;
      readonly boots: any;
      readonly ring: any;
      readonly necklace: any;
    };
    readonly buildings?: readonly {
      readonly id: string;
      readonly type: string;
      readonly x: number;
      readonly y: number;
    }[];
    readonly gatheredPickups?: readonly string[];
  };
  readonly inventory: {
    readonly slots: Record<
      string,
      | { readonly qty: number }
      | {
          readonly instances: readonly {
            readonly instanceId: string;
            readonly durability: number;
          }[];
        }
    >;
  };
  readonly skills: {
    readonly lumberjacking: RpgSkillState;
    readonly mining: RpgSkillState;
    readonly evade: RpgSkillState;
    readonly superGather: RpgSkillState;
  };
}

export interface RpgGatherResult {
  readonly userId: string;
  readonly locationId: string;
  readonly locationName: string;
  readonly tier: number;
  readonly toolId: string;
  readonly materialsGained: readonly { readonly id: string; readonly quantity: number }[];
  readonly remainingDurability: number;
  readonly toolBroken: boolean;
  readonly playerState: RpgPlayerState;
}

/** Describes a single triggered reaction event in the player environment. */
export interface RpgReactionTriggered {
  readonly itemId: string;
  readonly event: "ignited" | "melted" | "rotted";
  readonly resultItemId: string;
  readonly quantity: number;
  readonly equippedSlot?: string;
}

/** State payload returned after processing an environmental tick. */
export interface RpgEnvironmentTickResult {
  readonly mutated: boolean;
  readonly reactions: readonly RpgReactionTriggered[];
  readonly playerState: RpgPlayerState;
}
