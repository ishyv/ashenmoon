import { describe, expect, it } from "vitest";
import { baseStatsForItem, computeTierStats, defaultTierStats, TIER_MULTIPLIER, TIER_VARIANCE } from "./tier-stats";
import type { CraftRecipe } from "./recipe-types";

const zeroRng = () => 0; // no swing: value = base * multiplier * (1 + (-variance))... use midRng for the "no swing" case
const midRng = () => 0.5; // swing = 0 -> value = base * multiplier exactly

describe("defaultTierStats", () => {
  it("scales by the tier multiplier with no swing at rng=0.5", () => {
    const result = defaultTierStats({ damage: 10 }, "sloppy", midRng);
    expect(result.damage).toBeCloseTo(10 * TIER_MULTIPLIER.sloppy, 5);
  });

  it("produces bigger numbers at higher tiers", () => {
    const sloppy = defaultTierStats({ damage: 10 }, "sloppy", midRng).damage!;
    const robust = defaultTierStats({ damage: 10 }, "robust", midRng).damage!;
    const pristine = defaultTierStats({ damage: 10 }, "pristine", midRng).damage!;
    const masterwork = defaultTierStats({ damage: 10 }, "masterwork", midRng).damage!;
    const fable = defaultTierStats({ damage: 10 }, "fable", midRng).damage!;
    expect(sloppy).toBeLessThan(robust);
    expect(robust).toBeLessThan(pristine);
    expect(pristine).toBeLessThan(masterwork);
    expect(masterwork).toBeLessThan(fable);
  });

  it("stays within the tier's multiplier +/- variance bounds", () => {
    const base = 10;
    for (const tier of ["sloppy", "robust", "pristine", "masterwork", "fable"] as const) {
      const min = base * TIER_MULTIPLIER[tier] * (1 - TIER_VARIANCE[tier]);
      const max = base * TIER_MULTIPLIER[tier] * (1 + TIER_VARIANCE[tier]);
      const atZero = defaultTierStats({ damage: base }, tier, zeroRng).damage!;
      const atOne = defaultTierStats({ damage: base }, tier, () => 0.999999).damage!;
      expect(atZero).toBeCloseTo(min, 5);
      expect(atOne).toBeLessThanOrEqual(max + 1e-6);
    }
  });

  it("scales every stat present on the item", () => {
    const result = defaultTierStats({ damage: 10, reach: 4 }, "pristine", midRng);
    expect(result.damage).toBeCloseTo(10 * TIER_MULTIPLIER.pristine, 5);
    expect(result.reach).toBeCloseTo(4 * TIER_MULTIPLIER.pristine, 5);
  });
});

describe("computeTierStats", () => {
  const baseRecipe: CraftRecipe = {
    id: "test_blade",
    name: "Test Blade",
    description: "",
    costs: [],
    output: { itemId: "wood", qty: 1 },
    tiered: true,
  };

  it("falls back to the default formula when no override exists for the tier", () => {
    const result = computeTierStats(baseRecipe, { damage: 10 }, "robust", midRng);
    expect(result.damage).toBeCloseTo(10 * TIER_MULTIPLIER.robust, 5);
  });

  it("bypasses the default formula for stats with an explicit override", () => {
    const recipe: CraftRecipe = {
      ...baseRecipe,
      tierStatOverrides: { fable: [{ stat: "damage", min: 90, max: 110 }] },
    };
    const result = computeTierStats(recipe, { damage: 10 }, "fable", () => 0.5);
    expect(result.damage).toBeCloseTo(100, 5); // midpoint of [90,110]
  });

  it("only overrides the named stat, leaving other stats on the default formula", () => {
    const recipe: CraftRecipe = {
      ...baseRecipe,
      tierStatOverrides: { fable: [{ stat: "damage", min: 90, max: 110 }] },
    };
    const result = computeTierStats(recipe, { damage: 10, reach: 4 }, "fable", midRng);
    expect(result.damage).toBeCloseTo(100, 5);
    expect(result.reach).toBeCloseTo(4 * TIER_MULTIPLIER.fable, 5);
  });
});

describe("baseStatsForItem", () => {
  it("extracts weapon damage", () => {
    expect(baseStatsForItem("crude_knife").damage).toBeGreaterThan(0);
  });

  it("returns an empty record for items with no scalable trait", () => {
    expect(baseStatsForItem("wood")).toEqual({});
  });
});
