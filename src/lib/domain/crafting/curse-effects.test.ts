import { describe, expect, it } from "vitest";
import { CURSE_EFFECT_POOL, ambientTellChance, effectiveCadence } from "./curse-effects";

describe("effectiveCadence", () => {
  it("returns the base cadence at curse level 1", () => {
    const effect = CURSE_EFFECT_POOL[0]!;
    expect(effectiveCadence(effect, 1)).toBeCloseTo(effect.cadenceSec, 5);
  });

  it("shrinks (fires more often) as curse level rises", () => {
    const effect = CURSE_EFFECT_POOL[0]!;
    const level1 = effectiveCadence(effect, 1);
    const level3 = effectiveCadence(effect, 3);
    const level5 = effectiveCadence(effect, 5);
    expect(level3).toBeLessThan(level1);
    expect(level5).toBeLessThan(level3);
  });

  it("treats curse levels below 1 as 1", () => {
    const effect = CURSE_EFFECT_POOL[0]!;
    expect(effectiveCadence(effect, 0)).toBeCloseTo(effectiveCadence(effect, 1), 5);
  });
});

describe("ambientTellChance", () => {
  it("is small and monotonically non-decreasing with curse level", () => {
    const level1 = ambientTellChance(1);
    const level3 = ambientTellChance(3);
    const level5 = ambientTellChance(5);
    expect(level1).toBeGreaterThan(0);
    expect(level1).toBeLessThan(0.02);
    expect(level3).toBeGreaterThanOrEqual(level1);
    expect(level5).toBeGreaterThanOrEqual(level3);
  });

  it("never reaches a reliable-tell probability, even at max curse level", () => {
    // Must stay "unease", never a clean confirmation.
    expect(ambientTellChance(5)).toBeLessThan(0.1);
  });
});
