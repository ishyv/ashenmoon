export interface RecipeHistoryState {
  readonly entries: readonly string[];
  readonly index: number;
}

export const EMPTY_RECIPE_HISTORY: RecipeHistoryState = {
  entries: [],
  index: -1,
};

export function selectRecipeInHistory(
  state: RecipeHistoryState,
  recipeId: string,
): RecipeHistoryState {
  if (state.entries[state.index] === recipeId) return state;

  const previousEntries = state.index >= 0 ? state.entries.slice(0, state.index + 1) : [];
  return {
    entries: [...previousEntries, recipeId],
    index: previousEntries.length,
  };
}

export function stepRecipeHistory(
  state: RecipeHistoryState,
  direction: -1 | 1,
): RecipeHistoryState {
  const nextIndex = state.index + direction;
  if (nextIndex < 0 || nextIndex >= state.entries.length) return state;
  return {
    entries: state.entries,
    index: nextIndex,
  };
}

export function currentRecipeFromHistory(state: RecipeHistoryState): string | null {
  return state.entries[state.index] ?? null;
}

export function adjacentRecipeId(
  recipeIds: readonly string[],
  currentRecipeId: string | null,
  direction: -1 | 1,
): string | null {
  if (recipeIds.length === 0) return null;
  if (!currentRecipeId) return recipeIds[0] ?? null;

  const currentIndex = recipeIds.indexOf(currentRecipeId);
  if (currentIndex === -1) return recipeIds[0] ?? null;

  return recipeIds[currentIndex + direction] ?? null;
}
