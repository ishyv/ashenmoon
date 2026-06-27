import { describe, expect, it } from "vitest";
import {
  FIRST_CAMP_RELATIVE_LAYOUT,
  materializeFirstCampLayout,
  validateFirstCampLayout,
} from "$lib/domain/worldgen/first-camp-layout";

describe("First Camp worldgen layout", () => {
  it("defines valid first-camp metadata constraints around the start", () => {
    const layout = materializeFirstCampLayout(FIRST_CAMP_RELATIVE_LAYOUT, {
      mapW: 100,
      mapH: 100,
      spawnX: 50,
      spawnY: 50,
    });

    expect(validateFirstCampLayout(layout, {
      mapW: 100,
      mapH: 100,
      spawnX: 50,
      spawnY: 50,
      blockedTiles: new Set(),
      waterTiles: new Set(["60,52"]),
      startSafeRadiusTiles: 12,
    })).toEqual([]);
  });

  it("guarantees early tinder and small food options near the first camp", () => {
    const guaranteedIds = FIRST_CAMP_RELATIVE_LAYOUT.guaranteedSpawns.map((spawn) => spawn.gatherableId);

    expect(guaranteedIds).toEqual(expect.arrayContaining(["leaf_litter", "bark_strip"]));
    expect(guaranteedIds.filter((id) => ["berry_bush", "wild_root_node", "acorn_pickup", "mushroom_patch"].includes(id)).length)
      .toBeGreaterThanOrEqual(3);
  });

  it("reports missing required anchors and unsafe wolf den placement", () => {
    const layout = materializeFirstCampLayout(
      {
        ...FIRST_CAMP_RELATIVE_LAYOUT,
        landmarks: FIRST_CAMP_RELATIVE_LAYOUT.landmarks.filter((landmark) => landmark.kind !== "wolf_den"),
        animalZones: [],
        water: { kind: "pond", dx: 1, dy: 1, radiusTiles: 3 },
      },
      { mapW: 100, mapH: 100, spawnX: 50, spawnY: 50 },
    );

    expect(validateFirstCampLayout(layout, {
      mapW: 100,
      mapH: 100,
      spawnX: 50,
      spawnY: 50,
      blockedTiles: new Set(),
      waterTiles: new Set(),
      startSafeRadiusTiles: 12,
    })).toEqual(expect.arrayContaining([
      "missing required landmark wolf_den",
      "missing animal zone wolf_territory",
      "water source pond is not marked water",
    ]));
  });
});
