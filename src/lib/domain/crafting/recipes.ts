/**
 * Crafting recipe definitions, the single source of truth for what can be
 * crafted, what it costs, and what it yields. Both the crafting UI (preview) and
 * the local RPG command layer (execution) reads from here via crafting-system.ts.
 *
 * Pure data + validation. No Svelte, no Pixi, no network.
 */
import { Category, ITEM_DEFINITIONS } from "$lib/domain/items";
import { allRecipes } from "$lib/domain/definitions/recipes";
import type { ValidItemId } from "$lib/domain/definitions/items";
import type {
  CraftRecipe,
  RecipeInput,
  CraftingCategory,
  CraftingContextId,
  RecipeCost,
} from "./recipe-types";

export type {
  CraftRecipe,
  RecipeInput,
  CraftingCategory,
  CraftingContextId,
  RecipeCost,
};

/**
 * Output item categories that default to quality-tier crafting. A recipe's
 * `tiered` is derived from this unless explicitly set — so a new weapon or
 * tool recipe automatically gets Phase 1's quality-tier + curse roll without
 * anyone having to remember to flag it. Extend as new tiered categories are
 * designed; a recipe can always override with an explicit `tiered` either
 * direction (e.g. a simple utility tool that shouldn't feel like gear).
 */
const TIERED_CATEGORY_ALLOWLIST: ReadonlySet<Category> = new Set([Category.Weapon, Category.Tool]);

function deriveTiered(recipe: RecipeInput, output: { itemId: ValidItemId; qty: number }): boolean {
  if (recipe.tiered !== undefined) return recipe.tiered;
  const outputDef = ITEM_DEFINITIONS[output.itemId];
  return !!outputDef && TIERED_CATEGORY_ALLOWLIST.has(outputDef.category);
}

function withDefaults(recipe: RecipeInput): CraftRecipe {
  const output = recipe.output ?? { itemId: recipe.id as ValidItemId, qty: 1 };
  return {
    ...recipe,
    category: recipe.category ?? "material_processing",
    requiredContext: recipe.requiredContext ?? (recipe.requiresCampfire ? "campfire" : "hand"),
    discoverable: recipe.discoverable ?? true,
    feedbackTags: recipe.feedbackTags ?? [],
    output,
    tiered: deriveTiered(recipe, output),
  };
}

/** All craftable recipes, ordered for HUD display. */
export const CRAFT_RECIPES: readonly CraftRecipe[] = allRecipes.map(withDefaults);

/** Recipe lookup by id. */
export const CRAFT_RECIPES_BY_ID: Readonly<Record<string, CraftRecipe>> =
  Object.fromEntries(CRAFT_RECIPES.map((r) => [r.id, r]));

/** Returns a recipe by id, or null if unknown. */
export function getRecipe(recipeId: string): CraftRecipe | null {
  return CRAFT_RECIPES_BY_ID[recipeId] ?? null;
}

/**
 * Structural + referential validation for the recipe set. Returns a list of
 * human-readable problems; empty means valid. Cross-checks every cost and
 * output itemId against the item registry so authored content cannot reference
 * a non-existent item.
 */
export function validateCraftRecipes(
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
  knownItemIds: ReadonlySet<string> = new Set(Object.keys(ITEM_DEFINITIONS)),
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const recipe of recipes) {
    if (seen.has(recipe.id)) {
      problems.push(`duplicate recipe id: ${recipe.id}`);
    }
    seen.add(recipe.id);

    if (recipe.costs.length === 0) {
      problems.push(`recipe ${recipe.id} has no costs`);
    }
    for (const cost of recipe.costs) {
      if (cost.required <= 0) {
        problems.push(`recipe ${recipe.id} cost ${cost.itemId} must be > 0`);
      }
      if (!knownItemIds.has(cost.itemId)) {
        problems.push(`recipe ${recipe.id} cost references unknown item: ${cost.itemId}`);
      }
    }

    if (recipe.output.qty <= 0) {
      problems.push(`recipe ${recipe.id} output qty must be > 0`);
    }
    if (!knownItemIds.has(recipe.output.itemId)) {
      problems.push(`recipe ${recipe.id} output references unknown item: ${recipe.output.itemId}`);
    }

    // A hand-craftable recipe is always instant — there's no attended minigame to play,
    // so a tiered recipe left on "hand" can never reach Fable/Divine, permanently.
    if (recipe.tiered && recipe.requiredContext === "hand") {
      problems.push(
        `recipe ${recipe.id} is tiered but requiredContext is "hand" — Fable/Divine are permanently unreachable; move it to a station or set tiered: false`,
      );
    }
  }

  return problems;
}

/** Throws if the recipe set is invalid. Intended for boot/test boundaries. */
export function assertValidCraftRecipes(
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): void {
  const problems = validateCraftRecipes(recipes);
  if (problems.length > 0) {
    throw new Error(`invalid craft recipes:\n- ${problems.join("\n- ")}`);
  }
}

/** Recipes the player has unlocked. */
export function listKnownRecipes(
  knownRecipeIds: ReadonlySet<string>,
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): CraftRecipe[] {
  return recipes.filter((r) => knownRecipeIds.has(r.id));
}

/** Whether a recipe id is unlocked. */
export function isRecipeKnown(knownRecipeIds: ReadonlySet<string>, recipeId: string): boolean {
  return knownRecipeIds.has(recipeId);
}
