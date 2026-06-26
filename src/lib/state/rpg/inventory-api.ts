/**
 * Read helpers over `gameState.rpg.inventory` / loadout. WHY: call sites
 * were reaching into the slot union by hand
 * were reaching into the slot union by hand
 * (`slots[id] && "qty" in slots[id] ? slots[id].qty : 0`), which is easy to get
 * wrong and hides intent. These keep the slot-shape knowledge in one place.
 */
import { gameState } from "$lib/state/game-state.svelte";
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { matchesToolKind, toolKindOf } from "$lib/domain/gathering/gather-system";

type WeaponSlot = RpgPlayerState["profile"]["loadout"]["weapon"];

/** Stackable quantity of an item (0 if absent, or the slot holds instances not a qty). */
export function getItemQty(itemId: string): number {
  const slot = gameState.rpg.inventory?.slots[itemId];
  return slot && "qty" in slot ? slot.qty : 0;
}

export function hasItem(itemId: string, qty: number): boolean {
  return getItemQty(itemId) >= qty;
}

/** The equipped weapon slot raw (may be a string id or an instance object), or null. */
export function getEquippedWeapon(): WeaponSlot {
  return gameState.rpg.profile?.loadout?.weapon ?? null;
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
  return matchesToolKind(itemId, kind);
}

/** Records a manual weapon/tool equip to localStorage to remember preference. */
export function recordManualEquip(itemId: string | null): void {
  if (!itemId || typeof window === "undefined" || !window.localStorage) return;
  const kind = toolKindOf(itemId);
  if (kind) {
    try {
      const stored = window.localStorage.getItem("ashenmoor_last_equipped_tools");
      const map = stored ? JSON.parse(stored) : {};
      map[kind] = itemId;
      window.localStorage.setItem("ashenmoor_last_equipped_tools", JSON.stringify(map));
    } catch (e) {
      console.error("Failed to record manual equip:", e);
    }
  }
}

/** Gets the last manually equipped tool item id of the given kind. */
export function getLastManuallyEquippedTool(kind: "axe" | "pickaxe"): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem("ashenmoor_last_equipped_tools");
    if (!stored) return null;
    const map = JSON.parse(stored);
    return map[kind] ?? null;
  } catch {
    return null;
  }
}

/** Finds the best tool of the required kind to auto-equip. */
export function findBestAutoEquipTool(expectedKind: "axe" | "pickaxe"): string | null {
  const lastManuallyEquipped = getLastManuallyEquippedTool(expectedKind);
  if (lastManuallyEquipped && getItemQty(lastManuallyEquipped) > 0) {
    return lastManuallyEquipped;
  }

  const slots = gameState.rpg.inventory?.slots;
  if (slots) {
    for (const [itemId, slot] of Object.entries(slots)) {
      const qty = slot && ("qty" in slot ? slot.qty : slot.instances.length);
      if (qty > 0 && matchesToolKind(itemId, expectedKind)) {
        return itemId;
      }
    }
  }
  return null;
}
