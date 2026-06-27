import { describe, expect, it } from "vitest";
import {
  GATHERABLE_DEFINITIONS,
  getGatherableDefinition,
  resolveGatherYield,
  rollGatherRisk,
} from "./gatherables";
import { StatusId } from "$lib/domain/systems/status-types";

describe("gatherable definitions", () => {
  it("defines the milestone 1 resource set", () => {
    for (const id of [
      "stick_pickup",
      "loose_stone_pickup",
      "flint_shard_pickup",
      "leaf_litter",
      "bark_strip",
      "berry_bush",
      "mushroom_patch",
      "grass_patch",
      "moss_patch",
      "oak_tree",
      "clay_deposit",
      "water_source",
    ]) {
      expect(getGatherableDefinition(id), id).toBeDefined();
    }
  });

  it("keeps oak trees tool-gated and small pickups bare-handed", () => {
    expect(getGatherableDefinition("oak_tree")?.requiredToolKind).toBe("axe");
    expect(getGatherableDefinition("stick_pickup")?.requiredToolKind).toBeUndefined();
  });

  it("drives core metadata from definitions", () => {
    expect(getGatherableDefinition("oak_tree")).toMatchObject({
      renderKind: "tree",
      solidKind: "tree",
      skillKey: "lumberjacking",
      syncAction: "forest",
      syncLocationId: "oak_forest",
    });
    expect(getGatherableDefinition("iron_ore_vein")).toMatchObject({
      renderKind: "rock_iron",
      solidKind: "rock",
      skillKey: "mining",
      syncAction: "mine",
      syncLocationId: "iron_mine",
    });
  });

  it("resolves yields deterministically", () => {
    const stick = getGatherableDefinition("stick_pickup")!;
    expect(resolveGatherYield(stick, { quantityMultiplier: 1 }, () => 0)).toEqual([
      { itemId: "stick", quantity: 1 },
    ]);

    const water = getGatherableDefinition("water_source")!;
    expect(resolveGatherYield(water, { quantityMultiplier: 2 }, () => 0)).toEqual([
      { itemId: "dirty_water", quantity: 2 },
    ]);
  });

  it("makes dry leaves and tree leaves naturally obtainable", () => {
    expect(getGatherableDefinition("leaf_litter")?.yieldTable).toEqual(
      expect.arrayContaining([{ itemId: "dry_leaves", quantity: expect.any(Number) }]),
    );

    const oakYield = getGatherableDefinition("oak_tree")?.yieldTable ?? [];
    expect(oakYield).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "dry_leaves" }),
      expect.objectContaining({ itemId: "green_leaves" }),
    ]));
  });

  it("rolls configured risks with injected rng", () => {
    const flint = getGatherableDefinition("flint_shard_pickup")!;
    expect(rollGatherRisk(flint, { hasTool: false }, () => 0)).toEqual({
      status: StatusId.Cut,
      durationSec: 20,
      knowledgeItemId: "flint_shard",
    });
    expect(rollGatherRisk(flint, { hasTool: true }, () => 0)).toBeNull();
    expect(rollGatherRisk(flint, { hasTool: false }, () => 0.999)).toBeNull();
  });

  it("has no unknown yielded items", () => {
    for (const def of Object.values(GATHERABLE_DEFINITIONS)) {
      for (const entry of def.yieldTable) {
        expect(entry.itemId, def.id).toBeTruthy();
      }
    }
  });
});
