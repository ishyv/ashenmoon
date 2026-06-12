export interface InventoryEngine {
  isNearCampfire(): boolean;
  startBuildingPlacement(type: string, onConfirm: () => void, onCancel: () => void): void;
  startItemPlacement(itemId: string, onConfirm: () => void, onCancel: () => void): void;
}

export interface InventoryItemView {
  itemId: string;
  qty: number;
}

export interface BuildRecipeView {
  id: string;
  name: string;
  description: string;
  costs: { itemId: string; name: string; required: number }[];
}

export type InventoryTab = "stash" | "crafting" | "building";

