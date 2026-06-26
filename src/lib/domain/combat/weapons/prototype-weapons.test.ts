import { describe, expect, it } from "vitest";
import "./prototype-weapons";
import { explicitWeaponDefForItem } from "./weapon-registry";

describe("prototype weapon links", () => {
  it("resolves the crude knife item to its definition", () => {
    const def = explicitWeaponDefForItem("crude_knife");
    expect(def?.id).toBe("weapon.crude_knife");
    expect(def?.family).toBe("knife");
    expect(def?.attacks.swipe?.statusEffects?.[0]?.kind).toBe("bleed");
  });

  it("resolves the wooden spear and binds its close-range technique", () => {
    const def = explicitWeaponDefForItem("wooden_spear");
    expect(def?.id).toBe("weapon.wooden_spear");
    expect(def?.attacks.quick.techniqueId).toBe("spear_close_range_penalty");
  });

  it("resolves the stone axe as a heavy weapon", () => {
    const def = explicitWeaponDefForItem("stone_axe");
    expect(def?.id).toBe("weapon.stone_axe");
    expect(def?.handling.weightClass).toBe("heavy");
    expect(def?.attacks.heavy?.inputKind).toBe("hold");
  });

  it("returns undefined for a weapon with no explicit definition", () => {
    expect(explicitWeaponDefForItem("hardened_spear")).toBeUndefined();
  });
});
