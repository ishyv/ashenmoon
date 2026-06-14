import { describe, expect, it } from "vitest";
import {
  checkGatherTool,
  gatherInterval,
  matchesToolKind,
  requiredToolKind,
  toolKindOf,
} from "./gather-system";

describe("tool kinds", () => {
  it("maps actions to required tool kinds", () => {
    expect(requiredToolKind("mine")).toBe("pickaxe");
    expect(requiredToolKind("chop")).toBe("axe");
  });

  it("classifies tool ids, keeping pickaxe and axe distinct", () => {
    expect(toolKindOf("flint_pickaxe")).toBe("pickaxe");
    expect(toolKindOf("flint_axe")).toBe("axe");
    expect(toolKindOf("wood")).toBeNull();
    expect(matchesToolKind("flint_pickaxe", "axe")).toBe(false);
  });
});

describe("checkGatherTool", () => {
  it("blocks with no tool", () => {
    expect(checkGatherTool(null, "axe")).toEqual({ ok: false, reason: "no_tool", requiredKind: "axe" });
  });
  it("blocks the wrong tool", () => {
    expect(checkGatherTool("flint_pickaxe", "axe")).toEqual({ ok: false, reason: "wrong_tool", requiredKind: "axe" });
  });
  it("allows the right tool", () => {
    expect(checkGatherTool("flint_axe", "axe")).toEqual({ ok: true });
  });
});

describe("scaling", () => {
  it("speeds up gathering with skill, floored at 0.15s", () => {
    expect(gatherInterval(0.6, 1)).toBeCloseTo(0.6);
    expect(gatherInterval(0.6, 5)).toBeCloseTo(0.6 * 0.95 ** 4);
    expect(gatherInterval(0.6, 100)).toBe(0.15);
  });
});
