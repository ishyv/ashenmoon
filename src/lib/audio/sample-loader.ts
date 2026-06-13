/**
 * Sample pipeline. Decodes audio files declared in the manifest into cached
 * AudioBuffers; `getSampleBuffer` is a sync cache read the engine consults
 * before falling back to a procedural recipe. There are no audio files in the
 * repo yet, so every lookup currently misses and the recipe plays — dropping a
 * file into static/audio/ and pointing a manifest `sample` at it flips a sound
 * to its sample with zero code change.
 */

import { SOUNDS, type SoundId } from "./sound-manifest";

/** Decoded buffers per sound (>1 entry = random round-robin variation). */
const buffers = new Map<SoundId, AudioBuffer[]>();
let preloaded = false;

function sampleUrls(id: SoundId): string[] {
  const s = SOUNDS[id]?.sample;
  if (!s) return [];
  return (Array.isArray(s) ? s : [s]).map((name) => `/audio/${name}`);
}

/** A loaded buffer for `id`, or null to fall back to the recipe. */
export function getSampleBuffer(id: SoundId): AudioBuffer | null {
  const list = buffers.get(id);
  if (!list || list.length === 0) return null;
  const index = list.length === 1 ? 0 : Math.floor(Math.random() * list.length);
  return list[index] ?? null;
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
  const ids = Object.keys(SOUNDS) as SoundId[];
  await Promise.all(
    ids.map(async (id) => {
      const urls = sampleUrls(id);
      if (urls.length === 0) return;
      const decoded = (await Promise.all(urls.map((u) => decode(ctx, u)))).filter(
        (b): b is AudioBuffer => b !== null,
      );
      if (decoded.length > 0) buffers.set(id, decoded);
    }),
  );
}
