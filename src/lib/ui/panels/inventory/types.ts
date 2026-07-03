import type { StationId } from "$lib/domain/stations";
import type { CraftTier } from "$lib/domain/rpg-types";

export interface InventoryEngine {
  isNearCampfire(): boolean;
  nearbyStationIds?(): StationId[];
  startBuildingPlacement(type: string, onConfirm: () => void, onCancel: () => void, sourceItemId?: string): void;
  startItemPlacement(itemId: string, onConfirm: () => void, onCancel: () => void): void;
  /** Starts a timed, attendable station craft. Returns false if it can't legally start right now. */
  startCraftProcess?(recipeId: string): boolean;
}

export interface InventoryItemView {
  itemId: string;
  qty: number;
  /** Highest-tier instance in this slot, when the slot is instance-tracked (tiered crafting). Absent for flat qty stacks. */
  tier?: CraftTier;
  /** Whether the highest-tier instance is cursed. Never surfaced as a "cursed" label — see the Possessed design in curse-effects.ts. */
  cursed?: boolean;
  curseLevel?: number;
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
