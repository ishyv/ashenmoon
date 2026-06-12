import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { EntityId } from "$lib/domain/game-events";
import { MapResource, TILE } from "$lib/core/systems/map/map";
import { tickExposureSystem } from "./exposure-system";
import { spawnEnvFloatingText, type VFXResource } from "$lib/core/vfx/vfx";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

describe("tickExposureSystem", () => {
  it("ticks pickup exposure using the injected ECS world", () => {
    const ecsWorld = new World<Entity>();
    const map = new MapResource();
    const entityLayer = new Container();
    const vfx = {} as VFXResource;

    ecsWorld.add({
      id: EntityId.Campfire,
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      station: { stationId: "campfire" },
    });
    const branch = ecsWorld.add({
      id: "branch_pickup",
      position: { x: TILE, y: 0, targetX: TILE, targetY: 0 },
      pickup: { itemId: "branch", qty: 1, exposureTimeSec: 0, hasWarned: false },
    });

    tickExposureSystem(ecsWorld, map, 1.2, vfx, entityLayer);

    expect(branch.pickup?.exposureTimeSec).toBeCloseTo(1.2);
    expect(branch.pickup?.hasWarned).toBe(true);
    expect(spawnEnvFloatingText).toHaveBeenCalledWith(
      vfx,
      "smoldering...",
      expect.any(Number),
      branch.position,
      entityLayer,
    );
  });
});
