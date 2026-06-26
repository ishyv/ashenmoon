import { describe, expect, it } from "vitest";
import { getWeaponTechnique, SPEAR_CLOSE_RANGE_PX } from "./weapon-techniques";

describe("spear_close_range_penalty", () => {
  const tech = getWeaponTechnique("spear_close_range_penalty")!;

  it("is registered", () => {
    expect(tech).toBeDefined();
  });

  it("guts damage when the target is inside close range", () => {
    const out = tech.onHit({ weaponDamage: 100, distancePx: SPEAR_CLOSE_RANGE_PX - 1, targetTags: [] });
    expect(out.damage).toBeLessThan(100);
    expect(out.note).toBe("too close");
  });

  it("keeps full damage at proper spacing", () => {
    const out = tech.onHit({ weaponDamage: 100, distancePx: SPEAR_CLOSE_RANGE_PX + 40, targetTags: [] });
    expect(out.damage).toBe(100);
  });
});

describe("axe_structure_bonus", () => {
  const tech = getWeaponTechnique("axe_structure_bonus")!;

  it("boosts damage against structural targets", () => {
    const out = tech.onHit({ weaponDamage: 50, distancePx: 30, targetTags: ["structure"] });
    expect(out.damage).toBeGreaterThan(50);
  });

  it("leaves flesh damage unchanged", () => {
    const out = tech.onHit({ weaponDamage: 50, distancePx: 30, targetTags: ["wolf"] });
    expect(out.damage).toBe(50);
  });
});
