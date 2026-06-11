import { describe, expect, it } from "vitest";
import {
  BUILDING_SPECS,
  getBuildingSpec,
  validateBuildingSpecs,
} from "./building-specs";

describe("building specs", () => {
  it("keeps primitive milestone buildings in the domain table", () => {
    expect(getBuildingSpec("storage_pile")).toMatchObject({
      stationId: "storage_pile",
      cost: { stick: 4, leaves: 6 },
    });
    expect(getBuildingSpec("drying_rack")).toMatchObject({
      stationId: "drying_rack",
      cost: { stick: 6, grass_fiber: 4 },
    });
    expect(getBuildingSpec("primitive_work_surface")).toMatchObject({
      stationId: "primitive_work_surface",
      cost: { branch: 2, bark: 4 },
    });
  });

  it("validates costs and station references", () => {
    expect(validateBuildingSpecs(BUILDING_SPECS)).toEqual([]);
  });
});
