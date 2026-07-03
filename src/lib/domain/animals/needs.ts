import type { AnimalDefinition } from "./animal-behavior";

export interface AnimalNeedsState {
  hunger: number;
  thirst: number;
  energy: number;
  ageSec: number;
  lifeStage: "juvenile" | "adult" | "elder";
  gestationTimerSec?: number | undefined;
}

export const LIFECYCLE_CONFIG = {
  JUVENILE_DURATION_SEC: 180,
  ADULT_DURATION_SEC: 600,
  ELDER_DURATION_SEC: 300,
  JUVENILE_SCALE: 0.5,
  ADULT_SCALE: 1.0,
  ELDER_SCALE: 1.2,
} as const;

/**
 * Ticks basic needs: hunger, thirst, energy, age, and pregnancy gestation timer.
 */
export function tickNeeds(
  needs: AnimalNeedsState,
  def: AnimalDefinition,
  dt: number,
  isRaining: boolean,
  isHot: boolean
): void {
  // Hunger decay: wolves get hungrier faster in rain, pregnant females get hungrier 2x faster
  const isPregnant = needs.gestationTimerSec !== undefined && needs.gestationTimerSec > 0;
  let hungerMult = isPregnant ? 2.0 : 1.0;
  if (isRaining && def.temperament === "predator") {
    hungerMult *= 1.5;
  }
  const hungerRate = def.hungerDecayPerMinute * hungerMult;
  needs.hunger = Math.min(100, needs.hunger + (hungerRate / 60) * dt);

  // Thirst decay: standard rate is 4 per minute, doubles in Scorched Wastes (isHot)
  const thirstRate = isHot ? 8.0 : 4.0;
  needs.thirst = Math.min(100, needs.thirst + (thirstRate / 60) * dt);

  // Energy decay: decays by 2.5 per minute while awake, recovers by 15 per minute while asleep
  // Let's assume energy tick is handled here, but state selection determines active state
  // Energy tick rate can be defined dynamically.
  needs.ageSec += dt;

  if (isPregnant) {
    needs.gestationTimerSec = Math.max(0, needs.gestationTimerSec! - dt);
  }
}

/**
 * Determines and returns the next life stage based on current age.
 */
export function evaluateLifeStage(needs: AnimalNeedsState): "juvenile" | "adult" | "elder" | "dead" {
  const age = needs.ageSec;
  if (needs.lifeStage === "juvenile" && age >= LIFECYCLE_CONFIG.JUVENILE_DURATION_SEC) {
    return "adult";
  }
  if (needs.lifeStage === "adult" && age >= LIFECYCLE_CONFIG.JUVENILE_DURATION_SEC + LIFECYCLE_CONFIG.ADULT_DURATION_SEC) {
    return "elder";
  }
  if (needs.lifeStage === "elder" && age >= LIFECYCLE_CONFIG.JUVENILE_DURATION_SEC + LIFECYCLE_CONFIG.ADULT_DURATION_SEC + LIFECYCLE_CONFIG.ELDER_DURATION_SEC) {
    return "dead";
  }
  return needs.lifeStage;
}

/**
 * Returns the scale multiplier for rendering the animal sprite based on life stage.
 */
export function getLifeStageScale(lifeStage: "juvenile" | "adult" | "elder"): number {
  switch (lifeStage) {
    case "juvenile":
      return LIFECYCLE_CONFIG.JUVENILE_SCALE;
    case "elder":
      return LIFECYCLE_CONFIG.ELDER_SCALE;
    case "adult":
    default:
      return LIFECYCLE_CONFIG.ADULT_SCALE;
  }
}

/**
 * Returns scaled stats (health, speed, damage) based on life stage multipliers.
 */
export function getLifeStageStats(
  lifeStage: "juvenile" | "adult" | "elder",
  def: AnimalDefinition
): { maxHealth: number; moveSpeed: number; damage?: number } {
  let hpMult = 1.0;
  let speedMult = 1.0;
  let dmgMult = 1.0;

  switch (lifeStage) {
    case "juvenile":
      hpMult = 0.5;
      speedMult = 1.1; // Juveniles run slightly faster/scurry
      dmgMult = 0.0;   // Juveniles cannot deal damage
      break;
    case "elder":
      hpMult = 1.3;    // Elders have more health
      speedMult = 0.8; // Elders are slower
      dmgMult = 1.2;   // Elders deal more damage
      break;
    case "adult":
    default:
      hpMult = 1.0;
      speedMult = 1.0;
      dmgMult = 1.0;
      break;
  }

  return {
    maxHealth: Math.round(def.maxHealth * hpMult),
    moveSpeed: Math.round(def.moveSpeed * speedMult),
    ...(def.damage !== undefined ? { damage: Math.round(def.damage * dmgMult) } : {}),
  };
}
