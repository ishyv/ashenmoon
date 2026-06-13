export interface Vec2 {
  x: number;
  y: number;
}

export type CrosscutGrade = "excellent" | "good" | "weak";

export interface CrosscutEffectConfig {
  damageMultiplier: number;
  knockbackMultiplier: number;
  bleedChancePct: number;
  bleedDurationSec: number;
  bleedTickEverySec: number;
  bleedDamagePerTick: number;
  bleedImmediateDamage: number;
}

export interface CrosscutComboConfig {
  comboWindowMs: number;
  minFirstClickDistancePx: number;
  minSecondClickDistancePx: number;
  minDistanceBetweenClicksPx: number;
  maxClickDistancePx: number;
  perfectAngleDegrees: number;
  excellentToleranceDegrees: number;
  goodToleranceDegrees: number;
  minimumToleranceDegrees: number;
  staminaCosts: Record<CrosscutGrade, number>;
  comboCooldownMs: number;
  effects: Record<CrosscutGrade, CrosscutEffectConfig>;
  windowDecayRate: number;
  minComboWindowMs: number;
  damageStackMultiplier: number;
  bleedChanceStackBonus: number;
  bleedDamageStackBonus: number;
  bleedImmediateDamageStackBonus: number;
}

export interface CrosscutComboState {
  firstClickWorldPosition: Vec2 | null;
  firstPlayerPosition: Vec2 | null;
  firstDirection: Vec2 | null;
  firstAttackAtMs: number | null;
  cooldownUntilMs: number;
  stacks: number;
}

export type CrosscutFailureReason =
  | "no_starter"
  | "expired"
  | "cooldown"
  | "first_click_too_close"
  | "second_click_too_close"
  | "clicks_too_close"
  | "bad_angle"
  | "insufficient_stamina"
  | "too_far_from_player";

export interface CrosscutComboResult {
  triggered: boolean;
  reason?: CrosscutFailureReason;
  expired?: boolean;
  grade?: CrosscutGrade;
  angleDegrees?: number;
  angleErrorDegrees?: number;
  damageMultiplier?: number;
  knockbackMultiplier?: number;
  bleedChancePct?: number;
  bleedDurationSec?: number;
  bleedTickEverySec?: number;
  bleedDamagePerTick?: number;
  bleedImmediateDamage?: number;
  staminaCost?: number;
}

export interface StoreFirstCrosscutClickInput {
  clickWorldPosition: Vec2;
  playerPosition: Vec2;
  nowMs: number;
  config: CrosscutComboConfig;
}

export interface TryResolveCrosscutComboInput {
  state: CrosscutComboState;
  config: CrosscutComboConfig;
  nowMs: number;
  playerPosition: Vec2;
  clickWorldPosition: Vec2;
  currentStamina: number;
}

const RAD_TO_DEG = 180 / Math.PI;

export const DEFAULT_CROSSCUT_COMBO_CONFIG: CrosscutComboConfig = {
  comboWindowMs: 950,
  minFirstClickDistancePx: 32,
  minSecondClickDistancePx: 128,
  minDistanceBetweenClicksPx: 128,
  maxClickDistancePx: 300,
  perfectAngleDegrees: 90,
  excellentToleranceDegrees: 10,
  goodToleranceDegrees: 15,
  minimumToleranceDegrees: 18,
  staminaCosts: {
    weak: 10,
    good: 5,
    excellent: 1,
  },
  comboCooldownMs: 1,
  effects: {
    weak: {
      damageMultiplier: 1.15,
      knockbackMultiplier: 1.1,
      bleedChancePct: 10,
      bleedDurationSec: 6,
      bleedTickEverySec: 2,
      bleedDamagePerTick: 1,
      bleedImmediateDamage: 1,
    },
    good: {
      damageMultiplier: 1.35,
      knockbackMultiplier: 1.35,
      bleedChancePct: 22,
      bleedDurationSec: 6,
      bleedTickEverySec: 2,
      bleedDamagePerTick: 2,
      bleedImmediateDamage: 2,
    },
    excellent: {
      damageMultiplier: 1.65,
      knockbackMultiplier: 1.75,
      bleedChancePct: 35,
      bleedDurationSec: 6,
      bleedTickEverySec: 2,
      bleedDamagePerTick: 3,
      bleedImmediateDamage: 3,
    },
  },
  windowDecayRate: 0.85,
  minComboWindowMs: 200,
  damageStackMultiplier: 0.15,
  bleedChanceStackBonus: 10,
  bleedDamageStackBonus: 1,
  bleedImmediateDamageStackBonus: 1,
};

