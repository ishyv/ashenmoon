import { describe, expect, it } from "vitest";
import { Category, Consumable, itemId, Placeable, Rarity, Tool, Wearable, type ItemDefinition } from "$lib/domain/items";
import { Item } from "$lib/domain/items/item-builder";
import {
  countInventoryFilters,
  filterInventoryItems,
  itemMatchesInventoryFilter,
  type InventoryFilterId,
} from "./inventory-filters";
import type { InventoryItemView } from "./types";

function testItem(id: string, category: Category) {
  return Item({
    id: itemId(id),
    name: id.replaceAll("_", " "),
    description: "test item",
    rarity: Rarity.Common,
    category,
  });
}

describe("inventory filters", () => {
  it.each([
    ["consumable", testItem("berry", Category.Food).with(Consumable({ verb: "eat", onConsume: [] }))],
    ["equipment", testItem("axe", Category.Tool).with(Tool({ toolKind: "chopping", power: 1 }))],
    ["equipment", testItem("cloak", Category.Clothing).with(Wearable("body"))],
    ["materials", testItem("dry_stick", Category.Timber)],
    ["structures", testItem("bedroll", Category.Structure).with(Placeable("loose_bedroll"))],
    ["knowledge", testItem("hut_blueprint", Category.Knowledge)],
  ] satisfies [InventoryFilterId, ItemDefinition][])("matches %s items", (filterId, item) => {
    expect(itemMatchesInventoryFilter(item, filterId)).toBe(true);
  });

  it("does not leak unknown definitions into task filters", () => {
    expect(itemMatchesInventoryFilter(undefined, "all")).toBe(false);
    expect(itemMatchesInventoryFilter(undefined, "materials")).toBe(false);
  });

  it("combines task filtering with name search", () => {
    const defs = {
      stick: testItem("Dry Stick", Category.Timber),
      berry: testItem("Black Berry", Category.Food).with(Consumable({ verb: "eat", onConsume: [] })),
    };
    const items: InventoryItemView[] = [
      { itemId: "stick", qty: 2 },
      { itemId: "berry", qty: 1 },
    ];

    expect(filterInventoryItems(items, "materials", "stick", (id) => defs[id as keyof typeof defs]).map((i) => i.itemId))
      .toEqual(["stick"]);
    expect(filterInventoryItems(items, "materials", "berry", (id) => defs[id as keyof typeof defs]).map((i) => i.itemId))
      .toEqual([]);
  });

  it("counts current inventory items by filter group", () => {
    const defs = {
      stick: testItem("Dry Stick", Category.Timber),
      berry: testItem("Black Berry", Category.Food).with(Consumable({ verb: "eat", onConsume: [] })),
      cloak: testItem("Cloak", Category.Clothing).with(Wearable("body")),
    };
    const items: InventoryItemView[] = [
      { itemId: "stick", qty: 3 },
      { itemId: "berry", qty: 2 },
      { itemId: "cloak", qty: 1 },
      { itemId: "missing", qty: 1 },
    ];

    expect(countInventoryFilters(items, (id) => defs[id as keyof typeof defs])).toMatchObject({
      all: 3,
      consumable: 1,
      equipment: 1,
      materials: 1,
      structures: 0,
      knowledge: 0,
    });
  });
});
