import { describe, expect, it } from "vitest";
import { estimateFocusedGatherFeasibility } from "./focused-gather-feasibility";
import { FOCUSED_GATHER_PROFILES } from "./focused-gather-profiles";
import type { FocusedGatherTarget } from "./focused-gather-types";

function target(id: string, orderIndex: number, x: number, y: number, spawnAtMs: number, expiresAtMs: number): FocusedGatherTarget {
  return {
    id,
    orderIndex,
    spawnAtMs,
    expiresAtMs,
    position: { x, y },
    radius: 18,
    movement: "static",
    state: "pending",
  };
}

describe("estimateFocusedGatherFeasibility", () => {
  it("rejects patterns that require more travel and reaction time than they allow", () => {
    const profile = { ...FOCUSED_GATHER_PROFILES.medium, targetLifetimeMs: 500 };
    const targets = [
      target("t0", 0, 0, 0, 0, 500),
      target("t1", 1, 800, 0, 0, 500),
      target("t2", 2, 1600, 0, 0, 500),
    ];

    const result = estimateFocusedGatherFeasibility(targets, profile);

    expect(result.feasible).toBe(false);
    expect(result.totalDistancePx).toBe(1600);
    expect(result.estimatedRequiredTimeMs).toBeGreaterThan(result.availableTimeMs);
  });

  it("accepts patterns whose ordered travel fits inside available time", () => {
    const profile = FOCUSED_GATHER_PROFILES.medium;
    const targets = [
      target("t0", 0, 0, 0, 0, 1400),
      target("t1", 1, 46, 0, 300, 1700),
      target("t2", 2, 46, 46, 600, 2000),
    ];

    const result = estimateFocusedGatherFeasibility(targets, profile);

    expect(result.feasible).toBe(true);
    expect(result.difficultyScore).toBeGreaterThan(0);
    expect(result.difficultyScore).toBeLessThanOrEqual(1);
  });
});
