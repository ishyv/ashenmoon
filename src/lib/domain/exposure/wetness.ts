/**
 * Wetness / soakedness domain.
 * Pure — no Svelte, no Pixi. Manages a 0–100 accumulator that steps through
 * four exposure tiers, each with escalating gameplay penalties.
 */

export type WetnessLevel = "dry" | "damp" | "wet" | "soaked";

export interface WetnessState {
  accumulator: number; // 0–100
  level: WetnessLevel;
}

/** Rates in accumulator-units per second. */
export const WETNESS_RATES = {
  rain_exposed:   4.0,
  rain_sheltered: 0.8,
  near_fire:     -6.0,
  sheltered_dry: -2.0,
  passive_dry:   -0.5,
} as const;

export const WETNESS_THRESHOLDS: Record<WetnessLevel, number> = {
  dry:    0,
  damp:   25,
  wet:    50,
  soaked: 75,
};

/** Penalty multipliers and flags by level. */
export interface WetnessPenalties {
  coldBuildRateMult: number;
  fireStartPenalty: number; // 0–1 fractional reduction in success probability
  moveSpeedMult: number;
}

export const WETNESS_PENALTIES: Record<WetnessLevel, WetnessPenalties> = {
  dry:    { coldBuildRateMult: 1.0, fireStartPenalty: 0,    moveSpeedMult: 1.0 },
  damp:   { coldBuildRateMult: 1.3, fireStartPenalty: 0,    moveSpeedMult: 1.0 },
  wet:    { coldBuildRateMult: 1.6, fireStartPenalty: 0.20, moveSpeedMult: 1.0 },
  soaked: { coldBuildRateMult: 2.0, fireStartPenalty: 0.40, moveSpeedMult: 0.9 },
};

export function wetnessLevelFromAccumulator(acc: number): WetnessLevel {
  if (acc >= WETNESS_THRESHOLDS.soaked) return "soaked";
  if (acc >= WETNESS_THRESHOLDS.wet)    return "wet";
  if (acc >= WETNESS_THRESHOLDS.damp)   return "damp";
  return "dry";
}

export interface WetnessTick {
  isRaining: boolean;
  isSheltered: boolean;
  nearFire: boolean;
  dt: number;
}

export function tickWetness(state: WetnessState, ctx: WetnessTick): WetnessState {
  let rate: number;
  if (ctx.nearFire) {
    rate = WETNESS_RATES.near_fire;
  } else if (ctx.isRaining && ctx.isSheltered) {
    rate = WETNESS_RATES.rain_sheltered;
  } else if (ctx.isRaining) {
    rate = WETNESS_RATES.rain_exposed;
  } else if (ctx.isSheltered) {
    rate = WETNESS_RATES.sheltered_dry;
  } else {
    rate = WETNESS_RATES.passive_dry;
  }

  const next = Math.max(0, Math.min(100, state.accumulator + rate * ctx.dt));
  return { accumulator: next, level: wetnessLevelFromAccumulator(next) };
}
