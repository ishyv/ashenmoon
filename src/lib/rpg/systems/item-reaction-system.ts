/**
 * Reactive binding between live game state and the pure reaction processors.
 * Listens for environment changes and applies temperature / ambient-ignition
 * reactions to the player's inventory. All decision logic lives in the pure
 * `item-reactions.ts`; this file only wires it to `rpgState` and the event bus.
 *
 * Layering note: importing `rpgState` (game layer) here is an existing seam, the
 * reaction *rules* themselves stay pure and game-free in `item-reactions.ts`.
 */
import { processFlammableReactions, processTemperatureReactions } from "./item-reactions";
import { onEnvironmentChanged, type EnvironmentChangedEvent } from "./environment-system";
import { rpgState } from "../../game/rpg-state.svelte";

/** Applies temperature + ambient-ignition reactions when the environment shifts. */
export function onEnvironmentChangedEvent(event: EnvironmentChangedEvent): void {
  const inventory = rpgState.inventory;
  if (!inventory) return;
  if (event.previous.temperature === event.current.temperature) return;

  const temperature = event.current.temperature;
  let next = inventory;

  next = processTemperatureReactions(next, temperature).inventory;

  // Ambient ignition: items carried in a pack ignite only when the surrounding
  // air itself reaches their ignition point (a blight/ember zone). Radiant heat
  // from a nearby campfire is a separate, placed-near-fire path.
  next = processFlammableReactions(next, {
    location: "pack",
    ambientTemp: temperature,
    nearFire: false,
  }).inventory;

  if (next !== inventory) {
    rpgState.inventory = next;
  }
}

// Global listener registration for the item reaction system.
onEnvironmentChanged(onEnvironmentChangedEvent);
