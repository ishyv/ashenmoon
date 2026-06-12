import { describe, expect, it } from "vitest";
import {
  applyModifiers,
  attacksPerSecond,
  computeBaseStatsAtLevel,
  effectiveMoveSpeed,
  mitigatePhysical,
  staminaCost,
  statusModifiersToStatModifiers,
  type StatModifier,
} from "./stat-calculation";
import {
  BASE_COMBAT_STATS,
  COMBAT_GROWTH_PER_LEVEL,
  MAX_LEVEL,
} from "./player-stat-growth";

describe("computeBaseStatsAtLevel", () => {
  it("returns base values at level 1", () => {
    const stats = computeBaseStatsAtLevel(1);
    expect(stats.combat).toEqual(BASE_COMBAT_STATS);
  });

  it("adds one growth step at level 2", () => {
    const stats = computeBaseStatsAtLevel(2);
    expect(stats.combat.maxHealth).toBe(112);
    expect(stats.combat.attackDamage).toBeCloseTo(11.4);
    expect(stats.combat.armor).toBeCloseTo(5.8);
  });

  it("matches the spec table at level 18", () => {
    const stats = computeBaseStatsAtLevel(18);
    expect(stats.combat.maxHealth).toBe(304);
    expect(stats.combat.maxStamina).toBe(168);
    expect(stats.combat.attackDamage).toBeCloseTo(33.8);
    expect(stats.combat.armor).toBeCloseTo(18.6);
    expect(stats.combat.magicResist).toBeCloseTo(15.2);
    expect(stats.combat.attackSpeed).toBeCloseTo(1.255);
    expect(stats.combat.techniqueHaste).toBeCloseTo(8.5);
    expect(stats.combat.knockbackChance).toBeCloseTo(2.55);
  });

  it("clamps levels outside 1..18", () => {
    expect(computeBaseStatsAtLevel(0).combat).toEqual(computeBaseStatsAtLevel(1).combat);
    expect(computeBaseStatsAtLevel(99).combat).toEqual(computeBaseStatsAtLevel(MAX_LEVEL).combat);
  });

  it("keeps survival, resistances, and utility identical across levels", () => {
    const l1 = computeBaseStatsAtLevel(1);
    const l18 = computeBaseStatsAtLevel(18);
    expect(l18.survival).toEqual(l1.survival);
    expect(l18.resistances).toEqual(l1.resistances);
    expect(l18.utility).toEqual(l1.utility);
  });

  it("has a growth entry for every combat stat", () => {
    for (const key of Object.keys(BASE_COMBAT_STATS)) {
      expect(COMBAT_GROWTH_PER_LEVEL).toHaveProperty(key);
    }
  });
});

describe("applyModifiers", () => {
  it("returns the base unchanged with no modifiers", () => {
    const base = computeBaseStatsAtLevel(1);
    expect(applyModifiers(base, [])).toBe(base);
  });

  it("stacks flat, then percentAdd, then mult", () => {
    const base = computeBaseStatsAtLevel(1); // armor 5
    const mods: StatModifier[] = [
      { stat: "armor", op: "flat", value: 15, source: "equipment" },
      { stat: "armor", op: "percentAdd", value: 0.5, source: "skill" },
      { stat: "armor", op: "mult", value: 0.5, source: "status" },
    ];
    // (5 + 15) * 1.5 * 0.5 = 15
    expect(applyModifiers(base, mods).combat.armor).toBeCloseTo(15);
  });

  it("does not mutate the base", () => {
    const base = computeBaseStatsAtLevel(1);
    applyModifiers(base, [{ stat: "moveSpeed", op: "mult", value: 0.5, source: "status" }]);
    expect(base.combat.moveSpeed).toBe(BASE_COMBAT_STATS.moveSpeed);
  });

  it("routes keys to the correct layer", () => {
    const base = computeBaseStatsAtLevel(1);
    const out = applyModifiers(base, [
      { stat: "coldResist", op: "flat", value: 10, source: "equipment" },
      { stat: "maxThirst", op: "flat", value: 20, source: "equipment" },
    ]);
    expect(out.resistances.coldResist).toBe(10);
    expect(out.survival.maxThirst).toBe(120);
  });
});

describe("formulas", () => {
  it("mitigatePhysical: armor 0 is a no-op, 100 halves, negative clamps", () => {
    expect(mitigatePhysical(50, 0)).toBe(50);
    expect(mitigatePhysical(50, 100)).toBe(25);
    expect(mitigatePhysical(50, -20)).toBe(50);
  });

  it("attacksPerSecond applies the bonus percentage", () => {
    expect(attacksPerSecond(1.0, 0.25)).toBeCloseTo(1.25);
  });

  it("effectiveMoveSpeed combines bonus and penalty, floored at 0", () => {
    expect(effectiveMoveSpeed(100, 0.2, 0.1)).toBeCloseTo(110);
    expect(effectiveMoveSpeed(100, 0, 2)).toBe(0);
  });

  it("staminaCost multiplies through", () => {
    expect(staminaCost(8, 1.5, 2)).toBe(24);
  });
});

describe("statusModifiersToStatModifiers", () => {
  it("emits mult modifiers for non-neutral aggregates", () => {
    const mods = statusModifiersToStatModifiers({ staminaRegenMult: 0.4, moveSpeedMult: 0.85 });
    expect(mods).toEqual([
      { stat: "staminaRegenPerSecond", op: "mult", value: 0.4, source: "status" },
      { stat: "moveSpeed", op: "mult", value: 0.85, source: "status" },
    ]);
  });

  it("emits nothing when both are neutral", () => {
    expect(statusModifiersToStatModifiers({ staminaRegenMult: 1, moveSpeedMult: 1 })).toEqual([]);
  });

  it("round-trips through applyModifiers (the dropped moveSpeedMult bug path)", () => {
    const base = computeBaseStatsAtLevel(1);
    const out = applyModifiers(
      base,
      statusModifiersToStatModifiers({ staminaRegenMult: 1, moveSpeedMult: 0.8 }),
    );
    expect(out.combat.moveSpeed).toBeCloseTo(BASE_COMBAT_STATS.moveSpeed * 0.8);
  });
});
