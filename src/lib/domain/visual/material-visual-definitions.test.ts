import { describe, it, expect } from "vitest";
import { resolveVisualState } from "./visual-state-resolver.js";
import { MATERIAL_VISUAL_DEF, type MaterialVisualInput } from "./material-visual-definitions.js";

const base = (overrides: Partial<MaterialVisualInput> = {}): MaterialVisualInput => ({
  isDamp: false,
  heatNearby: 20,
  wetness: 0,
  cookingProgress: 0,
  dryingProgress: 0,
  ...overrides,
});

describe("MATERIAL_VISUAL_DEF resolver", () => {
  it("dry item with no heat or wetness resolves to 'dry' base state", () => {
    const result = resolveVisualState(MATERIAL_VISUAL_DEF, base());
    expect(result.baseState).toBe("dry");
    expect(result.particles).toHaveLength(0);
    expect(result.tint).toBeUndefined();
  });

  it("isDamp item resolves to 'damp' base state", () => {
    const result = resolveVisualState(MATERIAL_VISUAL_DEF, base({ isDamp: true }));
    expect(result.baseState).toBe("damp");
  });

  it("isDamp item with low wetness has no wet_sheen overlay (wetness <= 0.4)", () => {
    const result = resolveVisualState(MATERIAL_VISUAL_DEF, base({ isDamp: true, wetness: 0.2 }));
    expect(result.baseState).toBe("damp");
    // rain_splash comes from wet_sheen overlay only — should not appear at low wetness
    expect(result.particles).not.toContain("rain_splash");
  });

  it("isDamp item with high wetness gains wet_sheen overlay (wetness > 0.4)", () => {
    const result = resolveVisualState(MATERIAL_VISUAL_DEF, base({ isDamp: true, wetness: 0.6 }));
    expect(result.baseState).toBe("damp");
    expect(result.particles).toContain("rain_splash");
    // Overlay tint (0x8899bb) overrides damp base tint
    expect(result.tint).toBe(0x8899bb);
  });

  it("dry item with high wetness only shows wet_sheen overlay on dry base", () => {
    const result = resolveVisualState(MATERIAL_VISUAL_DEF, base({ wetness: 0.6 }));
    expect(result.baseState).toBe("dry");
    expect(result.particles).toContain("rain_splash");
    expect(result.tint).toBe(0x8899bb);
  });

  it("isDamp + dryingProgress > 0 resolves to 'drying' base state", () => {
    const result = resolveVisualState(
      MATERIAL_VISUAL_DEF,
      base({ isDamp: true, heatNearby: 130, dryingProgress: 0.3 }),
    );
    expect(result.baseState).toBe("drying");
    expect(result.particles).toContain("dry_dust");
  });

  it("cookingProgress > 0 resolves to 'cooking' base state regardless of isDamp", () => {
    const result = resolveVisualState(
      MATERIAL_VISUAL_DEF,
      base({ heatNearby: 200, cookingProgress: 0.5 }),
    );
    expect(result.baseState).toBe("cooking");
    expect(result.particles).toContain("cook_sizzle");
    expect(result.particles).toContain("cook_steam");
    expect(result.soundLoops).toContain("craft.cook.sizzle");
  });

  it("cooking has higher priority than drying", () => {
    const result = resolveVisualState(
      MATERIAL_VISUAL_DEF,
      base({ isDamp: true, cookingProgress: 0.3, dryingProgress: 0.5 }),
    );
    expect(result.baseState).toBe("cooking");
  });

  it("drying has higher priority than damp", () => {
    const result = resolveVisualState(
      MATERIAL_VISUAL_DEF,
      base({ isDamp: true, dryingProgress: 0.1 }),
    );
    expect(result.baseState).toBe("drying");
  });

  it("fallbackState is 'dry'", () => {
    expect(MATERIAL_VISUAL_DEF.fallbackState).toBe("dry");
  });

  it("all rule state references exist in states", () => {
    for (const rule of MATERIAL_VISUAL_DEF.rules) {
      expect(
        MATERIAL_VISUAL_DEF.states[rule.state],
        `rule "${rule.id}" references unknown state "${rule.state}"`,
      ).toBeDefined();
    }
  });
});
