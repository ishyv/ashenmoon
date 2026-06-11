/**
 * Public API for the item system. Everything outside `src/lib/rpg/items/`
 * should import from here rather than reaching into individual modules.
 *
 * Internal modules import each other directly to avoid a barrel cycle.
 */

// identity + data shapes
export {
  Rarity,
  Category,
  DEFAULT_CARRY_CLASS,
  carryClassOf,
  itemId,
  type CarryClass,
  type ItemId,
  type ItemDefinition,
  type ItemInstance,
} from "./item-types";

// trait DSL + introspection
export {
  TemperatureSensitive,
  Flammable,
  Decayable,
  Consumable,
  Boilable,
  traitOf,
  type ItemTrait,
  type TemperatureSensitiveTrait,
  type FlammableTrait,
  type DecayableTrait,
  type ConsumableTrait,
  type BoilableTrait,
} from "./item-traits";

// effect DSL
export {
  TransformInto,
  Destroy,
  DamageHolder,
  AddStatus,
  RestoreThirst,
  RestoreHp,
  ClearAllStatuses,
  ChanceOf,
  type ItemEffect,
  type TransformEffect,
  type DestroyEffect,
  type DamageHolderEffect,
  type AddStatusEffect,
  type RestoreThirstEffect,
  type RestoreHpEffect,
  type ClearAllStatusesEffect,
  type ChanceEffect,
} from "./item-effects";

// authoring + registry
export { Item } from "./item-builder";
export {
  defineItems,
  getItem,
  buildItemTraitIndex,
  isStashable,
  type ItemRegistry,
  type ItemTraitIndex,
} from "./item-registry";

// canonical content + lookups
export { ITEM_DEFINITIONS, ITEM_TRAIT_INDEX, getItemDef } from "./item-definitions";

// presentational helpers
export { iconUrlFor, reactsInto } from "./item-view";
