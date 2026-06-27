import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";

vi.mock("pixi.js", () => ({
  Container: class {
    addChild = vi.fn();
    removeChild = vi.fn();
  },
  Graphics: class {
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    ellipse = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
  Sprite: class {
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    x = 0;
    y = 0;
    zIndex = 0;
  },
  Texture: class {},
  TextStyle: class {},
  Text: class {
    anchor = { set: vi.fn() };
    x = 0;
    y = 0;
  },
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/core/systems/gatherable-render-adapter", () => ({
  createGatherableRenderSprite: vi.fn().mockReturnValue({
    anchor: { set: vi.fn() },
    scale: { set: vi.fn() },
    x: 0,
    y: 0,
    zIndex: 0,
  }),
}));

import { depleteNodeSystem } from "./node-depletion-system";
import { MapResource } from "$lib/core/systems/map/map";
import { world } from "$lib/core/ecs/ecs-miniplex";

describe("depleteNodeSystem", () => {
  it("spawns sticks when a tree is depleted", () => {
    // Clear and set up the shared world
    world.clear();

    const playerEntity: Entity = {
      id: "player",
      playerControlled: { speed: 100 },
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    world.add(playerEntity);

    const entity: Entity = {
      id: "test_tree",
      position: { x: 64, y: 64, targetX: 64, targetY: 64 },
      resource: { hp: 0, maxHp: 15, drop: "wood", gatherableId: "oak_tree" },
    };
    world.add(entity);

    const clearCurrentTarget = vi.fn();
    const vfx: any = {
      activeShakes: new Map(),
      baseScales: new Map(),
      particles: [],
      shockwaveRings: [],
      cameraShake: { intensity: 0, duration: 0, time: 0 },
      floatingTexts: [],
    };
    const entityLayer: any = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    };
    const entitySprites = new Map<string, any>();
    entitySprites.set("test_tree", { destroy: vi.fn() });

    const triggerQuestEvent = vi.fn();
    const map = new MapResource();
    map.mapW = 10;
    map.mapH = 10;
    map.cells = new Array(100).fill(1); // not water

    depleteNodeSystem(
      world,
      entity,
      clearCurrentTarget,
      vfx,
      entityLayer,
      entitySprites,
      triggerQuestEvent,
      map
    );

    // Verify entity was removed
    expect(world.entities.includes(entity)).toBe(false);

    // Verify sticks were spawned on the ground
    const spawnedPickups = world.entities.filter((e) => e.pickup && e.pickup.gatherableId === "stick_pickup");
    expect(spawnedPickups.length).toBeGreaterThanOrEqual(1);
    expect(spawnedPickups.length).toBeLessThanOrEqual(3);
    expect(spawnedPickups[0]?.pickup?.itemId).toBe("stick");
  });

  it("can spawn green leaves when a tree is depleted", () => {
    world.clear();
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);

    const playerEntity: Entity = {
      id: "player",
      playerControlled: { speed: 100 },
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    world.add(playerEntity);

    const entity: Entity = {
      id: "test_tree",
      position: { x: 64, y: 64, targetX: 64, targetY: 64 },
      resource: { hp: 0, maxHp: 15, drop: "wood", gatherableId: "oak_tree" },
    };
    world.add(entity);

    const vfx: any = {
      activeShakes: new Map(),
      baseScales: new Map(),
      particles: [],
      shockwaveRings: [],
      cameraShake: { intensity: 0, duration: 0, time: 0 },
      floatingTexts: [],
    };
    const entityLayer: any = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    };
    const entitySprites = new Map<string, any>();
    entitySprites.set("test_tree", { destroy: vi.fn() });

    const map = new MapResource();
    map.mapW = 10;
    map.mapH = 10;
    map.cells = new Array(100).fill(1);

    depleteNodeSystem(world, entity, vi.fn(), vfx, entityLayer, entitySprites, vi.fn(), map);

    const spawnedLeaves = world.entities.filter((e) => e.pickup?.gatherableId === "green_leaves_pickup");
    expect(spawnedLeaves.length).toBeGreaterThanOrEqual(1);
    expect(spawnedLeaves[0]?.pickup?.itemId).toBe("green_leaves");

    randomSpy.mockRestore();
  });

  it("spawns stones when a rock is depleted", () => {
    world.clear();

    const playerEntity: Entity = {
      id: "player",
      playerControlled: { speed: 100 },
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    world.add(playerEntity);

    const entity: Entity = {
      id: "test_rock",
      position: { x: 64, y: 64, targetX: 64, targetY: 64 },
      resource: { hp: 0, maxHp: 15, drop: "stone", gatherableId: "stone_node" },
    };
    world.add(entity);

    const clearCurrentTarget = vi.fn();
    const vfx: any = {
      activeShakes: new Map(),
      baseScales: new Map(),
      particles: [],
      shockwaveRings: [],
      cameraShake: { intensity: 0, duration: 0, time: 0 },
      floatingTexts: [],
    };
    const entityLayer: any = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    };
    const entitySprites = new Map<string, any>();
    entitySprites.set("test_rock", { destroy: vi.fn() });

    const triggerQuestEvent = vi.fn();
    const map = new MapResource();
    map.mapW = 10;
    map.mapH = 10;
    map.cells = new Array(100).fill(1); // not water

    depleteNodeSystem(
      world,
      entity,
      clearCurrentTarget,
      vfx,
      entityLayer,
      entitySprites,
      triggerQuestEvent,
      map
    );

    expect(world.entities.includes(entity)).toBe(false);

    const spawnedPickups = world.entities.filter((e) => e.pickup && e.pickup.gatherableId === "loose_stone_pickup");
    expect(spawnedPickups.length).toBeGreaterThanOrEqual(1);
    expect(spawnedPickups.length).toBeLessThanOrEqual(3);
    expect(spawnedPickups[0]?.pickup?.itemId).toBe("stone");
  });
});
