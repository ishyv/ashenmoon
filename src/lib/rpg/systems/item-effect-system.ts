import type { ItemEffect } from "../items";
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
    // Holder-facing effects don't touch the inventory; the consume system
    // routes them to survival/status state. Chance effects must be resolved
    // (rolled) before reaching here.
    case "damage_holder":
    case "add_status":
    case "restore_thirst":
    case "restore_hp":
    case "clear_all_statuses":
    case "chance":
      return inventory;
  }
}