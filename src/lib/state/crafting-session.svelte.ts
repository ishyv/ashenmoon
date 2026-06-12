import { CRAFT_RECIPES } from "$lib/domain/crafting/recipes";
import type { CraftInputs } from "$lib/domain/crafting/experimental";
import { readResonance, type ResonanceReading } from "$lib/domain/crafting/resonance";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

// ---------------------------------------------------------------------------
// Session state (display-only; nothing is consumed until commit)
// ---------------------------------------------------------------------------

const _session = $state<{
  open: boolean;
  tray: Record<string, number>;
}>({ open: false, tray: {} });

export const craftSession = {
  get open(): boolean { return _session.open; },
  get tray(): Readonly<Record<string, number>> { return _session.tray; },
};

export function openCraft(): void {
  _session.tray = {};
  _session.open = true;
}

export function closeCraft(): void {
  _session.open = false;
  _session.tray = {};
}

/** Add one unit of an ingredient, capped at the player's owned quantity. */
export function trayAdd(itemId: string, ownedQty: number): void {
  const current = _session.tray[itemId] ?? 0;
  if (current < ownedQty) {
    _session.tray = { ..._session.tray, [itemId]: current + 1 };
  }
}

/** Remove one unit of an ingredient (removes the key when it hits 0). */
export function trayRemove(itemId: string): void {
  const current = _session.tray[itemId] ?? 0;
  if (current <= 1) {
    const next = { ..._session.tray };
    delete next[itemId];
    _session.tray = next;
  } else {
    _session.tray = { ..._session.tray, [itemId]: current - 1 };
  }
}

export function clearTray(): void {
  _session.tray = {};
}

/** Snapshot of tray as CraftInputs (zero-qty keys excluded). */
export function trayInputs(): CraftInputs {
  return _session.tray;
}

/** Live resonance reading for the current tray. */
export function trayReading(knownRecipeIds?: ReadonlySet<string>): ResonanceReading {
  return readResonance(trayInputs(), CRAFT_RECIPES, knownRecipeIds);
}

/** Build tray add helper pre-bound to the player's current inventory slots. */
export function makeTrayAdd(slots: RpgPlayerState["inventory"]["slots"]) {
  return (itemId: string) => {
    const slot = slots[itemId];
    const owned = slot && "qty" in slot ? slot.qty : slot?.instances?.length ?? 0;
    trayAdd(itemId, owned);
  };
}
