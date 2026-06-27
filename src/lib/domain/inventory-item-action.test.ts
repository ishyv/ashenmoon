import { describe, expect, it } from "vitest";
import { Category, itemId, Rarity } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { Consumable, Placeable, Tool, Wearable } from "$lib/domain/items/item-traits";
import { resolveInventoryDoubleClickAction } from "./inventory-item-action";

describe("resolveInventoryDoubleClickAction", () => {
  it("starts item placement for placeable inventory objects without building specs", () => {
    const item = Item({
      id: itemId("test_bedroll"),
      name: "Test Bedroll",
      description: "place me",
      rarity: Rarity.Common,
      category: Category.Structure,
      physical: { carryClass: "haul", weight: 1, stackLimit: 1 },
    }).with(Placeable("loose_bedroll"));

    expect(resolveInventoryDoubleClickAction(item)).toEqual({ kind: "placeItem" });
  });

  it("starts building placement for placeable kits backed by building specs", () => {
    const item = Item({
      id: itemId("test_storage_pile_kit"),
      name: "Test Storage Kit",
      description: "build me",
      rarity: Rarity.Common,
      category: Category.Structure,
      physical: { carryClass: "haul", weight: 1, stackLimit: 1 },
    }).with(Placeable("storage_pile"));

    expect(resolveInventoryDoubleClickAction(item)).toEqual({
      kind: "placeBuilding",
      buildableId: "storage_pile",
    });
  });

  it("keeps equip and consume actions for non-placeable items", () => {
    const tool = Item({
      id: itemId("test_tool"),
      name: "Test Tool",
      description: "equip me",
      rarity: Rarity.Common,
      category: Category.Tool,
      physical: { carryClass: "pack", weight: 1, stackLimit: 1 },
    }).with(Tool({ toolKind: "mining", power: 1 }));
    const wearable = Item({
      id: itemId("test_cloak"),
      name: "Test Cloak",
      description: "wear me",
      rarity: Rarity.Common,
      category: Category.Clothing,
      physical: { carryClass: "pack", weight: 1, stackLimit: 1 },
    }).with(Wearable("body"));
    const consumable = Item({
      id: itemId("test_food"),
      name: "Test Food",
      description: "eat me",
      rarity: Rarity.Common,
      category: Category.Food,
      physical: { carryClass: "pack", weight: 1, stackLimit: 1 },
    }).with(Consumable({ verb: "eat", onConsume: [] }));

    expect(resolveInventoryDoubleClickAction(tool)).toEqual({ kind: "equip" });
    expect(resolveInventoryDoubleClickAction(wearable)).toEqual({ kind: "equip" });
    expect(resolveInventoryDoubleClickAction(consumable)).toEqual({ kind: "consume" });
  });
});
