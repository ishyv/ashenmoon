import type { VisualDefinition } from "./visual-definitions.js";
import { WET_SHEEN_OVERLAY } from "./visual-definitions.js";

/**
 * Input snapshot that drives the visual state resolver for placed material items.
 *
 * Consumed by MATERIAL_VISUAL_DEF rules. The bridge layer is responsible for
 * reading ECS pickup.reactions progress and local environment signals and
 * assembling this struct each tick.
 *
 * INVARIANT: progress fields (cookingProgress, dryingProgress) must be 0 when
 * the corresponding reaction is not active. The visual def does not guard against
 * spurious non-zero values — bad input produces confusing visuals.
 */
export interface MaterialVisualInput {
  /** Item is currently in its "damp" variant state (e.g. damp_firewood). */
  isDamp: boolean;
  /** Ambient temperature in °C from local environment signals. */
  heatNearby: number;
  /** Rain/wetness exposure level, 0–1. Drives wet_sheen overlay. */
  wetness: number;
  /** placed-reactions "cook" progress, 0–1. Non-zero while cooking is active. */
  cookingProgress: number;
  /** placed-reactions "dry" progress, 0–1. Non-zero while drying is active. */
  dryingProgress: number;
}

export const MATERIAL_VISUAL_DEF: VisualDefinition<MaterialVisualInput> = {
  id: "material",
  fallbackState: "dry",
  states: {
    // Base states — no baseSprite; these modify the existing pickup sprite via tint/particles
    dry: {
      id: "dry",
      alpha: 1,
    },
    damp: {
      id: "damp",
      tint: 0x7799bb,
      alpha: 1,
      particles: ["steam_small"] as const,
    },
    drying: {
      id: "drying",
      tint: 0xcc8840,
      alpha: 1,
      particles: ["dry_dust"] as const,
    },
    cooking: {
      id: "cooking",
      tint: 0xff8830,
      alpha: 1,
      particles: ["cook_sizzle", "cook_steam"] as const,
      soundLoops: ["craft.cook.sizzle"] as const,
    },
    // Shared overlay — applied on top of any base state when raining
    wet_sheen: WET_SHEEN_OVERLAY,
  },
  rules: [
    // Base rules — priority descending; higher priority wins
    {
      id: "cooking",
      priority: 50,
      kind: "base",
      when: (input) => input.cookingProgress > 0,
      state: "cooking",
    },
    {
      id: "drying",
      priority: 40,
      kind: "base",
      when: (input) => input.dryingProgress > 0 && input.isDamp,
      state: "drying",
    },
    {
      id: "damp",
      priority: 30,
      kind: "base",
      when: (input) => input.isDamp,
      state: "damp",
    },
    {
      id: "dry",
      priority: 10,
      kind: "base",
      when: () => true,
      state: "dry",
    },
    // Overlay rules
    {
      id: "wet_sheen",
      priority: 60,
      kind: "overlay",
      when: (input) => input.wetness > 0.4,
      state: "wet_sheen",
    },
  ],
};
