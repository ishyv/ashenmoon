/**
 * Skill XP + level-up, deduplicated. The same award/level-up/announce sequence
 * was copy-pasted four times (lumberjacking, mining, super-gather in
 * interaction-system; evade in movement; combat in engine). This is the one
 * implementation.
 *
 * INVARIANT: this is the only place that writes a skill's level. Callers decide
 * which skill and how much XP; the per-skill label and announcement color live
 * in `SKILL_DISPLAY`. A skill missing from `rpgState.skills` (e.g. `combat`,
 * which the backend may not define) is a safe no-op.
 */
import type { Container } from "pixi.js";
import { rpgState } from "$lib/state/rpg-state.svelte";
import { SkillKey } from "$lib/domain/game-events";
import { Colors } from "$lib/utils/colors";
import { spawnEnvFloatingText, type VFXResource } from "$lib/core/vfx";

interface SkillDisplay {
  label: string;
  levelColor: number;
}

const SKILL_DISPLAY: Record<SkillKey, SkillDisplay> = {
  [SkillKey.Lumberjacking]: { label: "Lumberjacking", levelColor: Colors.skillLevel.gather },
  [SkillKey.Mining]: { label: "Mining", levelColor: Colors.skillLevel.gather },
  [SkillKey.SuperGather]: { label: "Super-Gather", levelColor: Colors.skillLevel.superGather },
  [SkillKey.Evade]: { label: "Evade", levelColor: Colors.skillLevel.evade },
  [SkillKey.Combat]: { label: "Combat", levelColor: Colors.skillLevel.combat },
};

/**
 * Grant `amount` XP to a skill. Levels up (carrying overflow, next threshold =
 * level * 100) and shows the announcement when the threshold is crossed.
 * Returns whether a level-up happened.
 */
export function awardSkillXp(
  skillKey: SkillKey,
  amount: number,
  vfx: VFXResource,
  playerPos: { x: number; y: number },
  entityLayer: Container,
): boolean {
  // `skills` is typed with the four known keys; `combat` is intentionally looser.
  const skills = rpgState.skills as any;
  const skill = skills?.[skillKey];
  if (!skill) return false;

  const newXp = skill.xp + amount;
  if (newXp >= skill.nextXp) {
    const newLevel = skill.level + 1;
    const overflow = newXp - skill.nextXp;
    rpgState.skills = {
      ...skills,
      [skillKey]: { level: newLevel, xp: overflow, nextXp: newLevel * 100 },
    } as any;
    const { label, levelColor } = SKILL_DISPLAY[skillKey];
    spawnEnvFloatingText(vfx, `🎉 ${label} Level ${newLevel}!`, levelColor, playerPos, entityLayer);
    return true;
  }

  rpgState.skills = { ...skills, [skillKey]: { ...skill, xp: newXp } } as any;
  return false;
}
