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

/** A single material requirement for a recipe. `itemId` is an inventory slot key. */
export interface RecipeCost {
  readonly itemId: ValidItemId;
  /** Display label for the cost line (HUD copy). */
  readonly name: string;
  readonly required: number;
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
}

/** Recipe input shape before defaults are applied. */
export type RecipeInput = Omit<CraftRecipe, "category" | "discoverable" | "feedbackTags" | "output"> & {
  readonly category?: CraftingCategory;
  readonly discoverable?: boolean;
  readonly feedbackTags?: readonly string[];
  readonly output?: { readonly itemId: ValidItemId; readonly qty: number };
};
