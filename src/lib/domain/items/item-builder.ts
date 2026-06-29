import {
  Category,
  DEFAULT_CARRY_CLASS,
  Rarity,
  type ItemDefinition,
  type ItemId,
  type ItemPhysicalProperties,
  type ItemVisualProperties,
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
  visual?: ItemVisualProperties;
  icon?: string;
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
  const physical: ItemPhysicalProperties = {
    carryClass: base.physical?.carryClass ?? DEFAULT_CARRY_CLASS,
    weight: base.physical?.weight ?? 1,
    ...(base.physical?.stackLimit !== undefined ? { stackLimit: base.physical.stackLimit as number } : {}),
  };

  const definition: ItemDefinition = {
    id: base.id,
    name: base.name,
    description: base.description,
    rarity: base.rarity,
    category: base.category,
    physical,
    traits: [],
    ...(base.visual !== undefined && { visual: base.visual }),
    ...(base.icon !== undefined && { icon: base.icon }),
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
