import { describe, it, expect } from "vitest";
import { resolveMeleeHit, MELEE_FORGIVENESS } from "./attack";

describe("resolveMeleeHit", () => {
  it("hits when target is within exact range", () => {
    const result = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 50, targetY: 0, rangePx: 50 });
    expect(result.hit).toBe(true);
  });

  it("misses when target is beyond range", () => {
    const result = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 60, targetY: 0, rangePx: 50 });
    expect(result).toEqual({ hit: false, reason: "out_of_range" });
  });

  it("hits at diagonal with correct distance", () => {
    // distance = sqrt(30^2 + 40^2) = 50
    const result = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 30, targetY: 40, rangePx: 50 });
    expect(result.hit).toBe(true);
  });

  it("applies forgiveness multiplier on release frame", () => {
    // target at 60px, range 50px — miss without forgiveness, hit with 1.4x
    const noForgiveness = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 60, targetY: 0, rangePx: 50 });
    const withForgiveness = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 60, targetY: 0, rangePx: 50, forgiveness: MELEE_FORGIVENESS });
    expect(noForgiveness.hit).toBe(false);
    expect(withForgiveness.hit).toBe(true);
  });

  it("misses even with forgiveness when far enough away", () => {
    // range * 1.4 = 70; target at 71px
    const result = resolveMeleeHit({ attackerX: 0, attackerY: 0, targetX: 71, targetY: 0, rangePx: 50, forgiveness: MELEE_FORGIVENESS });
    expect(result.hit).toBe(false);
  });

  it("hits at zero distance (touching)", () => {
    const result = resolveMeleeHit({ attackerX: 100, attackerY: 100, targetX: 100, targetY: 100, rangePx: 1 });
    expect(result.hit).toBe(true);
  });
});
