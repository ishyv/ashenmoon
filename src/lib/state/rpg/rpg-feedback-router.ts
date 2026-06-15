import { GameEvent } from "$lib/domain/game-events";
import { createGameEventQueue, type QueuedGameEvent } from "$lib/domain/game-event-queue";
import { STATUS_DEFINITIONS, isStatusId } from "$lib/domain/systems/status-types";
import { playSound } from "$lib/audio/audio-engine";
import { learnRecipe } from "$lib/state/rpg/crafting.svelte";
import { triggerQuestEvent } from "$lib/state/rpg/quests.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";

export const rpgEventQueue = createGameEventQueue();

const PLAYER_ENTITY_ID = "player";

export function playerRpgEntityId(): string {
  return PLAYER_ENTITY_ID;
}

function routeStatusEvent(event: QueuedGameEvent): void {
  if (
    event.type !== "status_added" &&
    event.type !== "status_pulsed" &&
    event.type !== "status_expired" &&
    event.type !== "status_cleared"
  ) {
    return;
  }
  if (!isStatusId(event.statusId)) return;

  const definition = STATUS_DEFINITIONS[event.statusId];
  if (event.type === "status_added") {
    emitPlayerFeedback(`${definition.icon} ${definition.applyMessage}`, "danger");
    triggerQuestEvent(GameEvent.StatusApplied, event.statusId);
  } else if (event.type === "status_pulsed") {
    if (definition.pulseMessage) emitPlayerFeedback(definition.pulseMessage, "warning");
  } else if (event.type === "status_expired") {
    emitPlayerFeedback(definition.expireMessage, "info");
    triggerQuestEvent(GameEvent.StatusExpired, event.statusId);
  } else {
    emitPlayerFeedback(definition.expireMessage, "info");
  }
}

function routeWoundEvent(event: QueuedGameEvent): void {
  if (event.type === "wound_progressed" && event.progression === "infected") {
    emitPlayerFeedback("A wound turns hot and angry.", "danger");
  }
}

function routeCraftEvent(event: QueuedGameEvent): void {
  if (event.type === "item_crafted") {
    playSound("craft");
    learnRecipe(event.recipeId);
    triggerQuestEvent(GameEvent.Craft, event.recipeId);
  } else if (event.type === "recipe_discovered") {
    playSound("craft");
    learnRecipe(event.recipeId);
    triggerQuestEvent(GameEvent.Craft, event.recipeId);
  } else if (event.type === "craft_failed") {
    playSound("node.deplete");
  }
}

export function flushRpgFeedbackEvents(): readonly QueuedGameEvent[] {
  const events = rpgEventQueue.drain();
  for (const event of events) {
    if (event.type === "status_all_cleared") {
      emitPlayerFeedback("You feel completely restored.", "good");
      continue;
    }
    routeStatusEvent(event);
    routeWoundEvent(event);
    routeCraftEvent(event);
  }
  return events;
}
