/**
 * Reactive binding between live game state and the pure reaction processors.
 * Listens for environment changes and applies temperature / ambient-ignition
 * reactions to the player's inventory. All decision logic lives in the pure
 * `item-reactions.ts`; this file only wires it to game state and the event bus.
 *
 * The reaction *rules* themselves stay pure and game-free in `item-reactions.ts`.
 */
import { evaluateEnvironmentalExposure } from "./item-reactions";
import { onEnvironmentChanged, type EnvironmentChangedEvent } from "./environment-system";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgInventory } from "$lib/state/rpg-actions.svelte";

/** Applies environmental reactions (temperature, flammability) when the environment shifts. */
export function onEnvironmentChangedEvent(event: EnvironmentChangedEvent): void {
  const inventory = gameState.rpg.inventory;
  if (!inventory) return;
  if (event.previous.temperature === event.current.temperature) return;

  const { inventory: next } = evaluateEnvironmentalExposure(inventory, {
    location: "pack",
    ambientTemp: event.current.temperature,
    radiantHeat: 0,
  });

  if (next !== inventory) {
    setRpgInventory(next);
  }
}


// Global listener registration for the item reaction system.
onEnvironmentChanged(onEnvironmentChangedEvent);
