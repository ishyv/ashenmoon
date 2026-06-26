/**
 * Pure hunger math. The reactive pool lives in `src/lib/state/rpg/survival.svelte.ts`;
 * this module only answers "how much does hunger drain this tick" so the rates
 * stay unit-testable and tunable as data.
 */

import { BASE_SURVIVAL_STATS } from "$lib/domain/stats/player-stat-growth";

export interface HungerConfig {
  max: number;
  /** drain per second while idle. */
  baseDrainPerSec: number;
  /** multiplier while moving. */
  movingMult: number;
  /** multiplier while laboring (gathering, chopping). Overrides movingMult. */
  laboringMult: number;
}

export const DEFAULT_HUNGER_CONFIG: HungerConfig = {
  max: BASE_SURVIVAL_STATS.maxHunger,
  // ~25 min from full to starving while idle, ~8 min while working.
  // Sourced from the stat layer so resistances can modify it later.
  baseDrainPerSec: BASE_SURVIVAL_STATS.hungerDecayPerMinute / 60,
  movingMult: 2,
  laboringMult: 3,
};

export interface HungerActivity {
  moving: boolean;
  laboring: boolean;
}

/** Drain for a time slice. Laboring dominates moving; both fall back to base. */
export function computeHungerDrain(
  dtSec: number,
  activity: HungerActivity,
  config: HungerConfig,
): number {
  if (dtSec <= 0) return 0;
  const mult = activity.laboring ? config.laboringMult : activity.moving ? config.movingMult : 1;
  return config.baseDrainPerSec * mult * dtSec;
}
