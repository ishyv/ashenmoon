import { describe, expect, it } from "vitest";
import { removeStackQty, transformStackQty, type Inventory } from "./inventory-system";
import { ITEM_DEFINITIONS } from "$lib/domain/items/item-definitions";
import { resolveConsume } from "./consume-system";

describe("boiling dirty water", () => {
  it("dirty water carries a boilable trait that transforms into clean water", () => {
    const trait = ITEM_DEFINITIONS.dirty_water!.traits.find((t) => t.kind === "boilable");
    expect(trait).toBeDefined();
    if (trait?.kind !== "boilable") throw new Error("unreachable");
    expect(trait.effect).toEqual({ kind: "transform", into: "clean_water", preserveQuantity: true });
  });

  it("transformStackQty converts one unit and leaves the rest", () => {
    const inv: Inventory = { slots: { dirty_water: { qty: 3 } } };
    const next = transformStackQty(inv, "dirty_water", "clean_water", 1);
    expect(next.slots.dirty_water).toEqual({ qty: 2 });
    expect(next.slots.clean_water).toEqual({ qty: 1 });
  });

  it("transformStackQty merges into an existing target stack", () => {
    const inv: Inventory = { slots: { dirty_water: { qty: 1 }, clean_water: { qty: 4 } } };
    const next = transformStackQty(inv, "dirty_water", "clean_water", 1);
    expect(next.slots.dirty_water).toBeUndefined();
    expect(next.slots.clean_water).toEqual({ qty: 5 });
  });

  it("transformStackQty is a no-op when the source is missing or short", () => {
    const inv: Inventory = { slots: { clean_water: { qty: 1 } } };
    expect(transformStackQty(inv, "dirty_water", "clean_water", 1)).toBe(inv);
    const short: Inventory = { slots: { dirty_water: { qty: 1 } } };
    expect(transformStackQty(short, "dirty_water", "clean_water", 2)).toBe(short);
  });

  it("removeStackQty deducts and deletes empty slots", () => {
    const inv: Inventory = { slots: { dirty_water: { qty: 2 } } };
    const once = removeStackQty(inv, "dirty_water", 1);
    expect(once.slots.dirty_water).toEqual({ qty: 1 });
    const twice = removeStackQty(once, "dirty_water", 1);
    expect(twice.slots.dirty_water).toBeUndefined();
  });

  it("boiled output has no sickness risk", () => {
    const outcome = resolveConsume(ITEM_DEFINITIONS.clean_water!, () => 0.0)!;
    expect(outcome.holderCommands.every((c) => c.kind !== "add_status")).toBe(true);
  });
});
