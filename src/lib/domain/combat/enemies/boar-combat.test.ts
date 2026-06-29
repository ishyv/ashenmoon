import { describe, expect, it } from "vitest";
import {
  advanceBoarCombat,
  BOAR_CHARGE_ATTACK,
  resolveBoarChargeOutcome,
  type BoarCombatRuntime,
} from "./boar-combat";

function runtime(overrides: Partial<BoarCombatRuntime> = {}): BoarCombatRuntime {
  return {
    state: "graze",
    stateElapsedMs: 0,
    position: { x: 0, y: 0 },
    lockedDirection: null,
    chargeDistancePx: 0,
    ...overrides,
  };
}

describe("boar combat", () => {
  it("alerts before threatening when the player enters awareness range", () => {
    const next = advanceBoarCombat({
      boar: runtime(),
      player: { x: 130, y: 0 },
      dtMs: 100,
    });

    expect(next.state).toBe("alert");
    expect(next.feedback).toBe("noticed_player");
  });

  it("threatens when the player stays inside threat range after alert", () => {
    const next = advanceBoarCombat({
      boar: runtime({ state: "alert", stateElapsedMs: 700 }),
      player: { x: 80, y: 0 },
      dtMs: 200,
    });

    expect(next.state).toBe("threaten");
    expect(next.feedback).toBe("threat_started");
  });

  it("starts charge windup from threat and locks direction toward the player", () => {
    const next = advanceBoarCombat({
      boar: runtime({ state: "threaten", stateElapsedMs: 950 }),
      player: { x: 0, y: 100 },
      dtMs: 100,
    });

    expect(next.state).toBe("charge_windup");
    expect(next.feedback).toBe("charge_windup_started");
    expect(next.lockedDirection?.x).toBeCloseTo(0);
    expect(next.lockedDirection?.y).toBeCloseTo(1);
  });

  it("enters charge after windup without changing the locked direction", () => {
    const next = advanceBoarCombat({
      boar: runtime({ state: "charge_windup", stateElapsedMs: 450, lockedDirection: { x: 1, y: 0 } }),
      player: { x: -100, y: 0 },
      dtMs: 100,
    });

    expect(next.state).toBe("charge");
    expect(next.lockedDirection).toEqual({ x: 1, y: 0 });
    expect(next.activeAttack).toBe(BOAR_CHARGE_ATTACK);
  });

  it("resolves charge as crash, hit, or recovery without late homing", () => {
    expect(resolveBoarChargeOutcome({ hitPlayer: false, hitObstacle: true, chargeDistancePx: 80 })).toBe("crash");
    expect(resolveBoarChargeOutcome({ hitPlayer: true, hitObstacle: false, chargeDistancePx: 80 })).toBe("hit");
    expect(resolveBoarChargeOutcome({ hitPlayer: false, hitObstacle: false, chargeDistancePx: 260 })).toBe("miss");
  });
});
