import { CRAFT_RECIPES, type CraftRecipe } from "./recipes";
import type { CraftInputs } from "./experimental";

export interface ResonanceReading {
  nearestRecipeId: string | null;
  score: number;
  correctIdFraction: number;
  quantityProximity: number;
  foreignPenalty: number;
  exact: boolean;
  flags: {
    needsMoreIngredients: boolean;
    hasForeignElement: boolean;
    needMoreQuantity: boolean;
    exact: boolean;
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function presentIds(inputs: CraftInputs): string[] {
  return Object.keys(inputs).filter((id) => (inputs[id] ?? 0) > 0);
}

function findNearest(
  present: string[],
  recipes: readonly CraftRecipe[],
): CraftRecipe | null {
  if (present.length === 0) return null;
  const presentSet = new Set(present);
  let best: CraftRecipe | null = null;
  let bestOverlap = 0;
  let bestCostSize = Infinity;

  for (const recipe of recipes) {
    const costIds = recipe.costs.map((c) => c.itemId);
    const overlap = costIds.filter((id) => presentSet.has(id)).length;
    if (overlap === 0) continue;
    if (
      overlap > bestOverlap ||
      (overlap === bestOverlap && costIds.length < bestCostSize)
    ) {
      bestOverlap = overlap;
      bestCostSize = costIds.length;
      best = recipe;
    }
  }
  return best;
}

export function readResonance(
  inputs: CraftInputs,
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
  _knownRecipeIds?: ReadonlySet<string>,
): ResonanceReading {
  const present = presentIds(inputs);

  if (present.length === 0) {
    return {
      nearestRecipeId: null,
      score: 0,
      correctIdFraction: 0,
      quantityProximity: 1,
      foreignPenalty: 0,
      exact: false,
      flags: { needsMoreIngredients: false, hasForeignElement: false, needMoreQuantity: false, exact: false },
    };
  }

  const nearest = findNearest(present, recipes);

  if (!nearest) {
    return {
      nearestRecipeId: null,
      score: 0,
      correctIdFraction: 0,
      quantityProximity: 1,
      foreignPenalty: 1,
      exact: false,
      flags: { needsMoreIngredients: false, hasForeignElement: true, needMoreQuantity: false, exact: false },
    };
  }

  const costIds = nearest.costs.map((c) => c.itemId);
  const costSet = new Set<string>(costIds);
  const presentSet = new Set(present);

  const correctPresent = costIds.filter((id) => presentSet.has(id));
  const correctIdFraction = correctPresent.length / costIds.length;
  const foreignPenalty = present.filter((id) => !costSet.has(id)).length / present.length;

  const quantityProximity =
    correctPresent.length === 0
      ? 1
      : correctPresent.reduce((sum, id) => {
          const cost = nearest.costs.find((c) => c.itemId === id)!;
          return sum + Math.min(1, (inputs[id] ?? 0) / cost.required);
        }, 0) / correctPresent.length;

  // exact: same id set, every required qty met, no foreign
  const sameSet =
    costIds.length === present.length && costIds.every((id) => presentSet.has(id));
  const enough = nearest.costs.every((c) => (inputs[c.itemId] ?? 0) >= c.required);
  const exact = sameSet && enough;

  const qtyWeighted = correctIdFraction === 0 ? 0 : quantityProximity;
  const score = exact
    ? 1
    : clamp01(0.5 * correctIdFraction + 0.3 * qtyWeighted + 0.2 * (1 - foreignPenalty));

  const missingIds = costIds.filter((id) => !presentSet.has(id));

  return {
    nearestRecipeId: nearest.id,
    score,
    correctIdFraction,
    quantityProximity,
    foreignPenalty,
    exact,
    flags: {
      needsMoreIngredients: missingIds.length > 0,
      hasForeignElement: foreignPenalty > 0,
      needMoreQuantity: !exact && correctIdFraction === 1 && quantityProximity < 1,
      exact,
    },
  };
}
