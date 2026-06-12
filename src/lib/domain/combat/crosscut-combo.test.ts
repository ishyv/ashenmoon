import { describe, expect, it } from "vitest";
import {
  advanceCrosscutChain,
  clearCrosscutState,
  createInitialCrosscutComboState,
  DEFAULT_CROSSCUT_COMBO_CONFIG,
  getAngleBetweenDegrees,
  getCrosscutGrade,
  storeFirstCrosscutClick,
  tryResolveCrosscutCombo,
} from "./crosscut-combo";

describe("Crosscut combo rules", () => {
  const config = DEFAULT_CROSSCUT_COMBO_CONFIG;

  function primedState(nowMs = 1000) {
    const state = createInitialCrosscutComboState();
    const stored = storeFirstCrosscutClick(state, {
      clickWorldPosition: { x: 100, y: 0 },
      playerPosition: { x: 0, y: 0 },
      nowMs,
      config,
    });
    expect(stored).toBe(true);
    return state;
  }

  it("calculates the smaller angle between normalized vectors in degrees", () => {
    expect(getAngleBetweenDegrees({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
    expect(getAngleBetweenDegrees({ x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });

  it("maps angle error into excellent, good, weak, and failed bands", () => {
    expect(getCrosscutGrade(0, config)).toBe("excellent");
    expect(getCrosscutGrade(12, config)).toBe("excellent");
    expect(getCrosscutGrade(24, config)).toBe("good");
    expect(getCrosscutGrade(36, config)).toBe("weak");
    expect(getCrosscutGrade(36.1, config)).toBeNull();
  });

  it("triggers excellent on an exact perpendicular second click", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({
      triggered: true,
      grade: "excellent",
      angleDegrees: 90,
      angleErrorDegrees: 0,
      damageMultiplier: config.effects.excellent.damageMultiplier,
      knockbackMultiplier: config.effects.excellent.knockbackMultiplier,
      bleedChancePct: config.effects.excellent.bleedChancePct,
      staminaCost: config.staminaCosts.excellent,
    });
  });

  it("triggers good on a near perpendicular second click", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 100, y: 373.205 },
      currentStamina: 100,
    });

    expect(result.triggered).toBe(true);
    expect(result.grade).toBe("good");
    expect(result.angleErrorDegrees).toBeCloseTo(15, 1);
  });

  it("triggers weak on a barely valid angle", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 57.735, y: 100 },
      currentStamina: 100,
    });

    expect(result.triggered).toBe(true);
    expect(result.grade).toBe("weak");
    expect(result.angleErrorDegrees).toBeCloseTo(30, 1);
  });

  it("does not trigger on a bad angle", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 200, y: 0 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({ triggered: false, reason: "bad_angle" });
  });

  it("does not store a first click too close to the player", () => {
    const state = createInitialCrosscutComboState();

    const stored = storeFirstCrosscutClick(state, {
      clickWorldPosition: { x: 12, y: 0 },
      playerPosition: { x: 0, y: 0 },
      nowMs: 1000,
      config,
    });

    expect(stored).toBe(false);
    expect(state.firstDirection).toBeNull();
  });

  it("does not trigger when the second click is too close to the player", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 12 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({ triggered: false, reason: "second_click_too_close" });
  });

  it("does not trigger when the two clicks are too close together", () => {
    const state = createInitialCrosscutComboState();
    storeFirstCrosscutClick(state, {
      clickWorldPosition: { x: 32, y: 40 },
      playerPosition: { x: 0, y: 0 },
      nowMs: 1000,
      config,
    });

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 40, y: 32 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({ triggered: false, reason: "clicks_too_close" });
  });

  it("expires after the combo window and reports expiry", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1701,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({ triggered: false, reason: "expired", expired: true });
  });

  it("does not trigger while cooldown is active", () => {
    const state = primedState();
    state.cooldownUntilMs = 1500;

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });

    expect(result).toMatchObject({ triggered: false, reason: "cooldown" });
  });

  it("still resolves when the player moved between clicks", () => {
    const state = primedState();

    const result = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1300,
      playerPosition: { x: 50, y: 50 },
      clickWorldPosition: { x: 50, y: 150 },
      currentStamina: 100,
    });

    expect(result.triggered).toBe(true);
    expect(result.grade).toBe("excellent");
  });

  it("supports clockwise and counterclockwise perpendicular clicks", () => {
    const clockwise = tryResolveCrosscutCombo({
      state: primedState(),
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });
    const counterClockwise = tryResolveCrosscutCombo({
      state: primedState(),
      config,
      nowMs: 1300,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: -100 },
      currentStamina: 100,
    });

    expect(clockwise.triggered).toBe(true);
    expect(counterClockwise.triggered).toBe(true);
  });

  it("clears starter fields without clearing cooldown", () => {
    const state = primedState();
    state.cooldownUntilMs = 2000;

    clearCrosscutState(state);

    expect(state.firstClickWorldPosition).toBeNull();
    expect(state.firstPlayerPosition).toBeNull();
    expect(state.firstDirection).toBeNull();
    expect(state.firstAttackAtMs).toBeNull();
    expect(state.cooldownUntilMs).toBe(2000);
  });

  it("advances crosscut chain on success, incrementing stacks and updating fields", () => {
    const state = primedState(1000);
    const res = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1200,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });
    expect(res.triggered).toBe(true);

    advanceCrosscutChain(state, {
      clickWorldPosition: { x: 0, y: 100 },
      playerPosition: { x: 0, y: 0 },
      nowMs: 1200,
    });

    expect(state.stacks).toBe(1);
    expect(state.firstDirection).toEqual({ x: 0, y: 1 });
    expect(state.firstAttackAtMs).toBe(1200);

    const res2 = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1400,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: -100, y: 0 },
      currentStamina: 100,
    });
    expect(res2.triggered).toBe(true);
    expect(res2.damageMultiplier).toBeCloseTo(config.effects.excellent.damageMultiplier + config.damageStackMultiplier, 2);
  });

  it("decays the combo window as stacks increase", () => {
    const state = primedState(1000);
    state.stacks = 2;

    const resValid = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1400,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });
    expect(resValid.triggered).toBe(true);

    const resExpired = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1500,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });
    expect(resExpired.triggered).toBe(false);
    expect(resExpired.reason).toBe("expired");
  });

  it("scales damage and bleeding effects based on stacks", () => {
    const state = primedState(1000);
    state.stacks = 3;

    const res = tryResolveCrosscutCombo({
      state,
      config,
      nowMs: 1200,
      playerPosition: { x: 0, y: 0 },
      clickWorldPosition: { x: 0, y: 100 },
      currentStamina: 100,
    });

    expect(res.triggered).toBe(true);
    expect(res.damageMultiplier).toBeCloseTo(1.65 + 3 * 0.15, 2);
    expect(res.bleedChancePct).toBe(35 + 3 * 10);
    expect(res.bleedDamagePerTick).toBe(3 + 3 * 1);
    expect(res.bleedImmediateDamage).toBe(3 + 3 * 1);
  });
});
