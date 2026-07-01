/**
 * Crit rolls and crit-magnitude math. Frequency (rollCrit) is driven by the
 * player's critChance stat. Magnitude (critMultiplierForStacks) is driven
 * separately by hidden "setup" stacks built through combat/dodge/consume
 * actions (see crit-setup.svelte.ts) — the two are independent layers.
 */

/** Max hidden setup stacks; also the point at which the multiplier caps out. */
export const CRIT_SETUP_CAP = 10;
/** Stacks gained for landing a weapon hit. */
export const CRIT_SETUP_STACK_ON_HIT = 1;
/** Stacks gained for a real dodge (an attack that would have landed but was avoided). */
export const CRIT_SETUP_STACK_ON_DODGE = 1;
/** Stacks gained for successfully consuming an item. */
export const CRIT_SETUP_STACK_ON_CONSUME = 2;
/** Seconds of no setup-building action before one stack decays. */
export const CRIT_SETUP_DECAY_INTERVAL_SEC = 4.0;
/** Crit damage multiplier at 0 setup stacks (a "cold" crit). */
export const CRIT_BASE_MULTIPLIER = 1.5;
/** Additional multiplier added at max (CRIT_SETUP_CAP) stacks. */
export const CRIT_BONUS_RANGE = 1.5;

/**
 * Whether this hit crits. critChance is a percent (0-100), matching
 * CombatStats.critChance. Injectable rng for testability, matching
 * rollGatherWound's convention.
 */
export function rollCrit(critChance: number, rng: () => number = Math.random): boolean {
  if (critChance <= 0) return false;
  if (critChance >= 100) return true;
  return rng() * 100 < critChance;
}

/**
 * Crit damage multiplier for the given hidden setup-stack count. Clamps
 * stacks to [0, CRIT_SETUP_CAP] so an out-of-range input can't overshoot.
 */
export function critMultiplierForStacks(stacks: number): number {
  const clamped = Math.max(0, Math.min(CRIT_SETUP_CAP, stacks));
  return CRIT_BASE_MULTIPLIER + (clamped / CRIT_SETUP_CAP) * CRIT_BONUS_RANGE;
}
