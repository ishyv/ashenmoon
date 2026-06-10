import type { ItemId } from "../items/item-types";

export interface StackSlot {
  readonly qty: number;
}

export interface InstanceSlot {
  readonly instances: readonly {
    readonly instanceId: string;
    readonly durability: number;
  }[];
}

export type InventorySlot = StackSlot | InstanceSlot;

export interface Inventory {
  readonly slots: Record<string, InventorySlot>;
}

export function transformStackItem(
  inventory: Inventory,
  fromItemId: string,
  toItemId: string,
): Inventory {
  const existing = inventory.slots[fromItemId];
  if (!existing || !("qty" in existing)) {
    return inventory;
  }

  const qty = existing.qty;
  const nextSlots = { ...inventory.slots };
  delete nextSlots[fromItemId];

  const target = nextSlots[toItemId];
  if (target && "qty" in target) {
    nextSlots[toItemId] = {
      qty: target.qty + qty,
    };
  } else {
    nextSlots[toItemId] = {
      qty,
    };
  }

  return {
    ...inventory,
    slots: nextSlots,
  };
}

export function removeStackItem(inventory: Inventory, itemId: string): Inventory {
  if (!inventory.slots[itemId]) {
    return inventory;
  }

  const nextSlots = { ...inventory.slots };
  delete nextSlots[itemId];

  return {
    ...inventory,
    slots: nextSlots,
  };
}