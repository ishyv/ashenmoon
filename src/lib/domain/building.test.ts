import { describe, expect, it } from "vitest";
import { isValidBuildingPlacement, type BuildingPlacementContext } from "./building";

const baseContext: BuildingPlacementContext = {
  mapW: 10,
  mapH: 10,
  blockedTiles: new Set(),
  waterTiles: new Set(),
  reservedTiles: new Set(),
  playerTile: { x: 5, y: 5 },
  maxDistanceTiles: 4.5,
};

describe("building placement", () => {
  it("accepts a clear nearby footprint", () => {
    expect(isValidBuildingPlacement(6, 5, "storage_pile", baseContext)).toBe(true);
  });

  it("rejects blocked, water, reserved, player, range, and bounds conflicts", () => {
    expect(isValidBuildingPlacement(6, 5, "storage_pile", { ...baseContext, blockedTiles: new Set(["6,5"]) })).toBe(false);
    expect(isValidBuildingPlacement(6, 5, "storage_pile", { ...baseContext, waterTiles: new Set(["6,5"]) })).toBe(false);
    expect(isValidBuildingPlacement(6, 5, "storage_pile", { ...baseContext, reservedTiles: new Set(["6,5"]) })).toBe(false);
    expect(isValidBuildingPlacement(5, 5, "storage_pile", baseContext)).toBe(false);
    expect(isValidBuildingPlacement(0, 0, "storage_pile", baseContext)).toBe(false);
    expect(isValidBuildingPlacement(10, 10, "storage_pile", baseContext)).toBe(false);
  });
});

