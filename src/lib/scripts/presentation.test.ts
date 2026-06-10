import { describe, expect, it } from "vitest";
import { operationSummary, triggerSummary } from "./presentation";

describe("script workspace presentation", () => {
  it("summarizes triggers in compact workspace copy", () => {
    expect(triggerSummary({ kind: "manual" })).toBe("manual");
    expect(triggerSummary({ kind: "schedule", intervalHours: 12 })).toBe("every 12h");
    expect(triggerSummary({ kind: "event", event: "member-join" })).toBe("member join");
  });

  it("formats operations as readable plan rows instead of primary raw JSON", () => {
    expect(operationSummary({ kind: "remove_role", userId: "u1", role: "Veteran" })).toEqual({
      label: "remove role",
      detail: "u1 -> Veteran",
    });
    expect(
      operationSummary({ kind: "create_channel", name: "rules", channelType: "text" }),
    ).toEqual({
      label: "create channel",
      detail: "rules · text",
    });
  });
});
