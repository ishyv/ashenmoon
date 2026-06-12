export interface RhythmConfig {
  idealRecoveryMs: number;
  baseStaminaCost: number;
  minDamageMultiplier: number;
  maxDamageMultiplier: number;
  minStaminaCostMultiplier: number;
  maxStaminaCostMultiplier: number;
}

export const DEFAULT_RHYTHM_CONFIG: RhythmConfig = {
  idealRecoveryMs: 1000,
  baseStaminaCost: 4,
  minDamageMultiplier: 0.35,
  maxDamageMultiplier: 1.0,
  minStaminaCostMultiplier: 1.0,
  maxStaminaCostMultiplier: 2.75,
};

export interface RhythmResult {
  readiness: number;
  damageMultiplier: number;
  staminaCostMultiplier: number;
  staminaCost: number;
  grade: "rushed" | "strained" | "good" | "perfect";
}

/**
 * Evaluate attack readiness and calculate rhythm modifiers based on time elapsed since last basic attack.
 */
export function evaluate(
  nowMs: number,
  lastBasicAttackAtMs: number | null,
  config: RhythmConfig = DEFAULT_RHYTHM_CONFIG,
): RhythmResult {
  let readiness = 1.0;
  if (lastBasicAttackAtMs !== null) {
    const elapsed = nowMs - lastBasicAttackAtMs;
    readiness = Math.min(1.0, Math.max(0.0, elapsed / config.idealRecoveryMs));
  }

  // Damage scales from minDamageMultiplier to maxDamageMultiplier based on readiness
  const damageMultiplier =
    config.minDamageMultiplier +
    (config.maxDamageMultiplier - config.minDamageMultiplier) * readiness;

  // Stamina cost multiplier scales from maxStaminaCostMultiplier down to minStaminaCostMultiplier based on readiness
  const staminaCostMultiplier =
    config.maxStaminaCostMultiplier -
    (config.maxStaminaCostMultiplier - config.minStaminaCostMultiplier) * readiness;

  const staminaCost = config.baseStaminaCost * staminaCostMultiplier;

  // Timing grade
  // - readiness < 0.45: rushed
  // - readiness < 0.8: strained
  // - readiness < 1.0: good
  // - readiness >= 1.0: perfect
  let grade: "rushed" | "strained" | "good" | "perfect";
  if (readiness < 0.45) {
    grade = "rushed";
  } else if (readiness < 0.8) {
    grade = "strained";
  } else if (readiness < 1.0) {
    grade = "good";
  } else {
    grade = "perfect";
  }

  return {
    readiness,
    damageMultiplier,
    staminaCostMultiplier,
    staminaCost,
    grade,
  };
}
