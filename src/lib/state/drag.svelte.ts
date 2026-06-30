import type { ItemId } from '$lib/domain/items/item-types';

export interface DragPayload {
  source: 'inventory' | 'hotbar';
  itemId: ItemId;
  fromSlot?: number; // set when source is 'hotbar', 0-based index
}

// Svelte 5 reactive singleton
let _active = $state<DragPayload | null>(null);

export const dragState = {
  get active(): DragPayload | null { return _active; },
  set(payload: DragPayload): void { _active = payload; },
  clear(): void { _active = null; },
};
