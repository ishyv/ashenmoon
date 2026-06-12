export type AnimalBehaviorState =
  | "idle"
  | "wander"
  | "graze"
  | "flee"
  | "threaten"
  | "attack"
  | "hunt"
  | "eat"
  | "rest";

export type AnimalDiet = "herbivore" | "omnivore" | "carnivore";
export type AnimalTemperament = "fearful" | "timid" | "territorial" | "predator";
export type AnimalSpeciesId = "rabbit" | "deer" | "boar" | "wolf";
export type AnimalDecisionTargetKind = "player" | "animal" | "fire" | "zone";

export interface AnimalDefinition {
  id: AnimalSpeciesId;
  name: string;
  species: string;
  diet: AnimalDiet;
  temperament: AnimalTemperament;
  maxHealth: number;
  moveSpeed: number;
  fleeSpeed: number;
  detectionRadiusPx: number;
  attackRadiusPx?: number;
  threatRadiusPx?: number;
  fearOfFire: number;
  hungerDecayPerMinute: number;
  initialHunger: number;
  xpReward: number;
  damage?: number;
  attackCooldownSec?: number;
  preySpecies?: readonly AnimalSpeciesId[];
  preferredZones: readonly string[];
}

export interface AnimalRuntime {
  id: string;
  speciesId: AnimalSpeciesId;
  x: number;
  y: number;
  behavior: AnimalBehaviorState;
  hunger: number;
  threatened: boolean;
  attackCooldownSec: number;
  health: number;
}

export interface AnimalDecision {
  behavior: AnimalBehaviorState;
  targetKind?: AnimalDecisionTargetKind;
  targetId?: string;
}

export const ANIMAL_DEFINITIONS: Record<AnimalSpeciesId, AnimalDefinition> = {
  rabbit: {
    id: "rabbit",
    name: "Rabbit",
    species: "rabbit",
    diet: "herbivore",
    temperament: "fearful",
    maxHealth: 8,
    moveSpeed: 90,
    fleeSpeed: 180,
    detectionRadiusPx: 140,
    fearOfFire: 1,
    hungerDecayPerMinute: 6,
    initialHunger: 20,
    xpReward: 4,
    preferredZones: ["rabbit_burrow", "clearing"],
  },
  deer: {
    id: "deer",
    name: "Deer",
    species: "deer",
    diet: "herbivore",
    temperament: "timid",
    maxHealth: 28,
    moveSpeed: 105,
    fleeSpeed: 220,
    detectionRadiusPx: 220,
    fearOfFire: 0.9,
    hungerDecayPerMinute: 4,
    initialHunger: 20,
    xpReward: 4,
    preferredZones: ["deer_grazing", "clearing", "water_edge"],
  },
  boar: {
    id: "boar",
    name: "Boar",
    species: "boar",
    diet: "omnivore",
    temperament: "territorial",
    maxHealth: 48,
    moveSpeed: 95,
    fleeSpeed: 145,
    detectionRadiusPx: 155,
    threatRadiusPx: 96,
    attackRadiusPx: 58,
    fearOfFire: 0.55,
    hungerDecayPerMinute: 5,
    initialHunger: 20,
    xpReward: 18,
    damage: 13,
    attackCooldownSec: 1.5,
    preferredZones: ["boar_rooting", "forest_floor"],
  },
  wolf: {
    id: "wolf",
    name: "Wolf",
    species: "wolf",
    diet: "carnivore",
    temperament: "predator",
    maxHealth: 38,
    moveSpeed: 125,
    fleeSpeed: 175,
    detectionRadiusPx: 210,
    attackRadiusPx: 64,
    fearOfFire: 0.8,
    hungerDecayPerMinute: 8,
    initialHunger: 70,
    xpReward: 25,
    damage: 11,
    attackCooldownSec: 1.2,
    preySpecies: ["rabbit", "deer"],
    preferredZones: ["wolf_territory", "water_edge"],
  },
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function shouldAvoidFire(
  def: AnimalDefinition,
  position: { x: number; y: number },
  litCampfires: readonly { x: number; y: number; radiusPx: number }[],
): boolean {
  return litCampfires.some((fire) => distance(position, fire) <= fire.radiusPx * Math.max(0.25, def.fearOfFire));
}

export function chooseAnimalBehavior(
  animal: AnimalRuntime,
  context: {
    player: { x: number; y: number };
    litCampfires: readonly { x: number; y: number; radiusPx: number }[];
    nearbyAnimals: readonly AnimalRuntime[];
    timeOfDay: "day" | "dusk" | "night";
  },
): AnimalDecision {
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const position = { x: animal.x, y: animal.y };

  if (shouldAvoidFire(def, position, context.litCampfires)) {
    return { behavior: "flee", targetKind: "fire" };
  }

  const playerDistance = distance(position, context.player);
  if ((def.temperament === "fearful" || def.temperament === "timid") && playerDistance <= def.detectionRadiusPx) {
    return { behavior: "flee", targetKind: "player" };
  }

  if (def.temperament === "territorial" && playerDistance <= (def.threatRadiusPx ?? 0)) {
    if (animal.threatened || playerDistance <= (def.attackRadiusPx ?? 0)) {
      return { behavior: "attack", targetKind: "player" };
    }
    return { behavior: "threaten", targetKind: "player" };
  }

  if (def.temperament === "predator" && animal.hunger >= 60) {
    const prey = context.nearbyAnimals
      .filter((candidate) => def.preySpecies?.includes(candidate.speciesId))
      .sort((a, b) => distance(position, a) - distance(position, b))[0];
    if (prey && distance(position, prey) <= def.detectionRadiusPx) {
      return { behavior: "hunt", targetKind: "animal", targetId: prey.id };
    }
    if (context.timeOfDay !== "day" && playerDistance <= (def.attackRadiusPx ?? def.detectionRadiusPx)) {
      return { behavior: "attack", targetKind: "player" };
    }
  }

  return { behavior: def.diet === "herbivore" ? "graze" : "wander", targetKind: "zone" };
}

export function resolveAnimalConflict(
  attacker: AnimalRuntime,
  defender: AnimalRuntime,
  rng: () => number = Math.random,
): { attackerDamage: number; defenderDamage: number } {
  const attackerDef = ANIMAL_DEFINITIONS[attacker.speciesId];
  const defenderDef = ANIMAL_DEFINITIONS[defender.speciesId];
  const predatorHitsPrey = attackerDef.preySpecies?.includes(defender.speciesId);
  const defenderFightsBack = defenderDef.temperament === "territorial" || defenderDef.temperament === "predator";

  return {
    attackerDamage: defenderFightsBack && rng() < 0.65 ? Math.max(1, Math.round((defenderDef.damage ?? 4) * 0.6)) : 0,
    defenderDamage: predatorHitsPrey || rng() < 0.75 ? attackerDef.damage ?? 4 : 0,
  };
}
