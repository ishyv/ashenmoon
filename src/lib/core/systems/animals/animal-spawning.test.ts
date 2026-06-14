import { describe, expect, it } from "vitest";
import { planInitialAnimalSpawns } from "$lib/core/systems/animals/animal-spawning";
import type { ForestAnimalZone } from "$lib/core/systems/map/map";

describe("animal zone spawning", () => {
  it("expands forest animal zones into deterministic species spawn plans", () => {
    const zones: ForestAnimalZone[] = [
      { kind: "rabbit_burrow", x: 10, y: 20, radiusTiles: 5 },
      { kind: "deer_grazing", x: 11, y: 21, radiusTiles: 6 },
      { kind: "boar_rooting", x: 12, y: 22, radiusTiles: 6 },
      { kind: "wolf_territory", x: 13, y: 23, radiusTiles: 9 },
    ];

    expect(planInitialAnimalSpawns(zones, 4)).toEqual({
      nextSeq: 9,
      spawns: [
        { seq: 4, x: 10, y: 20, speciesId: "rabbit" },
        { seq: 5, x: 11, y: 20, speciesId: "rabbit" },
        { seq: 6, x: 11, y: 21, speciesId: "deer" },
        { seq: 7, x: 12, y: 22, speciesId: "boar" },
        { seq: 8, x: 13, y: 23, speciesId: "wolf" },
      ],
    });
  });
});
