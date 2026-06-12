import { describe, expect, it } from "vitest";
import { tickPlacedItemExposure } from "./placed-exposure";

describe("tickPlacedItemExposure", () => {
  it("shows a warning for smoldering branch near fire on the ground", () => {
    const state = { itemId: "branch", qty: 1, exposureTimeSec: 0, hasWarned: false };
    const ctx = { location: "ground" as const, ambientTemp: 20, radiantHeat: 600 };

    const res1 = tickPlacedItemExposure(state, ctx, 1.2);
    expect(res1.warning).toBe("smoldering...");
    expect(res1.next.hasWarned).toBe(true);
    expect(res1.transformedItemId).toBeNull();
  });

  it("transforms branch into charcoal after enough exposure on the ground near fire", () => {
    const state = { itemId: "branch", qty: 1, exposureTimeSec: 2.0, hasWarned: true };
    const ctx = { location: "ground" as const, ambientTemp: 20, radiantHeat: 600 };

    const res2 = tickPlacedItemExposure(state, ctx, 0.6);
    expect(res2.transformedItemId).toBe("charcoal");
    expect(res2.learnedProperty).toBe("flammable");
  });

  it("does not ignite a branch if it is sealed in a container near fire", () => {
    const state = { itemId: "branch", qty: 1, exposureTimeSec: 0, hasWarned: false };
    // sealed means effective temp remains ambient (20 c), which is < ignition temp (105 c)
    const ctx = { location: "sealed" as const, ambientTemp: 20, radiantHeat: 600 };

    const res = tickPlacedItemExposure(state, ctx, 1.0);
    expect(res.next.exposureTimeSec).toBe(0);
    expect(res.warning).toBeNull();
    expect(res.transformedItemId).toBeNull();
  });

  it("decays berries on the ground faster near fire", () => {
    const state = { itemId: "berries", qty: 2, exposureTimeSec: 10, hasWarned: false };
    const ctx = { location: "ground" as const, ambientTemp: 20, radiantHeat: 600 }; // radiantHeat > 0 doubles decay rate

    const res = tickPlacedItemExposure(state, ctx, 5);
    // 5s near campfire = 10s of effective decay
    expect(res.next.exposureTimeSec).toBe(20);
  });
});
