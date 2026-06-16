/**
 * Public API for the item system. Everything outside `src/lib/domain/items/`
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
  type ItemPhysicalProperties,
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
  TanninSource,
  BindingMaterial,
  Absorbent,
  Sealant,
  CleaningAgent,
  Pigment,
  Tool,
  Weapon,
  ReachWeapon,
  ArmorMaterial,
  InsulationMaterial,
  Wearable,
  Placeable,
  HeatSafe,
  AttractsPredators,
  MedicineIngredient,
  HandlingRisk,
  CuttingEdge,
  RestQuality,
  Blueprint,
  traitOf,
  type ItemTrait,
  type BlueprintTrait,
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
  ReduceStatus,
  RestoreThirst,
  RestoreHp,
  ClearAllStatuses,
  ChanceOfInventory,
  ChanceOfVitals,
  type InventoryEffect,
  type VitalsEffect,
  type TransformEffect,
  type DestroyEffect,
  type DamageHolderEffect,
  type AddStatusEffect,
  type ReduceStatusEffect,
  type RestoreThirstEffect,
  type RestoreHpEffect,
  type ClearAllStatusesEffect,
  type ChanceInventoryEffect,
  type ChanceVitalsEffect,
} from "./item-effects";

// authoring + registry
export { Item } from "./item-builder";
export {
  defineItems,
  getItem,
  buildItemTraitIndex,
  isStashable,
  validateItemRegistryProblems,
  type ItemRegistry,
  type ItemTraitIndex,
} from "./item-registry";

// canonical content + lookups
export { ITEM_DEFINITIONS, ITEM_TRAIT_INDEX, getItemDef } from "./item-definitions";

// presentational helpers
export { reactsInto } from "./item-view";
