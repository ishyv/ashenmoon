import { describe, expect, it } from "vitest";
import {
  FIRST_CAMP_DRESSING,
  FIRST_CAMP_FLOOR_OFFSETS,
  isFirstCampFloorOffset,
  materializeCampDressing,
} from "./camp-dressing";

const spawn = { x: 50, y: 50 };

describe("camp dressing", () => {
  it("places the cold firepit near spawn", () => {
    const props = materializeCampDressing(FIRST_CAMP_DRESSING, spawn);

    expect(props).toContainEqual(expect.objectContaining({
      id: "cold_firepit",
      kind: "firepit",
      x: 50,
      y: 49,
    }));
  });

  it("keeps all starter props within readable first-screen range", () => {
    const props = materializeCampDressing(FIRST_CAMP_DRESSING, spawn);

    for (const prop of props) {
      const dist = Math.hypot(prop.x - spawn.x, prop.y - spawn.y);
      expect(dist).toBeLessThanOrEqual(5);
    }
  });

  it("uses an irregular floor footprint instead of a perfect square", () => {
    expect(FIRST_CAMP_FLOOR_OFFSETS.size).toBeGreaterThan(15);
    expect(FIRST_CAMP_FLOOR_OFFSETS.size).toBeLessThan(25);
    expect(isFirstCampFloorOffset(0, 0)).toBe(true);
    expect(isFirstCampFloorOffset(2, 2)).toBe(false);
    expect(isFirstCampFloorOffset(-2, 2)).toBe(false);
  });
});
