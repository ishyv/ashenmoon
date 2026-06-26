import { describe, expect, it } from "vitest";
import { resolveAttack, selectAttack } from "./attack-resolution";
import type { InputIntent } from "../input-intent";
import type { WeaponAttackDefinition, WeaponDefinition } from "./weapon-types";

function attack(id: string, over: Partial<WeaponAttackDefinition> = {}): WeaponAttackDefinition {
  return {
    id,
    name: id,
    inputKind: "tap",
    damageType: "slash",
    damageMultiplier: 1,
    staminaCostMultiplier: 1,
    windupMs: 100,
    activeMs: 100,
    recoveryMs: 300,
    hitShape: { kind: "arc", radiusPx: 90, arcDegrees: 90 },
    movement: { moveSpeedMultiplier: 0.4 },
    ...over,
  };
}

const weapon: WeaponDefinition = {
  id: "test_weapon",
  name: "test weapon",
  family: "sword",
  baseDamage: 20,
  handling: {
    weightClass: "medium",
    baseReachPx: 90,
    baseRecoveryMs: 300,
    baseStaminaCost: 10,
    stanceMoveSpeedMultiplier: 0.6,
    attackMoveSpeedMultiplier: 0.4,
  },
  attacks: {
    quick: attack("quick"),
    heavy: attack("heavy", { inputKind: "hold", damageMultiplier: 2, staminaCostMultiplier: 1.5 }),
    swipe: attack("swipe", { inputKind: "swipe", techniqueId: "drawing_cut", hitShape: { kind: "capsule", lengthPx: 140, widthPx: 40 } }),
  },
  animationProfile: "small_slash",
  soundProfile: "sword",
};

function intent(kind: InputIntent["kind"]): InputIntent {
  return { kind, direction: { x: 1, y: 0 }, holdDurationMs: 0 };
}

describe("selectAttack", () => {
  it("maps each intent to its attack-set slot", () => {
    expect(selectAttack(intent("tap"), weapon).id).toBe("quick");
    expect(selectAttack(intent("hold"), weapon).id).toBe("heavy");
    expect(selectAttack(intent("swipe"), weapon).id).toBe("swipe");
  });

  it("falls back to quick when the weapon has no attack for the intent", () => {
    // stance_hold maps to `charged`, which this weapon lacks.
    expect(selectAttack(intent("stance_hold"), weapon).id).toBe("quick");
  });
});

describe("resolveAttack", () => {
  it("derives weapon damage and stamina from the weapon, not a global config", () => {
    const plan = resolveAttack(intent("hold"), weapon);
    expect(plan.weaponDamage).toBe(40); // 20 base × 2 heavy multiplier
    expect(plan.staminaCost).toBe(15); // 10 base × 1.5
    expect(plan.weaponDefId).toBe("test_weapon");
  });

  it("carries the slotted technique id and reach extent for a swipe", () => {
    const plan = resolveAttack(intent("swipe"), weapon);
    expect(plan.techniqueId).toBe("drawing_cut");
    expect(plan.reachPx).toBe(140); // capsule length
  });

  it("passes the intent direction through", () => {
    const plan = resolveAttack({ kind: "tap", direction: { x: 0, y: -1 }, holdDurationMs: 0 }, weapon);
    expect(plan.direction).toEqual({ x: 0, y: -1 });
  });
});
