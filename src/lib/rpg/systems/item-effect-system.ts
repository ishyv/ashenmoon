import type { ItemEffect } from "../items/item-effects";
import { removeStackItem, transformStackItem, type Inventory } from "./inventory-system";

export function applyItemEffectToInventory(
  inventory: Inventory,
  fromItemId: string,
  effect: ItemEffect,
): Inventory {
  switch (effect.kind) {
    case "transform":
      return transformStackItem(inventory, fromItemId, effect.into);
    case "destroy":
      return removeStackItem(inventory, fromItemId);
    case "damage_holder":
    case "add_status":
      return inventory;
  }
}