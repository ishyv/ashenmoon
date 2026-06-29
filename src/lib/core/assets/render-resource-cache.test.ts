import { beforeEach, describe, expect, it, vi } from "vitest";

const textureByPath = new Map<string, unknown>();
const loadCalls: string[][] = [];
const canvasTexture = { id: "campfire-glow" };

vi.mock("pixi.js", () => {
  class Sprite {
    public anchor = { set: vi.fn() };
    public scale = { set: vi.fn() };
    public alpha = 1;
    constructor(public texture?: unknown) {}
  }

  class AnimatedSprite extends Sprite {
    public animationSpeed = 0;
    public loop = true;
    public onComplete = vi.fn();
    play = vi.fn();
    gotoAndPlay = vi.fn();
    constructor(public textures: unknown[]) {
      super(textures[0]);
    }
  }

  return {
    AnimatedSprite,
    Sprite,
    Assets: {
      get: vi.fn((path: string) => textureByPath.get(path)),
      load: vi.fn(async (paths: string[]) => {
        loadCalls.push([...paths]);
        return Object.fromEntries(
          paths.map((path) => {
            const texture = { path };
            textureByPath.set(path, texture);
            return [path, texture];
          }),
        );
      }),
    },
    Texture: {
      EMPTY: { id: "empty" },
      from: vi.fn(() => canvasTexture),
    },
  };
});

import { Assets } from "pixi.js";
import {
  ASHENMOON_ITEM_ICON_PATHS,
  ASHENMOON_PROP_PATHS,
  BUNDLE_ASHENMOON_FIRST_CAMP,
} from "$lib/core/assets/ashenmoon-assets";
import { createRenderResourceCache } from "$lib/core/assets/render-resource-cache";

describe("render resource cache", () => {
  beforeEach(() => {
    textureByPath.clear();
    loadCalls.length = 0;
    vi.clearAllMocks();
    vi.stubGlobal("document", {
      createElement: vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
          fillRect: vi.fn(),
          fillStyle: "",
        })),
      })),
    });
  });

  it("preloads the declared Ashenmoon bundle once", async () => {
    const cache = createRenderResourceCache();

    await cache.preloadAll();
    await cache.preloadAll();

    expect(loadCalls).toHaveLength(1);
    expect(loadCalls[0]).toEqual(BUNDLE_ASHENMOON_FIRST_CAMP);
  });

  it("resolves and memoizes item icon paths with blueprint and stick fallback", () => {
    const cache = createRenderResourceCache();

    expect(cache.itemIconPath("stone")).toBe(ASHENMOON_ITEM_ICON_PATHS.stone);
    expect(cache.itemIconPath("blueprint_make_rope")).toBe(ASHENMOON_ITEM_ICON_PATHS.blueprintMethod);
    expect(cache.itemIconPath("unknown_item")).toBe(ASHENMOON_ITEM_ICON_PATHS.stick);
    expect(cache.itemIconPath("unknown_item")).toBe(ASHENMOON_ITEM_ICON_PATHS.stick);
  });

  it("returns stable actor frame arrays for repeated lookups", async () => {
    const cache = createRenderResourceCache();
    await cache.preloadAll();

    const first = cache.actorFrames("player", "idle");
    const second = cache.actorFrames("player", "idle");
    const run = cache.actorFrames("player", "run");

    expect(second).toBe(first);
    expect(run).not.toBe(first);
    expect(run).toHaveLength(3);
  });

  it("memoizes generated campfire glow texture", () => {
    const cache = createRenderResourceCache();

    const first = cache.generatedTexture("campfireGlow");
    const second = cache.generatedTexture("campfireGlow");

    expect(second).toBe(first);
    expect(first).toBe(canvasTexture);
  });

  it("reports loaded, generated, and missing asset stats", async () => {
    const cache = createRenderResourceCache();
    await cache.preloadAll();
    cache.generatedTexture("campfireGlow");

    textureByPath.delete(ASHENMOON_PROP_PATHS.firepitLit);

    expect(cache.stats()).toMatchObject({
      declaredAssets: BUNDLE_ASHENMOON_FIRST_CAMP.length,
      loadedAssets: BUNDLE_ASHENMOON_FIRST_CAMP.length - 1,
      generatedTextures: 1,
      missing: [ASHENMOON_PROP_PATHS.firepitLit],
    });
    expect(Assets.get).toHaveBeenCalled();
  });
});
