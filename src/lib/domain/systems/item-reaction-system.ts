/**
 * Reactive binding between live game state and the pure reaction processors.
 * Listens for environment changes and applies temperature / ambient-ignition
 * reactions to the player's inventory. All decision logic lives in the pure
 * `item-reactions.ts`; this file only wires it to `rpgState` and the event bus.
 *
 * Layering note: importing `rpgState` (game layer) here is an existing seam, the
 * reaction *rules* themselves stay pure and game-free in `item-reactions.ts`.
 */
import { evaluateEnvironmentalExposure } from "./item-reactions";
import { onEnvironmentChanged, type EnvironmentChangedEvent } from "./environment-system";
import { rpgState } from "$lib/state/rpg-state.svelte";

/** Applies environmental reactions (temperature, flammability) when the environment shifts. */
export function onEnvironmentChangedEvent(event: EnvironmentChangedEvent): void {
  const inventory = rpgState.inventory;
  if (!inventory) return;
  if (event.previous.temperature === event.current.temperature) return;

  const { inventory: next } = evaluateEnvironmentalExposure(inventory, {
    location: "pack",
    ambientTemp: event.current.temperature,
    nearFire: false,
  });

  if (next !== inventory) {
    rpgState.inventory = next;
  }
}


// Global listener registration for the item reaction system.
onEnvironmentChanged(onEnvironmentChangedEvent);
