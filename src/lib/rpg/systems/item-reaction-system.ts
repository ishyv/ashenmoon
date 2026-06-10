import { ITEM_DEFINITIONS, ITEM_TRAIT_INDEX } from "../items/item-definitions";
import type { TemperatureSensitiveTrait } from "../items/item-traits";
import { applyItemEffectToInventory } from "./item-effect-system";
import { onEnvironmentChanged, type EnvironmentChangedEvent } from "./environment-system";
import { rpgState } from "../../game/rpg-state.svelte";

/**
 * Type guard for identifying temperature sensitive traits within an item definition.
 */
function isTemperatureSensitiveTrait(
  trait: TemperatureSensitiveTrait | { kind: string },
): trait is TemperatureSensitiveTrait {
  return trait.kind === "temperature_sensitive";
}

/**
 * Processes inventory reactions triggered by ambient temperature changes.
 * Iterates through relevant items indexed by trait to minimize performance overhead.
 */
function processTemperatureChange(currentTemp: number): void {
  const inventory = rpgState.inventory;
  if (!inventory) return;

  let nextInventory = inventory;

  // Optimized loop: only checks items known to be temperature sensitive
  for (const itemId of ITEM_TRAIT_INDEX.temperatureSensitive) {
    const slot = nextInventory.slots[itemId];
    if (!slot || !("qty" in slot) || slot.qty <= 0) continue;

    const definition = ITEM_DEFINITIONS[itemId];
    if (!definition) continue;

    const trait = definition.traits.find(isTemperatureSensitiveTrait);
    if (!trait) continue;

    // Check hazard boundaries
    const tooHot = currentTemp > trait.maxSafeTemp;
    const tooCold = currentTemp < trait.minSafeTemp;
    if (!tooHot && !tooCold) continue;

    // Apply the defined effect (e.g., transform, destroy)
    const updatedInventory = applyItemEffectToInventory(nextInventory, itemId, trait.effect);
    if (updatedInventory !== nextInventory) {
      nextInventory = updatedInventory;
    }
  }

  // Update global state only if mutations occurred
  if (nextInventory !== inventory) {
    rpgState.inventory = nextInventory;
  }
}

/**
 * Event handler for environment updates.
 */
export function onEnvironmentChangedEvent(event: EnvironmentChangedEvent): void {
  if (event.previous.temperature !== event.current.temperature) {
    processTemperatureChange(event.current.temperature);
  }
}

// Global listener registration for the item reaction system
onEnvironmentChanged(onEnvironmentChangedEvent);
