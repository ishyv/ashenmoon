export type FellSweepChargeStage = "none" | "bracing" | "building" | "critical" | "full";

export interface Vec2 {
  x: number;
  y: number;
}

export interface FellSweepConfig {
  holdStartMs: number;
  fullChargeMs: number;
  staminaBaseCost: number;
  staminaMinCost: number;
  staminaCostReductionPerLevel: number;
  cooldownBaseSec: number;
  cooldownMinSec: number;
  cooldownReductionPerLevel: number;
  damageMinMultiplier: number;
  damageMaxMultiplier: number;
  reachMinMultiplier: number;
  reachMaxMultiplier: number;
  arcMinMultiplier: number;
  arcMaxMultiplier: number;
  knockbackMinMultiplier: number;
  knockbackMaxMultiplier: number;
  chargeMoveSpeedMinMultiplier: number;
  chargeMoveSpeedMaxMultiplier: number;
  whirlRequiredTurnRad: number;
  whirlDamageMultiplier: number;
  whirlReachMultiplier: number;
  whirlKnockbackMultiplier: number;
}

export interface FellSweepChargeState {
  isCharging: boolean;
  startedAtMs: number;
  heldMs: number;
  chargeProgress: number;
  chargeStage: FellSweepChargeStage;
  wasDeniedThisHold: boolean;
  aimDirection: Vec2;
  lastStage: FellSweepChargeStage;
  interrupted: boolean;
  isWhirlReady: boolean;
  whirlAngularTravelRad: number;
  lastWhirlAimAngleRad: number | null;
}

export interface FellSweepScaling {
  damage: number;
  reach: number;
  arcHalfAngle: number;
  knockback: number;
}

export const DEFAULT_FELL_SWEEP_CONFIG: FellSweepConfig = {
  holdStartMs: 200,
  fullChargeMs: 1500,
  staminaBaseCost: 20,
  staminaMinCost: 10,
  staminaCostReductionPerLevel: 1,
  cooldownBaseSec: 8.0,
  cooldownMinSec: 4.0,
  cooldownReductionPerLevel: 0.4,
  damageMinMultiplier: 1.8,
  damageMaxMultiplier: 3.5,
  reachMinMultiplier: 1.2,
  reachMaxMultiplier: 1.5,
  arcMinMultiplier: 1.0,
  arcMaxMultiplier: 1.3,
  knockbackMinMultiplier: 1.5,
  knockbackMaxMultiplier: 2.8,
  chargeMoveSpeedMinMultiplier: 0.85,
  chargeMoveSpeedMaxMultiplier: 0.45,
  whirlRequiredTurnRad: Math.PI * 2,
  whirlDamageMultiplier: 1.3,
  whirlReachMultiplier: 1.2,
  whirlKnockbackMultiplier: 1.35,
};

export function createInitialFellSweepChargeState(): FellSweepChargeState {
  return {
    isCharging: false,
    startedAtMs: 0,
    heldMs: 0,
    chargeProgress: 0,
    chargeStage: "none",
    wasDeniedThisHold: false,
    aimDirection: { x: 1, y: 0 },
    lastStage: "none",
    interrupted: false,
    isWhirlReady: false,
    whirlAngularTravelRad: 0,
    lastWhirlAimAngleRad: null,
  };
}

export function chargeProgressFromHeldMs(
  heldMs: number,
  config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG,
): number {
  if (heldMs < config.holdStartMs) return 0;
  const chargeWindowMs = Math.max(1, config.fullChargeMs - config.holdStartMs);
  return Math.min(1, Math.max(0, (heldMs - config.holdStartMs) / chargeWindowMs));
}

export function fellSweepStage(progress: number): FellSweepChargeStage {
  if (progress >= 1) return "full";
  if (progress >= 0.75) return "critical";
  if (progress >= 0.4) return "building";
  if (progress >= 0.1) return "bracing";
  return "none";
}

