/**
 * Reactive binding between live game state and the pure reaction processors.
 * Listens for environment changes and applies temperature / ambient-ignition
 * reactions to the player's inventory. All decision logic lives in the pure
 * `item-reactions.ts`; this file only wires it to game state and the event bus.
 *
 * WHY item_reacted events: the pure layer returns a reactions[] list but has no
 * access to the event queue or knowledge state. We push item_reacted here so the
 * feedback router can teach the matching KnowledgeProperty without this binding
 * needing to know anything about knowledge internals.
 *
 * The reaction *rules* themselves stay pure and game-free in `item-reactions.ts`.
 */
import { evaluateEnvironmentalExposure } from "$lib/domain/systems/item-reactions";
import { onEnvironmentChanged, type EnvironmentChangedEvent } from "$lib/domain/systems/environment-system";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgInventory } from "$lib/state/rpg-actions.svelte";
import { rpgEventQueue, playerRpgEntityId } from "$lib/state/rpg/rpg-feedback-router";

/** Applies environmental reactions (temperature, flammability) when the environment shifts. */
export function onEnvironmentChangedEvent(event: EnvironmentChangedEvent): void {
  const inventory = gameState.rpg.inventory;
  if (!inventory) return;
  if (event.previous.temperature === event.current.temperature) return;

  const { inventory: next, reactions } = evaluateEnvironmentalExposure(inventory, {
    location: "pack",
    ambientTemp: event.current.temperature,
    radiantHeat: 0,
  });

  if (next !== inventory) {
    setRpgInventory(next);
  }

  // Teach the player what they just witnessed. Each reacted item emits one
  // item_reacted event; the feedback router maps reactionKind → KnowledgeProperty.
  const actorId = playerRpgEntityId();
  for (const reaction of reactions) {
    rpgEventQueue.push({
      type: "item_reacted",
      actorId,
      itemId: reaction.itemId,
      reactionKind: reaction.kind,
    });
  }
}


// Global listener registration for the item reaction system.
onEnvironmentChanged(onEnvironmentChangedEvent);
