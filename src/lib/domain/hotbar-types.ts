import type { ItemId } from '$lib/domain/items/item-types';

export type HotbarSlot = { itemId: ItemId } | null;
export type HotbarBinding = HotbarSlot[]; // always length 9
export const HOTBAR_SIZE = 9;
