/**
 * Procedural sound recipes. Each is a small function over a bus-routed `Voice`,
 * ported in behavior from the legacy `audio-synthesis.ts` and the two combo
 * systems' private synths. Variation (the per-play pitch jitter `p`, combo
 * `stacks`) lives inside the recipe. A recipe is the fallback voice when no
 * sample is loaded for its sound.
 */

import { noise, tone, type Voice } from "./synth";

export type RecipeId =
  | "chop"
  | "clink"
  | "fall"
  | "deplete"
  | "pickup"
  | "craft"
  | "uiClick"
  | "uiTab"
  | "uiInvalid"
  | "discovery"
  | "woodBody"
  | "barkCrack"
  | "leafRustle"
  | "branchSnap"
  | "stoneCrack"
  | "gritScatter"
  | "toolRebound"
  | "clayPull"
  | "waterCollect"
  | "fiberPull"
  | "hideTension"
  | "fleshWetHit"
  | "boneDryCrack"
  | "missAir"
  | "craftFail"
  | "campfireIgnite"
  | "campfireCrackle"
  | "campfireLow"
  | "rainPulse"
  | "riverPulse"
  | "nightBed"
  | "wolfGrowl"
  | "boarCharge"
  | "animalFlee"
  | "bird"
  | "wind"
  | "water"
  | "kite"
  | "momentumActivate"
  | "momentumStack"
  | "momentumBreak"
  | "momentumOverload"
  | "crosscut"
  | "crosscutExcellent"
  | "crosscutBleed"
  | "drivingThrust"
  | "drivingThrustHit"
  | "fellSweepBrace"
  | "fellSweepPulse"
  | "fellSweepFull"
  | "fellSweepReleaseLow"
  | "fellSweepReleaseMid"
  | "fellSweepReleaseHigh"
  | "fellSweepDenied"
  | "fellSweepCancel";

export interface RecipeParams {
  stacks?: number;
  grade?: "excellent" | "good" | "weak";
}

export type Recipe = (v: Voice, params?: RecipeParams) => void;