export function createDefaultCrosscutComboConfig(): CrosscutComboConfig {
  return {
    ...DEFAULT_CROSSCUT_COMBO_CONFIG,
    staminaCosts: { ...DEFAULT_CROSSCUT_COMBO_CONFIG.staminaCosts },
    effects: {
      weak: { ...DEFAULT_CROSSCUT_COMBO_CONFIG.effects.weak },
      good: { ...DEFAULT_CROSSCUT_COMBO_CONFIG.effects.good },
      excellent: { ...DEFAULT_CROSSCUT_COMBO_CONFIG.effects.excellent },
    },
  };
}

export function createInitialCrosscutComboState(): CrosscutComboState {
  return {
    firstClickWorldPosition: null,
    firstPlayerPosition: null,
    firstDirection: null,
    firstAttackAtMs: null,
    cooldownUntilMs: 0,
    stacks: 0,
  };
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalize(v: Vec2): Vec2 | null {
  const len = Math.hypot(v.x, v.y);
  if (len <= 0.0001) return null;
  return { x: v.x / len, y: v.y / len };
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getAngleBetweenDegrees(a: Vec2, b: Vec2): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  const dot = clamp(na.x * nb.x + na.y * nb.y, -1, 1);
  return Math.acos(dot) * RAD_TO_DEG;
}

export function getCrosscutGrade(
  angleErrorDegrees: number,
  config: CrosscutComboConfig,
): CrosscutGrade | null {
  if (angleErrorDegrees <= config.excellentToleranceDegrees) return "excellent";
  if (angleErrorDegrees <= config.goodToleranceDegrees) return "good";
  if (angleErrorDegrees <= config.minimumToleranceDegrees) return "weak";
  return null;
}

export function clearCrosscutState(state: CrosscutComboState): void {
  state.firstClickWorldPosition = null;
  state.firstPlayerPosition = null;
  state.firstDirection = null;
  state.firstAttackAtMs = null;
  state.stacks = 0;
}

export function storeFirstCrosscutClick(
  state: CrosscutComboState,
  input: StoreFirstCrosscutClickInput,
): boolean {
  const dist = distance(input.playerPosition, input.clickWorldPosition);
  if (dist > input.config.maxClickDistancePx) {
    return false;
  }
  state.firstClickWorldPosition = { ...input.clickWorldPosition };
  state.firstPlayerPosition = { ...input.playerPosition };
  state.firstDirection = null;
  state.firstAttackAtMs = input.nowMs;
  return true;
}

export function getSegmentAxis(dir: Vec2): "horizontal" | "vertical" | "diagonal" {
  const thetaDeg = Math.abs(Math.atan2(dir.y, dir.x) * 180 / Math.PI);
  const errorH = Math.min(thetaDeg, 180 - thetaDeg);
  const errorV = Math.abs(90 - thetaDeg);
  const errorD1 = Math.abs(45 - thetaDeg);
  const errorD2 = Math.abs(135 - thetaDeg);
  const minErr = Math.min(errorH, errorV, errorD1, errorD2);
  if (minErr === errorH) return "horizontal";
  if (minErr === errorV) return "vertical";
  return "diagonal";
}

export function tryResolveCrosscutCombo(
  input: TryResolveCrosscutComboInput,
): CrosscutComboResult {
  const { state, config } = input;
  if (
    !state.firstClickWorldPosition ||
    state.firstAttackAtMs === null
  ) {
    return { triggered: false, reason: "no_starter" };
  }

  const currentComboWindowMs = Math.max(
    config.minComboWindowMs,
    config.comboWindowMs * Math.pow(config.windowDecayRate, state.stacks)
  );

  if (input.nowMs > state.firstAttackAtMs + currentComboWindowMs) {
    return { triggered: false, reason: "expired", expired: true };
  }

  if (input.nowMs < state.cooldownUntilMs) {
    return { triggered: false, reason: "cooldown" };
  }

  const clickDistToPlayer = distance(input.playerPosition, input.clickWorldPosition);
  if (clickDistToPlayer > config.maxClickDistancePx) {
    return { triggered: false, reason: "too_far_from_player" };
  }

  const clickDistance = distance(state.firstClickWorldPosition, input.clickWorldPosition);
  if (clickDistance < config.minDistanceBetweenClicksPx) {
    return { triggered: false, reason: "clicks_too_close" };
  }

  const currentDirection = normalize(subtract(input.clickWorldPosition, state.firstClickWorldPosition));
  if (!currentDirection) {
    return { triggered: false, reason: "second_click_too_close" };
  }

  const thetaDeg = Math.abs(Math.atan2(currentDirection.y, currentDirection.x) * RAD_TO_DEG);
  const errorH = Math.min(thetaDeg, 180 - thetaDeg);
  const errorV = Math.abs(90 - thetaDeg);
  const errorD1 = Math.abs(45 - thetaDeg);
  const errorD2 = Math.abs(135 - thetaDeg);
  const angleErrorDegrees = Math.min(errorH, errorV, errorD1, errorD2);

  const grade = getCrosscutGrade(angleErrorDegrees, config);
  if (!grade) {
    return { triggered: false, reason: "bad_angle" };
  }

  const angleDegrees = state.firstDirection
    ? getAngleBetweenDegrees(state.firstDirection, currentDirection)
    : config.perfectAngleDegrees;

  const staminaCost = config.staminaCosts[grade];
  if (input.currentStamina < staminaCost) {
    return { triggered: false, reason: "insufficient_stamina", angleDegrees, angleErrorDegrees, grade };
  }

  const baseEffects = config.effects[grade];
  const stacks = state.stacks;

  const damageMultiplier = baseEffects.damageMultiplier + stacks * config.damageStackMultiplier;
  const bleedChancePct = Math.min(100, baseEffects.bleedChancePct + stacks * config.bleedChanceStackBonus);
  const bleedDamagePerTick = baseEffects.bleedDamagePerTick + stacks * config.bleedDamageStackBonus;
  const bleedImmediateDamage = baseEffects.bleedImmediateDamage + stacks * config.bleedImmediateDamageStackBonus;

  return {
    triggered: true,
    grade,
    angleDegrees,
    angleErrorDegrees,
    staminaCost,
    damageMultiplier,
    knockbackMultiplier: baseEffects.knockbackMultiplier,
    bleedChancePct,
    bleedDurationSec: baseEffects.bleedDurationSec,
    bleedTickEverySec: baseEffects.bleedTickEverySec,
    bleedDamagePerTick,
    bleedImmediateDamage,
  };
}

export interface AdvanceCrosscutChainInput {
  clickWorldPosition: Vec2;
  playerPosition: Vec2;
  nowMs: number;
}

export function advanceCrosscutChain(
  state: CrosscutComboState,
  input: AdvanceCrosscutChainInput,
): void {
  if (!state.firstClickWorldPosition) {
    clearCrosscutState(state);
    return;
  }

  const currentDirection = normalize(subtract(input.clickWorldPosition, state.firstClickWorldPosition));
  if (!currentDirection) {
    clearCrosscutState(state);
    return;
  }
  state.firstClickWorldPosition = { ...input.clickWorldPosition };
  state.firstPlayerPosition = { ...input.playerPosition };
  state.firstDirection = currentDirection;
  state.firstAttackAtMs = input.nowMs;
  state.stacks += 1;
}
