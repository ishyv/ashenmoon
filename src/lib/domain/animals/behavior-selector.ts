import type { AnimalDefinition, AnimalBehaviorState, AnimalSpeciesId, AnimalDecision } from "./animal-behavior";
import type { AnimalNeedsState } from "./needs";
import type { PerceivedTarget } from "./perception";

export interface BehaviorSelectionContext {
  timeOfDay: "day" | "dusk" | "night";
  isRaining: boolean;
  isHot: boolean;
  hasDen: boolean;
}

/**
 * Pure function to choose the best behavior state using a utility scoring model.
 */
export function selectAnimalBehavior(
  needs: AnimalNeedsState,
  senses: readonly PerceivedTarget[],
  def: AnimalDefinition,
  context: BehaviorSelectionContext
): AnimalDecision {
  // 1. Check for immediate Threats (Fire, Predator, Player when alert)
  const threats = senses.filter((s) => s.type === "threat");
  if (threats.length > 0) {
    const closestThreat = threats[0]!;
    return {
      behavior: "flee",
      targetKind: closestThreat.id.includes("fire") ? "fire" : "player",
      targetId: closestThreat.id,
    };
  }

  // 2. Check for critical Fatigue/Sleep need (Energy < 15)
  if (needs.energy < 15) {
    const shelters = senses.filter((s) => s.type === "shelter");
    if (shelters.length > 0) {
      return {
        behavior: "sleep",
        targetKind: "zone",
        targetId: shelters[0]!.id,
      };
    }
    // Sleep in place if no shelter nearby
    return {
      behavior: "sleep",
      targetKind: "zone",
    };
  }

  // 3. Check for critical Dehydration (Thirst > 70)
  if (needs.thirst > 70) {
    const water = senses.filter((s) => s.type === "water");
    if (water.length > 0) {
      return {
        behavior: "drink",
        targetKind: "water",
        targetId: water[0]!.id,
      };
    }
  }

  // 4. Check for critical Hunger (Hunger > 60)
  if (needs.hunger > 60) {
    if (def.diet === "herbivore") {
      const food = senses.filter((s) => s.type === "food");
      if (food.length > 0) {
        return {
          behavior: "graze",
          targetKind: "food",
          targetId: food[0]!.id,
        };
      }
    } else {
      // Predator or omnivore hunting prey or bait decoy
      const prey = senses.filter((s) => s.type === "prey");
      if (prey.length > 0) {
        return {
          behavior: "hunt",
          targetKind: "animal",
          targetId: prey[0]!.id,
        };
      }
    }
  }

  // 5. Reproduction Urge (Adults with high energy and low hunger/thirst)
  const canReproduce =
    needs.lifeStage === "adult" &&
    needs.gestationTimerSec === undefined &&
    needs.hunger < 30 &&
    needs.thirst < 30 &&
    needs.energy > 70;

  if (canReproduce) {
    const mates = senses.filter((s) => s.type === "mate");
    if (mates.length > 0) {
      return {
        behavior: "mate",
        targetKind: "animal",
        targetId: mates[0]!.id,
      };
    }
  }

  // 6. Boar Mud Wallowing
  const isBoar = def.id === "boar";
  if (isBoar && needs.hunger < 50 && needs.thirst < 50) {
    const mudTiles = senses.filter((s) => s.type === "water"); // wallows in mud/water
    if (mudTiles.length > 0) {
      return {
        behavior: "wallow",
        targetKind: "water",
        targetId: mudTiles[0]!.id,
      };
    }
  }

  // 7. Sheltering during Rain
  if (context.isRaining && def.diet === "herbivore") {
    return {
      behavior: "rest",
      targetKind: "zone",
    };
  }

  // 8. Default Idle/Wander/Graze behavior
  return {
    behavior: def.diet === "herbivore" ? "graze" : "wander",
    targetKind: "zone",
  };
}
