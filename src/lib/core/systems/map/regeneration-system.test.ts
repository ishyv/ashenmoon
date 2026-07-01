import { describe, expect, it } from "vitest";
import { getReadyRegenNodeIds } from "./regeneration-system";
import { WORLDGEN_CONFIG } from "$lib/domain/worldgen/worldgen-config";

describe("regeneration-system rules", () => {
  const mockSpawns = [
    { id: "node_1", x: 10, y: 10, gatherableId: "stick_pickup" },
    { id: "node_2", x: 20, y: 20, gatherableId: "copper_ore_vein" },
    { id: "node_3", x: 50, y: 50, gatherableId: "stone_node" },
  ];

  const mockLandmarks = [
    { x: 10, y: 12 },
  ];

  it("identifies ready node IDs after cooldown expires", () => {
    const profile = {
      depletedNodes: {
        node_1: 1000,
        node_2: 1000,
      },
      buildings: [],
    };

    const ready = getReadyRegenNodeIds(profile, mockSpawns, [], 150000);
    expect(ready).toContain("node_1");
    expect(ready).not.toContain("node_2");
  });

  it("respects landmark preservation rules", () => {
    const profile = {
      depletedNodes: {
        node_1: 1000,
      },
      buildings: [],
    };

    const ready = getReadyRegenNodeIds(profile, mockSpawns, mockLandmarks, 500000);
    expect(ready).not.toContain("node_1");
  });

  it("respects player building preservation rules", () => {
    const profile = {
      depletedNodes: {
        node_2: 1000,
      },
      buildings: [
        { id: "b1", type: "wooden_wall", x: 21, y: 20 },
      ],
    };

    const ready = getReadyRegenNodeIds(profile, mockSpawns, [], 500000);
    expect(ready).not.toContain("node_2");
  });

  it("respects starting camp center preservation", () => {
    const profile = {
      depletedNodes: {
        node_3: 1000,
      },
      buildings: [],
    };

    const ready = getReadyRegenNodeIds(profile, mockSpawns, [], 500000);
    expect(ready).not.toContain("node_3");
  });
});