export function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * Math.min(1, Math.max(0, t));
}

export function fellSweepCost(level: number, config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG): number {
  return Math.max(
    config.staminaMinCost,
    config.staminaBaseCost - Math.max(0, level - 1) * config.staminaCostReductionPerLevel,
  );
}

export function fellSweepCooldown(level: number, config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG): number {
  return Math.max(
    config.cooldownMinSec,
    config.cooldownBaseSec - Math.max(0, level - 1) * config.cooldownReductionPerLevel,
  );
}

export function fellSweepMoveMultiplier(
  progress: number,
  config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG,
): number {
  return lerp(config.chargeMoveSpeedMinMultiplier, config.chargeMoveSpeedMaxMultiplier, progress);
}

export function fellSweepScaling(
  progress: number,
  combatConfig: { damage: number; reach: number; arcHalfAngle: number; knockback: number },
  config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG,
  isWhirlReady = false,
): FellSweepScaling {
  const base = {
    damage: Math.round(combatConfig.damage * lerp(config.damageMinMultiplier, config.damageMaxMultiplier, progress)),
    reach: combatConfig.reach * lerp(config.reachMinMultiplier, config.reachMaxMultiplier, progress),
    arcHalfAngle: combatConfig.arcHalfAngle * lerp(config.arcMinMultiplier, config.arcMaxMultiplier, progress),
    knockback: combatConfig.knockback * lerp(config.knockbackMinMultiplier, config.knockbackMaxMultiplier, progress),
  };
  if (!isWhirlReady) return base;
  return {
    damage: Math.round(base.damage * config.whirlDamageMultiplier),
    reach: base.reach * config.whirlReachMultiplier,
    arcHalfAngle: Math.PI,
    knockback: base.knockback * config.whirlKnockbackMultiplier,
  };
}

export function normalizeAimDirection(dx: number, dy: number, fallback: Vec2 = { x: 1, y: 0 }): Vec2 {
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return fallback;
  return { x: dx / len, y: dy / len };
}

export interface FellSweepWhirlTrackingState {
  isWhirlReady: boolean;
  whirlAngularTravelRad: number;
  lastWhirlAimAngleRad: number | null;
}

function normalizeSignedAngleDelta(delta: number): number {
  let d = delta;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function trackFellSweepWhirl<T extends FellSweepWhirlTrackingState>(
  state: T,
  aimAngleRad: number,
  config: FellSweepConfig = DEFAULT_FELL_SWEEP_CONFIG,
): T {
  if (state.lastWhirlAimAngleRad === null) {
    return { ...state, lastWhirlAimAngleRad: aimAngleRad };
  }

  const delta = normalizeSignedAngleDelta(aimAngleRad - state.lastWhirlAimAngleRad);
  const whirlAngularTravelRad = state.whirlAngularTravelRad + Math.abs(delta);
  return {
    ...state,
    lastWhirlAimAngleRad: aimAngleRad,
    whirlAngularTravelRad,
    isWhirlReady: state.isWhirlReady || whirlAngularTravelRad >= config.whirlRequiredTurnRad,
  };
}

export function smoothFellSweepAim(current: Vec2, target: Vec2, chargeProgress: number): Vec2 {
  const alpha = lerp(0.35, 0.13, chargeProgress);
  return normalizeAimDirection(
    current.x + (target.x - current.x) * alpha,
    current.y + (target.y - current.y) * alpha,
    current,
  );
}

export function isPointInsideFissure(
  origin: Vec2,
  direction: Vec2,
  lengthPx: number,
  widthPx: number,
  point: Vec2,
  pointRadiusPx = 0
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const along = dx * direction.x + dy * direction.y;
  if (along < -pointRadiusPx || along > lengthPx + pointRadiusPx) return false;
  const perpX = dx - direction.x * along;
  const perpY = dy - direction.y * along;
  return Math.hypot(perpX, perpY) <= widthPx / 2 + pointRadiusPx;
}
