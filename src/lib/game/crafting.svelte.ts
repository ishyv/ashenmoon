/**
 * Reactive crafting-knowledge orchestrator: tracks which recipes the player has
 * unlocked and persists them. Pure rules (matching, known-recipe filtering) live
 * in `rpg/crafting/`; this only binds discovery to runtime state.
 *
 * Recipes unlock by being crafted, whether picked from the known list or
 * stumbled onto experimentally. This records discovery and lays the groundwork
 * for a knowledge-gated recipe list without changing what is shown today.
 */
import { isRecipeKnown, listKnownRecipes } from "$lib/rpg/crafting/experimental";
import type { CraftRecipe } from "$lib/rpg/crafting/recipes";
import { loadSlice, saveSlice } from "$lib/state/save-load";
import { StorageKeys } from "./game-events";

export const recipeKnowledge = $state<{ known: ReadonlySet<string> }>({ known: new Set() });

/** Record that a recipe is now known (idempotent; persists on change). */
export function learnRecipe(recipeId: string): void {
  if (recipeKnowledge.known.has(recipeId)) return;
  const next = new Set(recipeKnowledge.known);
  next.add(recipeId);
  recipeKnowledge.known = next;
  saveRecipes();
}

/** Whether a recipe id has been unlocked. */
export function recipeKnown(recipeId: string): boolean {
  return isRecipeKnown(recipeKnowledge.known, recipeId);
}

/** Unlocked recipes, for a knowledge-gated crafting list. */
export function knownRecipeList(): CraftRecipe[] {
  return listKnownRecipes(recipeKnowledge.known);
}

export function loadRecipes(): void {
  const ids = loadSlice<string[]>(StorageKeys.recipes, []);
  recipeKnowledge.known = new Set(Array.isArray(ids) ? ids : []);
}

function saveRecipes(): void {
  saveSlice(StorageKeys.recipes, [...recipeKnowledge.known]);
}
