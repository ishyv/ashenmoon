import { beforeEach, describe, expect, it } from "vitest";
import { gameState } from "$lib/state/game-state.svelte";
import { createDefaultSkills } from "$lib/domain/rpg-defaults";
import { getPlayerStats } from "./stats.svelte";
import { BASE_UTILITY_STATS, BASE_RESISTANCE_STATS } from "$lib/domain/stats/player-stat-growth";

describe("getPlayerStats — skill modifier integration", () => {
  beforeEach(() => {
    gameState.rpg.profile!.characterLevel = 1;
    gameState.rpg.skills = createDefaultSkills();
  });

  it("matches base utility/resistance stats when all skills are level 1", () => {
    const stats = getPlayerStats();
    expect(stats.utility.gatheringPower).toBeCloseTo(BASE_UTILITY_STATS.gatheringPower);
    expect(stats.utility.craftingSpeed).toBeCloseTo(BASE_UTILITY_STATS.craftingSpeed);
    expect(stats.resistances.coldResist).toBeCloseTo(BASE_RESISTANCE_STATS.coldResist);
  });

  it("reflects lumberjacking level in gatheringPower/gatheringSpeed", () => {
    gameState.rpg.skills!.lumberjacking = { level: 20, xp: 0, nextXp: 2000 };
    const stats = getPlayerStats();
    // gatherModifiers at level 20: gatheringPower percentAdd 0.76, gatheringSpeed percentAdd 0.95
    expect(stats.utility.gatheringPower).toBeCloseTo(1 * 1.76);
    expect(stats.utility.gatheringSpeed).toBeCloseTo(1 * 1.95);
  });

  it("reflects vigilance level in coldResist (previously-inert stat now non-zero)", () => {
    gameState.rpg.skills!.vigilance = { level: 20, xp: 0, nextXp: 2000 };
    const stats = getPlayerStats();
    expect(stats.resistances.coldResist).toBeCloseTo(9.5);
  });

  it("falls back to level 1 (zero bonus) when a skill is missing from state (old save)", () => {
    const skills = createDefaultSkills();
    delete (skills as { woodcraft?: unknown }).woodcraft;
    gameState.rpg.skills = skills;
    const stats = getPlayerStats();
    expect(stats.utility.stealth).toBeCloseTo(BASE_UTILITY_STATS.stealth);
  });

  it("combines skill modifiers with existing equipment/status modifiers without regression", () => {
    // No weapon equipped, no active statuses by default — this just confirms the
    // new mods array entry doesn't break the existing combat-stat derivation path.
    const stats = getPlayerStats();
    expect(stats.combat.maxHealth).toBeCloseTo(600); // base at level 1, unaffected by skills
  });
});
