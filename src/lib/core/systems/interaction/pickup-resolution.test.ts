import { describe, expect, it } from "vitest";
import { resolvePickupTarget } from "./pickup-resolution";

describe("resolvePickupTarget", () => {
  it("uses pickup item, quantity, and gatherable metadata first", () => {
    expect(
      resolvePickupTarget({
        pickup: { itemId: "stick", qty: 3, gatherableId: "fallen_branch" },
        resource: { drop: "wood", gatherableId: "tree" },
      }),
    ).toEqual({
      itemId: "stick",
      qty: 3,
      gatherableId: "fallen_branch",
    });
  });

  it("falls back to a resource drop with quantity one", () => {
    expect(
      resolvePickupTarget({
        resource: { drop: "wood", gatherableId: "tree" },
      }),
    ).toEqual({
      itemId: "wood",
      qty: 1,
      gatherableId: "tree",
    });
  });

  it("returns no item when the target does not advertise a pickup or resource drop", () => {
    expect(resolvePickupTarget({})).toEqual({
      itemId: null,
      qty: 1,
      gatherableId: null,
    });
  });
});
