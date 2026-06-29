import { describe, expect, it } from "vitest";
import { enemyAttackHitsTarget } from "./enemy-attack-resolution";
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
  telegraph: { kind: "line" },
  movement: { kind: "charge", speedPxPerSec: 520, maxDistancePx: 240, turnLock: true },
};

describe("enemy attack resolution", () => {
  it("hits targets inside a committed charge lane", () => {
    expect(
      enemyAttackHitsTarget({
        attack: charge,
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        target: { x: 160, y: 10 },
        targetRadiusPx: 10,
      }),
    ).toBe(true);
  });

  it("misses targets outside the lateral width of the charge lane", () => {
    expect(
      enemyAttackHitsTarget({
        attack: charge,
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        target: { x: 160, y: 42 },
        targetRadiusPx: 8,
      }),
    ).toBe(false);
  });

  it("misses targets beyond authored range even if aligned", () => {
    expect(
      enemyAttackHitsTarget({
        attack: charge,
        origin: { x: 0, y: 0 },
        direction: { x: 1, y: 0 },
        target: { x: 280, y: 0 },
        targetRadiusPx: 8,
      }),
    ).toBe(false);
  });
});
