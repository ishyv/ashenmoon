import { describe, it, expect } from "vitest";
import { isValidItemPlacement, type ItemPlacementContext } from "./item-placement";

describe("isValidItemPlacement", () => {
  const defaultContext: ItemPlacementContext = {
    mapW: 10,
    mapH: 10,
    blockedTiles: new Set(["2,2"]),
    waterTiles: new Set(["3,3"]),
    playerTile: { x: 5, y: 5 },
    maxDistanceTiles: 4.5,
  };

  it("should allow placement on a free tile within range", () => {
    const valid = isValidItemPlacement(4, 4, defaultContext);
    expect(valid).toBe(true);
  });

  it("should disallow placement on player's own tile", () => {
    const valid = isValidItemPlacement(5, 5, defaultContext);
    expect(valid).toBe(false);
  });

  it("should disallow placement on blocked tiles", () => {
    const valid = isValidItemPlacement(2, 2, defaultContext);
    expect(valid).toBe(false);
  });

  it("should disallow placement on water tiles", () => {
    const valid = isValidItemPlacement(3, 3, defaultContext);
    expect(valid).toBe(false);
  });

  it("should disallow placement out of range", () => {
    const valid = isValidItemPlacement(0, 0, defaultContext);
    expect(valid).toBe(false);
  });

  it("should disallow placement out of bounds", () => {
    const valid = isValidItemPlacement(-1, 5, defaultContext);
    expect(valid).toBe(false);

    const valid2 = isValidItemPlacement(10, 5, defaultContext);
    expect(valid2).toBe(false);
  });
});
