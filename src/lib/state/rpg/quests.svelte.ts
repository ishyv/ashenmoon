import { INITIAL_QUESTS } from "$lib/domain/quests/quest-definitions";
import { advanceQuest } from "$lib/domain/quests/quest-system";
import type { Quest } from "$lib/domain/quests/quest-types";

export const activeQuests = $state<{
  currentQuestId: string | null;
  quests: Record<string, Quest>;
}>({
  currentQuestId: null, // null until Vane gives the first quest
  quests: { ...INITIAL_QUESTS },
});

export const dialogueState = $state<{
  activeNpc: { id: string; name: string } | null;
}>({
  activeNpc: null,
});

/**
 * Triggers quest events on player actions. Updates objectives accordingly.
 */
export function triggerQuestEvent(action: string, itemId?: string, amount = 1): void {
  const questId = activeQuests.currentQuestId;
  if (!questId) return;

  const quest = activeQuests.quests[questId];
  if (!quest) return;

  advanceQuest(quest, action, itemId, amount);
}
