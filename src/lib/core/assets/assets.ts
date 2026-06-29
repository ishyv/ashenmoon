import { Texture } from "pixi.js";
import { BUNDLE_ASHENMOON_FIRST_CAMP } from "$lib/core/assets/ashenmoon-assets";
import { renderResourceCache } from "$lib/core/assets/render-resource-cache";

export type UnitColor = "blue" | "black" | "red" | "purple" | "yellow";

export const BUNDLE_CORE = [
  ...BUNDLE_ASHENMOON_FIRST_CAMP,
];

const BUNDLE_CORE_PATHS: ReadonlySet<string> = new Set(BUNDLE_CORE);

/**
 * Loads the core gameplay bundle. Called once during
 * engine.init(). Subsequent calls are no-ops if the cache is already populated.
 */
export async function loadGameAssets(): Promise<void> {
  await renderResourceCache.preloadAll();
}

/**
 * Loads any set of asset paths into the texture cache. Safe to call multiple
 * times with overlapping paths — already-loaded entries are skipped.
 */
export async function loadAssets(paths: readonly string[]): Promise<void> {
  if (paths.every((path) => BUNDLE_CORE_PATHS.has(path))) {
    await renderResourceCache.preloadAll();
    return;
  }
  throw new Error("loadAssets only supports the Ashenmoon core bundle in Render Resource Cache V1");
}

/** Generates a warm radial gradient texture for campfire lighting. */
export function generateCampfireGlowTexture(): Texture {
  return renderResourceCache.generatedTexture("campfireGlow");
}
