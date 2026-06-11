import type { ItemRegistry } from "./item-registry";
import { carryClassOf, type ItemDefinition } from "./item-types";
import { canEnterGrid } from "../systems/inventory-system";

export interface ItemTraitIndex {
  temperatureSensitive: Set<string>;
  flammable: Set<string>;
  decayable: Set<string>;
  consumable: Set<string>;
  boilable: Set<string>;
  /** Items whose carry class is `haul` (cannot enter the grid). */
  haul: Set<string>;
}

export function buildItemTraitIndex(items: ItemRegistry): ItemTraitIndex {
  const index: ItemTraitIndex = {
    temperatureSensitive: new Set(),
    flammable: new Set(),
    decayable: new Set(),
    consumable: new Set(),
    boilable: new Set(),
    haul: new Set(),
  };

  for (const item of Object.values(items)) {
    if (!canEnterGrid(carryClassOf(item))) {
      index.haul.add(item.id);
    }
    for (const trait of item.traits) {
      switch (trait.kind) {
        case "temperature_sensitive":
          index.temperatureSensitive.add(item.id);
          break;
        case "flammable":
          index.flammable.add(item.id);
          break;
        case "decayable":
          index.decayable.add(item.id);
          break;
        case "consumable":
          index.consumable.add(item.id);
          break;
        case "boilable":
          index.boilable.add(item.id);
          break;
      }
    }
  }

  return index;
}

/** Whether an item may be stashed in the grid (false for haul-class items). */
export function isStashable(def: ItemDefinition): boolean {
  return canEnterGrid(carryClassOf(def));
}