import type { StationId } from "$lib/domain/stations";

export interface InventoryEngine {
  isNearCampfire(): boolean;
  nearbyStationIds?(): StationId[];
  startBuildingPlacement(type: string, onConfirm: () => void, onCancel: () => void, sourceItemId?: string): void;
  startItemPlacement(itemId: string, onConfirm: () => void, onCancel: () => void): void;
}

export interface InventoryItemView {
  itemId: string;
  qty: number;
}

export interface BuildRecipeView {
  id: string;
  sourceItemId: string;
  available: number;
  name: string;
  description: string;
  costs: { itemId: string; name: string; required: number }[];
}

export type InventoryTab = "stash" | "crafting" | "building";
