import { describe, expect, test } from "vitest";
import { parseScriptDraft, parseScriptRunInput } from "./script-parsers";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe("parseScriptDraft", () => {
  test("parses manual scripts with deduped capabilities", () => {
    expect(
      parseScriptDraft(
        form({
          source: "return 1;",
          description: "count",
          capabilities: "roles,messaging,roles",
          enabled: "on",
          triggerKind: "manual",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        source: "return 1;",
        description: "count",
        capabilities: ["roles", "messaging"],
        enabled: true,
        trigger: { kind: "manual" },
        reportChannelId: null,
      },
    });
  });

  test("rejects unknown capabilities", () => {
    expect(parseScriptDraft(form({ source: "return 1;", capabilities: "roles,ban" }))).toEqual({
      ok: false,
      error: "unknown capabilities: ban.",
      field: "capabilities",
    });
  });

  test("parses schedule triggers", () => {
    expect(
      parseScriptDraft(
        form({
          source: "return 1;",
          triggerKind: "schedule",
          intervalHours: "6",
          reportChannelId: "channel-1",
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        source: "return 1;",
        description: "",
        capabilities: [],
        enabled: false,
        trigger: { kind: "schedule", intervalHours: 6 },
        reportChannelId: "channel-1",
      },
    });
  });
});

describe("parseScriptRunInput", () => {
  test("parses input values and optional context channel", () => {
    expect(
      parseScriptRunInput(
        form({
          inputs: JSON.stringify({ role: "r-vet", amount: "2" }),
          channelId: "channel-1",
        }),
      ),
    ).toEqual({
      ok: true,
      value: { input: { role: "r-vet", amount: "2" }, channelId: "channel-1" },
    });
  });

  test("rejects malformed input JSON", () => {
    expect(parseScriptRunInput(form({ inputs: "{" }))).toEqual({
      ok: false,
      error: "inputs must be valid JSON.",
      field: "inputs",
    });
  });
});
