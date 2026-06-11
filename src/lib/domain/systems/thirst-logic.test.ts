import { describe, expect, it } from "vitest";
import { DEFAULT_THIRST_CONFIG, computeThirstDrain } from "./thirst-logic";

const config = DEFAULT_THIRST_CONFIG;

describe("computeThirstDrain", () => {
  it("drains at the base rate while idle", () => {
    expect(computeThirstDrain(10, { moving: false, laboring: false }, config)).toBeCloseTo(
      config.baseDrainPerSec * 10,
    );
  });

  it("drains faster while moving", () => {
    const idle = computeThirstDrain(10, { moving: false, laboring: false }, config);
    const moving = computeThirstDrain(10, { moving: true, laboring: false }, config);
    expect(moving).toBeCloseTo(idle * config.movingMult);
  });

  it("laboring dominates moving", () => {
    const laboring = computeThirstDrain(10, { moving: true, laboring: true }, config);
    expect(laboring).toBeCloseTo(config.baseDrainPerSec * config.laboringMult * 10);
  });

  it("returns zero for non-positive time slices", () => {
    expect(computeThirstDrain(0, { moving: true, laboring: true }, config)).toBe(0);
    expect(computeThirstDrain(-1, { moving: false, laboring: false }, config)).toBe(0);
  });
});
