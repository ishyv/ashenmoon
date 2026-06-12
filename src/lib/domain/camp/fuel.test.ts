import { describe, expect, it } from "vitest";
import { chooseFuelOption, getFuelSummary } from "./fuel";

describe("camp fuel options", () => {
  it("chooses the first available fuel option by configured priority", () => {
    expect(chooseFuelOption({ firewood_bundle: 1, oak_wood: 99 })).toEqual({
      itemId: "firewood_bundle",
      qty: 1,
      fuelMs: 90_000,
    });
  });

  it("summarizes mixed fuel inventory without treating pieces as equal burn value", () => {
    expect(getFuelSummary({ firewood_bundle: 1, branch: 4, stick: 5 })).toEqual({
      totalPieces: 10,
      canRefuel: true,
    });
  });
});
