/**
 * Layered stat model. Stats are split by what kind of thing they are:
 * combat capability, survival meter capacity/rate, environmental resistance,
 * and non-combat utility. "Temperature" is a current state, "cold resist" is
 * a modifier, "hypothermia" is a status — keeping the layers separate is what
 * stops level-ups from quietly solving the survival game.
 *
 * Internal names stay code-like (`attackDamage`); UI shows the flavored name
 * from STAT_DISPLAY_NAMES ("physical power"). Never invert that.
 */

export interface CombatStats {
  maxHealth: number;
  healthRegenPerSecond: number;
  maxStamina: number;
  staminaRegenPerSecond: number;
  attackDamage: number;
  abilityPower: number;
  armor: number;
  magicResist: number;
  /** attacks per second at 1.0 baseline; cooldown = base cooldown / attackSpeed. */
  attackSpeed: number;
  /** world px per second. */
  moveSpeed: number;
  techniqueHaste: number;
  /** percent (0..100). */
  knockbackChance: number;
  /** percent (0..100). */
  critChance: number;
}

export interface SurvivalStats {
  maxThirst: number;
  thirstDecayPerMinute: number;
  maxHunger: number;
  hungerDecayPerMinute: number;
  maxExhaustion: number;
  exhaustionRecoveryPerSecond: number;
  toxicityLimit: number;
  bodyTemperatureTarget: number;
}

export interface ResistanceStats {
  coldResist: number;
  heatResist: number;
  insulation: number;
  fireResist: number;
  toxinResist: number;
  sicknessResist: number;
  bleedResist: number;
}

export interface UtilityStats {
  carryCapacity: number;
  gatheringPower: number;
  gatheringSpeed: number;
  craftingSpeed: number;
  discoveryChance: number;
  stealth: number;
  noise: number;
}

export interface PlayerStats {
  combat: CombatStats;
  survival: SurvivalStats;
  resistances: ResistanceStats;
  utility: UtilityStats;
}

export type StatLayer = keyof PlayerStats;

export type StatKey =
  | keyof CombatStats
  | keyof SurvivalStats
  | keyof ResistanceStats
  | keyof UtilityStats;

const COMBAT_KEYS: readonly (keyof CombatStats)[] = [
  "maxHealth", "healthRegenPerSecond", "maxStamina", "staminaRegenPerSecond",
  "attackDamage", "abilityPower", "armor", "magicResist", "attackSpeed",
  "moveSpeed", "techniqueHaste", "knockbackChance", "critChance",
];
const SURVIVAL_KEYS: readonly (keyof SurvivalStats)[] = [
  "maxThirst", "thirstDecayPerMinute", "maxHunger", "hungerDecayPerMinute",
  "maxExhaustion", "exhaustionRecoveryPerSecond", "toxicityLimit", "bodyTemperatureTarget",
];
const RESISTANCE_KEYS: readonly (keyof ResistanceStats)[] = [
  "coldResist", "heatResist", "insulation", "fireResist", "toxinResist",
  "sicknessResist", "bleedResist",
];
const UTILITY_KEYS: readonly (keyof UtilityStats)[] = [
  "carryCapacity", "gatheringPower", "gatheringSpeed", "craftingSpeed",
  "discoveryChance", "stealth", "noise",
];

const LAYER_OF: Record<StatKey, StatLayer> = Object.fromEntries([
  ...COMBAT_KEYS.map((k) => [k, "combat"]),
  ...SURVIVAL_KEYS.map((k) => [k, "survival"]),
  ...RESISTANCE_KEYS.map((k) => [k, "resistances"]),
  ...UTILITY_KEYS.map((k) => [k, "utility"]),
]) as Record<StatKey, StatLayer>;

/** Which sub-object of PlayerStats a flat StatKey lives on. */
export function layerOf(key: StatKey): StatLayer {
  return LAYER_OF[key];
}

/** UI-only flavored names. Lowercase per design law. */
export const STAT_DISPLAY_NAMES: Record<StatKey, string> = {
  maxHealth: "health",
  healthRegenPerSecond: "recovery",
  maxStamina: "stamina",
  staminaRegenPerSecond: "stamina recovery",
  attackDamage: "physical power",
  abilityPower: "essence power",
  armor: "physical defense",
  magicResist: "essence resistance",
  attackSpeed: "attack speed",
  moveSpeed: "movement speed",
  techniqueHaste: "technique haste",
  knockbackChance: "knockback chance",
  critChance: "critical chance",
  maxThirst: "thirst",
  thirstDecayPerMinute: "thirst decay",
  maxHunger: "hunger",
  hungerDecayPerMinute: "hunger decay",
  maxExhaustion: "exhaustion",
  exhaustionRecoveryPerSecond: "exhaustion recovery",
  toxicityLimit: "toxicity limit",
  bodyTemperatureTarget: "body temperature",
  coldResist: "cold resistance",
  heatResist: "heat resistance",
  insulation: "insulation",
  fireResist: "fire resistance",
  toxinResist: "toxin resistance",
  sicknessResist: "sickness resistance",
  bleedResist: "bleed resistance",
  carryCapacity: "carry capacity",
  gatheringPower: "gathering power",
  gatheringSpeed: "gathering speed",
  craftingSpeed: "crafting speed",
  discoveryChance: "discovery chance",
  stealth: "stealth",
  noise: "noise",
};
