import { describe, expect, it, vi } from "vitest";
import { EntityId } from "$lib/domain/game-events";
import { MapResource, TILE, cullViewportSystem } from "./map";

vi.mock("pixi.js", () => ({
  Container: class {
    visible = true;
    addChild = vi.fn();
  },
  Graphics: class {
    visible = true;
    rect = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    circle = vi.fn().mockReturnThis();
    ellipse = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
  },
  Sprite: class {
    visible = true;
    anchor = { set: vi.fn() };
    scale = { set: vi.fn() };
    x = 0;
    y = 0;
    alpha = 1;
    zIndex = 0;
  },
  Texture: class {},
}));

function makeVisibleTile(): { visible: boolean } {
  return { visible: true };
}

function makeMap(width: number, height: number): MapResource {
  const map = new MapResource();
  map.mapW = width;
  map.mapH = height;
  map.tileSprites = Array.from({ length: width * height }, () => makeVisibleTile() as any);
  return map;
}

describe("cullViewportSystem", () => {
  it("keeps visible terrain inside the viewport and hides terrain outside it", () => {
    const map = makeMap(7, 7);

    cullViewportSystem(
      map,
      { x: 3 * TILE, y: 3 * TILE },
      1,
      { width: 1, height: 1 },
      new Map()
    );

    expect(map.tileSprites[3 * map.mapW + 3]?.visible).toBe(true);
    expect(map.tileSprites[3 * map.mapW + 0]?.visible).toBe(false);
  });

  it("hides non-player entities outside the viewport", () => {
    const map = makeMap(7, 7);
    const outsideEntity = {
      x: -2 * TILE + TILE / 2,
      y: 3 * TILE + TILE,
      visible: true,
    };

    cullViewportSystem(
      map,
      { x: 3 * TILE, y: 3 * TILE },
      1,
      { width: 1, height: 1 },
      new Map([["wolf", outsideEntity as any]])
    );

    expect(outsideEntity.visible).toBe(false);
  });

  it("does not cull the player sprite", () => {
    const map = makeMap(7, 7);
    const playerSprite = {
      x: -2 * TILE + TILE / 2,
      y: 3 * TILE + TILE,
      visible: true,
    };

    cullViewportSystem(
      map,
      { x: 3 * TILE, y: 3 * TILE },
      1,
      { width: 1, height: 1 },
      new Map([[EntityId.Player, playerSprite as any]])
    );

    expect(playerSprite.visible).toBe(true);
  });
});
