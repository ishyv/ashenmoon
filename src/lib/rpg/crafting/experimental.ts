/**
 * Two crafting modes (doc §6):
 *  - Known-recipe mode: the player picks from recipes they have unlocked.
 *  - Experimental mode: the player throws an arbitrary set of ingredients
 *    together; if it matches a hidden recipe it resolves (and is discovered),
 *    otherwise they get a hint about near-misses.
 *
 * Pure: matching and resolution never mutate inputs. Execution reuses the
 * validated `resolveCraft` so material/campfire checks stay in one place.
 */
import { CRAFT_RECIPES, type CraftRecipe } from "./recipes";
import { resolveCraft, type CraftContext, type CraftSlots } from "./crafting-system";

/** Ingredient set offered to the crucible: item id -> quantity offered. */
export type CraftInputs = Readonly<Record<string, number>>;

export interface ExperimentMatch {
  /** The recipe whose ingredient set the inputs satisfy exactly, if any. */
  readonly recipe: CraftRecipe | null;
  /** Recipes that share at least one ingredient (near-misses for hints). */
  readonly partial: readonly CraftRecipe[];
}

function presentIds(inputs: CraftInputs): string[] {
  return Object.keys(inputs).filter((id) => (inputs[id] ?? 0) > 0);
}

/**
 * Match an arbitrary ingredient set against the recipe book. An exact match
 * requires the same set of ingredient ids and enough of each.
 */
export function matchExperiment(
  inputs: CraftInputs,
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): ExperimentMatch {
  const inputIds = presentIds(inputs);
  let exact: CraftRecipe | null = null;
  const partial: CraftRecipe[] = [];

  for (const recipe of recipes) {
    const costIds = recipe.costs.map((c) => c.itemId);
    const sameSet =
      costIds.length === inputIds.length && costIds.every((id) => inputIds.includes(id));
    const enough = recipe.costs.every((c) => (inputs[c.itemId] ?? 0) >= c.required);

    if (sameSet && enough) {
      exact = recipe;
      break;
    }
    if (inputIds.some((id) => costIds.includes(id))) {
      partial.push(recipe);
    }
  }

  return { recipe: exact, partial };
}

export type ExperimentResult =
  | { readonly ok: true; readonly recipe: CraftRecipe; readonly slots: CraftSlots }
  | { readonly ok: false; readonly reason: "no_match" | "requires_campfire" | "insufficient_materials" };

/**
 * Attempt an experimental craft from `inputs`, drawing the actual materials from
 * `slots`. On a match it resolves via the standard craft path (so campfire and
 * inventory checks apply) and returns the discovered recipe.
 */
export function resolveExperiment(
  slots: CraftSlots,
  inputs: CraftInputs,
  ctx: CraftContext,
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): ExperimentResult {
  const { recipe } = matchExperiment(inputs, recipes);
  if (!recipe) return { ok: false, reason: "no_match" };

  const result = resolveCraft(slots, recipe.id, ctx);
  if (!result.ok) {
    const reason = result.reason === "requires_campfire" ? "requires_campfire" : "insufficient_materials";
    return { ok: false, reason };
  }
  return { ok: true, recipe, slots: result.slots };
}

/** Recipes the player has unlocked, for known-recipe mode. */
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
