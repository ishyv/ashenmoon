import { describe, expect, it } from "vitest";
import { advanceBoarChargeBody, boarChargeContactsPlayer, buildBoarChargeOutcomeFeedback } from "$lib/core/systems/animals/boar-combat-system";

describe("boar combat runtime movement", () => {
  it("moves along the locked charge direction instead of homing toward the player", () => {
    const result = advanceBoarChargeBody({
      position: { x: 0, y: 0 },
      lockedDirection: { x: 1, y: 0 },
      speedPxPerSec: 100,
      dtSec: 0.5,
      collides: () => false,
    });

    expect(result.outcome).toBe("continue");
    expect(result.position).toEqual({ x: 50, y: 0 });
    expect(result.distanceMovedPx).toBe(50);
  });

  it("crashes instead of sliding through solid obstacles", () => {
    const result = advanceBoarChargeBody({
      position: { x: 0, y: 0 },
      lockedDirection: { x: 1, y: 0 },
      speedPxPerSec: 100,
      dtSec: 0.5,
      collides: ({ x }) => x >= 50,
    });

    expect(result.outcome).toBe("crash");
    expect(result.position).toEqual({ x: 0, y: 0 });
    expect(result.distanceMovedPx).toBe(0);
  });

  it("uses the supplied max charge distance for miss timing", () => {
    const result = advanceBoarChargeBody({
      position: { x: 0, y: 0 },
      lockedDirection: { x: 1, y: 0 },
      speedPxPerSec: 100,
      dtSec: 0.4,
      distanceMovedPx: 60,
      maxDistancePx: 100,
      collides: () => false,
    });

    expect(result.outcome).toBe("miss");
    expect(result.distanceMovedPx).toBe(100);
  });

  it("only contacts the player when the charging body reaches them", () => {
    expect(boarChargeContactsPlayer({ boarCenter: { x: 0, y: 0 }, playerCenter: { x: 120, y: 0 } })).toBe(false);
    expect(boarChargeContactsPlayer({ boarCenter: { x: 0, y: 0 }, playerCenter: { x: 24, y: 10 } })).toBe(true);
  });

  it("gives the player readable outcome feedback for dodges and crashes", () => {
    expect(buildBoarChargeOutcomeFeedback("miss")?.tone).toBe("good");
    expect(buildBoarChargeOutcomeFeedback("miss")?.message).toContain("overcommits");
    expect(buildBoarChargeOutcomeFeedback("crash")?.message).toContain("crashes");
    expect(buildBoarChargeOutcomeFeedback("continue")).toBeNull();
  });
});
