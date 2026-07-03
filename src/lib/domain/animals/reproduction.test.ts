import { describe, expect, it } from "vitest";
import { canAnimalsMate, initiateMating, shouldRetreatToDen, birthOffspring, REPRODUCTION_CONFIG } from "./reproduction";
import type { AnimalNeedsState } from "./needs";

describe("animal reproduction", () => {
  it("only allows adult, healthy animals of the same species to mate", () => {
    const parentA = {
      speciesId: "rabbit" as const,
      needs: { hunger: 10, thirst: 10, energy: 90, ageSec: 200, lifeStage: "adult" as const },
    };
    const parentB = {
      speciesId: "rabbit" as const,
      needs: { hunger: 15, thirst: 20, energy: 85, ageSec: 200, lifeStage: "adult" as const },
    };

    expect(canAnimalsMate(parentA, parentB)).toBe(true);

    // Mismatched species
    const wolfParent = { ...parentB, speciesId: "wolf" as const };
    expect(canAnimalsMate(parentA, wolfParent)).toBe(false);

    // Juvenile parent
    const juvenileParent = { ...parentB, needs: { ...parentB.needs, lifeStage: "juvenile" as const } };
    expect(canAnimalsMate(parentA, juvenileParent)).toBe(false);

    // Starving parent
    const starvingParent = { ...parentB, needs: { ...parentB.needs, hunger: 70 } };
    expect(canAnimalsMate(parentA, starvingParent)).toBe(false);
  });

  it("initiates mating pregnancy with gestation timer", () => {
    const female = {
      speciesId: "rabbit" as const,
      needs: { hunger: 10, thirst: 10, energy: 90, ageSec: 200, lifeStage: "adult" as const },
    };
    const male = {
      speciesId: "rabbit" as const,
      needs: { hunger: 15, thirst: 20, energy: 85, ageSec: 200, lifeStage: "adult" as const },
    };

    const res = initiateMating(female, male);
    expect(res.success).toBe(true);
    expect(res.gestationTimerSec).toBe(REPRODUCTION_CONFIG.GESTATION_DURATION_SEC);
  });

  it("flags den retreat threshold when gestation timer is low", () => {
    const needs: AnimalNeedsState = {
      hunger: 10,
      thirst: 10,
      energy: 90,
      ageSec: 200,
      lifeStage: "adult",
      gestationTimerSec: 50,
    };

    expect(shouldRetreatToDen(needs)).toBe(false);

    needs.gestationTimerSec = REPRODUCTION_CONFIG.DEN_RETREAT_THRESHOLD_SEC;
    expect(shouldRetreatToDen(needs)).toBe(true);

    needs.gestationTimerSec = 10;
    expect(shouldRetreatToDen(needs)).toBe(true);
  });

  it("spawns 1-2 offspring near the mother or den", () => {
    const spawns = birthOffspring("rabbit_mother", "rabbit", 100, 100, 200, 200, () => 0.1);
    expect(spawns.length).toBeGreaterThanOrEqual(1);
    expect(spawns.length).toBeLessThanOrEqual(2);
    expect(spawns[0]!.speciesId).toBe("rabbit");
    expect(spawns[0]!.followerOfId).toBe("rabbit_mother");
    // With rng constant 0.1, kit should spawn near (200, 200) den coordinates
    expect(spawns[0]!.x).toBeCloseTo(193.6);
    expect(spawns[0]!.y).toBeCloseTo(193.6);
  });
});
