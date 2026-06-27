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

export type ImpactSource = "hand" | "knife" | "spear" | "axe" | "pickaxe" | "club" | "tool" | "unknown";

export interface ImpactSoundEvent {
  source?: ImpactSource | string;
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
  weaponCategory?: string;
  targetMaterial?: PhysicalMaterial;
  intensity?: number;
}

const GATHER_BY_MATERIAL: Partial<Record<PhysicalMaterial, SoundId>> = {
  wood: "gather.branch.snap",
  stone: "gather.stone.pickup",
  leaves: "gather.leaves",
  clay: "gather.clay.pull",
  water: "gather.water.collect",
  fiber: "gather.fiber.pull",
  bark: "gather.bark.peel",
};

export function resolveImpactSound(event: ImpactSoundEvent): SoundId {
  const heavy = (event.intensity ?? 0.5) >= 0.75;
  switch (event.targetMaterial) {
    case "wood":
    case "bark":
      return heavy || event.source === "axe" ? "impact.wood.heavy" : "impact.wood.light";
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
    return event.weaponCategory === "axe" || (event.intensity ?? 0) >= 0.75
      ? "player.swing.heavy"
      : "player.swing.light";
  }

  return resolveImpactSound({
    targetMaterial: event.targetMaterial ?? "flesh",
    ...(event.weaponCategory ? { source: event.weaponCategory } : {}),
    ...(event.intensity !== undefined ? { intensity: event.intensity } : {}),
  });
}
