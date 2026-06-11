import { carryClassOf, type ItemDefinition, type ItemId } from "./item-types";
import { canEnterGrid } from "../systems/inventory-system";

export type ItemRegistry = Record<string, ItemDefinition>;

export function defineItems<T extends ItemRegistry>(items: T): T {
  validateItemRegistry(items);
  return items;
}

export function getItem(registry: ItemRegistry, id: ItemId): ItemDefinition | null {
  return registry[id] ?? null;
}

function validateItemRegistry(items: ItemRegistry): void {
  for (const [key, item] of Object.entries(items)) {
    if (key !== item.id) {
      console.warn(`Item registry key "${key}" does not match item id "${item.id}".`);
    }

    for (const trait of item.traits) {
      const effect = "effect" in trait ? trait.effect : null;
      if (effect?.kind === "transform" && !items[effect.into]) {
        console.warn(`Item "${item.id}" transforms into missing item "${effect.into}".`);
      }
    }
  }
}

/**
 * Sets of item ids grouped by the trait they carry, plus the `haul` set for
 * items too large to stash. Built once from the registry so reaction ticks and
 * inventory checks iterate ids without rescanning every definition's traits.
 */
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
