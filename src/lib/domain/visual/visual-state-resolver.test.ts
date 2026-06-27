import { describe, expect, it } from "vitest";
import { CAMPFIRE_VISUAL_DEF, type CampfireVisualInput } from "./visual-definitions.js";
import { resolveVisualState, diffLoopSets } from "./visual-state-resolver.js";

function input(overrides: Partial<CampfireVisualInput>): CampfireVisualInput {
  return {
    isLit: false,
    fuelMs: 0,
    fuelFrac: 0,
    wetness: 0,
    raining: false,
    ignitionElapsedSec: 0,
    everBurned: false,
    ...overrides,
  };
}

describe("resolveVisualState – base state selection", () => {
  it("1. cold, no fuel, never burned → unlit_empty", () => {
    expect(resolveVisualState(CAMPFIRE_VISUAL_DEF, input({})).baseState).toBe("unlit_empty");
  });

  it("2. cold, has fuel → unlit_fueled", () => {
    expect(resolveVisualState(CAMPFIRE_VISUAL_DEF, input({ fuelMs: 1000 })).baseState).toBe(
      "unlit_fueled",
    );
  });

  it("3. cold, no fuel, everBurned → ash_pile", () => {
    expect(
      resolveVisualState(CAMPFIRE_VISUAL_DEF, input({ everBurned: true })).baseState,
    ).toBe("ash_pile");
  });

  it("4. cold, wetness=0.95, no fuel, everBurned → extinguished_wet (priority 90 > 80)", () => {
    expect(
      resolveVisualState(CAMPFIRE_VISUAL_DEF, input({ wetness: 0.95, everBurned: true }))
        .baseState,
    ).toBe("extinguished_wet");
  });

  it("5. lit, ignitionElapsedSec=0.3 → igniting", () => {
    expect(
      resolveVisualState(CAMPFIRE_VISUAL_DEF, input({ isLit: true, ignitionElapsedSec: 0.3 }))
        .baseState,
    ).toBe("igniting");
  });

  it("6. lit, fuelFrac=0.8, wetness=0.1, ignitionElapsedSec=1.0 → burning_high", () => {
    expect(
      resolveVisualState(
        CAMPFIRE_VISUAL_DEF,
        input({ isLit: true, fuelFrac: 0.8, wetness: 0.1, ignitionElapsedSec: 1.0 }),
      ).baseState,
    ).toBe("burning_high");
  });

  it("7. lit, fuelFrac=0.5, ignitionElapsedSec=1.0 → burning_med", () => {
    expect(
      resolveVisualState(
        CAMPFIRE_VISUAL_DEF,
        input({ isLit: true, fuelFrac: 0.5, ignitionElapsedSec: 1.0 }),
      ).baseState,
    ).toBe("burning_med");
  });

  it("8. lit, fuelFrac=0.1, ignitionElapsedSec=1.0 → burning_low", () => {
    expect(
      resolveVisualState(
        CAMPFIRE_VISUAL_DEF,
        input({ isLit: true, fuelFrac: 0.1, ignitionElapsedSec: 1.0 }),
      ).baseState,
    ).toBe("burning_low");
  });

  it("9. lit, wetness=0.6, ignitionElapsedSec=1.0 → wet_sputtering (priority 55 > 40/30/20)", () => {
    expect(
      resolveVisualState(
        CAMPFIRE_VISUAL_DEF,
        input({ isLit: true, wetness: 0.6, ignitionElapsedSec: 1.0 }),
      ).baseState,
    ).toBe("wet_sputtering");
  });

  it("10. lit, fuelFrac=0.8, wetness=0.25, ignitionElapsedSec=1.0 → burning_med (wetness>=0.2 fails burning_high)", () => {
    expect(
      resolveVisualState(
        CAMPFIRE_VISUAL_DEF,
        input({ isLit: true, fuelFrac: 0.8, wetness: 0.25, ignitionElapsedSec: 1.0 }),
      ).baseState,
    ).toBe("burning_med");
  });
});

