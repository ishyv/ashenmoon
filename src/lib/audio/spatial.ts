/**
 * Pure audio math: spatialization and voice gating. No Web Audio here, so these
 * are unit-testable without a live AudioContext. The engine feeds them the
 * listener (player center) and a sound's world position.
 */

export interface Vec2 {
  x: number;
  y: number;
}

const TILE = 64;
/** Beyond this, a positioned sound is inaudible. */
export const AUDIO_MAX_DISTANCE = TILE * 14;
/** Horizontal offset at which a sound is panned fully to one side. */
const PAN_DISTANCE = TILE * 8;

/**
 * Distance attenuation + stereo pan for a sound at `pos` heard from `listener`.
 * Gain falls to 0 at AUDIO_MAX_DISTANCE (squared for a softer near-field);
 * pan tracks horizontal offset, clamped to [-1, 1].
 */
export function spatialGainPan(listener: Vec2, pos: Vec2): { gain: number; pan: number } {
  const dx = pos.x - listener.x;
  const dy = pos.y - listener.y;
  const dist = Math.hypot(dx, dy);
  const linear = Math.max(0, 1 - dist / AUDIO_MAX_DISTANCE);
  const pan = Math.max(-1, Math.min(1, dx / PAN_DISTANCE));
  return { gain: linear * linear, pan };
}

/** True if `id` played within `throttleMs` of `now` (drops same-sound spam). */
export function shouldThrottle(
  last: Map<string, number>,
  id: string,
  throttleMs: number | undefined,
  now: number,
): boolean {
  if (!throttleMs) return false;
  const prev = last.get(id);
  return prev !== undefined && now - prev < throttleMs;
}

/** Count of timestamps within `windowMs` of `now` (soft global voice cap). */
export function playsInWindow(times: readonly number[], now: number, windowMs: number): number {
  let n = 0;
  for (const t of times) if (now - t < windowMs) n++;
  return n;
}
