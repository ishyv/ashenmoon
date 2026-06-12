import { describe, expect, it } from "vitest";
import { FOCUSED_GATHER_PROFILES } from "./focused-gather-profiles";
import {
  createSession,
  finalizeSession,
  isComplete,
  registerClick,
  tickSession,
} from "./focused-gather-session";
import type { FocusedGatherTarget } from "./focused-gather-types";

function staticTarget(orderIndex: number, x: number, y: number): FocusedGatherTarget {
  return {
    id: `t${orderIndex}`,
    orderIndex,
    spawnAtMs: orderIndex * 100,
    expiresAtMs: orderIndex * 100 + 1000,
    position: { x, y },
    radius: 20,
    movement: "static",
    state: "pending",
  };
}

function makeSession() {
  return createSession(
    FOCUSED_GATHER_PROFILES.easy,
    "node-1",
    { x: 0, y: 0 },
    [staticTarget(0, 0, 0), staticTarget(1, 100, 0)],
    1000,
  );
}

describe("tickSession", () => {
  it("activates pending targets once their spawn time elapses", () => {
    const session = makeSession();
    tickSession(session, 1000); // elapsed 0 -> target 0 spawns
    expect(session.targets[0].state).toBe("active");
    expect(session.targets[1].state).toBe("pending");
    tickSession(session, 1150); // elapsed 150 -> target 1 spawns
    expect(session.targets[1].state).toBe("active");
  });

  it("marks targets missed past their window", () => {
    const session = makeSession();
    tickSession(session, 1000);
    tickSession(session, 1000 + 1001); // past target 0 expiry (0 + 1000)
    expect(session.targets[0].state).toBe("missed");
    expect(session.missedTargets).toBe(1);
  });
});

describe("registerClick", () => {
  it("counts an in-order hit on the expected target", () => {
    const session = makeSession();
    tickSession(session, 1000);
    const outcome = registerClick(session, { x: 0, y: 0 }, 1000);
    expect(outcome).toBe("hit");
    expect(session.targets[0].state).toBe("hit");
    expect(session.successfulHits).toBe(1);
    expect(session.committed).toBe(true);
  });

  it("records higher timing quality for an earlier hit", () => {
    const early = makeSession();
    tickSession(early, 1000);
    registerClick(early, { x: 0, y: 0 }, 1000); // full lifetime remaining
    const late = makeSession();
    tickSession(late, 1000);
    registerClick(late, { x: 0, y: 0 }, 1900); // 100ms of 1000 remaining
    expect(early.targets[0].timingQuality!).toBeGreaterThan(late.targets[0].timingQuality!);
  });

  it("treats clicking a later target out of order as a wrong click, not a hit", () => {
    const session = makeSession();
    tickSession(session, 1150); // both active
    const outcome = registerClick(session, { x: 100, y: 0 }, 1150); // clicked target 1, not 0
    expect(outcome).toBe("wrong");
    expect(session.wrongClicks).toBe(1);
    expect(session.targets[1].state).toBe("active");
  });

  it("ignores clicks when nothing is active", () => {
    const session = makeSession();
    expect(registerClick(session, { x: 0, y: 0 }, 1000)).toBe("ignored");
    expect(session.wrongClicks).toBe(0);
  });

  it("counts a click that hits empty space as wrong", () => {
    const session = makeSession();
    tickSession(session, 1000);
    expect(registerClick(session, { x: 500, y: 500 }, 1000)).toBe("wrong");
    expect(session.wrongClicks).toBe(1);
  });
});

describe("isComplete / finalizeSession", () => {
  it("is complete only once all targets are resolved", () => {
    const session = makeSession();
    tickSession(session, 1150);
    registerClick(session, { x: 0, y: 0 }, 1150);
    expect(isComplete(session)).toBe(false);
    registerClick(session, { x: 100, y: 0 }, 1150);
    expect(isComplete(session)).toBe(true);
  });

  it("marks unresolved targets missed on a committed cancel", () => {
    const session = makeSession();
    tickSession(session, 1000);
    registerClick(session, { x: 0, y: 0 }, 1000); // hit target 0
    finalizeSession(session, 1200, "cancelled");
    expect(session.state).toBe("cancelled");
    expect(session.targets[1].state).toBe("missed");
    expect(session.missedTargets).toBe(1);
  });
});
