import { describe, expect, it } from "vitest";
import { AUDIO_MAX_DISTANCE, playsInWindow, shouldThrottle, spatialGainPan } from "./spatial";

describe("spatialGainPan", () => {
  it("is full gain, centered, at the listener", () => {
    const { gain, pan } = spatialGainPan({ x: 100, y: 100 }, { x: 100, y: 100 });
    expect(gain).toBe(1);
    expect(pan).toBe(0);
  });

  it("falls to zero gain at/beyond max distance", () => {
    const far = spatialGainPan({ x: 0, y: 0 }, { x: AUDIO_MAX_DISTANCE, y: 0 });
    expect(far.gain).toBe(0);
    const beyond = spatialGainPan({ x: 0, y: 0 }, { x: AUDIO_MAX_DISTANCE * 2, y: 0 });
    expect(beyond.gain).toBe(0);
  });

  it("pans right for sounds to the right, left for sounds to the left, clamped", () => {
    expect(spatialGainPan({ x: 0, y: 0 }, { x: 10000, y: 0 }).pan).toBe(1);
    expect(spatialGainPan({ x: 0, y: 0 }, { x: -10000, y: 0 }).pan).toBe(-1);
    expect(spatialGainPan({ x: 0, y: 0 }, { x: 0, y: 50 }).pan).toBe(0);
  });

  it("attenuates with distance (monotonic, squared falloff)", () => {
    const near = spatialGainPan({ x: 0, y: 0 }, { x: 100, y: 0 }).gain;
    const mid = spatialGainPan({ x: 0, y: 0 }, { x: 300, y: 0 }).gain;
    expect(near).toBeGreaterThan(mid);
    expect(mid).toBeGreaterThan(0);
  });
});

describe("shouldThrottle", () => {
  it("never throttles when no throttleMs is set", () => {
    expect(shouldThrottle(new Map([["a", 1000]]), "a", undefined, 1001)).toBe(false);
  });

  it("throttles a retrigger inside the window and allows it after", () => {
    const last = new Map([["a", 1000]]);
    expect(shouldThrottle(last, "a", 60, 1040)).toBe(true);
    expect(shouldThrottle(last, "a", 60, 1080)).toBe(false);
  });

  it("does not throttle a sound that has never played", () => {
    expect(shouldThrottle(new Map(), "a", 60, 5000)).toBe(false);
  });
});

describe("playsInWindow", () => {
  it("counts only timestamps within the window", () => {
    expect(playsInWindow([950, 980, 1000], 1010, 60)).toBe(2);
    expect(playsInWindow([], 1000, 60)).toBe(0);
  });
});
