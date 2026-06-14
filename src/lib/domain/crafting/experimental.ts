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
    if (inputIds.some((id) => (costIds as readonly string[]).includes(id))) {
      partial.push(recipe);
    }
  }

  return { recipe: exact, partial };
}

import type { RpgInventorySlot } from "$lib/domain/rpg-types";
import { getMaterialQty } from "./crafting-system";

export type ExperimentResult =
  | { readonly ok: true; readonly recipe: CraftRecipe; readonly slots: CraftSlots }
  | { readonly ok: false; readonly reason: "no_match"; readonly slots: CraftSlots }
  | { readonly ok: false; readonly reason: "requires_campfire" | "insufficient_materials"; readonly slots?: CraftSlots };

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
  if (!recipe) {
    // Verify player actually has the ingredients in slots
    const missing = Object.entries(inputs)
      .map(([itemId, required]) => ({ itemId, required, have: getMaterialQty(slots, itemId) }))
      .filter((c) => c.have < c.required);

    if (missing.length > 0) {
      return { ok: false, reason: "insufficient_materials" };
    }

    // Mismatch penalty: consume materials
    const next: Record<string, RpgInventorySlot> = { ...slots };
    for (const [itemId, required] of Object.entries(inputs)) {
      const remaining = getMaterialQty(next, itemId) - required;
      if (remaining <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = { qty: remaining };
      }
    }

    // Add byproduct
    const byproductId = ctx.isNearCampfire ? "charred_ash" : "foul_sludge";
    const currentQty = getMaterialQty(next, byproductId);
    next[byproductId] = { qty: currentQty + 1 };

    return { ok: false, reason: "no_match", slots: next };
  }

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

/**
 * Generates vague but useful feedback when an experimental combination fails.
 * If there are partial recipes, gives a hint about how close they are.
 */
export function getExperimentHint(
  inputs: CraftInputs,
  partials: readonly CraftRecipe[]
): string {
  if (partials.length === 0) {
    return "nothing useful happens.";
  }

  let bestRecipe: CraftRecipe | null = null;
  let maxShared = 0;
  const inputKeys = Object.keys(inputs).filter((k) => (inputs[k] ?? 0) > 0);

  for (const recipe of partials) {
    const costIds = recipe.costs.map((c) => c.itemId);
    const shared = costIds.filter((id) => inputKeys.includes(id)).length;
    if (shared > maxShared) {
      maxShared = shared;
      bestRecipe = recipe;
    }
  }

  if (bestRecipe && maxShared > 0) {
    const costIds = bestRecipe.costs.map((c) => c.itemId);
    const extraItems = inputKeys.filter((id) => !(costIds as readonly string[]).includes(id));
    const missingItems = costIds.filter((id) => !inputKeys.includes(id));

    if (extraItems.length > 0 && missingItems.length === 0) {
      return "something is close, but there are extra ingredients clashing.";
    }
    if (extraItems.length === 0 && missingItems.length > 0) {
      return `you feel a faint resonance. maybe you need ${missingItems.length} more ingredient${missingItems.length > 1 ? "s" : ""}?`;
    }
    if (extraItems.length > 0 && missingItems.length > 0) {
      return "some ingredients seem right, but the balance is off.";
    }
    const wrongQty = bestRecipe.costs.some(
      (c) => (inputs[c.itemId] ?? 0) < c.required
    );
    if (wrongQty) {
      return "the ingredients are right, but you need more of them.";
    }
  }

  return "something is close, but the mix is wrong.";
}

export interface ResonanceAnalysis {
  readonly level: 0 | 1 | 2 | 3;
  readonly relevantItemIds: ReadonlySet<string>;
  readonly partialCount: number;
  readonly hint: string;
  readonly outputCategory?: string;
}

const CATEGORY_LABELS: Partial<Record<string, string>> = {
  tools: "tool",
  structures: "structure",
  clothing: "clothing",
  medicine: "medicine",
  food: "food",
  fuel_fire: "fuel",
  material_processing: "material",
  survival: "survival",
};

export function analyzeResonance(
  inputs: CraftInputs,
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): ResonanceAnalysis {
  const inputIds = presentIds(inputs);

  if (inputIds.length === 0) {
    return { level: 0, relevantItemIds: new Set(), partialCount: 0, hint: "the mixture is inert." };
  }

  // Find all recipes that share at least one ingredient with the current inputs.
  const partials: CraftRecipe[] = [];
  for (const recipe of recipes) {
    const costIds = recipe.costs.map((c) => c.itemId);
    if (inputIds.some((id) => (costIds as readonly string[]).includes(id))) {
      partials.push(recipe);
    }
  }

  if (partials.length === 0) {
    return { level: 0, relevantItemIds: new Set(), partialCount: 0, hint: "the mixture is inert." };
  }

  // Build the set of ingredient IDs that appear in any partial match.
  const relevantItemIds = new Set<string>();
  for (const recipe of partials) {
    for (const c of recipe.costs) relevantItemIds.add(c.itemId);
  }

  // Find best partial: fewest extra + missing ingredients.
  let bestRecipe: CraftRecipe | null = null;
  let bestScore = Infinity;
  for (const recipe of partials) {
    const costIds = recipe.costs.map((c) => c.itemId);
    const extra = inputIds.filter((id) => !(costIds as readonly string[]).includes(id)).length;
    const missing = costIds.filter((id) => !inputIds.includes(id)).length;
    const score = extra + missing;
    if (score < bestScore) {
      bestScore = score;
      bestRecipe = recipe;
    }
  }

  if (!bestRecipe) {
    return { level: 1, relevantItemIds, partialCount: partials.length, hint: "something stirs." };
  }

  const costIds = bestRecipe.costs.map((c) => c.itemId);
  const extra = inputIds.filter((id) => !(costIds as readonly string[]).includes(id)).length;
  const missing = costIds.filter((id) => !inputIds.includes(id)).length;
  const wrongQty = bestRecipe.costs.some((c) => (inputs[c.itemId] ?? 0) < c.required);

  // Level 3: right ingredient IDs, only quantities off.
  if (extra === 0 && missing === 0 && wrongQty) {
    const cat = CATEGORY_LABELS[bestRecipe.category ?? ""] ?? bestRecipe.category;
    return {
      level: 3 as const,
      relevantItemIds,
      partialCount: partials.length,
      hint: "the pattern is clear. add more to complete it.",
      ...(cat !== undefined ? { outputCategory: cat } : {}),
    };
  }

  // Level 2: no extra items, all placed belong to a recipe — just need more.
  if (extra === 0 && missing > 0) {
    const n = missing;
    const cat = CATEGORY_LABELS[bestRecipe.category ?? ""] ?? bestRecipe.category;
    return {
      level: 2 as const,
      relevantItemIds,
      partialCount: partials.length,
      hint: `you feel resonance. ${n} more ingredient${n > 1 ? "s" : ""} needed.`,
      ...(cat !== undefined ? { outputCategory: cat } : {}),
    };
  }

  // Level 1: has extra or mismatched items.
  return {
    level: 1,
    relevantItemIds,
    partialCount: partials.length,
    hint: "something stirs. not all ingredients belong together.",
  };
}
