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
  | "insufficient_stamina";

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
  comboWindowMs: 650,
  minFirstClickDistancePx: 32,
  minSecondClickDistancePx: 32,
  minDistanceBetweenClicksPx: 48,
  perfectAngleDegrees: 90,
  excellentToleranceDegrees: 12,
  goodToleranceDegrees: 24,
  minimumToleranceDegrees: 36,
  staminaCosts: {
    weak: 6,
    good: 8,
    excellent: 10,
  },
  comboCooldownMs: 1200,
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
  const firstDistance = distance(input.clickWorldPosition, input.playerPosition);
  if (firstDistance < input.config.minFirstClickDistancePx) {
    clearCrosscutState(state);
    return false;
  }

  const firstDirection = normalize(subtract(input.clickWorldPosition, input.playerPosition));
  if (!firstDirection) {
    clearCrosscutState(state);
    return false;
  }

  state.firstClickWorldPosition = { ...input.clickWorldPosition };
  state.firstPlayerPosition = { ...input.playerPosition };
  state.firstDirection = firstDirection;
  state.firstAttackAtMs = input.nowMs;
  return true;
}

export function tryResolveCrosscutCombo(
  input: TryResolveCrosscutComboInput,
): CrosscutComboResult {
  const { state, config } = input;
  if (
    !state.firstClickWorldPosition ||
    !state.firstPlayerPosition ||
    !state.firstDirection ||
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

  const firstDistance = distance(state.firstClickWorldPosition, state.firstPlayerPosition);
  if (firstDistance < config.minFirstClickDistancePx) {
    return { triggered: false, reason: "first_click_too_close" };
  }

  const secondDistance = distance(input.clickWorldPosition, input.playerPosition);
  if (secondDistance < config.minSecondClickDistancePx) {
    return { triggered: false, reason: "second_click_too_close" };
  }

  const clickDistance = distance(state.firstClickWorldPosition, input.clickWorldPosition);
  if (clickDistance < config.minDistanceBetweenClicksPx) {
    return { triggered: false, reason: "clicks_too_close" };
  }

  const secondDirection = normalize(subtract(input.clickWorldPosition, input.playerPosition));
  if (!secondDirection) {
    return { triggered: false, reason: "second_click_too_close" };
  }

  const angleDegrees = getAngleBetweenDegrees(state.firstDirection, secondDirection);
  const angleErrorDegrees = Math.abs(config.perfectAngleDegrees - angleDegrees);
  const grade = getCrosscutGrade(angleErrorDegrees, config);
  if (!grade) {
    return { triggered: false, reason: "bad_angle", angleDegrees, angleErrorDegrees };
  }

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
  const secondDirection = normalize(subtract(input.clickWorldPosition, input.playerPosition));
  if (!secondDirection) {
    clearCrosscutState(state);
    return;
  }
  state.firstClickWorldPosition = { ...input.clickWorldPosition };
  state.firstPlayerPosition = { ...input.playerPosition };
  state.firstDirection = secondDirection;
  state.firstAttackAtMs = input.nowMs;
  state.stacks += 1;
}
