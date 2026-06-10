import type { ItemDefinition, ItemId } from "./item-types";

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