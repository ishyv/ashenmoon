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

  it("generates First Camp forest metadata with water, starter materials, and animal zones", async () => {
    const { buildMapSystem, MapResource } = await import("./map");
    const map = new MapResource();
    buildMapSystem(map);

    expect(map.forestMetadata.waterSources.length).toBeGreaterThan(0);
    expect(map.forestMetadata.animalZones.map((zone) => zone.kind)).toEqual(
      expect.arrayContaining(["rabbit_burrow", "deer_grazing", "boar_rooting", "wolf_territory"]),
    );
    expect(map.forestMetadata.campCandidates.length).toBeGreaterThan(0);

    const spawnX = Math.floor(map.mapW / 2);
    const spawnY = Math.floor(map.mapH / 2);
    const starterIds = new Set(
      map.mapData.spawns
        .filter((spawn) => Math.hypot(spawn.x - spawnX, spawn.y - spawnY) <= 14)
        .map((spawn) => spawn.gatherableId),
    );
    expect([...starterIds]).toEqual(expect.arrayContaining(["stick_pickup", "leaf_litter", "grass_patch", "flint_shard_pickup"]));
  });

  it("places clay deposits near water and flint near rocky patches", async () => {
    const { buildMapSystem, MapResource } = await import("./map");
    const map = new MapResource();
    buildMapSystem(map);

    const waterKeys = new Set(map.forestMetadata.waterSources.map((source) => `${source.x},${source.y}`));
    const clay = map.mapData.spawns.filter((spawn) => spawn.gatherableId === "clay_deposit");
    const flint = map.mapData.spawns.filter((spawn) => spawn.gatherableId === "flint_shard_pickup");

    expect(clay.length).toBeGreaterThan(0);
    expect(clay.every((spawn) => map.forestMetadata.waterSources.some((water) => Math.hypot(spawn.x - water.x, spawn.y - water.y) <= 4))).toBe(true);
    expect(flint.some((spawn) => map.forestMetadata.resourceClusters.some((cluster) => cluster.kind === "rocky_patch" && Math.hypot(spawn.x - cluster.x, spawn.y - cluster.y) <= cluster.radiusTiles))).toBe(true);
    expect(waterKeys.size).toBeGreaterThan(0);
  });
});
