/**
 * Reactive knowledge orchestrator: holds the player's discovered item knowledge,
 * applies pure unlock rules, and persists through the state save layer. All
 * rules live in `rpg/knowledge/`; this only binds them to runtime state.
 */
import {
  deserializeKnowledge,
  EMPTY_KNOWLEDGE,
  inspectItem,
  learn,
  serializeKnowledge,
  type InspectView,
  type KnowledgeProperty,
  type PlayerKnowledge,
} from "$lib/rpg/knowledge/item-knowledge";
import { ITEM_DEFINITIONS } from "$lib/rpg/items";
import { loadSlice, saveSlice } from "$lib/state/save-load";
import { StorageKeys } from "./game-events";

export const knowledgeState = $state<{ map: PlayerKnowledge }>({ map: EMPTY_KNOWLEDGE });

/** Record that the player has learned the given properties about an item. */
export function learnAbout(itemId: string, ...properties: KnowledgeProperty[]): void {
  const next = learn(knowledgeState.map, itemId, ...properties);
  if (next !== knowledgeState.map) {
    knowledgeState.map = next;
    saveKnowledge();
  }
}

/** Inspect view-model (known vs unknown facts) for an item, or null if unknown id. */
export function inspect(itemId: string): InspectView | null {
  const def = ITEM_DEFINITIONS[itemId];
  return def ? inspectItem(def, knowledgeState.map) : null;
}

export function loadKnowledge(): void {
  const snapshot = loadSlice<Record<string, readonly string[]>>(StorageKeys.knowledge, {});
  knowledgeState.map = deserializeKnowledge(snapshot);
}

function saveKnowledge(): void {
  saveSlice(StorageKeys.knowledge, serializeKnowledge(knowledgeState.map));
}
