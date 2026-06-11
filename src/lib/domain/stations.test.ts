import { describe, expect, it } from "vitest";
import { getStationDefinition, STATION_DEFINITIONS } from "./stations";

describe("station definitions", () => {
  it("defines the milestone 1 stations", () => {
    expect(Object.keys(STATION_DEFINITIONS).sort()).toEqual([
      "campfire",
      "drying_rack",
      "primitive_work_surface",
      "storage_pile",
    ]);
  });

  it("models campfire as the only early heat source", () => {
    expect(getStationDefinition("campfire")).toMatchObject({
      id: "campfire",
      processTypes: ["heat", "boil", "burn"],
      fuelRequired: true,
      heatOutput: 100,
    });
  });
});
