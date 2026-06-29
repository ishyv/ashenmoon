import type { Vec2 } from "../weapons/weapon-types";
import type { EnemyAttackDefinition, EnemyAttackPhase, EnemyAttackStartInput } from "./enemy-attack-types";

export interface EnemyAttackRuntime {
  readonly attack: EnemyAttackDefinition;
  readonly phase: EnemyAttackPhase;
  readonly elapsedMs: number;
  readonly origin: Vec2;
  readonly lockedDirection: Vec2;
  readonly distanceMovedPx: number;
  readonly didHit: boolean;
  readonly justBecameActive: boolean;
}

function normalizeDirection(direction: Vec2): Vec2 {
  const len = Math.hypot(direction.x, direction.y);
  if (len <= 0.0001) return { x: 1, y: 0 };
  return { x: direction.x / len, y: direction.y / len };
}

export function enemyAttackPhaseAtElapsed(attack: EnemyAttackDefinition, elapsedMs: number): EnemyAttackPhase {
  if (elapsedMs < attack.windupMs) return "windup";
  if (elapsedMs < attack.windupMs + attack.activeMs) return "active";
  if (elapsedMs < attack.windupMs + attack.activeMs + attack.recoveryMs) return "recovery";
  return "done";
}

export function startEnemyAttackRuntime(input: EnemyAttackStartInput): EnemyAttackRuntime {
  return {
    attack: input.attack,
    phase: "windup",
    elapsedMs: 0,
    origin: input.origin,
    lockedDirection: normalizeDirection(input.direction),
    distanceMovedPx: 0,
    didHit: false,
    justBecameActive: false,
  };
}

export function advanceEnemyAttackRuntime(runtime: EnemyAttackRuntime, deltaMs: number): EnemyAttackRuntime {
  const nextElapsedMs = runtime.elapsedMs + Math.max(0, deltaMs);
  const previousPhase = runtime.phase;
  const phase = enemyAttackPhaseAtElapsed(runtime.attack, nextElapsedMs);
  return {
    ...runtime,
    phase,
    elapsedMs: nextElapsedMs,
    justBecameActive: previousPhase !== "active" && phase === "active",
  };
}
