import { describe, expect, it } from "vitest";
import { DEFAULT_HUNGER_CONFIG, computeHungerDrain } from "./hunger-logic";

const config = DEFAULT_HUNGER_CONFIG;

describe("computeHungerDrain", () => {
  it("drains at the base rate while idle", () => {
    expect(computeHungerDrain(10, { moving: false, laboring: false }, config)).toBeCloseTo(
      config.baseDrainPerSec * 10,
    );
  });

  it("drains faster while moving", () => {
    const idle = computeHungerDrain(10, { moving: false, laboring: false }, config);
    const moving = computeHungerDrain(10, { moving: true, laboring: false }, config);
    expect(moving).toBeCloseTo(idle * config.movingMult);
  });

  it("laboring dominates moving", () => {
    const laboring = computeHungerDrain(10, { moving: true, laboring: true }, config);
    expect(laboring).toBeCloseTo(config.baseDrainPerSec * config.laboringMult * 10);
  });

  it("returns zero for non-positive time slices", () => {
    expect(computeHungerDrain(0, { moving: true, laboring: true }, config)).toBe(0);
    expect(computeHungerDrain(-1, { moving: false, laboring: false }, config)).toBe(0);
  });
});
