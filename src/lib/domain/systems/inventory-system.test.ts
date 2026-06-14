import { describe, expect, it } from "vitest";
import {
  canEnterGrid,
  removeStackItem,
  removeStackQty,
  transformStackItem,
  transformStackQty,
  type Inventory,
} from "./inventory-system";

describe("transformStackItem", () => {
  it("converts the whole stack and merges into an existing target", () => {
    const inv: Inventory = { slots: { wood: { qty: 4 }, charcoal: { qty: 1 } } };
    const next = transformStackItem(inv, "wood", "charcoal");
    expect(next.slots.wood).toBeUndefined();
    expect(next.slots.charcoal).toEqual({ qty: 5 });
    expect(inv.slots.wood).toEqual({ qty: 4 }); // input untouched
  });

  it("creates the target slot when absent", () => {
    const inv: Inventory = { slots: { wood: { qty: 2 } } };
    expect(transformStackItem(inv, "wood", "charcoal").slots.charcoal).toEqual({ qty: 2 });
  });

  it("is a no-op when the source is missing", () => {
    const inv: Inventory = { slots: { charcoal: { qty: 1 } } };
    expect(transformStackItem(inv, "wood", "charcoal")).toBe(inv);
  });
});

describe("removeStackQty", () => {
  it("decrements and deletes the slot when emptied", () => {
    const inv: Inventory = { slots: { stone: { qty: 3 } } };
    expect(removeStackQty(inv, "stone", 3).slots.stone).toBeUndefined();
    expect(removeStackQty(inv, "stone", 1).slots.stone).toEqual({ qty: 2 });
  });

  it("refuses invalid amounts and short stacks", () => {
    const inv: Inventory = { slots: { stone: { qty: 2 } } };
    expect(removeStackQty(inv, "stone", 5)).toBe(inv);
    expect(removeStackQty(inv, "stone", 0)).toBe(inv);
    expect(removeStackQty(inv, "missing", 1)).toBe(inv);
  });
});

describe("transformStackQty", () => {
  it("converts only the requested units, leaving the rest", () => {
    const inv: Inventory = { slots: { dirty_water: { qty: 3 } } };
    const next = transformStackQty(inv, "dirty_water", "clean_water", 1);
    expect(next.slots.dirty_water).toEqual({ qty: 2 });
    expect(next.slots.clean_water).toEqual({ qty: 1 });
  });

  it("no-ops on a short or missing source", () => {
    const inv: Inventory = { slots: { dirty_water: { qty: 1 } } };
    expect(transformStackQty(inv, "dirty_water", "clean_water", 2)).toBe(inv);
  });
});

describe("removeStackItem", () => {
  it("removes a slot entirely", () => {
    const inv: Inventory = { slots: { stone: { qty: 9 } } };
    expect(removeStackItem(inv, "stone").slots.stone).toBeUndefined();
  });

  it("no-ops when the slot is absent", () => {
    const inv: Inventory = { slots: {} };
    expect(removeStackItem(inv, "stone")).toBe(inv);
  });
});

describe("canEnterGrid", () => {
  it("blocks only haul-class items", () => {
    expect(canEnterGrid("pocket")).toBe(true);
    expect(canEnterGrid("pack")).toBe(true);
    expect(canEnterGrid("haul")).toBe(false);
  });
});
