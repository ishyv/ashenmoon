import { beforeAll, describe, expect, it } from "vitest";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";

describe("map gatherable spawns", () => {
  beforeAll(() => {
    const getContext = () => ({});
    HTMLCanvasElement.prototype.getContext =
      getContext as unknown as typeof HTMLCanvasElement.prototype.getContext;
  });

  it("emits gatherable ids that resolve to definitions", async () => {
    const { buildMapSystem, MapResource } = await import("./map");
    const map = new MapResource();
    buildMapSystem(map);

    expect(map.mapData.spawns.length).toBeGreaterThan(0);
    for (const spawn of map.mapData.spawns) {
      expect(getGatherableDefinition(spawn.gatherableId), spawn.gatherableId).toBeDefined();
    }
  });
});
