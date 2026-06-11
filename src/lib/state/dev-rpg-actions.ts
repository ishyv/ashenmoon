import {
  addLocalInventoryQty,
  equipLocalWeapon,
  setLocalHp,
} from "$lib/state/rpg-actions.svelte";

export function devGiveItem(itemId: string, qty: number): void {
  addLocalInventoryQty(itemId, qty);
}

export function devEquip(itemId: string | null): void {
  equipLocalWeapon(itemId);
}

export function devSetHp(hp: number): void {
  setLocalHp(hp);
}

