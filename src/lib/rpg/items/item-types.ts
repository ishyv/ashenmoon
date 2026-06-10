import type { ItemTrait } from "./item-traits";

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
  Component = "component",
  Herb = "herb",
  Reagent = "reagent",
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
  traits: ItemTrait[];
  iconUrl?: string;
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

/**
 * Interface for legacy metadata compatibility during the migration phase.
 */
export interface LegacyItemMetadata {
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  category: "mineral" | "timber" | "tool" | "component" | "herb" | "reagent";
  flammable?: { ignitionTemp: number; burnDurationSec: number; transformsInto: string };
  temperatureSensitive?: {
    maxSafeTemp: number;
    minSafeTemp: number;
    onExceeded: "melt" | "spoil" | "ignite";
    transformsInto?: string;
  };
  decayable?: { lifespanSec: number; transformsInto: string };
  iconUrl?: string;
}