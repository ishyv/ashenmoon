import { Category, Rarity, type ItemDefinition, type ItemId } from "./item-types";
import type { ItemTrait } from "./item-traits";

/**
 * Base properties required to define a new item.
 */
interface ItemBaseInput {
  id: ItemId;
  name: string;
  description: string;
  rarity: Rarity;
  category: Category;
}

/**
 * Entry point for the Item DSL. 
 * Creates a static ItemDefinition while providing a fluent '.with()' method to attach traits.
 * 
 * @example
 * Item({ id, name, ... }).with(Flammable({ ... }))
 */
export function Item(base: ItemBaseInput): ItemDefinition & {
  with: (...traits: ItemTrait[]) => ItemDefinition;
} {
  const definition: ItemDefinition = {
    ...base,
    traits: [],
  };

  return {
    ...definition,
    /**
     * Attaches one or more traits to the item definition.
     */
    with(...traits: ItemTrait[]): ItemDefinition {
      return {
        ...definition,
        traits,
      };
    },
  };
}
