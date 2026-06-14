import { describe, expect, it } from "vitest";
import {
  processFlammableReactions,
  processTemperatureReactions,
  tickDecay,
} from "./item-reactions";
import type { Inventory } from "./inventory-system";

// Uses real item content: ice_block (>0°C -> clean_water), wood
// (ignites >=120°C -> charcoal), ghost_lily (decays after 60s -> volatile_ash).

describe("processTemperatureReactions", () => {
  it("melts ice above its safe band", () => {
    const inv: Inventory = { slots: { ice_block: { qty: 2 } } };
    const { inventory, reactions } = processTemperatureReactions(inv, 15);
    expect(inventory.slots.clean_water).toBeDefined();
    expect(reactions).toEqual([{ itemId: "ice_block", kind: "temperature" }]);
  });

  it("leaves items untouched inside their safe band", () => {
    const inv: Inventory = { slots: { ice_block: { qty: 1 } } };
    const { inventory, reactions } = processTemperatureReactions(inv, -20);
    expect(inventory).toBe(inv);
    expect(reactions).toHaveLength(0);
  });
});

describe("processFlammableReactions", () => {
  it("ignites exposed wood at a hot enough effective temperature", () => {
    const inv: Inventory = { slots: { wood: { qty: 3 } } };
    const { inventory, reactions } = processFlammableReactions(inv, {
      location: "ground",
      ambientTemp: 20,
      radiantHeat: 600,
    });
    expect(inventory.slots.charcoal).toBeDefined();
    expect(reactions).toEqual([{ itemId: "wood", kind: "flammable" }]);
  });

  it("never ignites sealed items", () => {
    const inv: Inventory = { slots: { wood: { qty: 3 } } };
    const { inventory, reactions } = processFlammableReactions(inv, {
      location: "sealed",
      ambientTemp: 9000,
      radiantHeat: 600,
    });
    expect(inventory).toBe(inv);
    expect(reactions).toHaveLength(0);
  });

  it("does not ignite below the ignition point", () => {
    const inv: Inventory = { slots: { wood: { qty: 1 } } };
    const { reactions } = processFlammableReactions(inv, {
      location: "pack",
      ambientTemp: 20,
      radiantHeat: 0,
    });
    expect(reactions).toHaveLength(0);
  });
});

describe("tickDecay", () => {
  it("accumulates age and transforms at lifespan", () => {
    const inv: Inventory = { slots: { ghost_lily: { qty: 1 } } };

    const first = tickDecay(inv, {}, 30, "ground");
    expect(first.reactions).toHaveLength(0);
    expect(first.ages.ghost_lily).toBeCloseTo(30);

    const second = tickDecay(first.inventory, first.ages, 30, "ground");
    expect(second.reactions).toEqual([{ itemId: "ghost_lily", kind: "decay" }]);
    expect(second.inventory.slots.volatile_ash).toBeDefined();
    expect(second.ages.ghost_lily).toBeUndefined();
  });

  it("decays slower when sealed", () => {
    const inv: Inventory = { slots: { ghost_lily: { qty: 1 } } };
    // 50s of real time at sealed rate (0.4) = 20s effective, well under 60s.
    const { reactions, ages } = tickDecay(inv, {}, 50, "sealed");
    expect(reactions).toHaveLength(0);
    expect(ages.ghost_lily).toBeCloseTo(20);
  });

  it("forgets age for items no longer held", () => {
    const inv: Inventory = { slots: {} };
    const { ages } = tickDecay(inv, { ghost_lily: 40 }, 10, "ground");
    expect(ages.ghost_lily).toBeUndefined();
  });
});
