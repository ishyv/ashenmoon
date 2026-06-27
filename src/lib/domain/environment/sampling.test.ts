import { describe, expect, it } from "vitest";
import { sampleSignals, type PositionedEmitter } from "./sampling";
import { falloffFactor } from "./signals";

// Matches OPEN_FLAME_BONUS from exposure-context.ts
const OPEN_FLAME_BONUS = 600;

const heatEmitter = (x: number, y: number, radiusPx: number): PositionedEmitter => ({
  x, y,
  emitter: { signal: "heat", strength: OPEN_FLAME_BONUS, radiusPx, falloff: "linear" },
});

const lightEmitter = (x: number, y: number, radiusPx: number): PositionedEmitter => ({
  x, y,
  emitter: { signal: "light", strength: 1, radiusPx, falloff: "linear" },
});

const shelterEmitter = (x: number, y: number, radiusPx: number, protection: number): PositionedEmitter => ({
  x, y,
  emitter: { signal: "shelter", strength: protection, radiusPx, falloff: "none" },
});

const noRain = { raining: false };
const rain = { raining: true };

// -------- falloffFactor -------------------------------------------------------

describe("falloffFactor", () => {
  it("returns 1 at distance 0 for linear", () => {
    expect(falloffFactor("linear", 0, 100)).toBe(1);
  });

  it("returns 0 at the edge for linear", () => {
    expect(falloffFactor("linear", 100, 100)).toBe(0);
  });

  it("returns 0 beyond the edge for linear", () => {
    expect(falloffFactor("linear", 150, 100)).toBe(0);
  });

  it("returns 0.5 at half-radius for linear", () => {
    expect(falloffFactor("linear", 50, 100)).toBe(0.5);
  });

  it("returns 0.25 at half-radius for soft", () => {
    expect(falloffFactor("soft", 50, 100)).toBeCloseTo(0.25);
  });

  it("returns 1 at any distance within radius for none", () => {
    expect(falloffFactor("none", 0, 100)).toBe(1);
    expect(falloffFactor("none", 99, 100)).toBe(1);
  });

  it("returns 0 at edge for none", () => {
    expect(falloffFactor("none", 100, 100)).toBe(0);
  });

  it("returns 0 for zero radius", () => {
    expect(falloffFactor("linear", 0, 0)).toBe(0);
  });
});

// -------- heat ---------------------------------------------------------------

describe("sampleSignals – heat", () => {
  it("returns 0 heat with no emitters", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [], noRain);
    expect(s.heat).toBe(0);
  });

  it("returns full strength at emitter center", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [heatEmitter(0, 0, 200)], noRain);
    expect(s.heat).toBe(OPEN_FLAME_BONUS);
  });

  it("returns 0 at edge of radius", () => {
    const s = sampleSignals({ x: 200, y: 0 }, [heatEmitter(0, 0, 200)], noRain);
    expect(s.heat).toBe(0);
  });

  it("returns 0 outside radius", () => {
    const s = sampleSignals({ x: 250, y: 0 }, [heatEmitter(0, 0, 200)], noRain);
    expect(s.heat).toBe(0);
  });

  it("returns half strength at half radius (linear falloff)", () => {
    const s = sampleSignals({ x: 100, y: 0 }, [heatEmitter(0, 0, 200)], noRain);
    expect(s.heat).toBeCloseTo(OPEN_FLAME_BONUS * 0.5);
  });

  it("sums contributions from two overlapping fires (parity with old getCampfireHeatAt)", () => {
    // Mirrors getCampfireHeatAt logic: sum of OPEN_FLAME_BONUS * (1 - dist/radius)
    const radius = 224; // default campfire heatRadiusPx from campfire-runtime-system
    const emitters = [
      heatEmitter(0, 0, radius),
      heatEmitter(300, 0, radius), // separate fire, doesn't reach origin
    ];
    const atOrigin = sampleSignals({ x: 0, y: 0 }, emitters, noRain);
    expect(atOrigin.heat).toBeCloseTo(OPEN_FLAME_BONUS); // only first fire reaches

    // Point equidistant between two fires at 100px each
    const between = sampleSignals({ x: 150, y: 0 }, [
      heatEmitter(0, 0, radius),
      heatEmitter(300, 0, radius),
    ], noRain);
    const expected1 = OPEN_FLAME_BONUS * (1 - 150 / radius);
    const expected2 = OPEN_FLAME_BONUS * (1 - 150 / radius);
    expect(between.heat).toBeCloseTo(expected1 + expected2);
  });
});

// -------- light --------------------------------------------------------------

describe("sampleSignals – light", () => {
  it("caps at 1 even with two overlapping full-strength lights", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [
      lightEmitter(0, 0, 288),
      lightEmitter(0, 0, 288),
    ], noRain);
    expect(s.light).toBe(1);
  });

  it("partial light at half radius", () => {
    const s = sampleSignals({ x: 144, y: 0 }, [lightEmitter(0, 0, 288)], noRain);
    expect(s.light).toBeCloseTo(0.5);
  });
});

// -------- shelter ------------------------------------------------------------

describe("sampleSignals – shelter", () => {
  it("shelter takes the maximum across sources, not the sum", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [
      shelterEmitter(0, 0, 100, 0.6),
      shelterEmitter(0, 0, 100, 0.4),
    ], noRain);
    expect(s.shelter).toBeCloseTo(0.6);
  });

  it("outside shelter radius gives 0 shelter", () => {
    const s = sampleSignals({ x: 200, y: 0 }, [shelterEmitter(0, 0, 100, 1.0)], noRain);
    expect(s.shelter).toBe(0);
  });
});

// -------- wetness (derived from rain + shelter) ------------------------------

describe("sampleSignals – wetness", () => {
  it("no wetness when not raining", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [], noRain);
    expect(s.wetness).toBe(0);
  });

  it("full wetness when raining with no shelter", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [], rain);
    expect(s.wetness).toBe(1);
  });

  it("partial wetness when raining but partially sheltered", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [shelterEmitter(0, 0, 100, 0.7)], rain);
    expect(s.wetness).toBeCloseTo(0.3);
  });

  it("zero wetness when raining and fully sheltered", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [shelterEmitter(0, 0, 100, 1.0)], rain);
    expect(s.wetness).toBeCloseTo(0);
  });

  it("no wetness when not raining even if unsheltered", () => {
    const s = sampleSignals({ x: 0, y: 0 }, [shelterEmitter(0, 0, 100, 0.5)], noRain);
    expect(s.wetness).toBe(0);
  });
});

// -------- empty sample -------------------------------------------------------

describe("sampleSignals – empty", () => {
  it("returns all zeros for an empty emitter list", () => {
    const s = sampleSignals({ x: 100, y: 100 }, [], noRain);
    expect(s).toEqual({ heat: 0, light: 0, shelter: 0, wetness: 0 });
  });
});
