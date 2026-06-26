/**
 * Pure unlock rules: a gameplay event maps to the properties or recipes it
 * teaches. The orchestrator feeds these into `learn` / `learnRecipe`. Keeping
 * all rules here means "what does getting sick teach you" and "what does
 * crafting cord unlock via Eureka" are testable without touching game state.
 */
import type { KnowledgeProperty } from "./item-knowledge";
import type { ReactionKind } from "$lib/domain/systems/item-reactions";
import type { CraftRecipe } from "$lib/domain/crafting/recipe-types";

// ---------------------------------------------------------------------------
// Consume unlock
// ---------------------------------------------------------------------------

/**
 * What consuming an item teaches. Eating/drinking always proves it is edible;
 * feeling the hydration proves its thirst value; getting harmed proves toxicity.
 */
export function propertiesFromConsume(opts: {
  harmed: boolean;
  restoredThirst: boolean;
}): KnowledgeProperty[] {
  const props: KnowledgeProperty[] = ["edible"];
  if (opts.restoredThirst) props.push("thirst_value");
  if (opts.harmed) props.push("toxicity");
  return props;
}

// ---------------------------------------------------------------------------
// Reaction property unlock
// ---------------------------------------------------------------------------

/** What witnessing a reaction teaches about the item that reacted. */
export function propertyFromReaction(kind: ReactionKind): KnowledgeProperty {
  switch (kind) {
    case "flammable":
      return "flammable";
    case "decay":
      return "perishable";
    case "temperature":
      return "heat_sensitive";
  }
}

// ---------------------------------------------------------------------------
// Eureka recipe discovery
// ---------------------------------------------------------------------------

/**
 * Base probability that crafting an item triggers a Eureka moment where the
 * player discovers a new recipe that *uses* what they just made as an
 * ingredient. Tunable without touching call-sites.
 */
export const EUREKA_CHANCE = 0.25;

/**
 * Given the item just crafted, return the ids of any recipes the player should
 * newly discover via the Eureka mechanic. Pure: supply RNG and current known set.
 *
 * Rules:
 * - Only `discoverable` recipes are eligible.
 * - A recipe is a candidate if the crafted item appears in its cost list.
 * - Already-known recipes are excluded.
 * - At most one recipe is revealed per craft (to keep discoveries feeling special).
 * - The RNG roll happens once; if it fails the player learns nothing this time.
 *
 * Returns an empty array when the roll fails, all candidates are already known,
 * or no downstream recipes reference the crafted item.
 */
export function eurekaRecipesFor(
  craftedItemId: string,
  knownRecipeIds: ReadonlySet<string>,
  allRecipes: readonly CraftRecipe[],
  rng: () => number,
  chance = EUREKA_CHANCE,
): string[] {
  // Roll first — cheap exit before scanning recipes.
  if (rng() >= chance) return [];

  const candidates = allRecipes.filter(
    (r) =>
      (r.discoverable ?? true) &&
      !knownRecipeIds.has(r.id) &&
      r.costs.some((c) => c.itemId === craftedItemId),
  );

  if (candidates.length === 0) return [];

  // Pick one at random so the result varies across playthroughs.
  // INVARIANT: candidates.length > 0 is guaranteed by the guard above, but we
  // add an explicit check here so TypeScript is satisfied without a cast.
  const picked = candidates[Math.floor(rng() * candidates.length)];
  if (!picked) return [];
  return [picked.id];
}
