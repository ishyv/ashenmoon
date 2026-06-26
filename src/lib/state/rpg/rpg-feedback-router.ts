import { GameEvent } from "$lib/domain/game-events";
import { createGameEventQueue, type QueuedGameEvent } from "$lib/domain/game-event-queue";
import { STATUS_DEFINITIONS, isStatusId } from "$lib/domain/systems/status-types";
import { playSound } from "$lib/audio/audio-engine";
import { learnRecipe, recipeKnowledge } from "$lib/state/rpg/crafting.svelte";
import { CRAFT_RECIPES, getRecipe } from "$lib/domain/crafting/recipes";
import { triggerQuestEvent } from "$lib/state/rpg/quests.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { learnAbout, discoverSource } from "$lib/state/rpg/knowledge.svelte";
import { propertyFromReaction, eurekaRecipesFor } from "$lib/domain/knowledge/knowledge-unlock";

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

    // Eureka: crafting something may reveal a recipe that uses the new item as
    // an ingredient. We roll once per craft; on success we teach one new recipe
    // and fire a visible bark so the discovery feels earned.
    const eurekaIds = eurekaRecipesFor(
      event.itemId,
      recipeKnowledge.known,
      CRAFT_RECIPES,
      Math.random,
    );
    for (const id of eurekaIds) {
      learnRecipe(id);
      const recipe = getRecipe(id);
      if (recipe) {
        emitPlayerFeedback(`✨ Eureka! You figure out how to make ${recipe.name}.`, "good");
      }
    }
  } else if (event.type === "recipe_discovered") {
    playSound("craft");
    learnRecipe(event.recipeId);
    emitPlayerFeedback(`blueprint studied. recipe unlocked.`, "good");
    triggerQuestEvent(GameEvent.Craft, event.recipeId);
  } else if (event.type === "craft_failed") {
    playSound("node.deplete");
  }
}

/**
 * Teach the player a KnowledgeProperty when an item in their inventory reacts
 * to the environment. The reaction binding (item-reaction-binding.ts) emits
 * item_reacted events; we resolve them here to keep state imports out of core.
 */
function routeReactionKnowledgeEvent(event: QueuedGameEvent): void {
  if (event.type !== "item_reacted") return;
  const prop = propertyFromReaction(event.reactionKind);
  learnAbout(event.itemId, prop);
  // Emit a terse flavour bark so the player knows something just happened.
  const barkMap: Record<typeof event.reactionKind, string> = {
    temperature: `The item reacted to the heat.`,
    flammable: `Something in your pack caught fire.`,
    decay: `Something in your pack has spoiled.`,
  };
  emitPlayerFeedback(barkMap[event.reactionKind], "warning");
}

/**
 * Silently record that the player discovered a new source for an item.
 * No bark — the player already received feedback from the gather animation
 * and floating text. This is quiet background knowledge bookkeeping.
 */
function routeGatheredEvent(event: QueuedGameEvent): void {
  if (event.type !== "item_gathered") return;
  discoverSource(event.itemId, event.sourceName);
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
    routeReactionKnowledgeEvent(event);
    routeGatheredEvent(event);
  }
  return events;
}
