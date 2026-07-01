/**
 * Skill XP + level-up, deduplicated. The same award/level-up/announce sequence
 * was copy-pasted across the gathering, movement, and combat systems. This is
 * the one implementation.
 *
 * INVARIANT: this is the only place that writes a skill's level. Callers decide
 * which skill and how much XP; the per-skill label and announcement color live
 * in `SKILL_DISPLAY`. A skill missing from `gameState.rpg.skills` (e.g. an old
 * save predating a given skill) is a safe no-op.
 */
import type { Container } from "pixi.js";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { SkillKey } from "$lib/domain/game-events";
import { SKILL_MAX_LEVEL, skillXpForLevel } from "$lib/domain/stats/skill-growth";
import { Colors } from "$lib/utils/colors";
import { spawnEnvFloatingText, type VFXResource } from "$lib/core/vfx/vfx";

interface SkillDisplay {
  label: string;
  levelColor: number;
}

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
 * Grant `amount` XP to a skill. Carries overflow across multiple level-ups
 * and clamps at SKILL_MAX_LEVEL (further XP at cap is discarded), mirroring
 * `awardCharacterXp` in stats.svelte.ts. Returns whether a level-up happened.
 */
export function awardSkillXp(
  skillKey: SkillKey,
  amount: number,
  vfx: VFXResource,
  playerPos: { x: number; y: number },
  entityLayer: Container,
): boolean {
  const skills = gameState.rpg.skills;
  const skill = skills?.[skillKey];
  if (!skill || amount <= 0) return false;

  let level = skill.level;
  let xp = skill.xp + amount;
  let gained = 0;

  while (level < SKILL_MAX_LEVEL && xp >= skillXpForLevel(level)) {
    xp -= skillXpForLevel(level);
    level += 1;
    gained += 1;
  }
  if (level >= SKILL_MAX_LEVEL) xp = Math.min(xp, skillXpForLevel(SKILL_MAX_LEVEL) - 1);

  setRpgSkills({ ...skills, [skillKey]: { level, xp, nextXp: skillXpForLevel(level) } });

  if (gained > 0) {
    const { label, levelColor } = SKILL_DISPLAY[skillKey];
    spawnEnvFloatingText(vfx, `${label.toLowerCase()} level ${level}`, levelColor, playerPos, entityLayer);
  }
  return gained > 0;
}
