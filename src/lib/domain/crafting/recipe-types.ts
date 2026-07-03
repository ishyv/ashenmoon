import type { ProcessType, StationId } from "$lib/domain/stations";
import type { ValidItemId } from "$lib/domain/definitions/items";

export type CraftingCategory =
  | "survival"
  | "tools"
  | "medicine"
  | "food"
  | "fuel_fire"
  | "material_processing"
  | "structures"
  | "clothing"
  | "containers"
  | "knowledge";

export type CraftingContextId = "hand" | "campfire" | "placement" | "meat_smoking_rack" | StationId;

/** An alternative material that satisfies a recipe cost slot. */
export interface RecipeCostSubstitute {
  readonly itemId: ValidItemId;
  readonly name: string;
  readonly required: number;
}

/** A single material requirement for a recipe. `itemId` is an inventory slot key. */
export interface RecipeCost {
  readonly itemId: ValidItemId;
  /** Display label for the cost line (HUD copy). */
  readonly name: string;
  readonly required: number;
  /** Alternative materials that satisfy this slot, checked in order when the primary is unavailable. */
  readonly substitutes?: ReadonlyArray<RecipeCostSubstitute>;
}

/** A ranged stat roll for one quality tier, e.g. `{ stat: "damage", min: 50, max: 100 }`. */
export interface TierStatRange {
  readonly stat: string;
  readonly min: number;
  readonly max: number;
}

/** A craftable recipe: consume `costs`, produce `output`. */
export interface CraftRecipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category?: CraftingCategory;
  readonly requiredContext?: CraftingContextId;
  readonly process?: ProcessType;
  readonly durationSec?: number;
  readonly discoverable?: boolean;
  readonly discoveryText?: string;
  readonly feedbackTags?: readonly string[];
  /** When true, crafting requires the player to stand near a lit campfire. */
  readonly requiresCampfire?: boolean;
  readonly costs: readonly RecipeCost[];
  /** What the craft yields. Defaults to one unit of an item sharing the recipe id. */
  readonly output: { readonly itemId: ValidItemId; readonly qty: number };
  /** When true, this recipe's output rolls a quality tier (and possibly a curse) at craft time instead of stacking as a plain qty. */
  readonly tiered?: boolean;
  /** Per-tier stat range overrides, keyed by tier name. Tiers without an entry fall back to the default multiplier formula. */
  readonly tierStatOverrides?: Partial<Record<import("$lib/domain/rpg-types").CraftTier, readonly TierStatRange[]>>;
  /** Which attended-crafting minigame this recipe uses. Derived automatically from `process` when omitted (see minigame-kind.ts). */
  readonly minigameKind?: import("./minigame-kind").MinigameKind;
}

/** Recipe input shape before defaults are applied. */
export type RecipeInput = Omit<CraftRecipe, "category" | "discoverable" | "feedbackTags" | "output"> & {
  readonly category?: CraftingCategory;
  readonly discoverable?: boolean;
  readonly feedbackTags?: readonly string[];
  readonly output?: { readonly itemId: ValidItemId; readonly qty: number };
};
