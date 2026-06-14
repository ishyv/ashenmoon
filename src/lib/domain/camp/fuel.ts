import type { RpgPlayerState } from "$lib/domain/rpg-types";

export const CAMP_FUEL_OPTIONS = [
  { itemId: "firewood_bundle", qty: 1, fuelMs: 90_000 },
  { itemId: "wood", qty: 3, fuelMs: 75_000 },
  { itemId: "branch", qty: 4, fuelMs: 55_000 },
  { itemId: "stick", qty: 6, fuelMs: 35_000 },
] as const;

export type CampFuelOption = (typeof CAMP_FUEL_OPTIONS)[number];
export type CampFuelItemId = CampFuelOption["itemId"];
export type FuelInventory = Partial<Record<CampFuelItemId, number>>;

export function chooseFuelOption(inventory: FuelInventory): CampFuelOption | null {
  return CAMP_FUEL_OPTIONS.find((option) => (inventory[option.itemId] ?? 0) >= option.qty) ?? null;
}

export function getFuelSummary(inventory: FuelInventory): { totalPieces: number; canRefuel: boolean } {
  const totalPieces = CAMP_FUEL_OPTIONS.reduce((total, option) => total + (inventory[option.itemId] ?? 0), 0);
  return {
    totalPieces,
    canRefuel: chooseFuelOption(inventory) !== null,
  };
}

export function fuelInventoryFromSlots(slots: RpgPlayerState["inventory"]["slots"]): FuelInventory {
  const inventory: FuelInventory = {};
  for (const option of CAMP_FUEL_OPTIONS) {
    const slot = slots[option.itemId];
    inventory[option.itemId] = slot && "qty" in slot ? slot.qty : 0;
  }
  return inventory;
}
