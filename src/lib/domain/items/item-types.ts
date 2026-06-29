import type { ItemTrait } from "./item-traits";
import type { WorldVisualSizeSpec } from "$lib/domain/visual/world-visual-size";

/**
 * Rarity levels for items, influencing drop rates and visual presentation.
 */
export enum Rarity {
  Common = "common",
  Uncommon = "uncommon",
  Rare = "rare",
  Legendary = "legendary",
}

/**
 * Broad categories for items defining their primary use-case or origin.
 */
export enum Category {
  Mineral = "mineral",
  Timber = "timber",
  Tool = "tool",
  Weapon = "weapon",
  Component = "component",
  Herb = "herb",
  Reagent = "reagent",
  Food = "food",
  Medicine = "medicine",
  Fuel = "fuel_fire",
  Container = "container",
  Clothing = "clothing",
  Structure = "structure",
  Knowledge = "knowledge",
}

/**
 * How an item is carried, from least to most cumbersome:
 * - `pocket`: tiny, always carriable (herbs, vials, ore chips).
 * - `pack`: normal stashable goods (the default).
 * - `haul`: too large/heavy for the grid; carried physically or world-placed.
 */
export type CarryClass = "pocket" | "pack" | "haul";

/** Carry class assumed when an item definition does not specify one. */
export const DEFAULT_CARRY_CLASS: CarryClass = "pack";

export interface ItemPhysicalProperties {
  carryClass: CarryClass;
  weight: number;
  stackLimit?: number;
}

export interface ItemVisualProperties {
  /** World/ground sprite target size. Used for placed items and drops. */
  ground?: WorldVisualSizeSpec;
  /** Equipped attachment target size. Used by player loadout sprites. */
  equipped?: WorldVisualSizeSpec;
}

/** Resolves an item's carry class, falling back to the default. */
export function carryClassOf(def: Pick<ItemDefinition, "physical">): CarryClass {
  return def.physical.carryClass;
}

/**
 * Branded string type for Item IDs to prevent accidental string aliasing.
 */
export type ItemId = string & { readonly __brand: "ItemId" };

/**
 * Factory for creating branded ItemId values.
 */
export function itemId(value: string): ItemId {
  return value as ItemId;
}

/**
 * The static definition of an item, describing its identity and capabilities (traits).
 * Definitions remain pure data and do not hold mutable game state.
 */
export interface ItemDefinition {
  id: ItemId;
  name: string;
  description: string;
  rarity: Rarity;
  category: Category;
  physical: ItemPhysicalProperties;
  visual?: ItemVisualProperties;
  traits: ItemTrait[];
  /** Emoji placeholder, shown when no iconUrl is set. Lets items read at a glance before art exists. */
  icon?: string;
}

/**
 * A specific instance of an item in a player's possession.
 * Holds runtime state like durability or quantity.
 */
export interface ItemInstance {
  instanceId: string;
  itemId: ItemId;
  qty?: number;
  durability?: number;
  createdAt?: number;
  metadata?: Record<string, unknown>;
}
