import { describe, expect, it } from "vitest";
import { gradeFromScore, scoreSession } from "./focused-gather-scoring";
import { createSession } from "./focused-gather-session";
import { FOCUSED_GATHER_PROFILES } from "./focused-gather-profiles";
import type { FocusedGatherSession, FocusedGatherTarget } from "./focused-gather-types";

function target(orderIndex: number, state: FocusedGatherTarget["state"], timingQuality?: number): FocusedGatherTarget {
  return {
    id: `t${orderIndex}`,
    orderIndex,
    spawnAtMs: 0,
    expiresAtMs: 1000,
    position: { x: 0, y: 0 },
    radius: 20,
    movement: "static",
    state,
    timingQuality,
  };
}

function session(targets: FocusedGatherTarget[], counters: Partial<FocusedGatherSession>): FocusedGatherSession {
  const base = createSession(FOCUSED_GATHER_PROFILES.easy, "n", { x: 0, y: 0 }, targets, 0);
  return { ...base, targets, ...counters };
}

describe("gradeFromScore", () => {
  it("maps the five bands at their boundaries", () => {
    expect(gradeFromScore(0.95)).toBe("excellent");
    expect(gradeFromScore(0.9)).toBe("excellent");
    expect(gradeFromScore(0.7)).toBe("good");
    expect(gradeFromScore(0.45)).toBe("average");
    expect(gradeFromScore(0.2)).toBe("poor");
    expect(gradeFromScore(0.1)).toBe("ruined");
  });
});

describe("scoreSession", () => {
  it("scores a flawless instant run near 1", () => {
    const targets = [target(0, "hit", 1), target(1, "hit", 1)];
    const s = session(targets, { successfulHits: 2, completedAtMs: 0 });
    const score = scoreSession(s, 0);
    expect(score.finalScore).toBeGreaterThanOrEqual(0.99);
    expect(gradeFromScore(score.finalScore)).toBe("excellent");
  });

  it("scores an all-missed run at 0", () => {
    const targets = [target(0, "missed"), target(1, "missed")];
    const s = session(targets, { missedTargets: 2, completedAtMs: 1000 });
    const score = scoreSession(s, 1000);
    expect(score.finalScore).toBe(0);
    expect(gradeFromScore(score.finalScore)).toBe("ruined");
  });

  it("docks the score for wrong clicks", () => {
    const targets = [target(0, "hit", 1), target(1, "hit", 1)];
    const clean = scoreSession(session(targets, { successfulHits: 2, completedAtMs: 0 }), 0);
    const sloppy = scoreSession(
      session(targets, { successfulHits: 2, wrongClicks: 4, completedAtMs: 0 }),
      0,
    );
    expect(sloppy.finalScore).toBeLessThan(clean.finalScore);
  });
});
