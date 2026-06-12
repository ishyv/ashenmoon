import { describe, expect, it } from "vitest";
import {
  chargeProgressFromHeldMs,
  DEFAULT_FELL_SWEEP_CONFIG,
  fellSweepCooldown,
  fellSweepCost,
  fellSweepMoveMultiplier,
  fellSweepScaling,
  fellSweepStage,
  trackFellSweepWhirl,
  smoothFellSweepAim,
} from "./fell-sweep";

describe("Fell Sweep charge rules", () => {
  it("maps held time to charge progress using the configured charge window", () => {
    expect(chargeProgressFromHeldMs(199)).toBe(0);
    expect(chargeProgressFromHeldMs(200)).toBe(0);
    expect(chargeProgressFromHeldMs(1600)).toBeCloseTo(0.5);
    expect(chargeProgressFromHeldMs(3000)).toBe(1);
    expect(chargeProgressFromHeldMs(3600)).toBe(1);
  });

  it("maps progress to readable charge stages", () => {
    expect(fellSweepStage(0)).toBe("none");
    expect(fellSweepStage(0.1)).toBe("bracing");
    expect(fellSweepStage(0.4)).toBe("building");
    expect(fellSweepStage(0.75)).toBe("critical");
    expect(fellSweepStage(1)).toBe("full");
  });

  it("preserves current damage, reach, arc, and knockback scaling endpoints", () => {
    const combatConfig = {
      damage: 25,
      reach: 64,
      arcHalfAngle: Math.PI / 6,
      knockback: 240,
    };

    expect(fellSweepScaling(0, combatConfig)).toEqual({
      damage: 45,
      reach: 64 * 1.2,
      arcHalfAngle: Math.PI / 6,
      knockback: 240 * 1.5,
    });
    expect(fellSweepScaling(1, combatConfig)).toEqual({
      damage: 75,
      reach: 64 * 1.5,
      arcHalfAngle: (Math.PI / 6) * 1.3,
      knockback: 240 * 2.5,
    });
  });

  it("preserves current stamina cost and cooldown level scaling", () => {
    expect(fellSweepCost(1)).toBe(20);
    expect(fellSweepCost(11)).toBe(10);
    expect(fellSweepCost(30)).toBe(10);
    expect(fellSweepCooldown(1)).toBe(8);
    expect(fellSweepCooldown(6)).toBe(6);
    expect(fellSweepCooldown(20)).toBe(4);
  });

  it("lerps movement commitment from light to heavy slow", () => {
    expect(fellSweepMoveMultiplier(0)).toBe(DEFAULT_FELL_SWEEP_CONFIG.chargeMoveSpeedMinMultiplier);
    expect(fellSweepMoveMultiplier(0.5)).toBeCloseTo(0.65);
    expect(fellSweepMoveMultiplier(1)).toBe(DEFAULT_FELL_SWEEP_CONFIG.chargeMoveSpeedMaxMultiplier);
  });

  it("updates aim more slowly at high charge", () => {
    const current = { x: 1, y: 0 };
    const target = { x: 0, y: 1 };

    const low = smoothFellSweepAim(current, target, 0);
    const high = smoothFellSweepAim(current, target, 1);

    expect(low.y).toBeGreaterThan(high.y);
    expect(Math.hypot(low.x, low.y)).toBeCloseTo(1);
    expect(Math.hypot(high.x, high.y)).toBeCloseTo(1);
  });

  it("tracks mouse angular travel across the wraparound seam", () => {
    const state = {
      ...DEFAULT_FELL_SWEEP_CONFIG,
    };
    const tracked = trackFellSweepWhirl(
      {
        isWhirlReady: false,
        whirlAngularTravelRad: 0,
        lastWhirlAimAngleRad: Math.PI - 0.05,
      },
      -Math.PI + 0.05,
    );

    expect(tracked.whirlAngularTravelRad).toBeCloseTo(0.1);
    expect(tracked.isWhirlReady).toBe(false);
    expect(state.whirlRequiredTurnRad).toBeCloseTo(Math.PI * 2);
  });

  it("arms whirl mode after a full 360-degree mouse turn", () => {
    let state = {
      isWhirlReady: false,
      whirlAngularTravelRad: 0,
      lastWhirlAimAngleRad: 0,
    };

    for (const angle of [Math.PI / 2, Math.PI, -Math.PI / 2, 0]) {
      state = trackFellSweepWhirl(state, angle);
    }

    expect(state.whirlAngularTravelRad).toBeCloseTo(Math.PI * 2);
    expect(state.isWhirlReady).toBe(true);
  });

  it("scales Fell Sweep into full-circle whirl damage when armed", () => {
    const combatConfig = {
      damage: 25,
      reach: 64,
      arcHalfAngle: Math.PI / 6,
      knockback: 240,
    };

    expect(fellSweepScaling(1, combatConfig, DEFAULT_FELL_SWEEP_CONFIG, true)).toEqual({
      damage: 98,
      reach: 64 * 1.5 * 1.2,
      arcHalfAngle: Math.PI,
      knockback: 240 * 2.5 * 1.35,
    });
  });
});
