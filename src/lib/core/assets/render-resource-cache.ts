import { Assets, Texture } from "pixi.js";
import type { AnimState } from "$lib/core/types";
import type { PlayerAnimationClipId } from "$lib/domain/animation/player-animation";
import {
  ASHENMOON_ACTOR_PATHS,
  ASHENMOON_ITEM_ICON_PATHS,
  BUNDLE_ASHENMOON_FIRST_CAMP,
  getAshenmoonItemIconKeyForItemId,
  getAshenmoonPlayerAnimationFramePaths,
  type AshenmoonActorKey,
} from "$lib/core/assets/ashenmoon-assets";

export type GeneratedRenderTextureKey = "campfireGlow";

export interface RenderResourceCacheStats {
  declaredAssets: number;
  loadedAssets: number;
  generatedTextures: number;
  missing: readonly string[];
}

export interface RenderResourceCache {
  preloadAll(): Promise<void>;
  texture(path: string): Texture;
  itemIconTexture(itemId: string): Texture;
  itemIconPath(itemId: string): string;
  actorFrames(key: AshenmoonActorKey, state?: AnimState | PlayerAnimationClipId | "idle"): readonly Texture[];
  generatedTexture(key: GeneratedRenderTextureKey): Texture;
  stats(): RenderResourceCacheStats;
}

interface ItemIconResolution {
  readonly path: string;
}

/**
 * Owns Ashenmoon render-resource lookup policy while Pixi owns the actual
 * low-level asset cache. This keeps resource lifecycle visible to the engine
 * without caching scene objects such as Sprite, Graphics, or Text.
 */
export class AshenmoonRenderResourceCache implements RenderResourceCache {
  private preloadPromise: Promise<void> | null = null;
  private readonly itemIconByItemId = new Map<string, ItemIconResolution>();
  private readonly actorFrameCache = new Map<string, readonly Texture[]>();
  private readonly generatedTextures = new Map<GeneratedRenderTextureKey, Texture>();

  public async preloadAll(): Promise<void> {
    if (!this.preloadPromise) {
      this.preloadPromise = this.loadBundle(BUNDLE_ASHENMOON_FIRST_CAMP);
    }
    await this.preloadPromise;
  }

  public texture(path: string): Texture {
    const texture = Assets.get<Texture>(path);
    if (!texture) throw new Error(`Ashenmoon render asset not loaded: ${path}`);
    return texture;
  }

  public itemIconTexture(itemId: string): Texture {
    return this.texture(this.itemIconPath(itemId));
  }

  public itemIconPath(itemId: string): string {
    const cached = this.itemIconByItemId.get(itemId);
    if (cached) return cached.path;

    const key = getAshenmoonItemIconKeyForItemId(itemId) ?? "stick";
    const resolution = { path: ASHENMOON_ITEM_ICON_PATHS[key] };
    this.itemIconByItemId.set(itemId, resolution);
    return resolution.path;
  }

  public actorFrames(key: AshenmoonActorKey, state: AnimState | PlayerAnimationClipId | "idle" = "idle"): readonly Texture[] {
    const cacheKey = `${key}:${state}`;
    const cached = this.actorFrameCache.get(cacheKey);
    if (cached) return cached;

    if (key === "player") {
      const paths = getAshenmoonPlayerAnimationFramePaths(state);
      if (paths) {
        const frames = paths.map((path) => this.texture(path));
        this.actorFrameCache.set(cacheKey, frames);
        return frames;
      }
    }

    const base = this.texture(ASHENMOON_ACTOR_PATHS[key]);
    // Action readability is handled through runtime transforms/overlays; never
    // swap to another standee just to fake an attack frame.
    const frames = state === "run" || state === "walk" ? [base, base, base] : [base, base];
    this.actorFrameCache.set(cacheKey, frames);
    return frames;
  }

  public generatedTexture(key: GeneratedRenderTextureKey): Texture {
    const cached = this.generatedTextures.get(key);
    if (cached) return cached;

    const texture = key === "campfireGlow" ? createCampfireGlowTexture() : Texture.EMPTY;
    this.generatedTextures.set(key, texture);
    return texture;
  }

  public stats(): RenderResourceCacheStats {
    const missing = BUNDLE_ASHENMOON_FIRST_CAMP.filter((path) => !Assets.get<Texture>(path));
    return {
      declaredAssets: BUNDLE_ASHENMOON_FIRST_CAMP.length,
      loadedAssets: BUNDLE_ASHENMOON_FIRST_CAMP.length - missing.length,
      generatedTextures: this.generatedTextures.size,
      missing,
    };
  }

  private async loadBundle(paths: readonly string[]): Promise<void> {
    await Assets.load(paths as string[]);
    const stillMissing = paths.filter((path) => !Assets.get<Texture>(path));
    if (stillMissing.length > 0) {
      this.preloadPromise = null;
      throw new Error(`Ashenmoon render assets failed to preload:\n- ${stillMissing.join("\n- ")}`);
    }
  }
}

export function createRenderResourceCache(): RenderResourceCache {
  return new AshenmoonRenderResourceCache();
}

export const renderResourceCache = createRenderResourceCache();

export function getAshenmoonItemIconPath(itemId: string): string {
  return renderResourceCache.itemIconPath(itemId);
}

function createCampfireGlowTexture(): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;
  const radius = 384;
  const canvas = document.createElement("canvas");
  canvas.width = radius * 2;
  canvas.height = radius * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Texture.EMPTY;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, "rgba(255, 235, 205, 0.45)");
  grad.addColorStop(0.35, "rgba(255, 190, 130, 0.25)");
  grad.addColorStop(0.7, "rgba(255, 150, 90, 0.1)");
  grad.addColorStop(1, "rgba(255, 150, 90, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return Texture.from(canvas);
}
