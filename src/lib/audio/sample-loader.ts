/**
 * Sample pipeline. Decodes audio files declared in the manifest into cached
 * AudioBuffers; `getSampleBuffer` is a sync cache read the engine consults
 * before falling back to a procedural recipe. There are no audio files in the
 * repo yet, so every lookup currently misses and the recipe plays — dropping a
 * file into static/audio/ and pointing a manifest `sample` at it flips a sound
 * to its sample with zero code change.
 */

import { SOUNDS, type SoundId } from "./sound-manifest";

/** Cache of decoded audio buffers, keyed by absolute relative path (e.g. "/audio/footstep_1.mp3") */
const sampleCache = new Map<string, AudioBuffer>();
let preloaded = false;

/** Collect all unique sample paths from the sound manifest (including variations). */
export function getAllManifestSamples(): string[] {
  const samples = new Set<string>();
  for (const def of Object.values(SOUNDS)) {
    if (def.sample) {
      if (Array.isArray(def.sample)) {
        for (const s of def.sample) samples.add(s);
      } else {
        samples.add(def.sample);
      }
    }
    if (def.variations) {
      for (const variant of def.variations) {
        if (variant.sample) {
          if (Array.isArray(variant.sample)) {
            for (const s of variant.sample) samples.add(s);
          } else {
            samples.add(variant.sample);
          }
        }
      }
    }
  }
  return Array.from(samples).map((name) => `/audio/${name}`);
}

/** Get a random loaded sample buffer from the given sample spec, or null. */
export function getSampleBuffer(sampleSpec?: string | string[]): AudioBuffer | null {
  if (!sampleSpec) return null;
  const list = Array.isArray(sampleSpec) ? sampleSpec : [sampleSpec];
  const loaded: AudioBuffer[] = [];
  for (const name of list) {
    const buffer = sampleCache.get(`/audio/${name}`);
    if (buffer) loaded.push(buffer);
  }
  if (loaded.length === 0) return null;
  const index = loaded.length === 1 ? 0 : Math.floor(Math.random() * loaded.length);
  return loaded[index] ?? null;
}

async function decode(ctx: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Fetch + decode every manifested sample once. Misses are silently skipped. */
export async function preloadSamples(ctx: AudioContext): Promise<void> {
  if (preloaded) return;
  preloaded = true;
  const urls = getAllManifestSamples();
  await Promise.all(
    urls.map(async (url) => {
      const decoded = await decode(ctx, url);
      if (decoded) {
        sampleCache.set(url, decoded);
      }
    }),
  );
}

