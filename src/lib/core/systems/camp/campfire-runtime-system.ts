import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import {
  createCampfireState,
  tickCampfire,
  type CampfireState,
} from "$lib/domain/camp/camp-state";

export interface LitCampfire {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly radiusPx: number;
}

function center(entity: Entity): { x: number; y: number } {
  const pos = entity.position!;
  return { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
}

export function createLitCampfireState(fuelMs: number): CampfireState {
  return createCampfireState({
    isLit: true,
    fuelRemainingMs: fuelMs,
    heatRadiusPx: TILE * 4.5,
    lightRadiusPx: TILE * 5.5,
  });
}

export function refuelCampfireEntity(entity: Entity, fuelMs: number): void {
  entity.campfire = createLitCampfireState(fuelMs);
}

export function tickCampfireEntities(
  world: World<Entity>,
  dtSec: number,
  context: { raining: boolean },
): void {
  for (const entity of world.with("campfire").entities) {
    entity.campfire = tickCampfire(entity.campfire!, dtSec, {
      raining: context.raining,
      sheltered: false,
    });
  }
}

export function findLitCampfires(world: World<Entity>): LitCampfire[] {
  return world
    .with("campfire", "position")
    .entities
    .filter((entity) => entity.campfire!.isLit)
    .map((entity) => {
      const c = center(entity);
      return {
        entityId: entity.id,
        x: c.x,
        y: c.y,
        radiusPx: entity.campfire!.heatRadiusPx,
      };
    });
}

export function isPointNearLitCampfire(
  world: World<Entity>,
  point: { x: number; y: number },
): boolean {
  return findLitCampfires(world).some((fire) => Math.hypot(point.x - fire.x, point.y - fire.y) <= fire.radiusPx);
}

export function getCampfireHeatRadiusTiles(entity: Entity | undefined): number {
  if (!entity?.campfire?.isLit) return 0;
  return entity.campfire.heatRadiusPx / TILE;
}
