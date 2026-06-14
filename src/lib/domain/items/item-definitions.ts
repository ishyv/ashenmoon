import type { ItemDefinition } from "./item-types";
import { buildItemTraitIndex, defineItems } from "./item-registry";
import { allItemDefinitions } from "$lib/domain/definitions/items";

/**
 * The central registry of all item definitions in the game.
 *
 * This file acts as an orchestrator that aggregates definitions from the
 * categorized modules in `$lib/domain/definitions/items/`.
 */
export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = defineItems(allItemDefinitions);

/**
 * A reverse index for quickly finding which items have a specific trait.
 * Computed once at startup.
 */
export const ITEM_TRAIT_INDEX = buildItemTraitIndex(ITEM_DEFINITIONS);

/** Looks up a canonical item definition by id, or `undefined` if unknown. */
export function getItemDef(id: string): ItemDefinition | undefined {
  return ITEM_DEFINITIONS[id];
}
