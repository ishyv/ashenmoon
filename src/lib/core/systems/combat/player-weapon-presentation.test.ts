import { describe, expect, it } from "vitest";
import { CombatResource } from "./combat";
import { applyPlayerWeaponPresentation } from "./player-weapon-presentation";

function sprite() {
  return { alpha: 1, tint: 0xffffff, rotation: 0, x: 0, y: 0 };
}

describe("applyPlayerWeaponPresentation", () => {
  it("makes held guard visibly change player and weapon pose", () => {
    const combat = new CombatResource();
    combat.guard.active = true;
    const player = { tint: 0xffffff };
    const weapon = sprite();

    applyPlayerWeaponPresentation({
      combat,
      playerSprite: player,
      weaponSprite: weapon,
      facing: 1,
      basePose: { x: 6, y: -12, rotation: 0.2 },
    });

    expect(player.tint).toBe(0xd8ecff);
    expect(weapon.tint).toBe(0xcfe8ff);
    expect(weapon.rotation).toBeLessThan(0);
    expect(weapon.x).toBe(8);
    expect(weapon.y).toBe(-16);
  });

  it("sets absolute pose from the base instead of accumulating offsets", () => {
    const combat = new CombatResource();
    combat.guard.active = true;
    const player = { tint: 0xffffff };
    const weapon = sprite();

    applyPlayerWeaponPresentation({
      combat,
      playerSprite: player,
      weaponSprite: weapon,
      facing: 1,
      basePose: { x: 10, y: -20, rotation: 0.2 },
    });
    applyPlayerWeaponPresentation({
      combat,
      playerSprite: player,
      weaponSprite: weapon,
      facing: 1,
      basePose: { x: 10, y: -20, rotation: 0.2 },
    });

    expect(weapon.x).toBe(12);
    expect(weapon.y).toBe(-24);
  });
});
