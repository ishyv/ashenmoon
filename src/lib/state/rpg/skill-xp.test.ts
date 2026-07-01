import { beforeEach, describe, expect, it, vi } from "vitest";
import { gameState } from "$lib/state/game-state.svelte";
import { createDefaultSkills } from "$lib/domain/rpg-defaults";
import { SkillKey } from "$lib/domain/game-events";
import { SKILL_MAX_LEVEL } from "$lib/domain/stats/skill-growth";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
}));

import { awardSkillXp } from "./skill-xp";

const VFX = {} as never;
const POS = { x: 0, y: 0 };
const LAYER = {} as never;

describe("awardSkillXp", () => {
  beforeEach(() => {
    gameState.rpg.skills = createDefaultSkills();
  });

  it("accumulates xp without leveling when below threshold", () => {
    const leveled = awardSkillXp(SkillKey.Lumberjacking, 40, VFX, POS, LAYER);
    expect(leveled).toBe(false);
    expect(gameState.rpg.skills?.lumberjacking).toEqual({ level: 1, xp: 40, nextXp: 100 });
  });

  it("levels up and carries overflow xp", () => {
    const leveled = awardSkillXp(SkillKey.Lumberjacking, 130, VFX, POS, LAYER);
    expect(leveled).toBe(true);
    expect(gameState.rpg.skills?.lumberjacking).toEqual({ level: 2, xp: 30, nextXp: 200 });
  });

  it("carries overflow across multiple level-ups in a single award", () => {
    // level 1 needs 100, level 2 needs 200 -> a 350 xp grant should reach level 3 with 50 left over
    const leveled = awardSkillXp(SkillKey.Lumberjacking, 350, VFX, POS, LAYER);
    expect(leveled).toBe(true);
    expect(gameState.rpg.skills?.lumberjacking).toEqual({ level: 3, xp: 50, nextXp: 300 });
  });

  it("is a safe no-op for a skill missing from state", () => {
    delete (gameState.rpg.skills as { vigilance?: unknown })?.vigilance;
    const leveled = awardSkillXp(SkillKey.Vigilance, 500, VFX, POS, LAYER);
    expect(leveled).toBe(false);
  });

  it("clamps at SKILL_MAX_LEVEL and discards further overflow", () => {
    if (gameState.rpg.skills) {
      gameState.rpg.skills.lumberjacking = {
        level: SKILL_MAX_LEVEL,
        xp: 0,
        nextXp: SKILL_MAX_LEVEL * 100,
      };
    }
    const leveled = awardSkillXp(SkillKey.Lumberjacking, 1000000, VFX, POS, LAYER);
    expect(leveled).toBe(false);
    const skill = gameState.rpg.skills?.lumberjacking;
    expect(skill?.level).toBe(SKILL_MAX_LEVEL);
    expect(skill?.xp).toBeLessThan(skill!.nextXp);
  });
});
