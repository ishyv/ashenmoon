import { describe, expect, it } from "vitest";
import { ITEM_DEFINITIONS } from "./item-definitions";
import { resolveItemVisuals } from "./item-visuals";

describe("resolveItemVisuals", () => {
  it("makes small and large meat visually distinct on the ground", () => {
    const small = resolveItemVisuals(ITEM_DEFINITIONS.raw_small_meat).ground;
    const large = resolveItemVisuals(ITEM_DEFINITIONS.raw_large_meat).ground;

    expect(small.heightTiles).toBeLessThan(large.heightTiles ?? 0);
  });

  it("gives authored equipped weapon sizes instead of one fixed attachment size", () => {
    const knife = resolveItemVisuals(ITEM_DEFINITIONS.crude_knife).equipped;
    const spear = resolveItemVisuals(ITEM_DEFINITIONS.wooden_spear).equipped;
    const axe = resolveItemVisuals(ITEM_DEFINITIONS.stone_axe).equipped;

    expect(knife.heightTiles).toBeGreaterThan(0.5);
    expect(spear.heightTiles).toBeGreaterThan(knife.heightTiles ?? 0);
    expect(axe.heightTiles).toBeGreaterThan(knife.heightTiles ?? 0);
  });
});
