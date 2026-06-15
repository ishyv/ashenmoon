import { describe, expect, it } from "vitest";
import { resolveDamage } from "./damage";

describe("resolveDamage", () => {
  it("applies physical armor mitigation before reducing health", () => {
    const result = resolveDamage({
      health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
      amount: 50,
      damageType: "physical",
      armor: 100,
    });

    expect(result.applied).toBe(true);
    expect(result.damageApplied).toBe(25);
    expect(result.previousHealth).toBe(100);
    expect(result.nextHealth).toBe(75);
    expect(result.lethal).toBe(false);
  });

  it("ignores invulnerable targets without changing health", () => {
    const result = resolveDamage({
      health: { current: 100, max: 100, faction: "player", invulnTimer: 0.2 },
      amount: 50,
      damageType: "physical",
      armor: 0,
    });

    expect(result).toEqual({
      applied: false,
      reason: "invulnerable",
      previousHealth: 100,
      nextHealth: 100,
      damageApplied: 0,
      lethal: false,
    });
  });

  it("reports lethal hits when damage reduces health to zero", () => {
    const result = resolveDamage({
      health: { current: 12, max: 100, faction: "hostile", invulnTimer: 0 },
      amount: 20,
      damageType: "physical",
      armor: 0,
    });

    expect(result.applied).toBe(true);
    expect(result.damageApplied).toBe(20);
    expect(result.previousHealth).toBe(12);
    expect(result.nextHealth).toBe(0);
    expect(result.lethal).toBe(true);
  });

  it("ignores missing health components", () => {
    const result = resolveDamage({
      health: undefined,
      amount: 20,
      damageType: "physical",
      armor: 0,
    });

    if (result.applied) throw new Error("expected damage to be skipped");
    expect(result.reason).toBe("missing_health");
    expect(result.damageApplied).toBe(0);
    expect(result.lethal).toBe(false);
  });

  it("ignores targets that are already dead", () => {
    const result = resolveDamage({
      health: { current: 0, max: 100, faction: "hostile", invulnTimer: 0 },
      amount: 20,
      damageType: "physical",
      armor: 0,
    });

    expect(result).toEqual({
      applied: false,
      reason: "already_dead",
      previousHealth: 0,
      nextHealth: 0,
      damageApplied: 0,
      lethal: false,
    });
  });
});
