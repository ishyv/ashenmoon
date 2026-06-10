/**
 * Read helpers over `rpgState.inventory` / `rpgState.loadout`. WHY: call sites
 * were reaching into the slot union by hand
 * (`slots[id] && "qty" in slots[id] ? slots[id].qty : 0`), which is easy to get
 * wrong and hides intent. These keep the slot-shape knowledge in one place.
 */
import { rpgState } from "./rpg-state.svelte";
import type { RpgPlayerState } from "$shared/bridge-types";

type WeaponSlot = RpgPlayerState["profile"]["loadout"]["weapon"];

/** Stackable quantity of an item (0 if absent, or the slot holds instances not a qty). */
export function getItemQty(itemId: string): number {
  const slot = rpgState.inventory?.slots[itemId];
  return slot && "qty" in slot ? slot.qty : 0;
}

export function hasItem(itemId: string, qty: number): boolean {
  return getItemQty(itemId) >= qty;
}

/** The equipped weapon slot raw (may be a string id or an instance object), or null. */
export function getEquippedWeapon(): WeaponSlot {
  return rpgState.profile?.loadout?.weapon ?? null;
}

/** Normalized item id of the equipped weapon, or null when nothing is equipped. */
export function getEquippedWeaponId(): string | null {
  const weapon = getEquippedWeapon();
  if (!weapon) return null;
  return typeof weapon === "string" ? weapon : weapon.itemId;
}

/**
 * Whether an item id names a tool of the given kind. "pickaxe" ends in "axe", so
 * an axe must explicitly exclude pickaxes — otherwise a pickaxe reads as an axe.
 * INVARIANT: isToolType(id, "axe") and isToolType(id, "pickaxe") are mutually
 * exclusive. (This tightens the old bare `.includes("axe")` check, which let a
 * pickaxe pass as an axe and chop trees.)
 */
export function isToolType(itemId: string, kind: "axe" | "pickaxe"): boolean {
  if (kind === "pickaxe") return itemId.includes("pickaxe");
  return itemId.includes("axe") && !itemId.includes("pickaxe");
}
