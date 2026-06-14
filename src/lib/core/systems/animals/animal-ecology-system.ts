import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { LitCampfire } from "$lib/core/systems/camp/campfire-runtime-system";
import type { CombatConfig, CombatResource } from "$lib/core/systems/combat/combat";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import {
  ANIMAL_DEFINITIONS,
  chooseAnimalBehavior,
  type AnimalDecision,
} from "$lib/domain/animals/animal-behavior";
import { spawnAnimal } from "$lib/core/systems/map/spawn-system";
import { planInitialAnimalSpawns } from "$lib/core/systems/animals/animal-spawning";
import { animalCenter, animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";
import {
  handleScaredAnimal,
  moveAnimalToward,
  updateWanderOrGraze,
} from "$lib/core/systems/animals/animal-movement";
import { syncAnimalSprite } from "$lib/core/systems/animals/animal-sprite-sync";
import {
  tryAnimalAttackPlayer,
  tryAnimalAttackPrey,
} from "$lib/core/systems/animals/animal-combat-bridge";

type AnimalTimeOfDay = "day" | "dusk" | "night";

export function spawnInitialAnimalsSystem(
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  animalSeq: number,
): number {
  const plan = planInitialAnimalSpawns(map.forestMetadata.animalZones, animalSeq);
  for (const spawn of plan.spawns) {
    spawnAnimal(spawn.x, spawn.y, spawn.speciesId, entityLayer, entitySprites, map, spawn.seq);
  }
  return plan.nextSeq;
}

function tickAnimalNeeds(entity: Entity, dt: number): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  animal.hunger = Math.min(100, animal.hunger + (def.hungerDecayPerMinute / 60) * dt);
  animal.attackCooldownSec = Math.max(0, animal.attackCooldownSec - dt);
}

function applyAnimalDecision(input: {
  entity: Entity;
  decision: AnimalDecision;
  map: MapResource;
  dt: number;
  player: Entity;
  config: CombatConfig;
  combat: CombatResource;
  vfx: VFXResource;
  entityLayer: Container;
  entitySprites: Map<string, Container>;
  ecsWorld: World<Entity>;
  litCampfires: readonly LitCampfire[];
  animalsById: ReadonlyMap<string, Entity>;
}): void {
  const {
    entity,
    decision,
    map,
    dt,
    player,
    config,
    combat,
    vfx,
    entityLayer,
    entitySprites,
    ecsWorld,
    litCampfires,
    animalsById,
  } = input;
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const playerCenter = animalCenter(player);
  const pos = animalCenter(entity);

  if (decision.behavior === "flee") {
    const from = decision.targetKind === "fire" && litCampfires[0] ? litCampfires[0] : playerCenter;
    moveAnimalToward(entity, map, from.x, from.y, def.fleeSpeed, dt, true);
    return;
  }

  if (decision.behavior === "hunt" && decision.targetId) {
    const target = animalsById.get(decision.targetId);
    if (target?.position) {
      const targetCenter = animalCenter(target);
      moveAnimalToward(entity, map, targetCenter.x, targetCenter.y, def.moveSpeed, dt);
      tryAnimalAttackPrey(entity, target, config, vfx, entityLayer, entitySprites, ecsWorld);
    }
    return;
  }

  if (decision.behavior === "attack" && def.damage && Math.hypot(playerCenter.x - pos.x, playerCenter.y - pos.y) <= (def.attackRadiusPx ?? TILE)) {
    tryAnimalAttackPlayer(entity, player, config, combat, vfx, entityLayer);
    return;
  }

  if (decision.behavior === "threaten") {
    animal.threatened = true;
    return;
  }

  if (decision.behavior === "wander" || decision.behavior === "graze") {
    updateWanderOrGraze(entity, map, dt);
  }
}

export function animalEcologySystem(
  ecsWorld: World<Entity>,
  map: MapResource,
  dt: number,
  player: Entity,
  config: CombatConfig,
  combat: CombatResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  litCampfires: readonly LitCampfire[],
  timeOfDay: AnimalTimeOfDay,
): void {
  if (!player.position) return;
  const playerCenter = animalCenter(player);

  const animals = ecsWorld.with("animal", "position").entities;
  const runtimes = animals.map(animalCenterRuntime);
  const animalsById = new Map(animals.map((entity) => [entity.id, entity]));

  for (const entity of animals) {
    const animal = entity.animal!;
    tickAnimalNeeds(entity, dt);

    if (handleScaredAnimal(entity, map, dt)) {
      syncAnimalSprite(entity, entitySprites);
      continue;
    }

    const runtime = runtimes.find((candidate) => candidate.id === entity.id)!;
    const decision = chooseAnimalBehavior(runtime, {
      player: playerCenter,
      litCampfires,
      nearbyAnimals: runtimes.filter((candidate) => candidate.id !== entity.id),
      timeOfDay,
    });
    animal.behavior = decision.behavior;
    applyAnimalDecision({
      entity,
      decision,
      map,
      dt,
      player,
      config,
      combat,
      vfx,
      entityLayer,
      entitySprites,
      ecsWorld,
      litCampfires,
      animalsById,
    });

    syncAnimalSprite(entity, entitySprites);
  }
}
