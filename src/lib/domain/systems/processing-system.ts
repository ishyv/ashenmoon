import { getItemDef } from "$lib/domain/items";
import type { StationDefinition } from "$lib/domain/stations";
import type { InventoryEffect } from "$lib/domain/items/item-effects";
import type { Inventory } from "./inventory-system";
import { applyInventoryEffectToQty } from "./item-effect-system";

export type ProcessingStation = Pick<
  StationDefinition,
  "id" | "processTypes" | "heatOutput"
>;

export interface ProcessingResult {
  itemId: string;
  effect: InventoryEffect;
  durationSec: number;
}

/**
 * Finds the first item in the inventory that can be processed at the given station.
 * Currently supports 'boilable' items at a campfire.
 */
export function findProcessableItem(
  inventory: Inventory,
  station: ProcessingStation,
): ProcessingResult | null {
  for (const itemId of Object.keys(inventory.slots)) {
    const def = getItemDef(itemId);
    if (!def) continue;

    const boilable = def.traits.find((t) => t.kind === "boilable");
    if (
      boilable?.kind === "boilable" &&
      station.processTypes.includes("boil") &&
      (station.heatOutput ?? 0) >= boilable.minTemp
    ) {
      return {
        itemId,
        effect: boilable.effect,
        durationSec: boilable.durationSec,
      };
    }
  }

  return null;
}

/**
 * Applies the result of a finished process to the inventory.
 * Typically processes 1 unit of the item.
 */
export function resolveProcessingCompletion(
  inventory: Inventory,
  itemId: string,
  effect: InventoryEffect,
  qty: number = 1,
  rng: () => number = Math.random,
): Inventory {
  return applyInventoryEffectToQty(inventory, itemId, qty, effect, rng);
}
