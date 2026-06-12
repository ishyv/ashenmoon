import { describe, expect, it, vi, beforeEach } from "vitest";
import { World } from "miniplex";
import { Container, Sprite } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { MapResource, TILE } from "$lib/core/systems/map/map";
import {
  getItemTexture,
  isValidItemPlacementGrid,
  spawnPlacedItemSystem,
  placeItemSystem,
  ItemPlacementResource,
} from "./item-placement-system";
import type { VFXResource } from "$lib/core/vfx/vfx";

vi.mock("pixi.js", async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    Texture: {
      ...original.Texture,
      from: vi.fn(() => ({}) as any),
    },
  };
});

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/core/ecs/entity-queries", () => ({
  getPlayerEntity: () => ({
    id: "player",
    position: { x: 5 * TILE, y: 5 * TILE, targetX: 5 * TILE, targetY: 5 * TILE },
  }),
}));

vi.mock("$lib/state/persistence/remote-sync", () => ({
  syncPlaceItem: vi.fn(() => Promise.resolve({ ok: true, data: {} })),
}));

vi.mock("$lib/state/rpg-actions.svelte", () => ({
  applyRpgState: vi.fn(),
}));

vi.mock("$lib/core/assets/assets", () => ({
  getWoodItemTexture: () => ({}) as any,
  getRockVariantTexture: () => ({}) as any,
  getToolTexture: () => ({}) as any,
  getBushTexture: () => ({}) as any,
  getMeatItemTexture: () => ({}) as any,
}));

describe("item placement system", () => {
  let ecsWorld: World<Entity>;
  let map: MapResource;
  let entityLayer: Container;
  let entitySprites: Map<string, Container>;
  let vfx: VFXResource;

  beforeEach(() => {
    ecsWorld = new World<Entity>();
    map = new MapResource();
    map.mapW = 10;
    map.mapH = 10;
    map.cells = new Array(100).fill(1); // 1 = Dirt
    entityLayer = new Container();
    entitySprites = new Map();
    vfx = {} as VFXResource;
    vi.clearAllMocks();
  });

  describe("getItemTexture", () => {
    it("returns a texture fallback for stick", () => {
      const tex = getItemTexture("stick");
      expect(tex).toBeDefined();
    });
  });

  describe("isValidItemPlacementGrid", () => {
    it("checks player range and boundaries", () => {
      const playerPos = { x: 5 * TILE, y: 5 * TILE };
      // Within range (Chebyshev distance of 1 tile)
      expect(isValidItemPlacementGrid(4, 4, map, playerPos)).toBe(true);
      // Out of range (Chebyshev distance of 5 tiles)
      expect(isValidItemPlacementGrid(0, 0, map, playerPos)).toBe(false);
    });
  });

  describe("spawnPlacedItemSystem", () => {
    it("adds a pickup entity to world and sprite to layer", () => {
      spawnPlacedItemSystem("test_id", "clay", 4, 4, ecsWorld, entityLayer, entitySprites);

      const entities = ecsWorld.with("pickup").entities;
      expect(entities.length).toBe(1);
      expect(entities[0]?.pickup?.itemId).toBe("clay");
      expect(entitySprites.has("test_id")).toBe(true);
    });
  });

  describe("placeItemSystem", () => {
    it("handles placing an item successfully", async () => {
      const cancelPlacement = vi.fn();
      const onCompleteCb = vi.fn();

      await placeItemSystem(
        "clay",
        4,
        4,
        ecsWorld,
        map,
        vfx,
        entityLayer,
        entitySprites,
        cancelPlacement,
        onCompleteCb,
      );

      const entities = ecsWorld.with("pickup").entities;
      expect(entities.length).toBe(1);
      expect(cancelPlacement).toHaveBeenCalled();
      expect(onCompleteCb).toHaveBeenCalled();
    });
  });
});
