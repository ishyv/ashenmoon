import { describe, expect, it } from "vitest";
import { computeResult, resolveYieldItems } from "./focused-gather-rewards";
import { FOCUSED_GATHER_PROFILES } from "./focused-gather-profiles";
import type { FocusedGatherScore } from "./focused-gather-types";
import type { GatherableDefinition } from "../gatherables";

function score(finalScore: number): FocusedGatherScore {
  return {
    totalTargets: 4,
    successfulHits: 4,
    missedTargets: 0,
    wrongClicks: 0,
    averageTimingQuality: 1,
    completionTimeMs: 0,
    maxTimeMs: 1000,
    finalScore,
  };
}

const stoneDef = {
  id: "stone_node",
  yieldTable: [{ itemId: "stone", quantity: 1 }],
} as unknown as GatherableDefinition;

describe("computeResult", () => {
  it("uses the profile's band multiplier for the grade", () => {
    const excellent = computeResult(score(0.95), FOCUSED_GATHER_PROFILES.easy, "n");
    expect(excellent.grade).toBe("excellent");
    expect(excellent.yieldMultiplier).toBe(FOCUSED_GATHER_PROFILES.easy.excellentYieldMultiplier);

    const ruined = computeResult(score(0.05), FOCUSED_GATHER_PROFILES.easy, "n");
    expect(ruined.grade).toBe("ruined");
    expect(ruined.yieldMultiplier).toBe(FOCUSED_GATHER_PROFILES.easy.ruinedYieldMultiplier);
  });
});

describe("resolveYieldItems", () => {
  it("beats normal yield on an excellent run", () => {
    const result = computeResult(score(0.95), FOCUSED_GATHER_PROFILES.easy, "stone_node");
    const items = resolveYieldItems(stoneDef, result, 4, () => 0.99);
    expect(items[0].quantity).toBe(7); // round(4 * 1.75)
  });

  it("undershoots normal but never gives zero on a ruined run", () => {
    const result = computeResult(score(0.05), FOCUSED_GATHER_PROFILES.easy, "stone_node");
    const items = resolveYieldItems(stoneDef, result, 4, () => 0.99);
    expect(items[0].quantity).toBe(1); // round(4 * 0.25) = 1, floored at 1
    expect(items[0].quantity).toBeLessThan(4);
  });

  it("does not roll a bonus when the node has no secondary yield", () => {
    const result = computeResult(score(0.95), FOCUSED_GATHER_PROFILES.easy, "stone_node");
    const items = resolveYieldItems(stoneDef, result, 4, () => 0);
    expect(items).toHaveLength(1);
  });

  it("can roll a secondary drop on excellent when one exists", () => {
    const def = {
      id: "rich_vein",
      yieldTable: [
        { itemId: "iron_ore", quantity: 1 },
        { itemId: "raw_gem", quantity: 1 },
      ],
    } as unknown as GatherableDefinition;
    const result = computeResult(score(0.95), FOCUSED_GATHER_PROFILES.hard, "rich_vein");
    const items = resolveYieldItems(def, result, 4, () => 0); // forces the roll to hit
    expect(items.map((i) => i.itemId)).toContain("raw_gem");
  });
});
