import type { ItemRegistry } from "./item-registry";

export interface ItemTraitIndex {
  temperatureSensitive: Set<string>;
  flammable: Set<string>;
  decayable: Set<string>;
  consumable: Set<string>;
  boilable: Set<string>;
}

export function buildItemTraitIndex(items: ItemRegistry): ItemTraitIndex {
  const index: ItemTraitIndex = {
    temperatureSensitive: new Set(),
    flammable: new Set(),
    decayable: new Set(),
    consumable: new Set(),
    boilable: new Set(),
  };

  for (const item of Object.values(items)) {
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