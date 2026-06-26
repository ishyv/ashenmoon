import { INITIAL_QUESTS } from "$lib/domain/quests/quest-definitions";
import { advanceQuest } from "$lib/domain/quests/quest-system";
import type { Quest } from "$lib/domain/quests/quest-types";
import { GameEvent } from "$lib/domain/game-events";

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
 * Session-level first-loop progress flags used by the engine to gate the
 * first-night omen. Lives here so domain state drives presentation, not
 * the other way round.
 */
export const firstLoopProgress = $state<{
  cleanWaterDrunk: boolean;
  campfireWoken: boolean;
}>({
  cleanWaterDrunk: false,
  campfireWoken: false,
});

/**
 * Triggers quest events on player actions. Updates objectives accordingly.
 * Also tracks first-loop milestones for the omen system.
 */
export function triggerQuestEvent(action: string, itemId?: string, amount = 1): void {
  const questId = activeQuests.currentQuestId;
  if (!questId) return;

  const quest = activeQuests.quests[questId];
  if (!quest) return;

  advanceQuest(quest, action, itemId, amount);

  // Track first-loop milestones for omen gating.
  if (action === GameEvent.Consume && itemId === "clean_water") {
    firstLoopProgress.cleanWaterDrunk = true;
  }
  if (action === GameEvent.Refuel) {
    firstLoopProgress.campfireWoken = true;
  }
}
