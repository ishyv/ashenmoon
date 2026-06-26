import { describe, expect, it } from "vitest";
import { classifyInputIntent, DEFAULT_INPUT_INTENT_CONFIG, type AttackInputSnapshot } from "./input-intent";

const cursor = { x: 1, y: 0 };

function snap(overrides: Partial<AttackInputSnapshot>): AttackInputSnapshot {
  return {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    downAtMs: 0,
    upAtMs: 0,
    clickDirection: cursor,
    stanceHeld: false,
    ...overrides,
  };
}

describe("classifyInputIntent", () => {
  it("classifies a short, still click as a tap aimed at the cursor", () => {
    const intent = classifyInputIntent(snap({ upAtMs: 100 }));
    expect(intent.kind).toBe("tap");
    expect(intent.direction).toEqual(cursor);
  });

  it("classifies a long still press as a hold", () => {
    const intent = classifyInputIntent(snap({ upAtMs: 400 }));
    expect(intent.kind).toBe("hold");
  });

  it("classifies a fast drag as a swipe using the drag direction", () => {
    const intent = classifyInputIntent(snap({ end: { x: 0, y: 80 }, upAtMs: 120 }));
    expect(intent.kind).toBe("swipe");
    expect(intent.direction.y).toBeCloseTo(1);
  });

  it("classifies a slow deliberate drag as a swipe", () => {
    // Below speed threshold but past swipeMinHoldMs and distance.
    const intent = classifyInputIntent(snap({ end: { x: 80, y: 0 }, upAtMs: 600 }));
    expect(intent.kind).toBe("swipe");
  });

  it("treats jitter inside the deadzone as a tap, not a swipe", () => {
    const intent = classifyInputIntent(snap({ end: { x: 6, y: 0 }, upAtMs: 100 }));
    expect(intent.kind).toBe("tap");
  });

  it("promotes gestures to stance variants when the modifier is held", () => {
    expect(classifyInputIntent(snap({ upAtMs: 100, stanceHeld: true })).kind).toBe("stance_tap");
    expect(classifyInputIntent(snap({ upAtMs: 400, stanceHeld: true })).kind).toBe("stance_hold");
    expect(
      classifyInputIntent(snap({ end: { x: 0, y: 80 }, upAtMs: 120, stanceHeld: true })).kind,
    ).toBe("stance_swipe");
  });

  it("uses the configured thresholds", () => {
    const fast = { ...DEFAULT_INPUT_INTENT_CONFIG, holdMinDurationMs: 50 };
    expect(classifyInputIntent(snap({ upAtMs: 100 }), fast).kind).toBe("hold");
  });
});
