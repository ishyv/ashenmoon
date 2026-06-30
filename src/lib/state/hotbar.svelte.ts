/**
 * Hotbar reactive state — bridges persisted profile.hotbar with the UI and
 * keyboard input layer. Slots are derived from gameState; mutations write back
 * to gameState.rpg.profile so the auto-save effect picks them up.
 */
import type { ItemId } from '$lib/domain/items/item-types';
import type { HotbarSlot } from '$lib/domain/hotbar-types';
import { HOTBAR_SIZE } from '$lib/domain/hotbar-types';
import { getItemDef, traitOf } from '$lib/domain/items';
import { uiInputController } from '$lib/core/input/input-controller.svelte';
import { play } from '$lib/audio/audio-engine';
import {
  canEquipFromInventory,
  resolveInventoryItemActions,
  type InventoryItemActionView,
} from '$lib/domain/inventory-item-action';
import { prioritizeHotbarActions } from '$lib/domain/hotbar-action-priority';
import type { UIAction } from '$lib/domain/game-events';
import type { RpgInventorySlot } from '$lib/domain/rpg-types';
import { gameState } from '$lib/state/game-state.svelte';
import { dispatchRpgCommand } from '$lib/state/rpg-controller.svelte';
import { canConsume, consumeItem, getConsumeVerb } from '$lib/state/rpg/consume-actions';
import { hudActivity } from '$lib/state/hud-activity.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveSlots(raw: (string | null)[] | undefined): (HotbarSlot | null)[] {
  const base = raw ?? [];
  return Array.from({ length: HOTBAR_SIZE }, (_, i) => {
    const id = base[i];
    return id ? { itemId: id as ItemId } : null;
  });
}

function getSlotCount(slot: RpgInventorySlot | undefined): number {
  if (!slot) return 0;
  if ('qty' in slot) return slot.qty;
  return slot.instances.length;
}

type GearSlot = 'helmet' | 'chest' | 'shield' | 'pants' | 'boots' | 'ring' | 'necklace';

function gearSlotForItem(itemId: string): GearSlot | null {
  const def = getItemDef(itemId);
  const wearable = def ? traitOf(def, 'wearable') : undefined;
  if (!wearable) return null;
  if (wearable.slot === 'head') return 'helmet';
  if (wearable.slot === 'body') return 'chest';
  if (wearable.slot === 'feet') return 'boots';
  if (wearable.slot === 'hands') return 'shield';
  if (wearable.slot === 'legs') return 'pants';
  return null;
}

function isItemEquipped(itemId: string): boolean {
  const loadout = gameState.rpg.profile?.loadout;
  if (!loadout) return false;
  for (const slot of Object.values(loadout)) {
    if (!slot) continue;
    if (typeof slot === 'string') {
      if (slot === itemId) return true;
    } else if (slot.itemId === itemId) {
      return true;
    }
  }
  return false;
}

function executeAction(action: InventoryItemActionView, itemId: string): void {
  switch (action.id) {
    case 'consume':
      consumeItem(itemId);
      break;
    case 'equip': {
      const def = getItemDef(itemId);
      if (!def) break;
      if (canEquipFromInventory(def)) {
        dispatchRpgCommand({ type: 'equipTool', itemId });
      } else {
        const slot = gearSlotForItem(itemId);
        if (slot) dispatchRpgCommand({ type: 'equipGear', itemId, slot });
      }
      break;
    }
    case 'unequip': {
      const def = getItemDef(itemId);
      if (!def) break;
      if (canEquipFromInventory(def)) {
        dispatchRpgCommand({ type: 'equipTool', itemId: null });
      } else {
        const slot = gearSlotForItem(itemId);
        if (slot) dispatchRpgCommand({ type: 'equipGear', itemId: null, slot });
      }
      break;
    }
    case 'study':
      dispatchRpgCommand({ type: 'studyBlueprint', itemId });
      break;
    case 'place':
      // Placement requires an engine reference that hotbar does not hold.
      break;
  }
}

// ---------------------------------------------------------------------------
// Hotbar profile mutations
// ---------------------------------------------------------------------------

