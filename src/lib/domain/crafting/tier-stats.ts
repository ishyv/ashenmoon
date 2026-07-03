/**
 * Per-tier stat rolling. Most recipes need zero authoring: a default
 * multiplier-and-variance formula scales whatever base stats the item
 * already carries. Specific recipes can override individual tiers with a
 * hand-picked `{min, max}` range via `CraftRecipe.tierStatOverrides`.
 *
 * Divine never uses this file — see divine-outcomes.ts.
 */
import type { CraftTier } from "$lib/domain/rpg-types";
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import type { CraftRecipe, TierStatRange } from "./recipe-types";

/**
 * Pulls the numeric stats a tiered item's base (untiered) definition carries,
 * so `computeTierStats` has something to scale. Only stats that make sense to
 * vary by craft quality are included; traits without a natural "bigger is
 * better" number (e.g. `wearable.slot`) are ignored.
 */
export function baseStatsForItem(itemId: string): Record<string, number> {
  const def = ITEM_DEFINITIONS[itemId];
  const stats: Record<string, number> = {};
  const weapon = traitOf(def, "weapon");
  if (weapon) stats.damage = weapon.damage;
  const tool = traitOf(def, "tool");
  if (tool) stats.power = tool.power;
  const armor = traitOf(def, "armor_material");
  if (armor) stats.protection = armor.protection;
  const insulation = traitOf(def, "insulation_material");
  if (insulation) stats.warmth = insulation.warmth;
  const reach = traitOf(def, "reach_weapon");
  if (reach) stats.reach = reach.reach;
  const cuttingEdge = traitOf(def, "cutting_edge");
  if (cuttingEdge) stats.power = cuttingEdge.power;
  return stats;
}

/** Multiplier applied to a stat's base value at each tier. Tunable. */
export const TIER_MULTIPLIER: Record<Exclude<CraftTier, "divine">, number> = {
  sloppy: 0.6,
  robust: 1.0,
  pristine: 1.6,
  masterwork: 2.4,
  fable: 3.5,
};

/** +/- fractional variance applied around the multiplied value at each tier. Tunable. */
export const TIER_VARIANCE: Record<Exclude<CraftTier, "divine">, number> = {
  sloppy: 0.35,
  robust: 0.2,
  pristine: 0.2,
  masterwork: 0.25,
  fable: 0.3,
};

/** `rng()` in [0,1) mapped to a value in [min, max]. */
function randRange(min: number, max: number, rng: () => number): number {
  return min + (max - min) * rng();
}

/**
 * Default per-stat tier roll: `base * multiplier * (1 +/- variance)`.
 * Covers every tiered recipe that hasn't authored `tierStatOverrides`.
 */
export function defaultTierStats(
  baseStats: Readonly<Record<string, number>>,
  tier: Exclude<CraftTier, "divine">,
  rng: () => number,
): Record<string, number> {
  const multiplier = TIER_MULTIPLIER[tier];
  const variance = TIER_VARIANCE[tier];
  const result: Record<string, number> = {};
  for (const [stat, base] of Object.entries(baseStats)) {
    const swing = randRange(-variance, variance, rng);
    result[stat] = base * multiplier * (1 + swing);
  }
  return result;
}

function rollOverrideRanges(ranges: readonly TierStatRange[], rng: () => number): Record<string, number> {
  const result: Record<string, number> = {};
  for (const range of ranges) {
    result[range.stat] = randRange(range.min, range.max, rng);
  }
  return result;
}

/**
 * Roll stats for a tiered recipe's output at a given (non-Divine) tier.
 * Per-stat overrides in `recipe.tierStatOverrides[tier]` replace the default
 * formula entirely for that tier; stats without an override fall back to the
 * default formula against `baseStats`.
 */
export function computeTierStats(
  recipe: CraftRecipe,
  baseStats: Readonly<Record<string, number>>,
  tier: Exclude<CraftTier, "divine">,
  rng: () => number,
): Record<string, number> {
  const overrides = recipe.tierStatOverrides?.[tier];
  if (!overrides || overrides.length === 0) {
    return defaultTierStats(baseStats, tier, rng);
  }
  const overriddenStats = new Set(overrides.map((o) => o.stat));
  const remainingBase = Object.fromEntries(
    Object.entries(baseStats).filter(([stat]) => !overriddenStats.has(stat)),
  );
  return {
    ...defaultTierStats(remainingBase, tier, rng),
    ...rollOverrideRanges(overrides, rng),
  };
}
