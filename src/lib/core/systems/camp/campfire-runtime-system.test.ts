import { World } from "miniplex";
import { describe, expect, it } from "vitest";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { createCampfireState } from "$lib/domain/camp/camp-state";
import { TILE } from "$lib/core/systems/map/map";
import {
  findLitCampfires,
  isPointNearLitCampfire,
  refuelCampfireEntity,
  tickCampfireEntities,
} from "./campfire-runtime-system";

describe("campfire runtime system", () => {
  it("tracks lit campfire heat per entity", () => {
    const world = new World<Entity>();
    world.add({
      id: "fire",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      station: { stationId: "campfire" },
      campfire: createCampfireState({ isLit: true, fuelRemainingMs: 30_000 }),
    });
    world.add({
      id: "cold_fire",
      position: { x: TILE * 10, y: 0, targetX: TILE * 10, targetY: 0 },
      station: { stationId: "campfire" },
      campfire: createCampfireState({ isLit: false }),
    });

    expect(findLitCampfires(world)).toHaveLength(1);
    expect(isPointNearLitCampfire(world, { x: TILE / 2, y: TILE / 2 })).toBe(true);
    expect(isPointNearLitCampfire(world, { x: TILE * 12, y: TILE / 2 })).toBe(false);
  });

  it("refuels and ticks a campfire through the shared campfire state rules", () => {
    const world = new World<Entity>();
    const fire: Entity = {
      id: "fire",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      station: { stationId: "campfire" },
    };
    world.add(fire);

    refuelCampfireEntity(fire, 1_000);
    tickCampfireEntities(world, 2, { raining: false });

    expect(fire.campfire?.isLit).toBe(false);
    expect(fire.campfire?.fuelRemainingMs).toBe(0);
  });
});
