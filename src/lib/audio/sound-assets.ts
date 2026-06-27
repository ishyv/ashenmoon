import { SOUNDS, type SoundId } from "./sound-manifest";

export type SoundAssetSource =
  | "internal"
  | "generated"
  | "freesound"
  | "kenney"
  | "opengameart"
  | "zapsplat"
  | "other";

export interface SoundAssetMetadata {
  id: string;
  /** File under static/audio. Generated-only entries intentionally omit this. */
  file?: string;
  source: SoundAssetSource;
  author?: string;
  license?: string;
  sourceUrl?: string;
  modified?: boolean;
  notes?: string;
}

export const SOUND_ASSET_METADATA: Record<string, SoundAssetMetadata> = {
  generated_procedural_recipes: {
    id: "generated_procedural_recipes",
    source: "generated",
    license: "MIT",
    modified: false,
    notes: "Procedural fallback voices generated at runtime by src/lib/audio/recipes.ts.",
  },
};

export function getManifestSampleNames(): string[] {
  const names = new Set<string>();
  const addSample = (sample?: string | readonly string[]) => {
    if (!sample) return;
    if (typeof sample === "string") {
      names.add(sample);
    } else {
      for (const item of sample) names.add(item);
    }
  };

  for (const def of Object.values(SOUNDS)) {
    addSample(def.sample);
    for (const variation of def.variations ?? []) addSample(variation.sample);
  }

  return [...names].sort();
}

export function getMissingSampleMetadata(): string[] {
  const documented = new Set(
    Object.values(SOUND_ASSET_METADATA)
      .map((metadata) => metadata.file)
      .filter((file): file is string => Boolean(file)),
  );

  return getManifestSampleNames().filter((sample) => !documented.has(sample));
}

export function isSoundId(value: string): value is SoundId {
  return Object.prototype.hasOwnProperty.call(SOUNDS, value);
}
