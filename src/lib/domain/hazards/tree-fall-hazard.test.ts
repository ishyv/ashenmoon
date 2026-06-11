import { describe, expect, it } from "vitest";
import {
  createTreeFallHazard,
  fallDirectionAwayFromPlayer,
  isPointInTreeFallZone,
} from "./tree-fall-hazard";

describe("tree fall hazard", () => {
  it("chooses a fall direction away from the player", () => {
    expect(fallDirectionAwayFromPlayer({ x: 100, y: 100 }, { x: 70, y: 100 })).toBe("east");
    expect(fallDirectionAwayFromPlayer({ x: 100, y: 100 }, { x: 100, y: 130 })).toBe("north");
  });

  it("detects the landing strip", () => {
    const hazard = createTreeFallHazard({ x: 100, y: 100 }, "south");

    expect(isPointInTreeFallZone({ x: 100, y: 180 }, hazard)).toBe(true);
    expect(isPointInTreeFallZone({ x: 140, y: 180 }, hazard)).toBe(false);
    expect(isPointInTreeFallZone({ x: 100, y: 40 }, hazard)).toBe(false);
  });
});
