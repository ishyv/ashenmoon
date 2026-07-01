import { describe, expect, it } from "vitest";
import { CRIT_SETUP_CAP, critMultiplierForStacks, rollCrit } from "./crit";

describe("rollCrit", () => {
  it("never crits at critChance = 0, even with an rng that would otherwise hit", () => {
    const alwaysHits = () => 0; // 0 * 100 = 0 < any positive chance
    expect(rollCrit(0, alwaysHits)).toBe(false);
  });

  it("always crits at critChance = 100, even with an rng that would otherwise miss", () => {
    const almostNeverHits = () => 0.9999; // 99.99 < 100 is true, but the early return short-circuits anyway
    expect(rollCrit(100, almostNeverHits)).toBe(true);
  });

  it("crits when the roll lands under critChance", () => {
    // rng() * 100 = 20, 20 < 25 -> true
    expect(rollCrit(25, () => 0.2)).toBe(true);
  });

  it("misses when the roll lands over critChance", () => {
    // rng() * 100 = 30, 30 < 25 -> false
    expect(rollCrit(25, () => 0.3)).toBe(false);
  });

  it("misses on the exact boundary because the comparison is strict <", () => {
    // rng() * 100 = 25, 25 < 25 is false, so an exact-equal roll does not crit
    expect(rollCrit(25, () => 0.25)).toBe(false);
  });
});

describe("critMultiplierForStacks", () => {
  it("returns the base multiplier at 0 stacks", () => {
    expect(critMultiplierForStacks(0)).toBeCloseTo(1.5);
  });

  it("returns the midpoint multiplier at half the cap", () => {
    expect(critMultiplierForStacks(5)).toBeCloseTo(2.25);
  });

  it("returns the max multiplier at the cap", () => {
    expect(critMultiplierForStacks(CRIT_SETUP_CAP)).toBeCloseTo(3.0);
  });

  it("clamps beyond the cap instead of extrapolating", () => {
    expect(critMultiplierForStacks(15)).toBeCloseTo(3.0);
  });

  it("clamps negative stacks to the 0-stack result", () => {
    expect(critMultiplierForStacks(-3)).toBeCloseTo(1.5);
  });
});
