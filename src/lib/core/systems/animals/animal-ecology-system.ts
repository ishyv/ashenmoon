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
  type AnimalRuntime,
} from "$lib/domain/animals/animal-behavior";

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

    const runtime = runtimes.find((candidate) => candidate.id === entity.id)!;
    const decision = chooseAnimalBehavior(runtime, {
      player: playerCenter,
      litCampfires,
      nearbyAnimals: runtimes.filter((candidate) => candidate.id !== entity.id),
      timeOfDay: "day",
    });
    animal.behavior = decision.behavior;

    const pos = center(entity);
    if (decision.behavior === "flee") {
      const from = decision.targetKind === "fire" && litCampfires[0] ? litCampfires[0] : playerCenter;
      moveToward(entity, map, from.x, from.y, def.fleeSpeed, dt, true);
    } else if (decision.behavior === "hunt" && decision.targetId) {
      const target = animalsById.get(decision.targetId);
      if (target?.position) {
        moveToward(entity, map, center(target).x, center(target).y, def.moveSpeed, dt);
        tryAnimalAttackPrey(entity, target, config, vfx, entityLayer, entitySprites, ecsWorld);
      }
    } else if (decision.behavior === "attack" && def.damage && Math.hypot(playerCenter.x - pos.x, playerCenter.y - pos.y) <= (def.attackRadiusPx ?? TILE)) {
      tryAnimalAttackPlayer(entity, player, config, combat, vfx, entityLayer);
    } else if (decision.behavior === "threaten") {
      animal.threatened = true;
    } else if (decision.behavior === "wander" || decision.behavior === "graze") {
      const home = animal.home;
      if (Math.hypot(pos.x - home.x, pos.y - home.y) > HOME_LEASH_RADIUS_PX) {
        moveToward(entity, map, home.x, home.y, def.moveSpeed * GRAZE_RETURN_SPEED_MULTIPLIER, dt);
      }
    }

    syncAnimalSprite(entity, entitySprites);
  }
}
