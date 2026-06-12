/**
 * Reward resolution: turn a score into a grade, a set of multipliers, and the
 * concrete item bundle granted on node destruction. `baseExpectedYield` is what
 * normal auto-gathering would have produced (node hp x primary yield qty), so a
 * ruined run genuinely undershoots normal while an excellent run beats it.
 */

import type { GatherableDefinition } from "../gatherables";
import type {
  FocusedGatherGrade,
  FocusedGatherProfile,
  FocusedGatherResult,
  FocusedGatherScore,
  FocusedGatherYieldItem,
} from "./focused-gather-types";
import { gradeFromScore } from "./focused-gather-scoring";

const BONUS_DROP_BASE_CHANCE = 0.5;

const BONUS_BY_GRADE: Record<FocusedGatherGrade, number> = {
  excellent: 1.0,
  good: 0.25,
  average: 0,
  poor: 0,
  ruined: 0,
};

const XP_BY_GRADE: Record<FocusedGatherGrade, number> = {
  excellent: 1.75,
  good: 1.3,
  average: 1.0,
  poor: 0.6,
  ruined: 0.3,
};

function yieldMultiplierFor(profile: FocusedGatherProfile, grade: FocusedGatherGrade): number {
  switch (grade) {
    case "excellent":
      return profile.excellentYieldMultiplier;
    case "good":
      return profile.goodYieldMultiplier;
    case "average":
      return profile.averageYieldMultiplier;
    case "poor":
      return profile.poorYieldMultiplier;
    case "ruined":
      return profile.ruinedYieldMultiplier;
  }
}

export function computeResult(
  score: FocusedGatherScore,
  profile: FocusedGatherProfile,
  sourceId: string,
): FocusedGatherResult {
  const grade = gradeFromScore(score.finalScore);
  return {
    sourceId,
    finalScore: score.finalScore,
    grade,
    yieldMultiplier: yieldMultiplierFor(profile, grade),
    bonusDropChanceMultiplier: BONUS_BY_GRADE[grade],
    xpMultiplier: XP_BY_GRADE[grade],
  };
}

/**
 * Concrete items granted. Primary yield scales by the band multiplier (floored
 * at 1 so even a ruined node gives something); a secondary yield entry, if the
 * node defines one, may roll as a bonus on good/excellent runs.
 */
export function resolveYieldItems(
  def: GatherableDefinition,
  result: FocusedGatherResult,
  baseExpectedYield: number,
  rng: () => number = Math.random,
): FocusedGatherYieldItem[] {
  const primary = def.yieldTable[0];
  if (!primary) return [];

  const items: FocusedGatherYieldItem[] = [
    {
      itemId: primary.itemId,
      quantity: Math.max(1, Math.round(baseExpectedYield * result.yieldMultiplier)),
    },
  ];

  const secondary = def.yieldTable[1];
  if (secondary && result.bonusDropChanceMultiplier > 0) {
    if (rng() < BONUS_DROP_BASE_CHANCE * result.bonusDropChanceMultiplier) {
      items.push({ itemId: secondary.itemId, quantity: Math.max(1, secondary.quantity) });
    }
  }

  return items;
}