function mutateHotbar(mutator: (hotbar: (string | null)[]) => (string | null)[]): void {
  const profile = gameState.rpg.profile;
  if (!profile) return;
  const current = (profile.hotbar ?? Array<string | null>(HOTBAR_SIZE).fill(null)).slice();
  gameState.rpg.profile = { ...profile, hotbar: mutator(current) };
}

// ---------------------------------------------------------------------------
// Reactive state
// ---------------------------------------------------------------------------

let _slots = $derived(deriveSlots(gameState.rpg.profile?.hotbar));
let _flashSlot = $state<number | null>(null);
let _shakeSlot = $state<number | null>(null);
let _flashTimer: ReturnType<typeof setTimeout> | null = null;
let _shakeTimer: ReturnType<typeof setTimeout> | null = null;

// ---------------------------------------------------------------------------
// Public singleton
// ---------------------------------------------------------------------------

export const hotbarState = {
  /** Reactive slot array, always length HOTBAR_SIZE (9). */
  get slots(): readonly (HotbarSlot | null)[] {
    return _slots;
  },

  /** Index of the slot currently flashing (keypress pulse), or null. Resets after 200ms. */
  get flashSlot(): number | null {
    return _flashSlot;
  },

  /** Index of the slot currently shaking (empty-slot activation), or null. Resets after 300ms. */
  get shakeSlot(): number | null {
    return _shakeSlot;
  },

  /** Bind an item to a slot index (0-based). Persists via gameState auto-save. */
  bind(index: number, itemId: ItemId): void {
    if (index < 0 || index >= HOTBAR_SIZE) return;
    mutateHotbar((hotbar) => {
      hotbar[index] = itemId;
      return hotbar;
    });
  },

  /** Clear a slot. Persists. */
  unbind(index: number): void {
    if (index < 0 || index >= HOTBAR_SIZE) return;
    mutateHotbar((hotbar) => {
      hotbar[index] = null;
      return hotbar;
    });
  },

  /** Swap two slots. Persists. */
  swap(indexA: number, indexB: number): void {
    if (indexA < 0 || indexA >= HOTBAR_SIZE || indexB < 0 || indexB >= HOTBAR_SIZE) return;
    mutateHotbar((hotbar) => {
      const tmp = hotbar[indexA] ?? null;
      hotbar[indexA] = hotbar[indexB] ?? null;
      hotbar[indexB] = tmp;
      return hotbar;
    });
  },

  /**
   * Activate the item at slot index.
   * Priority: consume > equip/unequip > study > place.
   * Returns 'unbound' if the slot is empty, 'empty' if the item isn't in
   * inventory or loadout, 'ok' otherwise (action may or may not have fired).
   */
  activate(index: number): 'ok' | 'empty' | 'unbound' {
    hudActivity.signal();
    const slot = _slots[index];
    if (!slot) return 'unbound';

    const itemId = slot.itemId;
    const inventoryCount = getSlotCount(gameState.rpg.inventory?.slots[itemId]);
    if (inventoryCount === 0 && !isItemEquipped(itemId)) {
      if (_shakeTimer) clearTimeout(_shakeTimer);
      _shakeSlot = index;
      _shakeTimer = setTimeout(() => { _shakeSlot = null; }, 300);
      play('hotbar.activate.empty');
      return 'empty';
    }

    const def = getItemDef(itemId);
    const actions = resolveInventoryItemActions({
      def,
      itemId,
      isEquipped: isItemEquipped(itemId),
      consumeVerb: getConsumeVerb(itemId),
      canConsume: canConsume(itemId),
    });

    const prioritized = prioritizeHotbarActions(actions);
    const action = prioritized.find((a) => a.enabled);
    if (action) executeAction(action, itemId);

    if (_flashTimer) clearTimeout(_flashTimer);
    _flashSlot = index;
    _flashTimer = setTimeout(() => { _flashSlot = null; }, 200);
    return 'ok';
  },
};

// ---------------------------------------------------------------------------
// Register 1-9 hotbar key bindings at module init
// ---------------------------------------------------------------------------

for (let i = 0; i < HOTBAR_SIZE; i++) {
  uiInputController.register({
    action: `hotbar_${i + 1}` as UIAction,
    keys: [`${i + 1}`],
    layer: 'hotbar',
    handler: (_e) => {
      hotbarState.activate(i);
      return true;
    },
  });
}
