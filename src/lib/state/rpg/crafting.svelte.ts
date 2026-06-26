import { isRecipeKnown, listKnownRecipes, CRAFT_RECIPES, type CraftRecipe } from "$lib/domain/crafting/recipes";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";
import { StorageKeys } from "$lib/domain/game-events";

export const STARTER_RECIPE_IDS = new Set([
  "flint_axe", "flint_pickaxe", "crude_knife",
  "binding_cord", "twist_grass_cord",
  "tinder_bundle", "firewood_bundle", "charcoal", "bundle_twigs",
  "plank", "stone_block",
  "campfire_kit", "primitive_work_surface_kit",
  "fiber_wraps",
  "twist_bark_rope",
  "sealing_paste",
  "tannin_brew",
  "make_ash_from_leaves",
  "harden_clay",
  "dry_raw_hide",
  "cure_hide",
  "drying_rack_kit",
  "storage_pile_kit",
  "spike_barrier_kit",
  "rain_catcher_kit",
  "meat_smoking_rack_kit",
]);

export const recipeKnowledge = $state<{ known: ReadonlySet<string> }>({ known: new Set() });

export function learnRecipe(recipeId: string): void {
  if (recipeKnowledge.known.has(recipeId)) return;
  const next = new Set(recipeKnowledge.known);
  next.add(recipeId);
  recipeKnowledge.known = next;
  saveRecipes();
}

export function recipeKnown(recipeId: string): boolean {
  return isRecipeKnown(recipeKnowledge.known, recipeId);
}

export function knownRecipeList(): CraftRecipe[] {
  return listKnownRecipes(recipeKnowledge.known);
}

export function allRecipeList(): CraftRecipe[] {
  return [...CRAFT_RECIPES];
}

export function loadRecipes(): void {
  const ids = loadSlice<string[]>(StorageKeys.recipes, []);
  const saved = Array.isArray(ids) ? ids : [];
  recipeKnowledge.known = new Set([...STARTER_RECIPE_IDS, ...saved]);
}

function saveRecipes(): void {
  saveSlice(StorageKeys.recipes, [...recipeKnowledge.known]);
}
