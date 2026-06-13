import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { LitCampfire } from "$lib/core/systems/camp/campfire-runtime-system";
import { applyDamage, despawnEntity, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import type { VFXResource } from "$lib/core/vfx/vfx";
import {
  ANIMAL_DEFINITIONS,
  chooseAnimalBehavior,
  resolveAnimalConflict,
  type AnimalDecision,
  type AnimalRuntime,
} from "$lib/domain/animals/animal-behavior";
import { spawnAnimal } from "$lib/core/systems/map/spawn-system";

type AnimalTimeOfDay = "day" | "dusk" | "night";

export function spawnInitialAnimalsSystem(
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  animalSeq: number
): number {
  let nextSeq = animalSeq;
  for (const zone of map.forestMetadata.animalZones) {
    switch (zone.kind) {
      case "rabbit_burrow":
        spawnAnimal(zone.x, zone.y, "rabbit", entityLayer, entitySprites, map, nextSeq++);
        spawnAnimal(zone.x + 1, zone.y, "rabbit", entityLayer, entitySprites, map, nextSeq++);
        break;
      case "deer_grazing":
        spawnAnimal(zone.x, zone.y, "deer", entityLayer, entitySprites, map, nextSeq++);
        break;
      case "boar_rooting":
        spawnAnimal(zone.x, zone.y, "boar", entityLayer, entitySprites, map, nextSeq++);
        break;
      case "wolf_territory":
        spawnAnimal(zone.x, zone.y, "wolf", entityLayer, entitySprites, map, nextSeq++);
        break;
    }
  }
  return nextSeq;
}


const BODY_HX = TILE * 0.22;
const BODY_HY = TILE * 0.18;
const BODY_CY = TILE * 0.65;
const HOME_LEASH_RADIUS_PX = TILE * 3;
const GRAZE_RETURN_SPEED_MULTIPLIER = 0.45;

function center(entity: Entity): { x: number; y: number } {
  const pos = entity.position!;
  return { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
}

function moveToward(entity: Entity, map: MapResource, tx: number, ty: number, speed: number, dt: number, away = false): void {
  const pos = entity.position!;
  const c = center(entity);
  let dx = tx - c.x;
  let dy = ty - c.y;
  if (away) {
    dx = -dx;
    dy = -dy;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  const step = speed * dt;
  const cx = pos.x + TILE / 2;
  const cy = pos.y + BODY_CY;
  const mx = dx * step;
  const my = dy * step;
  // INVARIANT: animals use the same per-axis solid collision style as player
  // movement, so fleeing/hunting cannot slide them through water or structures.
  if (!collidesWithSolid(cx + mx, cy, BODY_HX, BODY_HY, map)) pos.x += mx;
  if (!collidesWithSolid(cx, cy + my, BODY_HX, BODY_HY, map)) pos.y += my;
  pos.targetX = pos.x;
  pos.targetY = pos.y;
}

function animalCenterRuntime(entity: Entity): AnimalRuntime {
  return {
    id: entity.id,
    speciesId: entity.animal!.speciesId,
    x: center(entity).x,
    y: center(entity).y,
    behavior: entity.animal!.behavior,
    hunger: entity.animal!.hunger,
    threatened: entity.animal!.threatened,
    attackCooldownSec: entity.animal!.attackCooldownSec,
    health: entity.health?.current ?? ANIMAL_DEFINITIONS[entity.animal!.speciesId].maxHealth,
  };
}

function tickAnimalNeeds(entity: Entity, dt: number): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  animal.hunger = Math.min(100, animal.hunger + (def.hungerDecayPerMinute / 60) * dt);
  animal.attackCooldownSec = Math.max(0, animal.attackCooldownSec - dt);
}

function tryAnimalAttackPlayer(
  entity: Entity,
  player: Entity,
  config: CombatConfig,
  combat: CombatResource,
  vfx: VFXResource,
  entityLayer: Container,
): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  if (!def.damage || animal.attackCooldownSec > 0) return;

  const pos = center(entity);
  const hit = applyDamage(player, def.damage, pos.x, pos.y, 120, config, vfx, entityLayer, combat);
  if (hit) {
    // Player death/respawn is owned by the engine; this system only requests damage.
  }
  animal.attackCooldownSec = def.attackCooldownSec ?? 1;
  animal.threatened = false;
}

function tryAnimalAttackPrey(
  predator: Entity,
  prey: Entity | undefined,
  config: CombatConfig,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  ecsWorld: World<Entity>,
): void {
  if (!prey?.position || !prey.health) return;
  const animal = predator.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  if (animal.attackCooldownSec > 0) return;

  const predatorPos = center(predator);
  const preyPos = center(prey);
  if (Math.hypot(preyPos.x - predatorPos.x, preyPos.y - predatorPos.y) > (def.attackRadiusPx ?? TILE)) return;

  // WHY: ecology should request combat through the shared damage path, not
  // mutate animal health directly. That keeps hit flash, i-frames, and knockback
  // consistent with player/enemy combat.
  const conflict = resolveAnimalConflict(animalCenterRuntime(predator), animalCenterRuntime(prey));
  const preyDied = applyDamage(prey, conflict.defenderDamage, predatorPos.x, predatorPos.y, 80, config, vfx, entityLayer);
  if (conflict.attackerDamage > 0) {
    applyDamage(predator, conflict.attackerDamage, preyPos.x, preyPos.y, 40, config, vfx, entityLayer);
  }
  if (preyDied) despawnEntity(ecsWorld, prey, entityLayer, entitySprites, vfx);
  animal.attackCooldownSec = def.attackCooldownSec ?? 1;
}

function syncAnimalSprite(entity: Entity, entitySprites: Map<string, Container>): void {
  const sprite = entitySprites.get(entity.id);
  if (!sprite || !entity.position) return;

  sprite.x = entity.position.x + TILE / 2;
  sprite.y = entity.position.y + TILE;
  sprite.zIndex = entity.position.y + TILE;
  sprite.alpha = entity.animal?.behavior === "flee" ? 0.9 : 1;
}

function handleScaredAnimal(
  entity: Entity,
  map: MapResource,
  dt: number,
): boolean {
  const animal = entity.animal!;
  if (!animal.scareSec || animal.scareSec <= 0) return false;
  animal.scareSec -= dt;

  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const pos = center(entity);
  const angle = Math.random() * Math.PI * 2;
  const fleeTargetX = pos.x + Math.cos(angle) * TILE;
  const fleeTargetY = pos.y + Math.sin(angle) * TILE;
  moveToward(entity, map, fleeTargetX, fleeTargetY, def.fleeSpeed, dt, true);
  return true;
}

function updateWanderOrGraze(entity: Entity, map: MapResource, dt: number): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const pos = center(entity);
  const home = animal.home;

  if (Math.hypot(pos.x - home.x, pos.y - home.y) > HOME_LEASH_RADIUS_PX) {
    moveToward(entity, map, home.x, home.y, def.moveSpeed * GRAZE_RETURN_SPEED_MULTIPLIER, dt);
    return;
  }

  animal.wanderTimerSec = (animal.wanderTimerSec ?? 0) - dt;
  if (animal.wanderTimerSec <= 0 || !animal.wanderTarget) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * TILE * 3;
    animal.wanderTarget = {
      x: home.x + Math.cos(angle) * radius,
      y: home.y + Math.sin(angle) * radius,
    };
    animal.wanderTimerSec = 3 + Math.random() * 4;
  }

  const target = animal.wanderTarget;
  if (target && Math.hypot(pos.x - target.x, pos.y - target.y) > TILE * 0.4) {
    moveToward(entity, map, target.x, target.y, def.moveSpeed * 0.45, dt);
  }
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
  const playerCenter = center(player);
  const pos = center(entity);

  if (decision.behavior === "flee") {
    const from = decision.targetKind === "fire" && litCampfires[0] ? litCampfires[0] : playerCenter;
    moveToward(entity, map, from.x, from.y, def.fleeSpeed, dt, true);
    return;
  }

  if (decision.behavior === "hunt" && decision.targetId) {
    const target = animalsById.get(decision.targetId);
    if (target?.position) {
      moveToward(entity, map, center(target).x, center(target).y, def.moveSpeed, dt);
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
  const playerCenter = center(player);

  const animals = ecsWorld.with("animal", "position").entities;
  const runtimes = animals.map(animalCenterRuntime);
  const animalsById = new Map(animals.map((entity) => [entity.id, entity]));

  for (const entity of animals) {
    const animal = entity.animal!;
    const def = ANIMAL_DEFINITIONS[animal.speciesId];
    tickAnimalNeeds(entity, dt);

    const pos = center(entity);

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
