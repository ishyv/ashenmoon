import { describe, expect, it } from "vitest";
import "./prototype-weapons";
import { explicitWeaponDefForItem, weaponDefForItem } from "./weapon-registry";

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
    expect(def?.attacks.thrust?.id).toBe("spear.driving_thrust");
    expect(def?.attacks.thrust?.inputKind).toBe("stance_swipe");
  });

  it("resolves the stone axe as a heavy weapon", () => {
    const def = explicitWeaponDefForItem("stone_axe");
    expect(def?.id).toBe("weapon.stone_axe");
    expect(def?.handling.weightClass).toBe("heavy");
    expect(def?.attacks.heavy?.inputKind).toBe("hold");
  });

  it("reuses the authored spear behavior for hardened spears in v1", () => {
    expect(explicitWeaponDefForItem("hardened_spear")?.id).toBe("weapon.wooden_spear");
  });

  it("resolves generic and unarmed equipment into weapon-driven definitions", () => {
    expect(weaponDefForItem("hardened_spear")?.id).toBe("weapon.wooden_spear");
    expect(weaponDefForItem("stone_pickaxe")?.id).toBe("weapon.unarmed");
    expect(weaponDefForItem(null)?.id).toBe("weapon.unarmed");
  });
});