export const RECIPES: Record<RecipeId, Recipe> = {
  chop: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "triangle", freq: 120 * p, sweepTo: 40 * p, gain: 0.4, dur: 0.15 });
    noise(v, { dur: 0.08, cutoff: 1200, gain: 0.25 });
  },
  clink: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "sine", freq: 1400 * p, gain: 0.35, dur: 0.25 });
    tone(v, { type: "sine", freq: 2100 * p, gain: 0.15, dur: 0.12 });
  },
  fall: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "sawtooth", freq: 80 * p, sweepTo: 20 * p, sweepShape: "lin", cutoff: 150, gain: 0.3, dur: 1.2 });
    noise(v, { dur: 0.96, cutoff: 600, gain: 0.18 });
  },
  deplete: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "sine", freq: 320 * p, sweepTo: 640 * p, sweepShape: "lin", gain: 0.2, dur: 0.18 });
    tone(v, { type: "sine", freq: 480 * p, sweepTo: 960 * p, sweepShape: "lin", gain: 0.25, dur: 0.2, delay: 0.08 });
  },
  pickup: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "sine", freq: 600 * p, sweepTo: 300 * p, gain: 0.2, dur: 0.12 });
    noise(v, { dur: 0.06, cutoff: 800, gain: 0.15 });
  },
  craft: (v) => {
    const p = 0.88 + v.rng() * 0.24;
    tone(v, { type: "sine", freq: 880 * p, sweepTo: 440 * p, gain: 0.3, dur: 0.4 });
    tone(v, { type: "triangle", freq: 220 * p, gain: 0.15, dur: 0.2 });
  },
  uiClick: (v) => {
    const p = 0.94 + v.rng() * 0.12;
    tone(v, { type: "triangle", freq: 360 * p, sweepTo: 180 * p, gain: 0.08, dur: 0.045 });
    noise(v, { dur: 0.025, cutoff: 1200, gain: 0.035 });
  },
  uiTab: (v) => {
    const p = 0.92 + v.rng() * 0.12;
    tone(v, { type: "triangle", freq: 260 * p, sweepTo: 210 * p, gain: 0.075, dur: 0.055 });
    tone(v, { type: "sine", freq: 120 * p, gain: 0.025, dur: 0.08 });
  },
  uiInvalid: (v) => {
    const p = 0.96 + v.rng() * 0.08;
    tone(v, { type: "square", freq: 125 * p, sweepTo: 80 * p, sweepShape: "lin", gain: 0.08, dur: 0.09 });
    noise(v, { dur: 0.035, cutoff: 350, gain: 0.03 });
  },
  discovery: (v) => {
    const p = 0.96 + v.rng() * 0.08;
    tone(v, { type: "triangle", freq: 220 * p, gain: 0.09, dur: 0.16 });
    tone(v, { type: "sine", freq: 330 * p, gain: 0.07, dur: 0.18, delay: 0.06 });
    tone(v, { type: "triangle", freq: 165 * p, sweepTo: 110 * p, gain: 0.05, dur: 0.32, delay: 0.09 });
  },
  woodBody: (v) => {
    const p = 0.86 + v.rng() * 0.2;
    tone(v, { type: "triangle", freq: 115 * p, sweepTo: 48 * p, gain: 0.34, dur: 0.18 });
    noise(v, { dur: 0.06, cutoff: 520, gain: 0.08 });
  },
  barkCrack: (v) => {
    const p = 0.9 + v.rng() * 0.18;
    tone(v, { type: "square", freq: 420 * p, sweepTo: 180 * p, sweepShape: "lin", gain: 0.07, dur: 0.055 });
    noise(v, { dur: 0.07, cutoff: 1800, gain: 0.14 });
  },
  leafRustle: (v) => {
    noise(v, { dur: 0.16 + v.rng() * 0.08, cutoff: 2400 + v.rng() * 1200, gain: 0.08 });
    noise(v, { dur: 0.08, cutoff: 900, gain: 0.035, delay: 0.08 });
  },
  branchSnap: (v) => {
    const p = 0.9 + v.rng() * 0.18;
    tone(v, { type: "square", freq: 520 * p, sweepTo: 220 * p, sweepShape: "lin", gain: 0.09, dur: 0.035 });
    noise(v, { dur: 0.09, cutoff: 2600, gain: 0.12 });
  },
  stoneCrack: (v) => {
    const p = 0.9 + v.rng() * 0.2;
    tone(v, { type: "sine", freq: 1150 * p, gain: 0.2, dur: 0.16 });
    tone(v, { type: "sine", freq: 1750 * p, gain: 0.08, dur: 0.08, delay: 0.018 });
    noise(v, { dur: 0.055, cutoff: 3200, gain: 0.16 });
  },
  gritScatter: (v) => {
    noise(v, { dur: 0.18 + v.rng() * 0.08, cutoff: 1500 + v.rng() * 900, gain: 0.07 });
    noise(v, { dur: 0.08, cutoff: 450, gain: 0.035, delay: 0.08 });
  },
  toolRebound: (v) => {
    const p = 0.9 + v.rng() * 0.16;
    tone(v, { type: "sine", freq: 720 * p, sweepTo: 480 * p, sweepShape: "lin", gain: 0.07, dur: 0.1 });
  },
  clayPull: (v) => {
    const p = 0.92 + v.rng() * 0.12;
    tone(v, { type: "triangle", freq: 95 * p, sweepTo: 55 * p, sweepShape: "lin", gain: 0.12, dur: 0.18 });
    noise(v, { dur: 0.18, cutoff: 420, gain: 0.09 });
  },
  waterCollect: (v) => {
    const p = 0.9 + v.rng() * 0.18;
    tone(v, { type: "sine", freq: 260 * p, sweepTo: 135 * p, gain: 0.075, dur: 0.18 });
    noise(v, { dur: 0.12, cutoff: 620, gain: 0.065 });
    tone(v, { type: "sine", freq: 420 * p, gain: 0.035, dur: 0.1, delay: 0.07 });
  },
  fiberPull: (v) => {
    const p = 0.88 + v.rng() * 0.18;
    noise(v, { dur: 0.12, cutoff: 1650, gain: 0.08 });
    tone(v, { type: "triangle", freq: 155 * p, sweepTo: 95 * p, gain: 0.075, dur: 0.14, delay: 0.035 });
  },
  hideTension: (v) => {
    const p = 0.9 + v.rng() * 0.14;
    tone(v, { type: "sawtooth", freq: 120 * p, sweepTo: 86 * p, sweepShape: "lin", cutoff: 420, gain: 0.1, dur: 0.16 });
    noise(v, { dur: 0.08, cutoff: 760, gain: 0.045 });
  },
  fleshWetHit: (v) => {
    const p = 0.88 + v.rng() * 0.18;
    tone(v, { type: "triangle", freq: 90 * p, sweepTo: 42 * p, gain: 0.18, dur: 0.12 });
    noise(v, { dur: 0.075, cutoff: 900, gain: 0.14 });
  },
  boneDryCrack: (v) => {
    const p = 0.92 + v.rng() * 0.16;
    tone(v, { type: "square", freq: 780 * p, sweepTo: 330 * p, sweepShape: "lin", gain: 0.055, dur: 0.04 });
    noise(v, { dur: 0.055, cutoff: 2400, gain: 0.08 });
  },
  missAir: (v) => {
    const p = 0.92 + v.rng() * 0.14;
    noise(v, { dur: 0.1, cutoff: 4200 * p, gain: 0.12 });
    tone(v, { type: "triangle", freq: 190 * p, sweepTo: 80 * p, gain: 0.05, dur: 0.1 });
  },
  craftFail: (v) => {
    tone(v, { type: "triangle", freq: 135, sweepTo: 55, sweepShape: "lin", gain: 0.13, dur: 0.18 });
    noise(v, { dur: 0.16, cutoff: 520, gain: 0.07 });
  },
  campfireIgnite: (v) => {
    noise(v, { dur: 0.12, cutoff: 3600, gain: 0.12 });
    tone(v, { type: "triangle", freq: 120, sweepTo: 220, sweepShape: "lin", gain: 0.06, dur: 0.16, delay: 0.04 });
    noise(v, { dur: 0.22, cutoff: 1300, gain: 0.08, delay: 0.08 });
  },
  campfireCrackle: (v) => {
    noise(v, { dur: 0.09 + v.rng() * 0.08, cutoff: 3200 + v.rng() * 2200, gain: 0.045 + v.rng() * 0.035 });
    noise(v, { dur: 0.24, cutoff: 620, gain: 0.025 });
  },
  campfireLow: (v) => {
    noise(v, { dur: 0.08 + v.rng() * 0.08, cutoff: 1600, gain: 0.035 });
    tone(v, { type: "triangle", freq: 80, sweepTo: 52, sweepShape: "lin", gain: 0.025, dur: 0.2 });
  },
  rainPulse: (v) => {
    noise(v, { dur: 0.45 + v.rng() * 0.18, cutoff: 2200, gain: 0.04 });
    noise(v, { dur: 0.16, cutoff: 620, gain: 0.025 });
  },
  riverPulse: (v) => {
    noise(v, { dur: 0.55 + v.rng() * 0.22, cutoff: 760, gain: 0.045 });
    tone(v, { type: "sine", freq: 180, sweepTo: 120, gain: 0.025, dur: 0.24 });
  },
  nightBed: (v) => {
    noise(v, { dur: 0.75 + v.rng() * 0.3, cutoff: 520, gain: 0.025 });
    tone(v, { type: "sine", freq: 72, gain: 0.018, dur: 0.6 });
  },
  wolfGrowl: (v) => {
    tone(v, { type: "sawtooth", freq: 82, sweepTo: 65, sweepShape: "lin", cutoff: 300, gain: 0.12, dur: 0.32 });
    noise(v, { dur: 0.22, cutoff: 520, gain: 0.07 });
  },
  boarCharge: (v) => {
    tone(v, { type: "triangle", freq: 95, sweepTo: 48, sweepShape: "lin", gain: 0.16, dur: 0.18 });
    noise(v, { dur: 0.2, cutoff: 900, gain: 0.12 });
    tone(v, { type: "triangle", freq: 70, gain: 0.08, dur: 0.16, delay: 0.12 });
  },
  animalFlee: (v) => {
    const p = 0.95 + v.rng() * 0.18;
    tone(v, { type: "triangle", freq: 560 * p, sweepTo: 240 * p, gain: 0.055, dur: 0.07 });
    noise(v, { dur: 0.08, cutoff: 1800, gain: 0.05 });
  },
  bird: (v) => {
    const b = (0.85 + v.rng() * 0.3) * 1800;
    tone(v, { type: "sine", freq: b, sweepTo: b * 1.4, sweepShape: "lin", gain: 0.04, dur: 0.06 });
    tone(v, { type: "sine", freq: b * 1.4, sweepTo: b * 0.9, sweepShape: "lin", gain: 0.04, dur: 0.08, delay: 0.06 });
  },
  wind: (v) => {
    noise(v, { dur: 0.7 + v.rng() * 0.5, cutoff: 600 + v.rng() * 400, gain: 0.04 + v.rng() * 0.025 });
  },
  water: (v) => {
    const p = 0.9 + v.rng() * 0.2;
    tone(v, { type: "sine", freq: 280 * p, sweepTo: 140 * p, gain: 0.055, dur: 0.18 });
    noise(v, { dur: 0.09, cutoff: 450, gain: 0.025 });
  },
  kite: (v, params) => {
    const s = params?.stacks ?? 0;
    const p = (0.9 + v.rng() * 0.2) * (1 + s * 0.12);
    const dur = 0.11 + s * 0.02;
    const g = 0.28 + s * 0.06;
    // Quick up-blip then the main snap-down.
    tone(v, { type: "sawtooth", freq: 200 * p, sweepTo: 360 * p, sweepShape: "lin", gain: g, dur: 0.025 });
    tone(v, { type: "sawtooth", freq: 360 * p, sweepTo: 70 * p, gain: g, dur, delay: 0.025 });
    noise(v, { dur: 0.08 + s * 0.02, cutoff: 4200 * (1 + s * 0.08), gain: 0.16 + s * 0.04 });
    tone(v, { type: "sine", freq: 1600 * p, gain: 0.07 + s * 0.03, dur: 0.2 + s * 0.05, delay: 0.03 });
  },
  momentumActivate: (v) => {
    tone(v, { type: "sine", freq: 150, sweepTo: 600, gain: 0.18, dur: 0.15 });
  },
  momentumStack: (v, params) => {
    const base = 220 + (params?.stacks ?? 0) * 40;
    tone(v, { type: "sawtooth", freq: base, sweepTo: base * 2, gain: 0.18, dur: 0.12 });
  },
  momentumBreak: (v) => {
    tone(v, { type: "sawtooth", freq: 300, sweepTo: 80, sweepShape: "lin", gain: 0.15, dur: 0.15 });
    noise(v, { dur: 0.15, cutoff: 800, gain: 0.05 });
  },
  momentumOverload: (v) => {
    // Two detuned saws (split gain so the sum matches the original 0.25).
    tone(v, { type: "sawtooth", freq: 120, sweepTo: 50, sweepShape: "lin", gain: 0.13, dur: 0.35 });
    tone(v, { type: "sawtooth", freq: 124, sweepTo: 51, sweepShape: "lin", gain: 0.13, dur: 0.35 });
    noise(v, { dur: 0.3, cutoff: 500, gain: 0.12 });
  },
  crosscut: (v, params) => {
    const stacks = Math.min(5, Math.max(0, params?.stacks ?? 0));
    const gradeLift = params?.grade === "good" ? 1.08 : params?.grade === "weak" ? 0.92 : 1;
    const stackLift = 1 + stacks * 0.08;
    const p = (0.9 + v.rng() * 0.18) * gradeLift * stackLift;
    tone(v, { type: "triangle", freq: 180 * p, sweepTo: 54 * p, gain: 0.3 + stacks * 0.025, dur: 0.12 + stacks * 0.006 });
    noise(v, { dur: 0.1 + stacks * 0.01, cutoff: 2600 + stacks * 420, gain: 0.24 + stacks * 0.025 });
    tone(v, { type: "sine", freq: 1200 * p, gain: 0.08 + stacks * 0.015, dur: 0.16 + stacks * 0.025, delay: 0.03 });
    if (stacks >= 2) {
      tone(v, { type: "square", freq: 1900 * p, sweepTo: 850 * p, sweepShape: "lin", gain: 0.035 + stacks * 0.01, dur: 0.055, delay: 0.015 });
    }
  },
  crosscutExcellent: (v, params) => {
    const stacks = Math.min(5, Math.max(0, params?.stacks ?? 0));
    const p = (0.95 + v.rng() * 0.14) * (1 + stacks * 0.09);
    tone(v, { type: "sawtooth", freq: 220 * p, sweepTo: 42 * p, sweepShape: "lin", cutoff: 520 + stacks * 90, gain: 0.38 + stacks * 0.035, dur: 0.18 + stacks * 0.008 });
    noise(v, { dur: 0.14 + stacks * 0.012, cutoff: 3600 + stacks * 520, gain: 0.32 + stacks * 0.03 });
    tone(v, { type: "sine", freq: 1800 * p, gain: 0.11 + stacks * 0.018, dur: 0.24 + stacks * 0.025, delay: 0.025 });
    if (stacks >= 2) {
      tone(v, { type: "square", freq: 2600 * p, sweepTo: 1000 * p, sweepShape: "lin", gain: 0.045 + stacks * 0.012, dur: 0.065, delay: 0.018 });
      tone(v, { type: "sine", freq: 3200 * p, gain: 0.025 + stacks * 0.006, dur: 0.16, delay: 0.055 });
    }
  },
  crosscutBleed: (v) => {
    tone(v, { type: "triangle", freq: 90, sweepTo: 45, sweepShape: "lin", gain: 0.13, dur: 0.12 });
    noise(v, { dur: 0.08, cutoff: 900, gain: 0.1 });
  },
  drivingThrust: (v) => {
    const p = 0.92 + v.rng() * 0.16;
    tone(v, { type: "sawtooth", freq: 260 * p, sweepTo: 70 * p, sweepShape: "lin", cutoff: 900, gain: 0.32, dur: 0.16 });
    noise(v, { dur: 0.12, cutoff: 3600, gain: 0.24 });
    tone(v, { type: "sine", freq: 1600 * p, gain: 0.08, dur: 0.18, delay: 0.025 });
  },
  drivingThrustHit: (v) => {
    const p = 0.9 + v.rng() * 0.18;
    tone(v, { type: "triangle", freq: 160 * p, sweepTo: 48 * p, gain: 0.28, dur: 0.12 });
    noise(v, { dur: 0.08, cutoff: 1800, gain: 0.22 });
  },
  fellSweepBrace: (v) => {
    tone(v, { type: "triangle", freq: 95, sweepTo: 70, sweepShape: "lin", gain: 0.16, dur: 0.18 });
    noise(v, { dur: 0.08, cutoff: 260, gain: 0.05 });
  },
  fellSweepPulse: (v) => {
    tone(v, { type: "sawtooth", freq: 80, sweepTo: 55, sweepShape: "lin", cutoff: 220, gain: 0.14, dur: 0.22 });
    noise(v, { dur: 0.14, cutoff: 420, gain: 0.08 });
  },
  fellSweepFull: (v) => {
    tone(v, { type: "sawtooth", freq: 110, sweepTo: 42, sweepShape: "lin", cutoff: 240, gain: 0.22, dur: 0.35 });
    tone(v, { type: "triangle", freq: 55, sweepTo: 42, sweepShape: "lin", gain: 0.16, dur: 0.42 });
    noise(v, { dur: 0.18, cutoff: 700, gain: 0.08 });
  },
  fellSweepReleaseLow: (v) => {
    tone(v, { type: "triangle", freq: 140, sweepTo: 48, gain: 0.32, dur: 0.18 });
    noise(v, { dur: 0.12, cutoff: 1500, gain: 0.22 });
  },
  fellSweepReleaseMid: (v) => {
    tone(v, { type: "sawtooth", freq: 130, sweepTo: 38, sweepShape: "lin", cutoff: 360, gain: 0.34, dur: 0.24 });
    tone(v, { type: "triangle", freq: 62, sweepTo: 45, sweepShape: "lin", gain: 0.18, dur: 0.25 });
    noise(v, { dur: 0.16, cutoff: 1800, gain: 0.26 });
  },
  fellSweepReleaseHigh: (v) => {
    tone(v, { type: "sawtooth", freq: 125, sweepTo: 30, sweepShape: "lin", cutoff: 300, gain: 0.42, dur: 0.32 });
    tone(v, { type: "triangle", freq: 48, sweepTo: 35, sweepShape: "lin", gain: 0.24, dur: 0.38 });
    noise(v, { dur: 0.2, cutoff: 2200, gain: 0.32 });
  },
  fellSweepDenied: (v) => {
    tone(v, { type: "square", freq: 120, sweepTo: 80, sweepShape: "lin", gain: 0.12, dur: 0.09 });
  },
  fellSweepCancel: (v) => {
    tone(v, { type: "sawtooth", freq: 210, sweepTo: 60, sweepShape: "lin", cutoff: 260, gain: 0.16, dur: 0.18 });
    noise(v, { dur: 0.12, cutoff: 500, gain: 0.08 });
  },
};
