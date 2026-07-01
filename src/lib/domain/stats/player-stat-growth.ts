/**
 * Base + per-level growth tables for the player. League-shaped: combat stats
 * grow linearly with character level (1..18); survival, resistance, and
 * utility layers are level-independent constants — level improves the body,
 * not the world's pressure. Starter numbers, not balance.
 */

import type {
  CombatStats,
  ResistanceStats,
  SurvivalStats,
  UtilityStats,
} from "./stat-types";

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 18;

/** Matches TILE * 6 (the engine's spawn speed). Domain stays Pixi-free, so the literal lives here. */
export const BASE_MOVE_SPEED = 384;

export const BASE_COMBAT_STATS: CombatStats = {
  maxHealth: 600,
  healthRegenPerSecond: 1.5,
  maxStamina: 100,
  staminaRegenPerSecond: 8,
  attackDamage: 60,
  abilityPower: 0,
  armor: 30,
  magicResist: 30,
  attackSpeed: 1.0,
  moveSpeed: BASE_MOVE_SPEED,
  techniqueHaste: 0,
  knockbackChance: 0,
  critChance: 0,
};

/** Added once per level above 1. */
export const COMBAT_GROWTH_PER_LEVEL: CombatStats = {
  maxHealth: 90,
  healthRegenPerSecond: 0.15,
  maxStamina: 4,
  staminaRegenPerSecond: 0.15,
  attackDamage: 4.0,
  abilityPower: 0,
  armor: 4.0,
  magicResist: 1.5,
  attackSpeed: 0.015,
  moveSpeed: 0,
  techniqueHaste: 0.5,
  knockbackChance: 0.15,
  critChance: 0,
};

// Seeded from the existing thirst config: 0.15/sec idle drain = 9/min.
export const BASE_SURVIVAL_STATS: SurvivalStats = {
  maxThirst: 100,
  thirstDecayPerMinute: 3.5,
  maxHunger: 100,
  hungerDecayPerMinute: 4,
  maxExhaustion: 100,
  exhaustionRecoveryPerSecond: 1,
  toxicityLimit: 100,
  bodyTemperatureTarget: 37,
};

export const BASE_RESISTANCE_STATS: ResistanceStats = {
  coldResist: 0,
  heatResist: 0,
  insulation: 0,
  fireResist: 0,
  toxinResist: 0,
  sicknessResist: 0,
  bleedResist: 0,
};

export const BASE_UTILITY_STATS: UtilityStats = {
  carryCapacity: 100,
  gatheringPower: 1,
  gatheringSpeed: 1,
  miningPower: 1,
  miningSpeed: 1,
  craftingSpeed: 1,
  discoveryChance: 0,
  stealth: 0,
  noise: 0,
};

/** XP needed to go from `level` to `level + 1`. Single tuning knob. */
export function characterXpForLevel(level: number): number {
  return 280 + (level - 1) * 100;
}
