import type { InventoryEffect } from "$lib/domain/items";
import {
  removeStackItem,
  removeStackQty,
  transformStackItem,
  transformStackQty,
  type Inventory,
} from "./inventory-system";

/**
 * Applies a purely inventory-facing effect.
 * The RNG is required for chance-based transformations (e.g. fragile processing).
 */
export function applyInventoryEffect(
  inventory: Inventory,
  fromItemId: string,
  effect: InventoryEffect,
  rng: () => number,
): Inventory {
  switch (effect.kind) {
    case "transform":
      return transformStackItem(inventory, fromItemId, effect.into);
    case "destroy":
      return removeStackItem(inventory, fromItemId);
    case "chance":
      if (rng() < effect.probability) {
        return applyInventoryEffect(inventory, fromItemId, effect.effect, rng);
      }
      return inventory;
    default:
      return inventory;
  }
}

/**
 * Applies an inventory effect to a specific quantity of an item stack.
 */
export function applyInventoryEffectToQty(
  inventory: Inventory,
  fromItemId: string,
  qty: number,
  effect: InventoryEffect,
  rng: () => number,
): Inventory {
  switch (effect.kind) {
    case "transform":
      return transformStackQty(inventory, fromItemId, effect.into, qty);
    case "destroy":
      return removeStackQty(inventory, fromItemId, qty);
    case "chance":
      if (rng() < effect.probability) {
        return applyInventoryEffectToQty(inventory, fromItemId, qty, effect.effect, rng);
      }
      return inventory;
    default:
      return inventory;
  }
}