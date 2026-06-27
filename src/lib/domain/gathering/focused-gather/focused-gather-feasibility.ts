import type {
  FocusedGatherProfile,
  FocusedGatherTarget,
} from "./focused-gather-types";

export interface FocusedGatherFeasibilityOptions {
  readonly reactionTimeMs?: number;
  readonly pointerSpeedPxPerMs?: number;
  readonly safetyMarginMs?: number;
}

export interface FocusedGatherFeasibilityResult {
  readonly targetCount: number;
  readonly totalDistancePx: number;
  readonly availableTimeMs: number;
  readonly estimatedRequiredTimeMs: number;
  readonly feasible: boolean;
  readonly difficultyScore: number;
}

export const DEFAULT_FOCUSED_GATHER_FEASIBILITY = {
  reactionTimeMs: 220,
  pointerSpeedPxPerMs: 1.2,
  safetyMarginMs: 250,
} as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function orderedTargets(targets: readonly FocusedGatherTarget[]): FocusedGatherTarget[] {
  return [...targets].sort((a, b) => a.orderIndex - b.orderIndex);
}

function sequentialTravelDistance(targets: readonly FocusedGatherTarget[]): number {
  const ordered = orderedTargets(targets);
  let total = 0;
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]!;
    const current = ordered[i]!;
    total += Math.hypot(current.position.x - prev.position.x, current.position.y - prev.position.y);
  }
  return total;
}

function availableWindowMs(targets: readonly FocusedGatherTarget[], profile: FocusedGatherProfile): number {
  if (targets.length === 0) return 0;
  const lastExpiry = targets.reduce((max, target) => Math.max(max, target.expiresAtMs), 0);
  return Math.max(0, lastExpiry, profile.targetLifetimeMs);
}

export function estimateFocusedGatherFeasibility(
  targets: readonly FocusedGatherTarget[],
  profile: FocusedGatherProfile,
  options: FocusedGatherFeasibilityOptions = {},
): FocusedGatherFeasibilityResult {
  const reactionTimeMs = options.reactionTimeMs ?? DEFAULT_FOCUSED_GATHER_FEASIBILITY.reactionTimeMs;
  const pointerSpeedPxPerMs = options.pointerSpeedPxPerMs ?? DEFAULT_FOCUSED_GATHER_FEASIBILITY.pointerSpeedPxPerMs;
  const safetyMarginMs = options.safetyMarginMs ?? DEFAULT_FOCUSED_GATHER_FEASIBILITY.safetyMarginMs;

  const targetCount = targets.length;
  const totalDistancePx = sequentialTravelDistance(targets);
  const availableTimeMs = availableWindowMs(targets, profile);
  const estimatedRequiredTimeMs =
    targetCount * reactionTimeMs +
    totalDistancePx / Math.max(0.01, pointerSpeedPxPerMs) +
    safetyMarginMs;

  const ratio = estimatedRequiredTimeMs / Math.max(1, availableTimeMs);

  return {
    targetCount,
    totalDistancePx,
    availableTimeMs,
    estimatedRequiredTimeMs,
    feasible: targetCount > 0 && estimatedRequiredTimeMs <= availableTimeMs,
    difficultyScore: clamp01(ratio),
  };
}
