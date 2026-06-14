import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { ANIMAL_DEFINITIONS } from "$lib/domain/animals/animal-behavior";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import type { MapResource } from "$lib/core/systems/map/map";
import { TILE } from "$lib/core/systems/map/map";
import { ANIMAL_ECOLOGY_CONFIG } from "$lib/core/systems/animals/animal-ecology-config";
import { animalCenter } from "$lib/core/systems/animals/animal-runtime";

export function moveAnimalToward(
  entity: Entity,
  map: MapResource,
  tx: number,
  ty: number,
  speed: number,
  dt: number,
  away = false,
): void {
  const pos = entity.position!;
  const c = animalCenter(entity);
  let dx = tx - c.x;
  let dy = ty - c.y;
  if (away) {
    dx = -dx;
    dy = -dy;
  }
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  if (entity.animal && Math.abs(dx) > 0.1) {
    entity.animal.facingX = dx < 0 ? -1 : 1;
  }

  const step = speed * dt;
  const cx = pos.x + TILE / 2;
  const cy = pos.y + ANIMAL_ECOLOGY_CONFIG.bodyCenterYOffsetPx;
  const mx = dx * step;
  const my = dy * step;
  if (!collidesWithSolid(cx + mx, cy, ANIMAL_ECOLOGY_CONFIG.bodyHalfWidthPx, ANIMAL_ECOLOGY_CONFIG.bodyHalfHeightPx, map)) {
    pos.x += mx;
  }
  if (!collidesWithSolid(cx, cy + my, ANIMAL_ECOLOGY_CONFIG.bodyHalfWidthPx, ANIMAL_ECOLOGY_CONFIG.bodyHalfHeightPx, map)) {
    pos.y += my;
  }
  pos.targetX = pos.x;
  pos.targetY = pos.y;
}

export function handleScaredAnimal(
  entity: Entity,
  map: MapResource,
  dt: number,
  rng: () => number = Math.random,
): boolean {
  const animal = entity.animal!;
  if (!animal.scareSec || animal.scareSec <= 0) return false;
  animal.scareSec -= dt;

  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const pos = animalCenter(entity);
  const angle = rng() * Math.PI * 2;
  const fleeTargetX = pos.x + Math.cos(angle) * TILE;
  const fleeTargetY = pos.y + Math.sin(angle) * TILE;
  moveAnimalToward(entity, map, fleeTargetX, fleeTargetY, def.fleeSpeed, dt, true);
  return true;
}

export function updateWanderOrGraze(
  entity: Entity,
  map: MapResource,
  dt: number,
  rng: () => number = Math.random,
): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const pos = animalCenter(entity);
  const home = animal.home;

  if (Math.hypot(pos.x - home.x, pos.y - home.y) > ANIMAL_ECOLOGY_CONFIG.homeLeashRadiusPx) {
    moveAnimalToward(entity, map, home.x, home.y, def.moveSpeed * ANIMAL_ECOLOGY_CONFIG.grazeReturnSpeedMultiplier, dt);
    return;
  }

  animal.wanderTimerSec = (animal.wanderTimerSec ?? 0) - dt;
  if (animal.wanderTimerSec <= 0 || !animal.wanderTarget) {
    const angle = rng() * Math.PI * 2;
    const radius = rng() * TILE * 3;
    animal.wanderTarget = {
      x: home.x + Math.cos(angle) * radius,
      y: home.y + Math.sin(angle) * radius,
    };
    animal.wanderTimerSec = 3 + rng() * 4;
  }

  const target = animal.wanderTarget;
  if (target && Math.hypot(pos.x - target.x, pos.y - target.y) > TILE * 0.4) {
    moveAnimalToward(entity, map, target.x, target.y, def.moveSpeed * 0.45, dt);
  }
}
