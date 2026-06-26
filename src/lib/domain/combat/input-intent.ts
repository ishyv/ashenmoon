/**
 * Input intent classification for weapon-driven combat.
 *
 * Raw pointer + stance state in, a single weapon-agnostic `InputIntent` out. The
 * weapon decides what each intent *does*; this file only decides which gesture
 * the player performed. Pure — the runtime passes a snapshot, never the live
 * InputResource.
 *
 * Gesture vocabulary: tap (quick click), hold (press without travel), swipe
 * (deliberate armed drag). Holding the stance modifier promotes each to its
 * stance variant. Right click never reaches here — it stays interaction/gather.
 */
import { distanceBetween, normalizeVec2, type Vec2 } from "./driving-thrust";
import type { AttackInputKind } from "./weapons/weapon-types";

export interface InputIntentConfig {
  /** At or below this hold time with no travel, the gesture is a tap. */
  tapMaxDurationMs: number;
  /** At or above this hold time with no travel, the gesture is a hold. */
  holdMinDurationMs: number;
  /** A swipe must travel at least this far. */
  swipeMinDistancePx: number;
  /** A swipe qualifies on speed (fast flick) at any hold within the window... */
  swipeMinSpeedPxPerMs: number;
  /** ...or on a slow deliberate drag held at least this long. */
  swipeMinHoldMs: number;
  /** Travel below this is treated as jitter, never a swipe. */
  deadzonePx: number;
}

export const DEFAULT_INPUT_INTENT_CONFIG: InputIntentConfig = {
  tapMaxDurationMs: 180,
  holdMinDurationMs: 240,
  swipeMinDistancePx: 48,
  swipeMinSpeedPxPerMs: 0.16,
  swipeMinHoldMs: 120,
  deadzonePx: 14,
};

export interface AttackInputSnapshot {
  /** Pointer-down position (screen space is fine; only deltas matter). */
  start: Vec2;
  /** Pointer-up position. */
  end: Vec2;
  downAtMs: number;
  upAtMs: number;
  /** Unit vector from the player toward the cursor at release. */
  clickDirection: Vec2;
  /** Whether the stance modifier (Ctrl by default) was held at release. */
  stanceHeld: boolean;
}

export interface InputIntent {
  kind: AttackInputKind;
  /** Aim/travel direction the attack should use (unit vector). */
  direction: Vec2;
  holdDurationMs: number;
}

/** Base gesture before the stance modifier is applied. */
type BaseGesture = "tap" | "hold" | "swipe";

function applyStance(base: BaseGesture, stanceHeld: boolean): AttackInputKind {
  if (!stanceHeld) return base;
  return base === "tap" ? "stance_tap" : base === "hold" ? "stance_hold" : "stance_swipe";
}

export function classifyInputIntent(
  snapshot: AttackInputSnapshot,
  config: InputIntentConfig = DEFAULT_INPUT_INTENT_CONFIG,
): InputIntent {
  const heldMs = Math.max(0, snapshot.upAtMs - snapshot.downAtMs);
  const travelPx = distanceBetween(snapshot.start, snapshot.end);
  const dragDirection = normalizeVec2({
    x: snapshot.end.x - snapshot.start.x,
    y: snapshot.end.y - snapshot.start.y,
  });

  const speedPxPerMs = travelPx / Math.max(1, heldMs);
  const isSwipe =
    travelPx >= Math.max(config.swipeMinDistancePx, config.deadzonePx) &&
    dragDirection !== null &&
    (speedPxPerMs >= config.swipeMinSpeedPxPerMs || heldMs >= config.swipeMinHoldMs);

  if (isSwipe && dragDirection) {
    return {
      kind: applyStance("swipe", snapshot.stanceHeld),
      direction: dragDirection,
      holdDurationMs: heldMs,
    };
  }

  // Not a swipe: decide tap vs hold by how long the button was down. Travel inside
  // the deadzone is ignored so a small jitter while holding still reads as a hold.
  const base: BaseGesture = heldMs >= config.holdMinDurationMs ? "hold" : "tap";
  return {
    kind: applyStance(base, snapshot.stanceHeld),
    direction: snapshot.clickDirection,
    holdDurationMs: heldMs,
  };
}
