/**
 * Difficulty presets and per-node resolution for Focused Gathering. Numbers
 * follow the design's Balance Defaults; harder nodes spawn more, smaller,
 * faster-moving targets with stricter windows and richer yield bands.
 */

import type { GatherableDefinition } from "../gatherables";
import type { FocusedGatherDifficulty, FocusedGatherProfile } from "./focused-gather-types";

export const FOCUSED_GATHER_PROFILES: Record<FocusedGatherDifficulty, FocusedGatherProfile> = {
  easy: {
    difficulty: "easy",
    patternPool: ["clockwise_arc", "counterclockwise_arc", "center_out"],
    targetCount: 4,
    baseCircleRadius: 26,
    minCircleRadius: 22,
    targetLifetimeMs: 1800,
    spawnDelayMinMs: 400,
    spawnDelayMaxMs: 800,
    simultaneousTargetLimit: 1,
    movementTypes: ["static"],
    staminaCost: 10,
    cooldownMs: 12000,
    baseYield: 4,
    excellentYieldMultiplier: 1.75,
    goodYieldMultiplier: 1.25,
    averageYieldMultiplier: 1.0,
    poorYieldMultiplier: 0.6,
    ruinedYieldMultiplier: 0.25,
  },
  medium: {
    difficulty: "medium",
    patternPool: ["clockwise_arc", "counterclockwise_arc", "cross_fracture", "center_out", "zigzag"],
    targetCount: 5,
    baseCircleRadius: 22,
    minCircleRadius: 18,
    targetLifetimeMs: 1400,
    spawnDelayMinMs: 300,
    spawnDelayMaxMs: 600,
    simultaneousTargetLimit: 2,
    movementTypes: ["static", "slow_drift", "pulse_radius"],
    staminaCost: 14,
    cooldownMs: 15000,
    baseYield: 5,
    excellentYieldMultiplier: 1.9,
    goodYieldMultiplier: 1.3,
    averageYieldMultiplier: 1.0,
    poorYieldMultiplier: 0.55,
    ruinedYieldMultiplier: 0.2,
  },
  hard: {
    difficulty: "hard",
    patternPool: ["cross_fracture", "spiral_in", "zigzag", "random_burst", "clockwise_arc"],
    targetCount: 7,
    baseCircleRadius: 18,
    minCircleRadius: 14,
    targetLifetimeMs: 1000,
    spawnDelayMinMs: 200,
    spawnDelayMaxMs: 450,
    simultaneousTargetLimit: 2,
    movementTypes: ["slow_drift", "pulse_radius", "orbit_source"],
    staminaCost: 18,
    cooldownMs: 18000,
    baseYield: 6,
    excellentYieldMultiplier: 2.0,
    goodYieldMultiplier: 1.35,
    averageYieldMultiplier: 1.0,
    poorYieldMultiplier: 0.5,
    ruinedYieldMultiplier: 0.15,
  },
  expert: {
    difficulty: "expert",
    patternPool: ["spiral_in", "random_burst", "zigzag", "cross_fracture", "counterclockwise_arc"],
    targetCount: 9,
    baseCircleRadius: 15,
    minCircleRadius: 12,
    targetLifetimeMs: 800,
    spawnDelayMinMs: 120,
    spawnDelayMaxMs: 350,
    simultaneousTargetLimit: 3,
    movementTypes: ["orbit_source", "jump", "jitter", "pulse_radius"],
    staminaCost: 22,
    cooldownMs: 20000,
    baseYield: 7,
    excellentYieldMultiplier: 2.25,
    goodYieldMultiplier: 1.4,
    averageYieldMultiplier: 1.0,
    poorYieldMultiplier: 0.45,
    ruinedYieldMultiplier: 0.12,
  },
};

/** Large material sources can be cracked open through the focused-gather minigame. */
export function isFocusedGatherEligible(def: GatherableDefinition): boolean {
  return def.interactionKind === "repeated_action" && def.solidKind !== "none";
}

/**
 * Difficulty for a node: an explicit `focusedGatherDifficulty` wins, otherwise
 * we derive one from the render/solid kind so every node is eligible without
 * hand-authoring each definition.
 */
export function focusedGatherDifficultyFor(def: GatherableDefinition): FocusedGatherDifficulty {
  if (def.focusedGatherDifficulty) return def.focusedGatherDifficulty;
  switch (def.renderKind) {
    case "rock_toxic":
      return "expert";
    case "rock_iron":
      return "hard";
    case "rock_copper":
      return "medium";
    default:
      break;
  }
  if (def.solidKind === "tree") return "medium";
  return "easy";
}

export function focusedGatherProfileFor(def: GatherableDefinition): FocusedGatherProfile {
  return FOCUSED_GATHER_PROFILES[focusedGatherDifficultyFor(def)];
}
