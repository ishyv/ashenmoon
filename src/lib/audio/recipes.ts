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
    const gradeLift = params?.grade === "good" ? 1.08 : params?.grade === "weak" ? 0.92 : 1;
    const p = (0.9 + v.rng() * 0.18) * gradeLift;
    tone(v, { type: "triangle", freq: 180 * p, sweepTo: 54 * p, gain: 0.3, dur: 0.12 });
    noise(v, { dur: 0.1, cutoff: 2600, gain: 0.24 });
    tone(v, { type: "sine", freq: 1200 * p, gain: 0.08, dur: 0.16, delay: 0.03 });
  },
  crosscutExcellent: (v) => {
    const p = 0.95 + v.rng() * 0.14;
    tone(v, { type: "sawtooth", freq: 220 * p, sweepTo: 42 * p, sweepShape: "lin", cutoff: 520, gain: 0.38, dur: 0.18 });
    noise(v, { dur: 0.14, cutoff: 3600, gain: 0.32 });
    tone(v, { type: "sine", freq: 1800 * p, gain: 0.11, dur: 0.24, delay: 0.025 });
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
