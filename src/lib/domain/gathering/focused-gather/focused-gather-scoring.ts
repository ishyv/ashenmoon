/**
 * Scoring. Performance collapses to a single 0..1 `finalScore` from four
 * weighted parts, which then maps to a five-band grade. A missed target lowers
 * the score; it never fails the run outright.
 */

import type { FocusedGatherGrade, FocusedGatherScore, FocusedGatherSession } from "./focused-gather-types";

const HIT_WEIGHT = 0.6;
const TIMING_WEIGHT = 0.25;
const SPEED_WEIGHT = 0.15;
const WRONG_CLICK_PENALTY = 0.05;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function scoreSession(session: FocusedGatherSession, nowMs: number): FocusedGatherScore {
  const totalTargets = Math.max(1, session.targets.length);
  const hits = session.targets.filter((t) => t.state === "hit");

  const averageTimingQuality =
    hits.length > 0 ? hits.reduce((sum, t) => sum + (t.timingQuality ?? 0), 0) / hits.length : 0;

  const maxTimeMs = session.targets.reduce((max, t) => Math.max(max, t.expiresAtMs), 1);
  const endMs = session.completedAtMs ?? nowMs;
  const completionTimeMs = Math.max(0, endMs - session.startedAtMs);

  const hitRatio = session.successfulHits / totalTargets;
  const speedScore = clamp01(1 - completionTimeMs / maxTimeMs);
  const penalty = session.wrongClicks * WRONG_CLICK_PENALTY;

  const finalScore = clamp01(
    HIT_WEIGHT * hitRatio + TIMING_WEIGHT * averageTimingQuality + SPEED_WEIGHT * speedScore - penalty,
  );

  return {
    totalTargets: session.targets.length,
    successfulHits: session.successfulHits,
    missedTargets: session.missedTargets,
    wrongClicks: session.wrongClicks,
    averageTimingQuality,
    completionTimeMs,
    maxTimeMs,
    finalScore,
  };
}

export function gradeFromScore(finalScore: number): FocusedGatherGrade {
  if (finalScore >= 0.9) return "excellent";
  if (finalScore >= 0.7) return "good";
  if (finalScore >= 0.45) return "average";
  if (finalScore >= 0.2) return "poor";
  return "ruined";
}