describe("resolveVisualState – overlay merge", () => {
  it("11. burning_high + low_fuel overlay → tint=0xcc8830, particles keep fire_embers_high+fire_smoke, soundLoops has campfire.loop", () => {
    const result = resolveVisualState(
      CAMPFIRE_VISUAL_DEF,
      input({ isLit: true, fuelFrac: 0.8, wetness: 0.1, ignitionElapsedSec: 1.0, fuelMs: 5000 }),
    );
    expect(result.baseState).toBe("burning_high");
    expect(result.tint).toBe(0xcc8830);
    expect(result.particles).toContain("fire_embers_high");
    expect(result.particles).toContain("fire_smoke");
    expect(result.soundLoops).toContain("campfire.loop");
  });

  it("12. low_fuel + wet_sheen overlays both apply → tint=0x8899bb (wet_sheen prio 60 beats low_fuel prio 50), particles includes fire_smoke+rain_splash", () => {
    // wetness=0.5 triggers wet_sputtering base (priority 55) + both overlays
    const result = resolveVisualState(
      CAMPFIRE_VISUAL_DEF,
      input({ isLit: true, fuelFrac: 0.8, wetness: 0.5, ignitionElapsedSec: 1.0, fuelMs: 5000 }),
    );
    expect(result.tint).toBe(0x8899bb);
    expect(result.particles).toContain("fire_smoke");
    expect(result.particles).toContain("rain_splash");
  });

  it("13. burning_med (no overlays triggered) → soundLoops is exactly ['campfire.loop'] (no dupes)", () => {
    // fuelMs=20000 → low_fuel doesn't fire; wetness=0 → wet_sheen doesn't fire
    const result = resolveVisualState(
      CAMPFIRE_VISUAL_DEF,
      input({ isLit: true, fuelFrac: 0.5, ignitionElapsedSec: 1.0, fuelMs: 20000 }),
    );
    expect(result.soundLoops).toEqual(["campfire.loop"]);
  });

  it("14. unlit_empty → light is null, soundLoops is [], particles is []", () => {
    const result = resolveVisualState(CAMPFIRE_VISUAL_DEF, input({}));
    expect(result.light).toBeNull();
    expect(result.soundLoops).toEqual([]);
    expect(result.particles).toEqual([]);
  });
});

describe("resolveVisualState – defaults", () => {
  it("15. result always has alpha=1 (when state doesn't override it)", () => {
    // burning_high + low_fuel: low_fuel has no alpha, burning_high sets alpha=1
    const result = resolveVisualState(
      CAMPFIRE_VISUAL_DEF,
      input({ isLit: true, fuelFrac: 0.8, wetness: 0.1, ignitionElapsedSec: 1.0, fuelMs: 5000 }),
    );
    expect(result.alpha).toBe(1);
  });

  it("16. result always has scale=1 (when no overlay multiplies it)", () => {
    // burning_high (scale=1) + low_fuel (no scale) → 1 * unmodified = 1
    const result = resolveVisualState(
      CAMPFIRE_VISUAL_DEF,
      input({ isLit: true, fuelFrac: 0.8, wetness: 0.1, ignitionElapsedSec: 1.0, fuelMs: 5000 }),
    );
    expect(result.scale).toBe(1);
  });

  it("17. result always has light=null (when state sets light=null and no overlay)", () => {
    const result = resolveVisualState(CAMPFIRE_VISUAL_DEF, input({}));
    expect(result.light).toBeNull();
  });
});

describe("diffLoopSets", () => {
  it("18. empty prev, empty next → both empty arrays", () => {
    const result = diffLoopSets(new Set(), new Set());
    expect(result.toStart).toEqual([]);
    expect(result.toStop).toEqual([]);
  });

  it("19. new loop appears → toStart contains it, toStop empty", () => {
    const result = diffLoopSets(new Set(), new Set(["campfire.loop"]));
    expect(result.toStart).toContain("campfire.loop");
    expect(result.toStop).toEqual([]);
  });

  it("20. loop removed → toStop contains it, toStart empty", () => {
    const result = diffLoopSets(new Set(["campfire.loop"]), new Set());
    expect(result.toStop).toContain("campfire.loop");
    expect(result.toStart).toEqual([]);
  });

  it("21. stable loop → appears in neither toStart nor toStop", () => {
    const result = diffLoopSets(new Set(["campfire.loop"]), new Set(["campfire.loop"]));
    expect(result.toStart).not.toContain("campfire.loop");
    expect(result.toStop).not.toContain("campfire.loop");
  });

  it("22. mixed: prev={A,B}, next={B,C} → toStart=[C], toStop=[A]", () => {
    const result = diffLoopSets(new Set(["A", "B"]), new Set(["B", "C"]));
    expect(result.toStart).toEqual(["C"]);
    expect(result.toStop).toEqual(["A"]);
  });
});
