import {
  addLocalInventoryQty,
  equipLocalWeapon,
  setLocalHp,
} from "$lib/state/rpg-actions.svelte";
import { formatDevItemIdUsage, resolveDevItemId } from "$lib/domain/dev-item-aliases";

function canonicalDevItemId(itemId: string): string {
  const resolved = resolveDevItemId(itemId);
  if (!resolved) throw new Error(formatDevItemIdUsage(itemId));
  return resolved;
}

export function devGiveItem(itemId: string, qty: number): void {
  addLocalInventoryQty(canonicalDevItemId(itemId), qty);
}

export function devEquip(itemId: string | null): void {
  equipLocalWeapon(itemId ? canonicalDevItemId(itemId) : null);
}

export function devSetHp(hp: number): void {
  setLocalHp(hp);
}
