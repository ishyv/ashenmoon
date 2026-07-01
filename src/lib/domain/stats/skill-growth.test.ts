import { describe, expect, it } from "vitest";
import {
  SKILL_MAX_LEVEL,
  skillXpForLevel,
  lumberjackingModifiers,
  miningModifiers,
  combatModifiers,
  vigilanceModifiers,
  woodcraftModifiers,
  craftsmanshipModifiers,
  skillStatModifiers,
  gatherActivityStats,
} from "./skill-growth";
import { createDefaultSkills } from "$lib/domain/rpg-defaults";
import { computeBaseStatsAtLevel } from "./stat-calculation";
import { SkillKey } from "$lib/domain/game-events";

describe("skillXpForLevel", () => {
  it("matches the existing level*100 curve", () => {
    expect(skillXpForLevel(1)).toBe(100);
    expect(skillXpForLevel(5)).toBe(500);
    expect(skillXpForLevel(19)).toBe(1900);
  });
});

describe("SKILL_MAX_LEVEL", () => {
  it("is 20", () => {
    expect(SKILL_MAX_LEVEL).toBe(20);
  });
});

describe("lumberjackingModifiers", () => {
  it("feeds gatheringPower/gatheringSpeed, zero at level 1", () => {
    expect(lumberjackingModifiers(1)).toEqual([
      { stat: "gatheringPower", op: "percentAdd", value: 0, source: "skill" },
      { stat: "gatheringSpeed", op: "percentAdd", value: 0, source: "skill" },
    ]);
  });

  it("scales linearly with level and caps at level 20", () => {
    const atTen = lumberjackingModifiers(10);
    expect(atTen[0]!.value).toBeCloseTo(0.36); // 0.04 * 9 steps
    expect(atTen[1]!.value).toBeCloseTo(0.45); // 0.05 * 9 steps

    const atCap = lumberjackingModifiers(SKILL_MAX_LEVEL);
    const beyondCap = lumberjackingModifiers(SKILL_MAX_LEVEL + 5);
    expect(atCap).toEqual(beyondCap);
    expect(atCap[0]!.value).toBeCloseTo(0.76); // 0.04 * 19 steps
    expect(atCap[1]!.value).toBeCloseTo(0.95); // 0.05 * 19 steps
  });
});

describe("miningModifiers", () => {
  it("feeds miningPower/miningSpeed, zero at level 1", () => {
    expect(miningModifiers(1)).toEqual([
      { stat: "miningPower", op: "percentAdd", value: 0, source: "skill" },
      { stat: "miningSpeed", op: "percentAdd", value: 0, source: "skill" },
    ]);
  });

  it("scales identically to lumberjacking but on its own stat keys", () => {
    const atCap = miningModifiers(SKILL_MAX_LEVEL);
    expect(atCap[0]!.value).toBeCloseTo(0.76);
    expect(atCap[1]!.value).toBeCloseTo(0.95);
    expect(atCap[0]!.stat).toBe("miningPower");
    expect(atCap[1]!.stat).toBe("miningSpeed");
  });

  it("no longer equals lumberjackingModifiers (independent stats)", () => {
    expect(miningModifiers(SKILL_MAX_LEVEL)).not.toEqual(lumberjackingModifiers(SKILL_MAX_LEVEL));
  });
});

describe("combatModifiers", () => {
  it("feeds critChance flat, zero at level 1, capped at level 20", () => {
    expect(combatModifiers(1)).toEqual([{ stat: "critChance", op: "flat", value: 0, source: "skill" }]);
    expect(combatModifiers(SKILL_MAX_LEVEL)[0]!.value).toBeCloseTo(5.7); // 0.3 * 19 steps
  });
});

