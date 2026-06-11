import {
  Category,
  DEFAULT_CARRY_CLASS,
  Rarity,
  type ItemDefinition,
  type ItemId,
  type ItemPhysicalProperties,
} from "./item-types";
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
  physical?: Partial<ItemPhysicalProperties>;
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
    id: base.id,
    name: base.name,
    description: base.description,
    rarity: base.rarity,
    category: base.category,
    physical: {
      carryClass: base.physical?.carryClass ?? DEFAULT_CARRY_CLASS,
      weight: base.physical?.weight ?? 1,
      stackLimit: base.physical?.stackLimit,
    },
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
