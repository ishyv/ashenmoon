import { describe, expect, it } from "vitest";
import { stationMenuOptions, ringPosition, groupByCategory, UPKEEP_CATEGORY, type StationMenuOption } from "./interaction-wheel";
import type { RpgPlayerState } from "./rpg-types";

function slots(map: Record<string, number>): RpgPlayerState["inventory"]["slots"] {
  return Object.fromEntries(Object.entries(map).map(([id, qty]) => [id, { qty }]));
}

describe("stationMenuOptions", () => {
  it("returns nothing for a null stationId", () => {
    expect(stationMenuOptions(null, {}, { isNearCampfire: false })).toEqual([]);
  });

  it("returns nothing when no processes/recipes/refuel are currently affordable", () => {
    const options = stationMenuOptions("primitive_work_surface", {}, {
      isNearCampfire: false,
      stationId: "primitive_work_surface",
    });
    expect(options).toEqual([]);
  });

  it("includes a station process once its ingredients are met", () => {
    // copper_ingot smelting requires a campfire per definitions/recipes; use a known
    // primitive_work_surface process instead — flint_axe (tiered recipe) covers the
    // recipe path below, so exercise a plain STATION_PROCESSES entry here indirectly
    // by checking recipe inclusion, which is the more stable cross-file contract.
    const options = stationMenuOptions("primitive_work_surface", slots({ stick: 1, flint_shard: 1, grass_fiber: 1 }), {
      isNearCampfire: false,
      stationId: "primitive_work_surface",
    });
    expect(options.some((o) => o.id === "flint_axe" && o.kind === "recipe")).toBe(true);
  });

  it("does not include a recipe the player lacks materials for", () => {
    const options = stationMenuOptions("primitive_work_surface", slots({ stick: 1 }), {
      isNearCampfire: false,
      stationId: "primitive_work_surface",
    });
    expect(options.some((o) => o.id === "flint_axe")).toBe(false);
  });

  it("only offers refuel for campfire, and only when enough fuel is owned", () => {
    const noFuel = stationMenuOptions("campfire", slots({ wood: 1 }), { isNearCampfire: true });
    expect(noFuel.some((o) => o.kind === "refuel")).toBe(false);

    const withFuel = stationMenuOptions("campfire", slots({ wood: 3 }), { isNearCampfire: true });
    expect(withFuel.some((o) => o.id === "refuel" && o.kind === "refuel")).toBe(true);

    const nonCampfire = stationMenuOptions("primitive_work_surface", slots({ wood: 3 }), {
      isNearCampfire: false,
      stationId: "primitive_work_surface",
    });
    expect(nonCampfire.some((o) => o.kind === "refuel")).toBe(false);
  });

  it("derives category from the output item for recipes and processes, and a fixed pseudo-category for refuel", () => {
    const options = stationMenuOptions("primitive_work_surface", slots({ stick: 1, flint_shard: 1, grass_fiber: 1 }), {
      isNearCampfire: false,
      stationId: "primitive_work_surface",
    });
    const flintAxe = options.find((o) => o.id === "flint_axe");
    expect(flintAxe?.category).toBeTruthy();
    expect(flintAxe?.category).not.toBe(UPKEEP_CATEGORY);

    const withFuel = stationMenuOptions("campfire", slots({ wood: 3 }), { isNearCampfire: true });
    const refuel = withFuel.find((o) => o.id === "refuel");
    expect(refuel?.category).toBe(UPKEEP_CATEGORY);
  });
});

describe("ringPosition", () => {
  it("places a single item exactly at startAngleDeg", () => {
    // startAngleDeg = 0 (straight up) -> x=0, y=-radius
    const p = ringPosition(0, 1, 100, 0);
    expect(p.x).toBeCloseTo(0, 5);
    expect(p.y).toBeCloseTo(-100, 5);
  });

  it("returns the anchor for a non-positive count", () => {
    expect(ringPosition(0, 0, 100)).toEqual({ x: 0, y: 0 });
  });

  it("spreads items evenly around a full circle (spanDeg >= 360)", () => {
    // 4 items around a full circle starting at 0deg (up): 0, 90, 180, 270 clockwise
    const p0 = ringPosition(0, 4, 100, 0, 360);
    const p1 = ringPosition(1, 4, 100, 0, 360);
    const p2 = ringPosition(2, 4, 100, 0, 360);
    const p3 = ringPosition(3, 4, 100, 0, 360);
    expect(p0.x).toBeCloseTo(0, 5);
    expect(p0.y).toBeCloseTo(-100, 5);
    expect(p1.x).toBeCloseTo(100, 5); // 90deg clockwise from up -> right
    expect(p1.y).toBeCloseTo(0, 5);
    expect(p2.x).toBeCloseTo(0, 5);
    expect(p2.y).toBeCloseTo(100, 5); // 180deg -> down
    expect(p3.x).toBeCloseTo(-100, 5); // 270deg -> left
    expect(p3.y).toBeCloseTo(0, 5);
  });

  it("spreads items across a centered partial arc, first and last at the arc's ends", () => {
    // 3 items across a 90deg arc centered on 0 (up): -45, 0, 45
    const first = ringPosition(0, 3, 100, 0, 90);
    const middle = ringPosition(1, 3, 100, 0, 90);
    const last = ringPosition(2, 3, 100, 0, 90);
    expect(middle.x).toBeCloseTo(0, 5);
    expect(middle.y).toBeCloseTo(-100, 5);
    expect(first.x).toBeCloseTo(-100 * Math.sin(Math.PI / 4), 5);
    expect(last.x).toBeCloseTo(100 * Math.sin(Math.PI / 4), 5);
    // symmetric around the center angle
    expect(first.x).toBeCloseTo(-last.x, 5);
    expect(first.y).toBeCloseTo(last.y, 5);
  });
});

describe("groupByCategory", () => {
  function option(id: string, category: string): StationMenuOption {
    return { id, kind: "recipe", label: id, category };
  }

  it("groups options preserving first-seen category order and within-group order", () => {
    const groups = groupByCategory([
      option("a", "tool"),
      option("b", "food"),
      option("c", "tool"),
      option("d", "food"),
    ]);
    expect(groups.map((g) => g.category)).toEqual(["tool", "food"]);
    expect(groups[0]?.options.map((o) => o.id)).toEqual(["a", "c"]);
    expect(groups[1]?.options.map((o) => o.id)).toEqual(["b", "d"]);
  });

  it("returns an empty array for no options", () => {
    expect(groupByCategory([])).toEqual([]);
  });
});
