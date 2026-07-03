/**
 * Which attended-crafting minigame a recipe uses, derived automatically from
 * its `process` metadata — same "logical, automatic" philosophy as tiered
 * derivation in recipes.ts, so a new station recipe inherits a sensible
 * minigame without anyone hand-authoring one. A recipe may still override
 * with an explicit `minigameKind`.
 */
import type { ProcessType } from "$lib/domain/stations";
import type { CraftRecipe } from "./recipe-types";

export type MinigameKind = "strike" | "tension" | "sequence";

const DEFAULT_MINIGAME_KIND: MinigameKind = "strike";

/** `process` → minigame kind. Unlisted process types fall back to `DEFAULT_MINIGAME_KIND`. */
const PROCESS_TO_MINIGAME: Partial<Record<ProcessType, MinigameKind>> = {
  assemble: "strike",
  heat: "tension",
  boil: "tension",
  burn: "tension",
  dry: "sequence",
  smoke: "sequence",
};

export function minigameKindFor(recipe: CraftRecipe): MinigameKind {
  return recipe.minigameKind ?? (recipe.process ? PROCESS_TO_MINIGAME[recipe.process] : undefined) ?? DEFAULT_MINIGAME_KIND;
}
