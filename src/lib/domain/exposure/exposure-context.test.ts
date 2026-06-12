import { describe, expect, it } from "vitest";
import {
  canIgnite,
  decayRateMultiplier,
  effectiveTemperature,
  OPEN_FLAME_BONUS,
} from "./exposure-context";

describe("effectiveTemperature", () => {
  it("adds full radiant heat on the ground near fire", () => {
    expect(effectiveTemperature({ location: "ground", ambientTemp: 20, radiantHeat: OPEN_FLAME_BONUS })).toBe(20 + OPEN_FLAME_BONUS);
  });

  it("shields most radiant heat in a pack", () => {
    expect(effectiveTemperature({ location: "pack", ambientTemp: 20, radiantHeat: OPEN_FLAME_BONUS })).toBe(20 + OPEN_FLAME_BONUS * 0.4);
  });

  it("insulates sealed items from radiant heat", () => {
    expect(effectiveTemperature({ location: "sealed", ambientTemp: 20, radiantHeat: OPEN_FLAME_BONUS })).toBe(20);
  });

  it("returns ambient with no fire regardless of location", () => {
    for (const location of ["ground", "pack", "sealed"] as const) {
      expect(effectiveTemperature({ location, ambientTemp: -5, radiantHeat: 0 })).toBe(-5);
    }
  });
});

describe("canIgnite", () => {
  it("blocks only sealed items", () => {
    expect(canIgnite("ground")).toBe(true);
    expect(canIgnite("pack")).toBe(true);
    expect(canIgnite("sealed")).toBe(false);
  });
});

describe("decayRateMultiplier", () => {
  it("slows decay the more enclosed the item is", () => {
    expect(decayRateMultiplier("ground")).toBeGreaterThan(decayRateMultiplier("pack"));
    expect(decayRateMultiplier("pack")).toBeGreaterThan(decayRateMultiplier("sealed"));
  });
});
