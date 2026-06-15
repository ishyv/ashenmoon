/**
 * MELEE_FORGIVENESS: the range is extended by this factor on the release frame
 * so a strike can still land even if the target walked slightly out of range
 * during the windup window. Surfaces this constant for tests and future AI.
 */
export const MELEE_FORGIVENESS = 1.4;

export interface MeleeHitRequest {
  attackerX: number;
  attackerY: number;
  targetX: number;
  targetY: number;
  rangePx: number;
  /** Multiplier applied to rangePx on the release frame. Defaults to 1.0 (exact range). */
  forgiveness?: number;
}

export type MeleeHitResult =
  | { hit: true }
  | { hit: false; reason: "out_of_range" };

export function resolveMeleeHit(req: MeleeHitRequest): MeleeHitResult {
  const dist = Math.hypot(req.targetX - req.attackerX, req.targetY - req.attackerY);
  if (dist > req.rangePx * (req.forgiveness ?? 1.0)) {
    return { hit: false, reason: "out_of_range" };
  }
  return { hit: true };
}
