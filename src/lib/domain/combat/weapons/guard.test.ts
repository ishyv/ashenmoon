import { describe, expect, it } from "vitest";
import { resolveGuardedDamage } from "./guard";

describe("resolveGuardedDamage", () => {
  it("reduces frontal damage and spends guard stamina", () => {
    const result = resolveGuardedDamage({
      incomingDamage: 30,
      currentStamina: 40,
      guardAngleRad: 0,
      sourceVector: { x: 1, y: 0 },
      reductionPct: 0.6,
      staminaCostMultiplier: 0.5,
      frontalArcDegrees: 120,
    });

    expect(result).toEqual({
      damage: 12,
      staminaCost: 15,
      guarded: true,
      broken: false,
    });
  });

  it("breaks guard when stamina cannot pay the block cost", () => {
    const result = resolveGuardedDamage({
      incomingDamage: 30,
      currentStamina: 8,
      guardAngleRad: 0,
      sourceVector: { x: 1, y: 0 },
      reductionPct: 0.6,
      staminaCostMultiplier: 0.5,
      frontalArcDegrees: 120,
    });

    expect(result.guarded).toBe(true);
    expect(result.broken).toBe(true);
    expect(result.damage).toBeGreaterThan(12);
    expect(result.damage).toBeLessThan(30);
    expect(result.staminaCost).toBe(8);
  });

  it("does not guard side or rear hits", () => {
    const result = resolveGuardedDamage({
      incomingDamage: 30,
      currentStamina: 40,
      guardAngleRad: 0,
      sourceVector: { x: 0, y: 1 },
      reductionPct: 0.6,
      staminaCostMultiplier: 0.5,
      frontalArcDegrees: 90,
    });

    expect(result).toEqual({
      damage: 30,
      staminaCost: 0,
      guarded: false,
      broken: false,
    });
  });
});
