import { describe, expect, it } from "vitest";
import { getGatherableDefinition } from "../gatherables";
import {
  focusedGatherDifficultyFor,
  focusedGatherProfileFor,
  isFocusedGatherEligible,
} from "./focused-gather-profiles";

function def(id: string) {
  const value = getGatherableDefinition(id);
  if (!value) throw new Error(`missing gatherable ${id}`);
  return value;
}

describe("focused gather eligibility", () => {
  it("allows large solid repeated-action sources", () => {
    expect(isFocusedGatherEligible(def("oak_tree"))).toBe(true);
    expect(isFocusedGatherEligible(def("stone_node"))).toBe(true);
    expect(isFocusedGatherEligible(def("iron_ore_vein"))).toBe(true);
    expect(isFocusedGatherEligible(def("clay_deposit"))).toBe(true);
  });

  it("rejects pickups, forage, and liquid sources", () => {
    expect(isFocusedGatherEligible(def("stick_pickup"))).toBe(false);
    expect(isFocusedGatherEligible(def("berry_bush"))).toBe(false);
    expect(isFocusedGatherEligible(def("water_source"))).toBe(false);
  });
});

describe("focused gather difficulty", () => {
  it("derives difficulty from source data and respects explicit overrides", () => {
    expect(focusedGatherDifficultyFor(def("oak_tree"))).toBe("medium");
    expect(focusedGatherDifficultyFor(def("copper_ore_vein"))).toBe("medium");
    expect(focusedGatherDifficultyFor(def("iron_ore_vein"))).toBe("hard");
    expect(focusedGatherDifficultyFor(def("toxic_copper_node"))).toBe("expert");
    expect(focusedGatherDifficultyFor(def("glacial_silver_vein"))).toBe("hard");
    expect(focusedGatherProfileFor(def("glacial_silver_vein")).difficulty).toBe("hard");
  });
});
