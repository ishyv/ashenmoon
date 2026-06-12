import { describe, expect, it } from "vitest";
import {
  DEFAULT_DRIVING_THRUST_CONFIG,
  DEFAULT_POINTER_ATTACK_INTENT_CONFIG,
  canStartDrivingThrust,
  classifyPointerAttackIntent,
  computeCollisionClippedTravelDistance,
  getDrivingThrustDistancePx,
  getPointerAttackArmedIntent,
  isPointInsideDrivingThrustCapsule,
  resolveDrivingThrustSwipe,
} from "./driving-thrust";

describe("Driving Thrust domain rules", () => {
  it("rejects tiny swipes", () => {
    const result = resolveDrivingThrustSwipe({
      screenStart: { x: 100, y: 100 },
      screenEnd: { x: 120, y: 100 },
      worldStart: { x: 10, y: 10 },
      worldEnd: { x: 30, y: 10 },
      config: DEFAULT_DRIVING_THRUST_CONFIG,
    });

    expect(result.triggered).toBe(false);
    if (result.triggered) throw new Error("expected tiny swipe to be rejected");
    expect(result.reason).toBe("too_short");
  });

  it("normalizes a valid short swipe direction in world space", () => {
    const result = resolveDrivingThrustSwipe({
      screenStart: { x: 100, y: 100 },
      screenEnd: { x: 140, y: 140 },
      worldStart: { x: 10, y: 10 },
      worldEnd: { x: 30, y: 30 },
      config: DEFAULT_DRIVING_THRUST_CONFIG,
    });

    expect(result.triggered).toBe(true);
    if (!result.triggered) throw new Error("expected swipe to trigger");
    expect(result.direction.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(result.direction.y).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it("clamps very long swipe distance for validation but keeps direction", () => {
    const result = resolveDrivingThrustSwipe({
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 2000, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 2000, y: 0 },
      config: DEFAULT_DRIVING_THRUST_CONFIG,
    });

    expect(result.triggered).toBe(true);
    if (!result.triggered) throw new Error("expected long swipe to trigger");
    expect(result.swipeDistancePx).toBe(DEFAULT_DRIVING_THRUST_CONFIG.maxSwipeDistancePx);
    expect(result.direction).toEqual({ x: 1, y: 0 });
  });

  it("scales thrust distance by Combat level and clamps at max", () => {
    expect(getDrivingThrustDistancePx(DEFAULT_DRIVING_THRUST_CONFIG, 1)).toBe(140);
    expect(getDrivingThrustDistancePx(DEFAULT_DRIVING_THRUST_CONFIG, 5)).toBe(172);
    expect(getDrivingThrustDistancePx(DEFAULT_DRIVING_THRUST_CONFIG, 99)).toBe(220);
  });

  it("checks a capsule hitbox by path length and width", () => {
    const hitbox = {
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      lengthPx: 140,
      widthPx: 42,
    };

    expect(isPointInsideDrivingThrustCapsule(hitbox, { x: 70, y: 20 }, 0)).toBe(true);
    expect(isPointInsideDrivingThrustCapsule(hitbox, { x: 70, y: 23 }, 0)).toBe(false);
    expect(isPointInsideDrivingThrustCapsule(hitbox, { x: 150, y: 0 }, 0)).toBe(false);
    expect(isPointInsideDrivingThrustCapsule(hitbox, { x: 148, y: 0 }, 8)).toBe(true);
  });

  it("blocks attempts during cooldown or when stamina is below the minimum", () => {
    expect(canStartDrivingThrust({
      nowMs: 1000,
      cooldownUntilMs: 1500,
      currentStamina: 100,
      config: DEFAULT_DRIVING_THRUST_CONFIG,
    })).toEqual({ ok: false, reason: "cooldown" });

    expect(canStartDrivingThrust({
      nowMs: 1000,
      cooldownUntilMs: 0,
      currentStamina: 8,
      config: DEFAULT_DRIVING_THRUST_CONFIG,
    })).toEqual({ ok: false, reason: "insufficient_stamina" });
  });

  it("clips travel distance at the first blocking collision", () => {
    const distance = computeCollisionClippedTravelDistance({
      origin: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      intendedDistancePx: 140,
      stepPx: 10,
      collidesAt: (x) => x >= 65,
    });

    expect(distance).toBe(60);
  });
});

describe("Pointer attack intent classifier", () => {
  const clickDirection = { x: 1, y: 0 };
  const config = DEFAULT_POINTER_ATTACK_INTENT_CONFIG;

  it("classifies fast clicks with tiny movement as basic attacks", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 110, y: 104 },
        downAtMs: 1000,
        upAtMs: 1080,
      },
      clickDirection,
      config,
    });

    expect(result).toEqual({ kind: "basic_attack", direction: clickDirection });
  });

  it("classifies fast clicks with moderate jitter as basic attacks", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 145, y: 100 },
        downAtMs: 1000,
        upAtMs: 1070,
      },
      clickDirection,
      config,
    });

    expect(result).toEqual({ kind: "basic_attack", direction: clickDirection });
  });

  it("classifies short movement below thrust distance as a basic attack fallback", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 145, y: 100 },
        downAtMs: 1000,
        upAtMs: 1160,
      },
      clickDirection,
      config,
    });

    expect(result).toEqual({ kind: "basic_attack", direction: clickDirection });
  });

  it("classifies a quick deliberate drag as Driving Thrust", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 160, y: 100 },
        downAtMs: 1000,
        upAtMs: 1180,
      },
      clickDirection,
      config,
    });

    expect(result).toEqual({ kind: "driving_thrust", direction: { x: 1, y: 0 } });
  });

  it("does not classify slow long drags as Driving Thrust", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 170, y: 100 },
        downAtMs: 1000,
        upAtMs: 1700,
      },
      clickDirection,
      config,
    });

    expect(result.kind).not.toBe("driving_thrust");
  });

  it("classifies long held drags as full swipe before thrust", () => {
    const result = classifyPointerAttackIntent({
      input: {
        start: { x: 100, y: 100 },
        end: { x: 160, y: 100 },
        downAtMs: 1000,
        upAtMs: 1600,
      },
      clickDirection,
      config,
    });

    expect(result).toEqual({ kind: "full_swipe", direction: { x: 1, y: 0 }, holdDurationMs: 600 });
  });

  it("only arms Driving Thrust after hold, distance, and speed thresholds are met", () => {
    expect(getPointerAttackArmedIntent({
      start: { x: 100, y: 100 },
      current: { x: 160, y: 100 },
      downAtMs: 1000,
      nowMs: 1080,
      config,
    })).toBe("none");

    expect(getPointerAttackArmedIntent({
      start: { x: 100, y: 100 },
      current: { x: 160, y: 100 },
      downAtMs: 1000,
      nowMs: 1180,
      config,
    })).toBe("driving_thrust");
  });
});
