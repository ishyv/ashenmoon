/**
 * Session lifecycle: the pure state machine for an in-flight Focused Gathering
 * attempt. The engine owns a single session object and drives it through these
 * mutating transitions each frame; nothing here imports Svelte or Pixi.
 *
 * Movement is applied at *read* time (`targetCurrentPosition` /
 * `targetCurrentRadius`) from the elapsed clock, so hit-testing and rendering
 * always agree without storing animated positions back onto the target.
 */

import type {
  FocusedGatherProfile,
  FocusedGatherSession,
  FocusedGatherTarget,
  Vec2,
} from "./focused-gather-types";

export type ClickOutcome = "hit" | "wrong" | "ignored";

export function createSession(
  profile: FocusedGatherProfile,
  sourceId: string,
  sourceCenter: Vec2,
  targets: FocusedGatherTarget[],
  startedAtMs: number,
  sessionId = `fg-${startedAtMs}`,
): FocusedGatherSession {
  return {
    sessionId,
    sourceId,
    sourceCenter,
    profile,
    startedAtMs,
    state: "active",
    targets: targets.map((t) => ({ ...t, state: "pending" })),
    successfulHits: 0,
    missedTargets: 0,
    wrongClicks: 0,
    committed: false,
  };
}

/** Promote pending targets that have spawned and expire active ones past their window. */
export function tickSession(session: FocusedGatherSession, nowMs: number): void {
  if (session.state !== "active") return;
  const elapsed = nowMs - session.startedAtMs;
  for (const target of session.targets) {
    if (target.state === "pending" && elapsed >= target.spawnAtMs) {
      target.state = "active";
    }
    if (target.state === "active" && elapsed > target.expiresAtMs) {
      target.state = "missed";
      session.missedTargets++;
    }
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

/** Display position of a target, applying its movement behavior. */
export function targetCurrentPosition(
  target: FocusedGatherTarget,
  session: FocusedGatherSession,
  nowMs: number,
): Vec2 {
  const base = target.position;
  if (target.state === "hit" || target.state === "missed") return base;
  const t = (nowMs - session.startedAtMs) / 1000;
  const seed = target.orderIndex * 1.7;
  switch (target.movement) {
    case "slow_drift":
      return { x: base.x + Math.sin(t * 0.8 + seed) * 5, y: base.y + Math.cos(t * 0.7 + seed) * 5 };
    case "orbit_source": {
      const c = session.sourceCenter;
      const dx = base.x - c.x;
      const dy = base.y - c.y;
      const r = Math.hypot(dx, dy);
      const a0 = Math.atan2(dy, dx);
      const a = a0 + t * 0.9;
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
    }
    case "jump": {
      const step = Math.floor(t / 0.5);
      const ox = (hash(step + seed) - 0.5) * 16;
      const oy = (hash(step + seed + 99) - 0.5) * 16;
      return { x: base.x + ox, y: base.y + oy };
    }
    case "jitter":
      return { x: base.x + Math.sin(t * 30 + seed) * 3, y: base.y + Math.cos(t * 27 + seed) * 3 };
    case "pulse_radius":
    case "static":
    default:
      return base;
  }
}

/** Effective clickable radius (pulse_radius breathes; others are constant). */
export function targetCurrentRadius(
  target: FocusedGatherTarget,
  session: FocusedGatherSession,
  nowMs: number,
): number {
  if (target.movement !== "pulse_radius") return target.radius;
  const t = (nowMs - session.startedAtMs) / 1000;
  return target.radius * (0.85 + 0.15 * Math.sin(t * 4 + target.orderIndex));
}

/** The next target the player is expected to click: lowest-order active one. */
export function expectedTarget(session: FocusedGatherSession): FocusedGatherTarget | null {
  let best: FocusedGatherTarget | null = null;
  for (const target of session.targets) {
    if (target.state !== "active") continue;
    if (best === null || target.orderIndex < best.orderIndex) best = target;
  }
  return best;
}

function withinTarget(
  target: FocusedGatherTarget,
  session: FocusedGatherSession,
  point: Vec2,
  nowMs: number,
): boolean {
  const pos = targetCurrentPosition(target, session, nowMs);
  const radius = targetCurrentRadius(target, session, nowMs);
  return Math.hypot(point.x - pos.x, point.y - pos.y) <= radius;
}

/**
 * Register a click. A hit on the expected (lowest-order active) target counts;
 * a click anywhere else while targets are active is a wrong click (score-only
 * penalty, never an instant fail). Clicks with nothing active are ignored.
 */
export function registerClick(
  session: FocusedGatherSession,
  point: Vec2,
  nowMs: number,
): ClickOutcome {
  if (session.state !== "active") return "ignored";
  const expected = expectedTarget(session);
  if (expected === null) return "ignored";

  if (withinTarget(expected, session, point, nowMs)) {
    const elapsed = nowMs - session.startedAtMs;
    const lifetime = Math.max(1, expected.expiresAtMs - expected.spawnAtMs);
    const remaining = expected.expiresAtMs - elapsed;
    expected.state = "hit";
    expected.hitAtMs = elapsed;
    expected.timingQuality = Math.max(0, Math.min(1, remaining / lifetime));
    session.successfulHits++;
    session.committed = true;
    return "hit";
  }

  session.wrongClicks++;
  return "wrong";
}

/** Every target has resolved (hit or missed). */
export function isComplete(session: FocusedGatherSession): boolean {
  return session.targets.every((t) => t.state === "hit" || t.state === "missed");
}

/**
 * Mark the session finished. Any still-unresolved targets count as missed —
 * used both on natural completion and on a committed cancel (knockback).
 */
export function finalizeSession(
  session: FocusedGatherSession,
  nowMs: number,
  state: "completed" | "cancelled" = "completed",
): void {
  for (const target of session.targets) {
    if (target.state === "pending" || target.state === "active") {
      target.state = "missed";
      session.missedTargets++;
    }
  }
  session.state = state;
  session.completedAtMs = nowMs;
}
