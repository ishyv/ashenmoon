/**
 * Skill-level curve and skill-to-stat bonus mappers. Skills level through use
 * (see state/rpg/skill-xp.ts) and grant continuous, capped bonuses via
 * StatModifier's "skill" source — the counterpart to player-stat-growth.ts's
 * character-level track, but scaled independently and applied to stats
 * character level otherwise leaves untouched (e.g. critChance).
 *
 * No unlock gates, no tiers: every bonus is linear in level, matching the
 * "use it, level it" design (see docs/director/progression-system-plan.md).
 */

import type { RpgPlayerState } from "../rpg-types";
import type { StatModifier } from "./stat-calculation";

export const SKILL_MAX_LEVEL = 20;

/** XP needed to go from `level` to `level + 1`. Single tuning knob for all skills. */
export function skillXpForLevel(level: number): number {
  return level * 100;
}

/** Growth steps above level 1, clamped to the cap. Range 0..SKILL_MAX_LEVEL-1. */
function steps(level: number): number {
  return Math.max(0, Math.min(SKILL_MAX_LEVEL, Math.floor(level)) - 1);
}

function activityModifiers(
  level: number,
  powerStat: "gatheringPower" | "miningPower",
  speedStat: "gatheringSpeed" | "miningSpeed",
): StatModifier[] {
  const s = steps(level);
  return [
    { stat: powerStat, op: "percentAdd", value: 0.04 * s, source: "skill" },
    { stat: speedStat, op: "percentAdd", value: 0.05 * s, source: "skill" },
  ];
}

export function lumberjackingModifiers(level: number): StatModifier[] {
  return activityModifiers(level, "gatheringPower", "gatheringSpeed");
}

export function miningModifiers(level: number): StatModifier[] {
  return activityModifiers(level, "miningPower", "miningSpeed");
}

/** Only combat stat character level leaves permanently at 0 — Combat skill's home. */
export function combatModifiers(level: number): StatModifier[] {
  const s = steps(level);
  return [{ stat: "critChance", op: "flat", value: 0.3 * s, source: "skill" }];
}

export function vigilanceModifiers(level: number): StatModifier[] {
  const s = steps(level);
  return [
    { stat: "coldResist", op: "flat", value: 0.5 * s, source: "skill" },
    { stat: "bleedResist", op: "flat", value: 1.0 * s, source: "skill" },
    { stat: "sicknessResist", op: "flat", value: 1.0 * s, source: "skill" },
    { stat: "toxinResist", op: "flat", value: 1.0 * s, source: "skill" },
    { stat: "thirstDecayPerMinute", op: "percentAdd", value: -0.01 * s, source: "skill" },
    { stat: "hungerDecayPerMinute", op: "percentAdd", value: -0.01 * s, source: "skill" },
    { stat: "exhaustionRecoveryPerSecond", op: "percentAdd", value: 0.01 * s, source: "skill" },
  ];
}

export function woodcraftModifiers(level: number): StatModifier[] {
  const s = steps(level);
  return [{ stat: "stealth", op: "flat", value: 1.5 * s, source: "skill" }];
}

export function craftsmanshipModifiers(level: number): StatModifier[] {
  const s = steps(level);
  return [{ stat: "craftingSpeed", op: "percentAdd", value: 0.03 * s, source: "skill" }];
}

/** Aggregates every skill's bonus into one modifier list for the stat pipeline. */
export function skillStatModifiers(skills: RpgPlayerState["skills"]): StatModifier[] {
  return [
    ...lumberjackingModifiers(skills.lumberjacking.level),
    ...miningModifiers(skills.mining.level),
    ...combatModifiers(skills.combat?.level ?? 1),
    ...vigilanceModifiers(skills.vigilance?.level ?? 1),
    ...woodcraftModifiers(skills.woodcraft?.level ?? 1),
    ...craftsmanshipModifiers(skills.craftsmanship?.level ?? 1),
  ];
}
