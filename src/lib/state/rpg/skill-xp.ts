/**
 * Skill XP + level-up, deduplicated. The same award/level-up/announce sequence
 * was copy-pasted across the gathering, movement, and combat systems. This is
 * the one implementation.
 *
 * INVARIANT: this is the only place that writes a skill's level. Callers decide
 * which skill and how much XP; the per-skill label and announcement color live
 * in `SKILL_DISPLAY`. A skill missing from `gameState.rpg.skills` (e.g. `combat`,
 * which the backend may not define) is a safe no-op.
 */
import type { Container } from "pixi.js";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { SkillKey } from "$lib/domain/game-events";
import type { RpgPlayerState, RpgSkillState } from "$lib/domain/rpg-types";
import { Colors } from "$lib/utils/colors";
import { spawnEnvFloatingText, type VFXResource } from "$lib/core/vfx/vfx";

interface SkillDisplay {
  label: string;
  levelColor: number;
}

type RuntimeSkillMap = RpgPlayerState["skills"] & Partial<Record<SkillKey.Combat | SkillKey.FellSweep, RpgSkillState>>;

const SKILL_DISPLAY: Record<SkillKey, SkillDisplay> = {
  [SkillKey.Lumberjacking]: { label: "Lumberjacking", levelColor: Colors.skillLevel.gather },
  [SkillKey.Mining]: { label: "Mining", levelColor: Colors.skillLevel.gather },
  [SkillKey.Evade]: { label: "Evade", levelColor: Colors.skillLevel.evade },
  [SkillKey.Combat]: { label: "Combat", levelColor: Colors.skillLevel.combat },
  [SkillKey.FellSweep]: { label: "Fell Sweep", levelColor: Colors.skillLevel.fellSweep },
  [SkillKey.KiteCombo]: { label: "Kite Specialization", levelColor: Colors.skillLevel.combat },
  [SkillKey.Vigilance]: { label: "Vigilance", levelColor: Colors.skillLevel.vigilance },
  [SkillKey.Woodcraft]: { label: "Woodcraft", levelColor: Colors.skillLevel.woodcraft },
  [SkillKey.Craftsmanship]: { label: "Craftsmanship", levelColor: Colors.skillLevel.craftsmanship },
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
  const skills: RuntimeSkillMap | null = gameState.rpg.skills;
  const skill = skills?.[skillKey];
  if (!skill) return false;

  const newXp = skill.xp + amount;
  if (newXp >= skill.nextXp) {
    const newLevel = skill.level + 1;
    const overflow = newXp - skill.nextXp;
    const nextSkills: RuntimeSkillMap = {
      ...skills,
      [skillKey]: { level: newLevel, xp: overflow, nextXp: newLevel * 100 },
    };
    setRpgSkills(nextSkills);
    const { label, levelColor } = SKILL_DISPLAY[skillKey];
    spawnEnvFloatingText(vfx, `${label.toLowerCase()} level ${newLevel}`, levelColor, playerPos, entityLayer);
    return true;
  }

  const nextSkills: RuntimeSkillMap = { ...skills, [skillKey]: { ...skill, xp: newXp } };
  setRpgSkills(nextSkills);
  return false;
}
