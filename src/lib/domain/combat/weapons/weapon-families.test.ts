import { describe, expect, it } from "vitest";
import {
  getWeaponFamily,
  registerWeaponFamily,
  resolveWeaponFamilyForKind,
} from "./weapon-families";

describe("weapon family registry", () => {
  it("resolves existing weapon families without a closed union", () => {
    expect(resolveWeaponFamilyForKind("wooden spear").id).toBe("spear");
    expect(resolveWeaponFamilyForKind("stone axe").id).toBe("axe");
    expect(getWeaponFamily("knife")?.tags).toContain("short_blade");
  });

  it("allows new weapon families to be registered as data", () => {
    registerWeaponFamily({
      id: "chain_whip",
      aliases: ["chain whip"],
      defaultDamageType: "slash",
      defaultWeightClass: "medium",
      defaultAnimationProfile: "small_slash",
      defaultSoundProfile: "chain_whip",
      defaultAttackShape: "arc",
      tags: ["flexible", "reach"],
    });

    expect(resolveWeaponFamilyForKind("rusted chain whip").id).toBe("chain_whip");
  });
});
