/**
 * Environmental signal types and pure math utilities.
 *
 * A signal is a named scalar value at a world position. Emitters broadcast
 * signals into a radius; the sampler accumulates contributions from all
 * in-range emitters to answer "what is the environment like here?"
 *
 * Signals in scope this pass: heat, wetness, shelter, light.
 * Future additions (smoke, smell, sound, cold) extend the union here.
 */

export type EnvironmentSignalId = "heat" | "wetness" | "shelter" | "light";

/** How a signal's strength decays with distance from its source. */
export type SignalFalloff =
  | "linear" // strength * (1 - dist/radius); 0 at edge
  | "soft"   // strength * (1 - dist/radius)^2; gentler drop-off
  | "none";  // constant strength up to edge

/** A signal emitted by an entity into a radius around its position. */
export interface EnvironmentEmitter {
  signal: EnvironmentSignalId;
  /** Base strength of the signal at the source point. */
  strength: number;
  radiusPx: number;
  falloff: SignalFalloff;
}

/**
 * A snapshot of all environmental signals at a single world point.
 *
 * heat:    radiant heat above ambient in °C (additive from all fire sources)
 * light:   illumination factor 0–1 (additive, capped at 1)
 * shelter: rain/exposure coverage 0–1 (max across shelter sources)
 * wetness: rain influx pressure 0–1, derived from raining + shelter
 */
export interface EnvironmentSample {
  heat: number;
  light: number;
  shelter: number;
  wetness: number;
}

export function emptySample(): EnvironmentSample {
  return { heat: 0, light: 0, shelter: 0, wetness: 0 };
}

/**
 * Fractional contribution of an emitter at `dist` pixels from its center.
 * Returns 0 if dist >= radius (outside the field).
 */
export function falloffFactor(kind: SignalFalloff, dist: number, radius: number): number {
  if (radius <= 0 || dist >= radius) return 0;
  const t = 1 - dist / radius;
  switch (kind) {
    case "linear": return t;
    case "soft":   return t * t;
    case "none":   return 1;
  }
}