describe("vigilanceModifiers", () => {
  it("feeds resistances flat and decay/recovery rates as percentAdd", () => {
    const mods = vigilanceModifiers(SKILL_MAX_LEVEL);
    const byStat = Object.fromEntries(mods.map((m) => [m.stat, m]));
    // Note: uses toBeCloseTo throughout, not toEqual — 0.01 * 19 is not exact
    // in IEEE754 floating point (same class of issue as 0.1 * 3 !== 0.3 in JS).
    expect(byStat.coldResist!.op).toBe("flat");
    expect(byStat.coldResist!.value).toBeCloseTo(9.5);
    expect(byStat.bleedResist!.value).toBeCloseTo(19);
    expect(byStat.sicknessResist!.value).toBeCloseTo(19);
    expect(byStat.toxinResist!.value).toBeCloseTo(19);
    expect(byStat.thirstDecayPerMinute!.op).toBe("percentAdd");
    expect(byStat.thirstDecayPerMinute!.value).toBeCloseTo(-0.19);
    expect(byStat.hungerDecayPerMinute!.value).toBeCloseTo(-0.19);
    expect(byStat.exhaustionRecoveryPerSecond!.value).toBeCloseTo(0.19);
  });
});

describe("woodcraftModifiers", () => {
  it("feeds stealth flat, capped at level 20", () => {
    expect(woodcraftModifiers(1)).toEqual([{ stat: "stealth", op: "flat", value: 0, source: "skill" }]);
    expect(woodcraftModifiers(SKILL_MAX_LEVEL)[0]!.value).toBeCloseTo(28.5); // 1.5 * 19 steps
  });
});

describe("craftsmanshipModifiers", () => {
  it("feeds craftingSpeed percentAdd, capped at level 20", () => {
    expect(craftsmanshipModifiers(1)).toEqual([
      { stat: "craftingSpeed", op: "percentAdd", value: 0, source: "skill" },
    ]);
    expect(craftsmanshipModifiers(SKILL_MAX_LEVEL)[0]!.value).toBeCloseTo(0.57); // 0.03 * 19 steps
  });
});

describe("skillStatModifiers", () => {
  it("aggregates all six mappers from a full skills object, all at level 1 (zero bonus)", () => {
    const skills = createDefaultSkills();
    const mods = skillStatModifiers(skills);
    expect(mods.every((m) => m.value === 0)).toBe(true);
    // one modifier per gathering stat (x2 skills) + crit + 7 vigilance + stealth + craftingSpeed
    expect(mods).toHaveLength(2 + 2 + 1 + 7 + 1 + 1);
  });

  it("falls back to level 1 for a skill missing from an old-shaped save", () => {
    const skills = createDefaultSkills();
    delete (skills as { vigilance?: unknown }).vigilance;
    const mods = skillStatModifiers(skills);
    expect(mods.find((m) => m.stat === "coldResist")?.value).toBe(0);
  });
});

describe("gatherActivityStats", () => {
  const baseStats = computeBaseStatsAtLevel(1); // utility.gatheringPower/miningPower etc all at base 1.0

  it("looks up Lumberjacking's gathering stats", () => {
    expect(gatherActivityStats(SkillKey.Lumberjacking, baseStats)).toEqual({ power: 1, speed: 1 });
  });

  it("looks up Mining's mining stats independently", () => {
    const boosted = { ...baseStats, utility: { ...baseStats.utility, miningPower: 1.5, miningSpeed: 1.3 } };
    expect(gatherActivityStats(SkillKey.Mining, boosted)).toEqual({ power: 1.5, speed: 1.3 });
    // Lumberjacking's stats are untouched by mining's boost:
    expect(gatherActivityStats(SkillKey.Lumberjacking, boosted)).toEqual({ power: 1, speed: 1 });
  });

  it("returns neutral 1/1 for a non-gathering skill", () => {
    expect(gatherActivityStats(SkillKey.Combat, baseStats)).toEqual({ power: 1, speed: 1 });
  });

  it("returns neutral 1/1 for a null skillKey", () => {
    expect(gatherActivityStats(null, baseStats)).toEqual({ power: 1, speed: 1 });
  });
});
