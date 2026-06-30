import { describe, expect, it } from "vitest";
import {
  advanceWolfCombat,
  WOLF_COMBAT_TUNING,
  resolveWolfLungeOutcome,
  type WolfCombatRuntime,
} from "./wolf-combat";

function runtime(overrides: Partial<WolfCombatRuntime> = {}): WolfCombatRuntime {
  return {
    state: "prowl",
    stateElapsedMs: 0,
    position: { x: 0, y: 0 },
    lockedDirection: null,
    lungeDistancePx: 0,
    circleSign: 1,
    ...overrides,
  };
}

describe("wolf combat pressure loop", () => {
  it("notices the player at outer pressure range and starts stalking", () => {
    const next = advanceWolfCombat({
      wolf: runtime(),
      player: { x: WOLF_COMBAT_TUNING.stalkRadiusPx - 8, y: 0 },
      dtMs: 100,
    });

    expect(next.state).toBe("stalk");
    expect(next.feedback).toBe("noticed_player");
  });

  it("circles instead of immediately biting once inside pressure distance", () => {
    const next = advanceWolfCombat({
      wolf: runtime({ state: "stalk", stateElapsedMs: 500 }),
      player: { x: WOLF_COMBAT_TUNING.circleRadiusPx - 4, y: 0 },
      dtMs: 100,
    });

    expect(next.state).toBe("circle");
    expect(next.feedback).toBe("circle_started");
  });

  it("telegraphs a lunge before committing to a locked direction", () => {
    const next = advanceWolfCombat({
      wolf: runtime({ state: "circle", stateElapsedMs: WOLF_COMBAT_TUNING.circleCommitMs - 50 }),
      player: { x: WOLF_COMBAT_TUNING.lungeTriggerRadiusPx - 4, y: 0 },
      dtMs: 80,
    });

    expect(next.state).toBe("lunge_windup");
    expect(next.feedback).toBe("lunge_windup_started");
    expect(next.lockedDirection).toEqual({ x: 1, y: 0 });
  });

  it("keeps lunge windup reaction-readable before active movement", () => {
    const next = advanceWolfCombat({
      wolf: runtime({
        state: "lunge_windup",
        stateElapsedMs: WOLF_COMBAT_TUNING.lungeWindupMs - 40,
        lockedDirection: { x: 1, y: 0 },
      }),
      player: { x: 12, y: 0 },
      dtMs: 20,
    });

    expect(WOLF_COMBAT_TUNING.lungeWindupMs).toBeGreaterThanOrEqual(360);
    expect(next.state).toBe("lunge_windup");
  });

  it("enters recovery after a hit, a clean miss, or reaching max lunge distance", () => {
    expect(resolveWolfLungeOutcome({ hitPlayer: true, lungeDistancePx: 10 })).toBe("hit");
    expect(resolveWolfLungeOutcome({ hitPlayer: false, lungeDistancePx: WOLF_COMBAT_TUNING.lungeMaxDistancePx })).toBe("miss");

    const recovered = advanceWolfCombat({
      wolf: runtime({ state: "recover", stateElapsedMs: WOLF_COMBAT_TUNING.recoverMs - 10 }),
      player: { x: 240, y: 0 },
      dtMs: 20,
    });
    expect(recovered.state).toBe("prowl");
  });
});
