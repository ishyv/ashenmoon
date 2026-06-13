import { describe, expect, it } from "vitest";
import { evaluate, type RhythmConfig } from "./rhythm";

// Explicit test config — balance tuning in DEFAULT_RHYTHM_CONFIG does not break these tests.
const C: RhythmConfig = {
  idealRecoveryMs: 1000,
  baseStaminaCost: 4,
  minDamageMultiplier: 0.35,
  maxDamageMultiplier: 1.0,
  minStaminaCostMultiplier: 1.0,
  maxStaminaCostMultiplier: 2.75,
};

describe("Basic Attack Rhythm calculation", () => {
  it("first attack is fully ready", () => {
    const res = evaluate(1000, null, C);
    expect(res.readiness).toBe(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("instant second attack has minimum damage and maximum stamina cost", () => {
    const res = evaluate(1000, 1000, C);
    expect(res.readiness).toBe(0.0);
    expect(res.damageMultiplier).toBeCloseTo(0.35);
    expect(res.staminaCost).toBeCloseTo(4 * 2.75); // 11
    expect(res.grade).toBe("rushed");
  });

  it("half-timed attack has partial damage and increased stamina cost", () => {
    const res = evaluate(1500, 1000, C);
    expect(res.readiness).toBeCloseTo(0.5);
    expect(res.damageMultiplier).toBeCloseTo(0.35 + 0.65 * 0.5); // 0.675
    expect(res.staminaCost).toBeCloseTo(4 * (2.75 - 1.75 * 0.5)); // 4 * 1.875 = 7.5
    expect(res.grade).toBe("strained");
  });

  it("fully-timed attack has full damage and normal stamina cost", () => {
    const res = evaluate(2000, 1000, C);
    expect(res.readiness).toBeCloseTo(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("readiness never goes below 0", () => {
    const res = evaluate(500, 1000, C);
    expect(res.readiness).toBe(0.0);
    expect(res.damageMultiplier).toBeCloseTo(0.35);
    expect(res.staminaCost).toBeCloseTo(11.0);
    expect(res.grade).toBe("rushed");
  });

  it("readiness never goes above 1", () => {
    const res = evaluate(2500, 1000, C);
    expect(res.readiness).toBe(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("rushed grade applies below 45%", () => {
    expect(evaluate(1440, 1000, C).grade).toBe("rushed");
  });

  it("strained grade applies below 80%", () => {
    expect(evaluate(1450, 1000, C).grade).toBe("strained");
    expect(evaluate(1790, 1000, C).grade).toBe("strained");
  });

  it("good grade applies below 100%", () => {
    expect(evaluate(1800, 1000, C).grade).toBe("good");
    expect(evaluate(1990, 1000, C).grade).toBe("good");
  });

  it("perfect grade applies near or after full recovery", () => {
    expect(evaluate(2000, 1000, C).grade).toBe("perfect");
  });

  it("matches example test cases from instructions", () => {
    expect(evaluate(0, null, C).readiness).toBe(1);
    expect(evaluate(1000, 1000, C).damageMultiplier).toBeCloseTo(0.35);
    expect(evaluate(1500, 1000, C).readiness).toBeCloseTo(0.5);
    expect(evaluate(2000, 1000, C).damageMultiplier).toBeCloseTo(1.0);
    expect(evaluate(2500, 1000, C).readiness).toBe(1);
  });
});
