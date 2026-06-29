import { hitShapeContains } from "../weapons/hit-shapes";
import type { Vec2 } from "../weapons/weapon-types";
import type { EnemyAttackDefinition } from "./enemy-attack-types";

export interface EnemyAttackHitInput {
  readonly attack: EnemyAttackDefinition;
  readonly origin: Vec2;
  readonly direction: Vec2;
  readonly target: Vec2;
  readonly targetRadiusPx?: number;
}

function aimAngleFor(direction: Vec2): number {
  const len = Math.hypot(direction.x, direction.y);
  if (len <= 0.0001) return 0;
  return Math.atan2(direction.y / len, direction.x / len);
}

export function enemyAttackHitsTarget(input: EnemyAttackHitInput): boolean {
  const args = {
    shape: input.attack.hitShape,
    origin: input.origin,
    aimAngle: aimAngleFor(input.direction),
    point: input.target,
    ...(input.targetRadiusPx !== undefined ? { pointRadiusPx: input.targetRadiusPx } : {}),
  };
  return hitShapeContains(args);
}
