import { describe, expect, it } from "vitest";
import { advanceEnemyAttackRuntime, startEnemyAttackRuntime } from "./enemy-attack-runtime";
import type { EnemyAttackDefinition } from "./enemy-attack-types";

const charge: EnemyAttackDefinition = {
  id: "boar.charge",
  name: "Boar Charge",
  rangePx: 240,
  windupMs: 500,
  activeMs: 300,
  recoveryMs: 800,
  cooldownMs: 1200,
  damage: 28,
  knockbackPx: 96,
  hitShape: { kind: "capsule", lengthPx: 240, widthPx: 34 },
  telegraph: { kind: "line", windupColor: 0xff7a33 },
  movement: { kind: "charge", speedPxPerSec: 520, maxDistancePx: 240, turnLock: true },
};

describe("enemy attack runtime", () => {
  it("advances windup to active to recovery to done using authored timings", () => {
    let runtime = startEnemyAttackRuntime({
      attack: charge,
      origin: { x: 10, y: 20 },
      direction: { x: 1, y: 0 },
    });

    expect(runtime.phase).toBe("windup");
    expect(runtime.lockedDirection).toEqual({ x: 1, y: 0 });

    runtime = advanceEnemyAttackRuntime(runtime, 499);
    expect(runtime.phase).toBe("windup");

    runtime = advanceEnemyAttackRuntime(runtime, 1);
    expect(runtime.phase).toBe("active");
    expect(runtime.justBecameActive).toBe(true);

    runtime = advanceEnemyAttackRuntime(runtime, 300);
    expect(runtime.phase).toBe("recovery");

    runtime = advanceEnemyAttackRuntime(runtime, 800);
    expect(runtime.phase).toBe("done");
  });

  it("normalizes and locks the committed direction at attack start", () => {
    const runtime = startEnemyAttackRuntime({
      attack: charge,
      origin: { x: 0, y: 0 },
      direction: { x: 10, y: 0 },
    });

    expect(runtime.lockedDirection.x).toBeCloseTo(1);
    expect(runtime.lockedDirection.y).toBeCloseTo(0);
  });
});
