import { describe, expect, it } from "vitest";
import { ACTION_FEEDBACK, getActionFeedback } from "./action-feedback";

describe("action feedback", () => {
  it("defines layered feedback for waking the campfire", () => {
    const feedback = getActionFeedback("campfire_wake");

    expect(feedback?.floatingText).toBe("fire wakes");
    expect(feedback?.particles).toBe("smoke");
    expect(feedback?.sound).toBe("campfire.light");
  });

  it("keeps every action feedback player-readable", () => {
    for (const feedback of Object.values(ACTION_FEEDBACK)) {
      expect(feedback.toast.length).toBeGreaterThan(0);
      expect(feedback.toast.length).toBeLessThanOrEqual(96);
    }
  });
});
