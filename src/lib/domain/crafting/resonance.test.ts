import { describe, it, expect } from "vitest";
import { readResonance } from "./resonance";
import type { CraftRecipe } from "./recipes";

const RECIPES: any[] = [
  {
    id: "simple_potion",
    name: "simple potion",
    description: "",
    costs: [
      { itemId: "herb", name: "herb", required: 2 },
      { itemId: "water", name: "water", required: 1 },
    ],
    output: { itemId: "simple_potion", qty: 1 },
  },
  {
    id: "iron_blade",
    name: "iron blade",
    description: "",
    costs: [
      { itemId: "iron", name: "iron", required: 3 },
      { itemId: "wood", name: "wood", required: 1 },
    ],
    output: { itemId: "iron_blade", qty: 1 },
  },
  {
    id: "small_thing",
    name: "small thing",
    description: "",
    costs: [
      { itemId: "herb", name: "herb", required: 1 },
    ],
    output: { itemId: "small_thing", qty: 1 },
  },
];

describe("readResonance", () => {
  it("empty tray returns zero score, null nearest", () => {
    const r = readResonance({}, RECIPES);
    expect(r.score).toBe(0);
    expect(r.nearestRecipeId).toBeNull();
    expect(r.quantityProximity).toBe(1);
    expect(r.flags.exact).toBe(false);
    expect(r.flags.needsMoreIngredients).toBe(false);
    expect(r.flags.hasForeignElement).toBe(false);
  });

  it("partial match: one of two required ids present (no full overlap recipe)", () => {
    // iron_blade needs iron+wood; providing only iron matches it partially
    const r = readResonance({ iron: 3 }, RECIPES);
    expect(r.nearestRecipeId).toBe("iron_blade");
    expect(r.score).toBeGreaterThan(0);
    expect(r.exact).toBe(false);
    expect(r.correctIdFraction).toBeCloseTo(0.5); // 1 of 2 cost ids
    expect(r.flags.needsMoreIngredients).toBe(true);
  });

  it("all ids present but quantities below required", () => {
    const r = readResonance({ herb: 1, water: 1 }, RECIPES);
    expect(r.nearestRecipeId).toBe("simple_potion");
    expect(r.correctIdFraction).toBe(1);
    expect(r.quantityProximity).toBeLessThan(1); // herb needs 2
    expect(r.exact).toBe(false);
    expect(r.flags.needMoreQuantity).toBe(true);
    expect(r.flags.needsMoreIngredients).toBe(false);
  });

  it("exact match returns score 1", () => {
    const r = readResonance({ herb: 2, water: 1 }, RECIPES);
    expect(r.exact).toBe(true);
    expect(r.score).toBe(1);
    expect(r.nearestRecipeId).toBe("simple_potion");
    expect(r.flags.exact).toBe(true);
  });

  it("excess quantity still exact when all ids right and qty met", () => {
    const r = readResonance({ herb: 5, water: 3 }, RECIPES);
    expect(r.exact).toBe(true);
    expect(r.score).toBe(1);
  });

  it("foreign element penalty reduces score", () => {
    const base = readResonance({ herb: 2, water: 1 }, RECIPES);
    const withForeign = readResonance({ herb: 2, water: 1, iron: 1 }, RECIPES);
    // base is exact=1; foreign breaks exactness
    expect(withForeign.exact).toBe(false);
    expect(withForeign.score).toBeLessThan(base.score);
    expect(withForeign.flags.hasForeignElement).toBe(true);
  });

  it("tie-break: smaller cost set wins over larger when equal overlap", () => {
    // herb matches both simple_potion (size 2) and small_thing (size 1)
    const r = readResonance({ herb: 1 }, RECIPES);
    expect(r.nearestRecipeId).toBe("small_thing");
  });

  it("adding a missing required id never lowers score (monotonicity)", () => {
    const without = readResonance({ herb: 2 }, RECIPES);
    const withWater = readResonance({ herb: 2, water: 1 }, RECIPES);
    expect(withWater.score).toBeGreaterThanOrEqual(without.score);
  });

  it("correctIdFraction is |present∩cost|/|cost|", () => {
    const r = readResonance({ herb: 1 }, RECIPES);
    // nearest = small_thing (size 1), herb is in it
    expect(r.correctIdFraction).toBe(1);
  });

  it("foreignPenalty is |present\\cost| / |present|", () => {
    // simple_potion: herb+water. Add stone (foreign).
    const r = readResonance({ herb: 2, water: 1, stone: 1 }, RECIPES);
    // nearest = simple_potion, present=3, foreign=1 => 1/3
    expect(r.foreignPenalty).toBeCloseTo(1 / 3);
  });

  it("score is clamp01(0.5*cIF + 0.3*qtyW + 0.2*(1-fP))", () => {
    // herb:1, water:1 -> nearest=simple_potion
    // cIF=1 (both present), qtyProx=avg(min(1,1/2), min(1,1/1))=avg(0.5,1)=0.75
    // foreignPenalty=0, qtyWeighted=0.75
    // expected = 0.5*1 + 0.3*0.75 + 0.2*1 = 0.5+0.225+0.2 = 0.925
    const r = readResonance({ herb: 1, water: 1 }, RECIPES);
    expect(r.score).toBeCloseTo(0.925);
  });

  it("completely foreign input with no recipe overlap returns score 0", () => {
    const r = readResonance({ unicorn_dust: 5 }, RECIPES);
    expect(r.score).toBe(0);
    expect(r.nearestRecipeId).toBeNull();
  });
});
