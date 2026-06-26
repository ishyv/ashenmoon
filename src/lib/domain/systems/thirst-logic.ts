/**
 * Pure thirst math. The reactive pool lives in `src/lib/domain/survival.svelte.ts`;
 * this module only answers "how much does thirst drain this tick" so the rates
 * stay unit-testable and tunable as data.
 */

import { BASE_SURVIVAL_STATS } from "$lib/domain/stats/player-stat-growth";

export interface ThirstConfig {
  max: number;
  /** drain per second while idle. */
  baseDrainPerSec: number;
  /** multiplier while moving. */
  movingMult: number;
  /** multiplier while laboring (gathering, chopping). Overrides movingMult. */
  laboringMult: number;
}

export const DEFAULT_THIRST_CONFIG: ThirstConfig = {
  max: BASE_SURVIVAL_STATS.maxThirst,
  // ~11 min from full to parched while idle, ~4 min while working.
  // Sourced from the stat layer so resistances can modify it later.
  baseDrainPerSec: BASE_SURVIVAL_STATS.thirstDecayPerMinute / 60,
  movingMult: 2,
  laboringMult: 3,
};

export interface ThirstActivity {
  moving: boolean;
  laboring: boolean;
  raining?: boolean;
}

/** Drain for a time slice. Laboring dominates moving; both fall back to base. */
export function computeThirstDrain(
  dtSec: number,
  activity: ThirstActivity,
  config: ThirstConfig,
): number {
  if (dtSec <= 0) return 0;
  const mult = activity.laboring ? config.laboringMult : activity.moving ? config.movingMult : 1;
  return config.baseDrainPerSec * mult * dtSec;
}
