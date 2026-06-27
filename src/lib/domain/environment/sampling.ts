/**
 * Pure environment sampling — no ECS, no Pixi, no Svelte.
 *
 * Given a set of positioned emitters and global weather context, returns the
 * EnvironmentSample at a point. This is the domain rule; core/engine gathers
 * real emitters from the ECS world and delegates here.
 */

import { falloffFactor, emptySample, type EnvironmentEmitter, type EnvironmentSample } from "./signals";

/** An emitter attached to a world position. */
export interface PositionedEmitter {
  x: number;
  y: number;
  emitter: EnvironmentEmitter;
}

export interface SampleContext {
  raining: boolean;
}

/**
 * Sample all environmental signals at `point` from a set of positioned emitters.
 *
 * Accumulation rules per signal:
 *   heat   — additive (multiple fires sum)
 *   light  — additive, capped at 1
 *   shelter — max coverage (shelters don't double-stack)
 *   wetness — derived: raining ? (1 - shelter) : 0
 */
export function sampleSignals(
  point: { x: number; y: number },
  emitters: readonly PositionedEmitter[],
  ctx: SampleContext,
): EnvironmentSample {
  const result = emptySample();

  for (const { x, y, emitter } of emitters) {
    const dist = Math.hypot(point.x - x, point.y - y);
    const factor = falloffFactor(emitter.falloff, dist, emitter.radiusPx);
    if (factor <= 0) continue;

    const contribution = emitter.strength * factor;

    switch (emitter.signal) {
      case "heat":
        result.heat += contribution;
        break;
      case "light":
        result.light = Math.min(1, result.light + contribution);
        break;
      case "shelter":
        result.shelter = Math.max(result.shelter, contribution);
        break;
      case "wetness":
        // Explicit wetness emitters are additive (reserved for future use).
        result.wetness = Math.min(1, result.wetness + contribution);
        break;
    }
  }

  // Derive wetness from rain + shelter (rain is a global condition, not an emitter).
  if (ctx.raining) {
    result.wetness = Math.max(result.wetness, 1 - result.shelter);
  }

  return result;
}
