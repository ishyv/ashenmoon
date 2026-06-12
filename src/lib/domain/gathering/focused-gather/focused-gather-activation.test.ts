import { describe, expect, it } from "vitest";
import { getGatherableDefinition } from "../gatherables";
import { resolveFocusedGatherActivation } from "./focused-gather-activation";

function def(id: string) {
  const value = getGatherableDefinition(id);
  if (!value) throw new Error(`missing gatherable ${id}`);
  return value;
}

const readyInput = {
  cooldownSec: 0,
  equippedToolId: "iron_pickaxe",
  hasUsableSource: true,
  playerDead: false,
  stamina: 100,
  zeroCooldowns: false,
};

describe("resolveFocusedGatherActivation", () => {
  it("starts for an eligible large material source", () => {
    const result = resolveFocusedGatherActivation({
      ...readyInput,
      def: def("stone_node"),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.profile.targetCount).toBeGreaterThan(0);
  });

  it("rejects small or non-solid sources with readable feedback", () => {
    const result = resolveFocusedGatherActivation({
      ...readyInput,
      def: def("berry_bush"),
    });

    expect(result).toEqual({
      ok: false,
      reason: "ineligible_source",
      message: "too small to focus",
      tone: "muted",
    });
  });

  it("blocks activation when the required tool is missing or wrong", () => {
    const missing = resolveFocusedGatherActivation({
      ...readyInput,
      def: def("oak_tree"),
      equippedToolId: null,
    });
    const wrong = resolveFocusedGatherActivation({
      ...readyInput,
      def: def("oak_tree"),
      equippedToolId: "stone_pickaxe",
    });

    expect(missing).toMatchObject({ ok: false, reason: "missing_tool", message: "need axe", tone: "error" });
    expect(wrong).toMatchObject({ ok: false, reason: "wrong_tool", message: "need axe", tone: "error" });
  });

  it("blocks activation while cooling down unless cooldowns are disabled", () => {
    const blocked = resolveFocusedGatherActivation({
      ...readyInput,
      cooldownSec: 1,
      def: def("stone_node"),
    });
    const bypassed = resolveFocusedGatherActivation({
      ...readyInput,
      cooldownSec: 1,
      def: def("stone_node"),
      zeroCooldowns: true,
    });

    expect(blocked).toMatchObject({ ok: false, reason: "cooldown", message: "not ready", tone: "muted" });
    expect(bypassed.ok).toBe(true);
  });

  it("blocks activation without enough stamina", () => {
    const result = resolveFocusedGatherActivation({
      ...readyInput,
      def: def("stone_node"),
      stamina: 0,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "stamina",
      message: "not enough stamina",
      tone: "error",
    });
  });

  it("blocks activation without a usable current source", () => {
    const result = resolveFocusedGatherActivation({
      ...readyInput,
      def: undefined,
      hasUsableSource: false,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "no_source",
      message: "no large source",
      tone: "muted",
    });
  });
});
