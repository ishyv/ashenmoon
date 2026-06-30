import { describe, expect, it } from "vitest";
import { advanceWolfLungeBody, buildWolfOutcomeFeedback, shouldWolfCombatOwnTick, wolfLungeContactsPlayer } from "$lib/core/systems/animals/wolf-combat-system";
import { WOLF_COMBAT_TUNING, type WolfCombatRuntime } from "$lib/domain/combat/enemies/wolf-combat";

describe("wolf combat runtime movement", () => {
  it("lunges along the locked direction instead of homing late", () => {
    const result = advanceWolfLungeBody({
      position: { x: 0, y: 0 },
      lockedDirection: { x: 1, y: 0 },
      speedPxPerSec: 120,
      dtSec: 0.25,
      collides: () => false,
    });

    expect(result.outcome).toBe("continue");
    expect(result.position).toEqual({ x: 30, y: 0 });
    expect(result.distanceMovedPx).toBe(30);
  });

  it("turns obstacle contact into a miss/recovery rather than sliding through terrain", () => {
    const result = advanceWolfLungeBody({
      position: { x: 0, y: 0 },
      lockedDirection: { x: 1, y: 0 },
      speedPxPerSec: 120,
      dtSec: 0.25,
      collides: ({ x }) => x >= 30,
    });

    expect(result.outcome).toBe("miss");
    expect(result.position).toEqual({ x: 0, y: 0 });
  });

  it("only contacts the player when the lunge body reaches contact distance", () => {
    expect(wolfLungeContactsPlayer({ wolfCenter: { x: 0, y: 0 }, playerCenter: { x: 90, y: 0 } })).toBe(false);
    expect(wolfLungeContactsPlayer({ wolfCenter: { x: 0, y: 0 }, playerCenter: { x: WOLF_COMBAT_TUNING.contactRadiusPx - 2, y: 0 } })).toBe(true);
  });

  it("lets distant wolves keep using ecology until the player enters pressure range", () => {
    const activeRuntime: WolfCombatRuntime = {
      state: "circle",
      stateElapsedMs: 100,
      position: { x: 0, y: 0 },
      lockedDirection: null,
      lungeDistancePx: 0,
      circleSign: 1,
    };

    expect(shouldWolfCombatOwnTick({ existingRuntime: null, playerDistancePx: WOLF_COMBAT_TUNING.stalkRadiusPx + 20 })).toBe(false);
    expect(shouldWolfCombatOwnTick({ existingRuntime: null, playerDistancePx: WOLF_COMBAT_TUNING.stalkRadiusPx - 4 })).toBe(true);
    expect(shouldWolfCombatOwnTick({ existingRuntime: activeRuntime, playerDistancePx: WOLF_COMBAT_TUNING.disengageRadiusPx + 40 })).toBe(true);
  });
});
