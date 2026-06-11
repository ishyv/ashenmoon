import type { CarryClass, ItemId } from "../items/item-types";

/**
 * Whether an item of the given carry class may occupy a stash/grid slot. Haul
 * items are too large for the grid, they are carried physically or placed in
 * the world, never stashed.
 */
export function canEnterGrid(carryClass: CarryClass): boolean {
  return carryClass !== "haul";
}

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

/**
 * Removes `qty` units from a stack, deleting the slot when it empties.
 * Returns the inventory unchanged if the stack is missing or too small.
 */
export function removeStackQty(inventory: Inventory, itemId: string, qty: number): Inventory {
  const existing = inventory.slots[itemId];
  if (!existing || !("qty" in existing) || existing.qty < qty || qty <= 0) {
    return inventory;
  }

  const nextSlots = { ...inventory.slots };
  const remaining = existing.qty - qty;
  if (remaining <= 0) {
    delete nextSlots[itemId];
  } else {
    nextSlots[itemId] = { qty: remaining };
  }

  return { ...inventory, slots: nextSlots };
}

/**
 * Converts `qty` units of one stack into another item (boiling one unit of
 * dirty water, charring one log). Unlike `transformStackItem`, the rest of the
 * source stack stays put. No-op if the source stack is missing or too small.
 */
export function transformStackQty(
  inventory: Inventory,
  fromItemId: string,
  toItemId: string,
  qty: number,
): Inventory {
  const source = inventory.slots[fromItemId];
  if (!source || !("qty" in source) || source.qty < qty || qty <= 0) {
    return inventory;
  }

  const removed = removeStackQty(inventory, fromItemId, qty);
  const target = removed.slots[toItemId];
  const targetQty = target && "qty" in target ? target.qty : 0;

  return {
    ...removed,
    slots: {
      ...removed.slots,
      [toItemId]: { qty: targetQty + qty },
    },
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