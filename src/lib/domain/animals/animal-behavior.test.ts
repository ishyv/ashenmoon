import { describe, expect, it } from "vitest";
import {
  ANIMAL_DEFINITIONS,
  chooseAnimalBehavior,
  resolveAnimalConflict,
  shouldAvoidFire,
  type AnimalRuntime,
} from "./animal-behavior";

function animal(id: string, speciesId: keyof typeof ANIMAL_DEFINITIONS, x = 0, y = 0): AnimalRuntime {
  return {
    id,
    speciesId,
    x,
    y,
    behavior: "idle",
    hunger: 0,
    threatened: false,
    attackCooldownSec: 0,
    health: ANIMAL_DEFINITIONS[speciesId].maxHealth,
  };
}

describe("animal behavior", () => {
  it("makes rabbits flee from a nearby player", () => {
    const result = chooseAnimalBehavior(animal("rabbit", "rabbit"), {
      player: { x: 20, y: 0 },
      litCampfires: [],
      nearbyAnimals: [],
      timeOfDay: "day",
    });

    expect(result.behavior).toBe("flee");
    expect(result.targetKind).toBe("player");
  });

  it("makes boars threaten before attacking when approached", () => {
    const first = chooseAnimalBehavior(animal("boar", "boar"), {
      player: { x: 70, y: 0 },
      litCampfires: [],
      nearbyAnimals: [],
      timeOfDay: "day",
    });
    const second = chooseAnimalBehavior({ ...animal("boar", "boar"), threatened: true }, {
      player: { x: 40, y: 0 },
      litCampfires: [],
      nearbyAnimals: [],
      timeOfDay: "day",
    });

    expect(first.behavior).toBe("threaten");
    expect(second.behavior).toBe("attack");
  });

  it("makes hungry wolves hunt prey before attacking the player", () => {
    const result = chooseAnimalBehavior({ ...animal("wolf", "wolf"), hunger: 80 }, {
      player: { x: 120, y: 0 },
      litCampfires: [],
      nearbyAnimals: [animal("rabbit", "rabbit", 40, 0)],
      timeOfDay: "dusk",
    });

    expect(result.behavior).toBe("hunt");
    expect(result.targetId).toBe("rabbit");
  });

  it("keeps animals away from lit campfire radius", () => {
    expect(shouldAvoidFire(ANIMAL_DEFINITIONS.deer, { x: 0, y: 0 }, [{ x: 60, y: 0, radiusPx: 180 }])).toBe(true);
  });

  it("resolves simple predator-prey damage", () => {
    const result = resolveAnimalConflict(animal("wolf", "wolf"), animal("rabbit", "rabbit"), () => 0);

    expect(result.defenderDamage).toBeGreaterThan(0);
    expect(result.attackerDamage).toBe(0);
  });

  it("keeps attack cadence data on animal definitions instead of runtime branches", () => {
    expect(ANIMAL_DEFINITIONS.boar.attackCooldownSec).toBeGreaterThan(0);
    expect(ANIMAL_DEFINITIONS.wolf.attackCooldownSec).toBeGreaterThan(0);
  });
});
