import { describe, expect, it } from "vitest";
import { evaluate } from "./rhythm";

describe("Basic Attack Rhythm calculation", () => {
  it("first attack is fully ready", () => {
    const res = evaluate(1000, null);
    expect(res.readiness).toBe(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("instant second attack has minimum damage and maximum stamina cost", () => {
    const res = evaluate(1000, 1000);
    expect(res.readiness).toBe(0.0);
    expect(res.damageMultiplier).toBeCloseTo(0.35);
    expect(res.staminaCost).toBeCloseTo(4 * 2.75); // 11
    expect(res.grade).toBe("rushed");
  });

  it("half-timed attack has partial damage and increased stamina cost", () => {
    const res = evaluate(1500, 1000);
    expect(res.readiness).toBeCloseTo(0.5);
    expect(res.damageMultiplier).toBeCloseTo(0.35 + 0.65 * 0.5); // 0.675
    expect(res.staminaCost).toBeCloseTo(4 * (2.75 - 1.75 * 0.5)); // 4 * 1.875 = 7.5
    expect(res.grade).toBe("strained");
  });

  it("fully-timed attack has full damage and normal stamina cost", () => {
    const res = evaluate(2000, 1000);
    expect(res.readiness).toBeCloseTo(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("readiness never goes below 0", () => {
    const res = evaluate(500, 1000);
    expect(res.readiness).toBe(0.0);
    expect(res.damageMultiplier).toBeCloseTo(0.35);
    expect(res.staminaCost).toBeCloseTo(11.0);
    expect(res.grade).toBe("rushed");
  });

  it("readiness never goes above 1", () => {
    const res = evaluate(2500, 1000);
    expect(res.readiness).toBe(1.0);
    expect(res.damageMultiplier).toBeCloseTo(1.0);
    expect(res.staminaCost).toBeCloseTo(4.0);
    expect(res.grade).toBe("perfect");
  });

  it("rushed grade applies below 45%", () => {
    const res = evaluate(1440, 1000);
    expect(res.grade).toBe("rushed");
  });

  it("strained grade applies below 80%", () => {
    const res1 = evaluate(1450, 1000);
    expect(res1.grade).toBe("strained");

    const res2 = evaluate(1790, 1000);
    expect(res2.grade).toBe("strained");
  });

  it("good grade applies below 100%", () => {
    const res1 = evaluate(1800, 1000);
    expect(res1.grade).toBe("good");

    const res2 = evaluate(1990, 1000);
    expect(res2.grade).toBe("good");
  });

  it("perfect grade applies near or after full recovery", () => {
    const res = evaluate(2000, 1000);
    expect(res.grade).toBe("perfect");
  });

  it("matches example test cases from instructions", () => {
    expect(evaluate(0, null).readiness).toBe(1);
    expect(evaluate(1000, 1000).damageMultiplier).toBeCloseTo(0.35);
    expect(evaluate(1500, 1000).readiness).toBeCloseTo(0.5);
    expect(evaluate(2000, 1000).damageMultiplier).toBeCloseTo(1.0);
    expect(evaluate(2500, 1000).readiness).toBe(1);
  });
});
