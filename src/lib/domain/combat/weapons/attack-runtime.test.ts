import { describe, expect, it } from "vitest";
import { phaseAtElapsed } from "./attack-runtime";
import type { AttackPlan } from "./attack-resolution";

const plan = {
  windupMs: 100,
  activeMs: 80,
  recoveryMs: 200,
} as AttackPlan;

describe("phaseAtElapsed", () => {
  it("walks windup → active → recovery → done across the timeline", () => {
    expect(phaseAtElapsed(plan, 0)).toBe("windup");
    expect(phaseAtElapsed(plan, 99)).toBe("windup");
    expect(phaseAtElapsed(plan, 100)).toBe("active");
    expect(phaseAtElapsed(plan, 179)).toBe("active");
    expect(phaseAtElapsed(plan, 180)).toBe("recovery");
    expect(phaseAtElapsed(plan, 379)).toBe("recovery");
    expect(phaseAtElapsed(plan, 380)).toBe("done");
  });
});
