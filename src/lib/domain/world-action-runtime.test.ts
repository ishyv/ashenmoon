import { describe, expect, it } from "vitest";
import { createWorldActionRuntime, tickWorldActionRuntime } from "$lib/domain/world-action-runtime";
import type { WorldActionOption } from "$lib/domain/world-actions";

const action: WorldActionOption = {
  id: "harvest_meat",
  label: "harvest meat",
  durationSec: 5,
  requirements: [],
  feedback: {
    start: "start",
    success: "done",
    failure: "fail",
  },
  executeIntent: { kind: "carcass.process", targetId: "carcass_1" },
};

describe("world action runtime", () => {
  it("honors duration and completes once", () => {
    const runtime = createWorldActionRuntime(action);

    const partial = tickWorldActionRuntime(runtime, 3);
    expect(partial.completed).toBe(false);
    expect(partial.remainingSec).toBe(2);

    const complete = tickWorldActionRuntime(partial, 3);
    expect(complete.completed).toBe(true);
    expect(complete.remainingSec).toBe(0);

    const stillComplete = tickWorldActionRuntime(complete, 3);
    expect(stillComplete).toBe(complete);
  });
});
