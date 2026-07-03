import type { AnimalSpeciesId } from "./animal-behavior";
import type { AnimalNeedsState } from "./needs";

export interface MatingResult {
  readonly success: boolean;
  readonly gestationTimerSec?: number | undefined;
}

export interface OffspringSpawnSpec {
  readonly speciesId: AnimalSpeciesId;
  readonly x: number;
  readonly y: number;
  readonly followerOfId: string;
}

export const REPRODUCTION_CONFIG = {
  GESTATION_DURATION_SEC: 120,
  POST_BIRTH_COOLDOWN_SEC: 300,
  DEN_RETREAT_THRESHOLD_SEC: 30,
} as const;

/**
 * Checks if two animals can mate.
 */
export function canAnimalsMate(
  parentA: { speciesId: AnimalSpeciesId; needs: AnimalNeedsState },
  parentB: { speciesId: AnimalSpeciesId; needs: AnimalNeedsState }
): boolean {
  if (parentA.speciesId !== parentB.speciesId) return false;
  if (parentA.needs.lifeStage !== "adult" || parentB.needs.lifeStage !== "adult") return false;
  if (parentA.needs.gestationTimerSec !== undefined || parentB.needs.gestationTimerSec !== undefined) return false;

  // Parents must be well-fed, hydrated, and energetic
  const healthyA = parentA.needs.hunger < 30 && parentA.needs.thirst < 30 && parentA.needs.energy > 70;
  const healthyB = parentB.needs.hunger < 30 && parentB.needs.thirst < 30 && parentB.needs.energy > 70;

  return healthyA && healthyB;
}

/**
 * Initiates mating, returning the pregnancy details for the female.
 */
export function initiateMating(
  female: { speciesId: AnimalSpeciesId; needs: AnimalNeedsState },
  male: { speciesId: AnimalSpeciesId; needs: AnimalNeedsState }
): MatingResult {
  if (!canAnimalsMate(female, male)) {
    return { success: false };
  }

  return {
    success: true,
    gestationTimerSec: REPRODUCTION_CONFIG.GESTATION_DURATION_SEC,
  };
}

/**
 * Checks if a pregnant animal needs to retreat to her den.
 */
export function shouldRetreatToDen(needs: AnimalNeedsState): boolean {
  return (
    needs.gestationTimerSec !== undefined &&
    needs.gestationTimerSec > 0 &&
    needs.gestationTimerSec <= REPRODUCTION_CONFIG.DEN_RETREAT_THRESHOLD_SEC
  );
}

/**
 * Calculates birth outcome, generating offspring spawn specifications.
 */
export function birthOffspring(
  motherId: string,
  speciesId: AnimalSpeciesId,
  mx: number,
  my: number,
  nestX?: number,
  nestY?: number,
  rng: () => number = Math.random
): OffspringSpawnSpec[] {
  const spawns: OffspringSpawnSpec[] = [];
  // Spawn 1 to 2 kits
  const count = rng() < 0.5 ? 1 : 2;

  // Spawn position is either at the den/nest or close to the mother
  const baseX = nestX !== undefined ? nestX : mx;
  const baseY = nestY !== undefined ? nestY : my;

  for (let i = 0; i < count; i++) {
    // Offset slightly so they don't overlap perfectly
    const ox = baseX + (rng() * 16 - 8);
    const oy = baseY + (rng() * 16 - 8);
    spawns.push({
      speciesId,
      x: ox,
      y: oy,
      followerOfId: motherId,
    });
  }

  return spawns;
}
