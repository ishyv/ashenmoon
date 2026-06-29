import type { Vec2 } from "./weapon-types";

export interface GuardResolutionInput {
  incomingDamage: number;
  currentStamina: number;
  guardAngleRad: number;
  sourceVector: Vec2;
  reductionPct: number;
  staminaCostMultiplier: number;
  frontalArcDegrees: number;
}

export interface GuardResolution {
  damage: number;
  staminaCost: number;
  guarded: boolean;
  broken: boolean;
}

function normalize(v: Vec2): Vec2 | null {
  const len = Math.hypot(v.x, v.y);
  if (len <= 0.0001) return null;
  return { x: v.x / len, y: v.y / len };
}

function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function resolveGuardedDamage(input: GuardResolutionInput): GuardResolution {
  const source = normalize(input.sourceVector);
  if (!source || input.incomingDamage <= 0) {
    return { damage: input.incomingDamage, staminaCost: 0, guarded: false, broken: false };
  }

  const sourceAngle = Math.atan2(source.y, source.x);
  const halfArc = (input.frontalArcDegrees * Math.PI) / 360;
  if (Math.abs(angleDelta(sourceAngle, input.guardAngleRad)) > halfArc) {
    return { damage: input.incomingDamage, staminaCost: 0, guarded: false, broken: false };
  }

  const fullStaminaCost = Math.ceil(input.incomingDamage * input.staminaCostMultiplier);
  const paidStamina = Math.min(input.currentStamina, fullStaminaCost);
  const paidRatio = fullStaminaCost > 0 ? paidStamina / fullStaminaCost : 1;
  const effectiveReduction = input.reductionPct * paidRatio;
  const damage = Math.max(0, Math.round(input.incomingDamage * (1 - effectiveReduction)));

  return {
    damage,
    staminaCost: paidStamina,
    guarded: true,
    broken: paidStamina < fullStaminaCost,
  };
}
