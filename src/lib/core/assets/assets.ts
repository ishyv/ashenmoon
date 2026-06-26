import { Assets, Texture } from "pixi.js";
import { BUNDLE_ASHENMOON_FIRST_CAMP } from "$lib/core/assets/ashenmoon-assets";

export type UnitColor = "blue" | "black" | "red" | "purple" | "yellow";

export const BUNDLE_CORE = [
  ...BUNDLE_ASHENMOON_FIRST_CAMP,
];

const textures = new Map<string, Texture>();

/**
 * Loads the core gameplay bundle. Called once during
 * engine.init(). Subsequent calls are no-ops if the cache is already populated.
 */
export async function loadGameAssets(): Promise<void> {
  if (textures.size > 0) return;
  await loadAssets(BUNDLE_CORE);
}

/**
 * Loads any set of asset paths into the texture cache. Safe to call multiple
 * times with overlapping paths — already-loaded entries are skipped.
 */
export async function loadAssets(paths: readonly string[]): Promise<void> {
  const missing = paths.filter((p) => !textures.has(p));
  if (missing.length === 0) return;
  const loaded = await Assets.load(missing as string[]);
  for (const path of missing) {
    const t = loaded[path];
    if (t) textures.set(path, t);
  }
}

/** Generates a warm radial gradient texture for campfire lighting. */
export function generateCampfireGlowTexture(): Texture {
  if (typeof document === "undefined") return Texture.EMPTY;
  const radius = 384;
  const canvas = document.createElement("canvas");
  canvas.width = radius * 2;
  canvas.height = radius * 2;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  grad.addColorStop(0, "rgba(255, 235, 205, 0.45)"); // Warm orange/white center
  grad.addColorStop(0.35, "rgba(255, 190, 130, 0.25)"); // Mid glow
  grad.addColorStop(0.7, "rgba(255, 150, 90, 0.1)"); // Fading glow
  grad.addColorStop(1, "rgba(255, 150, 90, 0)"); // Fades out completely
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, radius * 2, radius * 2);
  return Texture.from(canvas);
}
