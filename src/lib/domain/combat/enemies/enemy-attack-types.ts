import type { AttackHitShapeDefinition, AttackStatusEffectDefinition, Vec2 } from "../weapons/weapon-types";

export type EnemyAttackPhase = "windup" | "active" | "recovery" | "done";

export type EnemyTelegraphKind = "body" | "line" | "cone" | "circle";

export interface EnemyAttackTelegraph {
  readonly kind: EnemyTelegraphKind;
  readonly windupColor?: number;
  readonly activeColor?: number;
}

export interface EnemyAttackMovement {
  readonly kind: "none" | "lunge" | "charge" | "retreat";
  readonly speedPxPerSec?: number;
  readonly maxDistancePx?: number;
  readonly turnLock?: boolean;
}

export interface EnemyAttackDefinition {
  readonly id: string;
  readonly name: string;
  readonly rangePx: number;
  readonly windupMs: number;
  readonly activeMs: number;
  readonly recoveryMs: number;
  readonly cooldownMs: number;
  readonly damage: number;
  readonly knockbackPx: number;
  readonly hitShape: AttackHitShapeDefinition;
  readonly telegraph: EnemyAttackTelegraph;
  readonly movement?: EnemyAttackMovement;
  readonly statusEffects?: readonly AttackStatusEffectDefinition[];
}

export interface EnemyAttackStartInput {
  readonly attack: EnemyAttackDefinition;
  readonly origin: Vec2;
  readonly direction: Vec2;
}
