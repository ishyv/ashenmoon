import { gatherSoundId, type SoundId } from "./sound-manifest";
import type { GatherSoundKey } from "$lib/domain/gathering/gatherables";

export type PhysicalMaterial =
  | "wood"
  | "stone"
  | "flesh"
  | "hide"
  | "bone"
  | "leaves"
  | "clay"
  | "water"
  | "fiber"
  | "bark";

export interface AudioSourceProfile {
  id: string;
  tags: readonly string[];
  defaultIntensity?: number;
}

export interface ImpactSoundEvent {
  sourceProfileId?: string;
  sourceTags?: readonly string[];
  targetMaterial: PhysicalMaterial;
  intensity?: number;
}

export interface GatherSoundEvent {
  material?: PhysicalMaterial;
  legacyGatherSound?: GatherSoundKey;
}

export interface CraftSoundEvent {
  outcome: "success" | "failure" | "discovered";
  feedbackTags?: readonly string[];
}

export interface CombatSoundEvent {
  phase: "swing" | "miss" | "hit" | "glance" | "death";
  sourceProfileId?: string;
  sourceTags?: readonly string[];
  targetMaterial?: PhysicalMaterial;
  intensity?: number;
}

const SOURCE_PROFILES = new Map<string, AudioSourceProfile>();

export function registerAudioSourceProfile(profile: AudioSourceProfile): void {
  SOURCE_PROFILES.set(profile.id, profile);
}

export function getAudioSourceProfile(id: string): AudioSourceProfile | undefined {
  return SOURCE_PROFILES.get(id);
}

function registerDefaultAudioSourceProfiles(): void {
  for (const profile of [
    { id: "hand", tags: ["unarmed"], defaultIntensity: 0.35 },
    { id: "unarmed", tags: ["unarmed"], defaultIntensity: 0.35 },
    { id: "knife", tags: ["sharp", "light"], defaultIntensity: 0.45 },
    { id: "spear", tags: ["sharp", "wooden", "polearm"], defaultIntensity: 0.55 },
    { id: "axe", tags: ["sharp", "heavy", "chop"], defaultIntensity: 0.8 },
    { id: "pickaxe", tags: ["tool", "stone"], defaultIntensity: 0.7 },
    { id: "club", tags: ["blunt", "wooden"], defaultIntensity: 0.65 },
    { id: "tool", tags: ["tool"], defaultIntensity: 0.55 },
  ] satisfies AudioSourceProfile[]) {
    registerAudioSourceProfile(profile);
  }
}

registerDefaultAudioSourceProfiles();

const GATHER_BY_MATERIAL: Partial<Record<PhysicalMaterial, SoundId>> = {
  wood: "gather.branch.snap",
  stone: "gather.stone.pickup",
  leaves: "gather.leaves",
  clay: "gather.clay.pull",
  water: "gather.water.collect",
  fiber: "gather.fiber.pull",
  bark: "gather.bark.peel",
};

function sourceTags(event: Pick<ImpactSoundEvent, "sourceProfileId" | "sourceTags">): Set<string> {
  const profileTags = event.sourceProfileId ? getAudioSourceProfile(event.sourceProfileId)?.tags ?? [] : [];
  return new Set([...profileTags, ...(event.sourceTags ?? [])]);
}

function eventIntensity(event: Pick<ImpactSoundEvent, "sourceProfileId" | "intensity">): number {
  return event.intensity ?? (event.sourceProfileId ? getAudioSourceProfile(event.sourceProfileId)?.defaultIntensity : undefined) ?? 0.5;
}

export function resolveImpactSound(event: ImpactSoundEvent): SoundId {
  const tags = sourceTags(event);
  const heavy = eventIntensity(event) >= 0.75 || tags.has("heavy") || tags.has("chop");
  switch (event.targetMaterial) {
    case "wood":
    case "bark":
      return heavy ? "impact.wood.heavy" : "impact.wood.light";
    case "stone":
      return "impact.stone";
    case "flesh":
      return "impact.flesh";
    case "hide":
      return "impact.hide";
    case "bone":
      return "impact.bone";
    case "leaves":
      return "gather.leaves";
    case "clay":
      return "gather.clay.pull";
    case "water":
      return "gather.water.collect";
    case "fiber":
      return "gather.fiber.pull";
  }
}

export function resolveGatherSound(event: GatherSoundEvent): SoundId {
  if (event.material) {
    const materialSound = GATHER_BY_MATERIAL[event.material];
    if (materialSound) return materialSound;
  }
  return gatherSoundId(event.legacyGatherSound);
}

export function resolveCraftSound(event: CraftSoundEvent): SoundId {
  if (event.outcome === "failure") return "craft.failure";
  if (event.outcome === "discovered") return "recipe.discovered";

  const tags = new Set(event.feedbackTags ?? []);
  if (tags.has("binding")) return "craft.bind";
  if (tags.has("sharp")) return "craft.cut";
  if (tags.has("herbal")) return "craft.crush";
  if (tags.has("fire") || tags.has("smoke")) return "craft.cook.meat";
  return "craft.success";
}

export function resolveCombatSound(event: CombatSoundEvent): SoundId {
  if (event.phase === "miss") return "combat.miss.air";
  if (event.phase === "glance") return "combat.glancing";
  if (event.phase === "death") return "enemy.death";

  if (event.phase === "swing") {
    const tags = sourceTags(event);
    return tags.has("heavy") || tags.has("chop") || eventIntensity(event) >= 0.75
      ? "player.swing.heavy"
      : "player.swing.light";
  }

  return resolveImpactSound({
    targetMaterial: event.targetMaterial ?? "flesh",
    ...(event.sourceProfileId ? { sourceProfileId: event.sourceProfileId } : {}),
    ...(event.sourceTags ? { sourceTags: event.sourceTags } : {}),
    ...(event.intensity !== undefined ? { intensity: event.intensity } : {}),
  });
}
