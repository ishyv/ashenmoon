/**
 * Crafting recipe definitions, the single source of truth for what can be
 * crafted, what it costs, and what it yields. Both the crafting UI (preview) and
 * the local RPG command layer (execution) reads from here via crafting-system.ts.
 *
 * Pure data + validation. No Svelte, no Pixi, no network.
 */
import { ITEM_DEFINITIONS } from "$lib/domain/items";
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

function withDefaults(recipe: RecipeInput): CraftRecipe {
  return {
    ...recipe,
    category: recipe.category ?? "material_processing",
    requiredContext: recipe.requiredContext ?? (recipe.requiresCampfire ? "campfire" : "hand"),
    discoverable: recipe.discoverable ?? true,
    feedbackTags: recipe.feedbackTags ?? [],
    output: recipe.output ?? { itemId: recipe.id as ValidItemId, qty: 1 },
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
