/**
 * Focused Gathering — type vocabulary.
 *
 * A risk/reward minigame that replaces passive auto-gathering: the player
 * commits a node, clicks target circles in order and on time, and the scored
 * performance maps to a yield band. All times on targets are RELATIVE to the
 * session start (`session.startedAtMs`) so generation stays clock-free.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type FocusedGatherDifficulty = "easy" | "medium" | "hard" | "expert";

export type FocusedGatherPatternType =
  | "clockwise_arc"
  | "counterclockwise_arc"
  | "cross_fracture"
  | "center_out"
  | "spiral_in"
  | "zigzag"
  | "random_burst";

export type FocusedGatherTargetMovement =
  | "static"
  | "slow_drift"
  | "orbit_source"
  | "pulse_radius"
  | "jump"
  | "jitter";

/** Tuning bundle for one difficulty tier. Resolved per node. */
export interface FocusedGatherProfile {
  difficulty: FocusedGatherDifficulty;
  patternPool: readonly FocusedGatherPatternType[];
  targetCount: number;
  /** Largest clickable radius, in world pixels. */
  baseCircleRadius: number;
  /** Smallest clickable radius; targets randomize between min and base. */
  minCircleRadius: number;
  targetLifetimeMs: number;
  spawnDelayMinMs: number;
  spawnDelayMaxMs: number;
  /** How many targets may share a spawn wave. */
  simultaneousTargetLimit: number;
  movementTypes: readonly FocusedGatherTargetMovement[];
  staminaCost: number;
  cooldownMs: number;
  /** Units a normal-graded attempt yields; bands scale off this. */
  baseYield: number;
  excellentYieldMultiplier: number;
  goodYieldMultiplier: number;
  averageYieldMultiplier: number;
  poorYieldMultiplier: number;
  ruinedYieldMultiplier: number;
}

export type FocusedGatherTargetState = "pending" | "active" | "hit" | "missed";

export interface FocusedGatherTarget {
  id: string;
  orderIndex: number;
  /** Relative to session start. */
  spawnAtMs: number;
  /** Relative to session start. */
  expiresAtMs: number;
  /** Base (un-animated) world position. Movement is applied at read time. */
  position: Vec2;
  radius: number;
  movement: FocusedGatherTargetMovement;
  state: FocusedGatherTargetState;
  /** Relative-to-start time the target was hit, if it was. */
  hitAtMs?: number;
  /** 0..1 fraction of lifetime remaining when hit (1 = instant). */
  timingQuality?: number;
}

export type FocusedGatherSessionState = "active" | "completed" | "cancelled";

export interface FocusedGatherSession {
  sessionId: string;
  sourceId: string;
  sourceCenter: Vec2;
  profile: FocusedGatherProfile;
  startedAtMs: number;
  state: FocusedGatherSessionState;
  targets: FocusedGatherTarget[];
  successfulHits: number;
  missedTargets: number;
  wrongClicks: number;
  /** True once the first hit lands or the player is knocked away. */
  committed: boolean;
  completedAtMs?: number;
}

export interface FocusedGatherScore {
  totalTargets: number;
  successfulHits: number;
  missedTargets: number;
  wrongClicks: number;
  averageTimingQuality: number;
  completionTimeMs: number;
  maxTimeMs: number;
  finalScore: number;
}

export type FocusedGatherGrade = "excellent" | "good" | "average" | "poor" | "ruined";

export interface FocusedGatherResult {
  sourceId: string;
  finalScore: number;
  grade: FocusedGatherGrade;
  yieldMultiplier: number;
  bonusDropChanceMultiplier: number;
  xpMultiplier: number;
}

export interface FocusedGatherYieldItem {
  itemId: string;
  quantity: number;
}
