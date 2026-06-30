export type AnimalBehaviorState =
  | "idle"
  | "wander"
  | "graze"
  | "curious"
  | "alert"
  | "flee"
  | "threaten"
  | "charge_windup"
  | "attack"
  | "charge"
  | "crash"
  | "recover"
  | "reset"
  | "hunt"
  | "prowl"
  | "stalk"
  | "circle"
  | "lunge_windup"
  | "lunge"
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
  awarenessLevel: "unaware" | "curious" | "alert" | "fleeing";
  huntTargetId?: string;
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
    maxHealth: 30,
    moveSpeed: 90,
    fleeSpeed: 180,
    detectionRadiusPx: 140,
    fearOfFire: 1,
    hungerDecayPerMinute: 6,
    initialHunger: 20,
    xpReward: 15,
    preferredZones: ["rabbit_burrow", "clearing"],
  },
  deer: {
    id: "deer",
    name: "Deer",
    species: "deer",
    diet: "herbivore",
    temperament: "timid",
    maxHealth: 240,
    moveSpeed: 105,
    fleeSpeed: 220,
    detectionRadiusPx: 220,
    fearOfFire: 0.9,
    hungerDecayPerMinute: 4,
    initialHunger: 20,
    xpReward: 20,
    preferredZones: ["deer_grazing", "clearing", "water_edge"],
  },
  boar: {
    id: "boar",
    name: "Boar",
    species: "boar",
    diet: "omnivore",
    temperament: "territorial",
    maxHealth: 480,
    moveSpeed: 95,
    fleeSpeed: 145,
    detectionRadiusPx: 155,
    threatRadiusPx: 96,
    attackRadiusPx: 58,
    fearOfFire: 0.55,
    hungerDecayPerMinute: 5,
    initialHunger: 20,
    xpReward: 45,
    damage: 22,
    attackCooldownSec: 1.5,
    preferredZones: ["boar_rooting", "forest_floor"],
  },
  wolf: {
    id: "wolf",
    name: "Wolf",
    species: "wolf",
    diet: "carnivore",
    temperament: "predator",
    maxHealth: 320,
    moveSpeed: 125,
    fleeSpeed: 175,
    detectionRadiusPx: 210,
    attackRadiusPx: 64,
    fearOfFire: 0.8,
    hungerDecayPerMinute: 8,
    initialHunger: 70,
    xpReward: 60,
    damage: 18,
    attackCooldownSec: 1.2,
    preySpecies: ["rabbit", "deer"],
    preferredZones: ["wolf_territory", "water_edge"],
  },
};

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Outer "curiosity" ring — 1.5× the alert/detection radius. */
export function curiousRadiusPx(def: AnimalDefinition): number {
  return def.detectionRadiusPx * 1.5;
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
    isRaining: boolean;
  },
): AnimalDecision {
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const position = { x: animal.x, y: animal.y };

  if (shouldAvoidFire(def, position, context.litCampfires)) {
    return { behavior: "flee", targetKind: "fire" };
  }

  const playerDistance = distance(position, context.player);

  // Rain: herbivores shelter in place if unaware (rain masks approach noise).
  if (context.isRaining && def.diet === "herbivore" && animal.awarenessLevel === "unaware") {
    return { behavior: "rest", targetKind: "zone" };
  }

  // Two-ring awareness for fearful/timid animals.
  if (def.temperament === "fearful" || def.temperament === "timid") {
    const alertR = context.isRaining ? def.detectionRadiusPx * 0.8 : def.detectionRadiusPx;
    const curiousR = curiousRadiusPx(def) * (context.isRaining ? 0.8 : 1);

    if (playerDistance <= alertR) {
      if (animal.awarenessLevel === "alert" || animal.awarenessLevel === "fleeing") {
        return { behavior: "flee", targetKind: "player" };
      }
      return { behavior: "alert", targetKind: "player" };
    }
    if (playerDistance <= curiousR) {
      if (animal.awarenessLevel === "curious" || animal.awarenessLevel === "alert") {
        return { behavior: "curious", targetKind: "player" };
      }
    }
  }

  // Territorial boar — threaten → attack on re-entry; charge when player retreats.
  if (def.temperament === "territorial" && playerDistance <= (def.threatRadiusPx ?? 0)) {
    if (animal.threatened || playerDistance <= (def.attackRadiusPx ?? 0)) {
      return { behavior: "attack", targetKind: "player" };
    }
    return { behavior: "threaten", targetKind: "player" };
  }

  // Boar charge: player backed off while boar still has wanderTimerSec (charge window open).
  if (def.id === "boar" && animal.behavior === "threaten" && playerDistance > (def.attackRadiusPx ?? 0)) {
    return { behavior: "charge", targetKind: "player" };
  }

  // Wolf predator — hunger threshold lowered during rain (prey easier to catch).
  if (def.temperament === "predator") {
    const huntThreshold = context.isRaining ? 45 : 60;
    if (animal.hunger >= huntThreshold) {
      // Pack coordination: join a nearby hunting wolf even before personal hunger is high.
      const packLeader = context.nearbyAnimals.find(
        (candidate) =>
          candidate.speciesId === "wolf" &&
          candidate.huntTargetId !== undefined &&
          distance(position, candidate) <= 320,
      );
      if (packLeader?.huntTargetId) {
        return { behavior: "hunt", targetKind: "animal", targetId: packLeader.huntTargetId };
      }

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
