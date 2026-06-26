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
} from "$lib/domain/knowledge/item-knowledge";
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";
import { StorageKeys } from "$lib/domain/game-events";

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

export const itemSourcesState = $state<{ map: Record<string, string[]> }>({ map: {} });

/** Record that the player discovered a source for a given item ID. */
export function discoverSource(itemId: string, sourceName: string): void {
  const normalizedSource = sourceName.toLowerCase().trim();
  const currentSources = itemSourcesState.map[itemId] || [];
  if (!currentSources.includes(normalizedSource)) {
    itemSourcesState.map[itemId] = [...currentSources, normalizedSource];
    saveItemSources();
  }
}

/** Get all discovered unique sources for an item ID. */
export function getKnownSources(itemId: string): readonly string[] {
  return itemSourcesState.map[itemId] || [];
}

export function loadItemSources(): void {
  itemSourcesState.map = loadSlice<Record<string, string[]>>(StorageKeys.itemSources, {});
}

function saveItemSources(): void {
  saveSlice(StorageKeys.itemSources, itemSourcesState.map);
}

export function loadKnowledge(): void {
  const snapshot = loadSlice<Record<string, readonly string[]>>(StorageKeys.knowledge, {});
  knowledgeState.map = deserializeKnowledge(snapshot);
  loadItemSources();
}

function saveKnowledge(): void {
  saveSlice(StorageKeys.knowledge, serializeKnowledge(knowledgeState.map));
}
