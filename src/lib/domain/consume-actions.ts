/**
 * Client-side consume orchestrator: the UI's "Drink"/"Eat" button calls
 * `consumeItem()`, which rolls the outcome via the pure consume system, removes
 * one unit from the local inventory, and routes holder commands to survival/
 * status/health state. Consumption is client-local in this slice (matching the
 * dev-give flow); server persistence is a deliberate follow-up.
 */
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { getConsumableTrait, resolveConsume } from "$lib/domain/systems/consume-system";
import { removeStackQty } from "$lib/domain/systems/inventory-system";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgInventory } from "$lib/state/rpg-actions.svelte";
import { restoreThirst } from "$lib/domain/survival.svelte";
import {
  applyStatusEffect,
  clearAllStatusEffects,
  clearStatusEffect,
  statusState,
} from "$lib/domain/status-effects.svelte";
import { emitPlayerFeedback, emitPlayerHpDelta } from "$lib/ui/player-feedback";
import { triggerQuestEvent } from "$lib/domain/quests.svelte";
import { GameEvent } from "$lib/domain/game-events";
import { playSound } from "$lib/audio/audio-engine";
import { learnAbout } from "$lib/domain/knowledge.svelte";
import { propertiesFromConsume } from "$lib/domain/knowledge/knowledge-unlock";


/** Whether one unit of this item can be consumed right now. */
export function canConsume(itemId: string): boolean {
  const def = ITEM_DEFINITIONS[itemId];
  if (!def || !getConsumableTrait(def)) return false;
  const slot = gameState.rpg.inventory?.slots[itemId];
  return !!slot && "qty" in slot && slot.qty >= 1;
}

/** The consume verb for an item ("drink"/"eat"), or null if not consumable. */
export function getConsumeVerb(itemId: string): "drink" | "eat" | null {
  const def = ITEM_DEFINITIONS[itemId];
  return def ? (getConsumableTrait(def)?.verb ?? null) : null;
}

/**
 * Consume one unit. Returns false (with player-facing failure feedback) when
 * the item isn't consumable or isn't in the inventory.
 */
export function consumeItem(itemId: string, rng: () => number = Math.random): boolean {
  const def = ITEM_DEFINITIONS[itemId];
  if (!def) return false;

  if (!canConsume(itemId)) {
    emitPlayerFeedback("You have none left.", "warning");
    return false;
  }

  const outcome = resolveConsume(def, rng);
  if (!outcome) return false;

  if (!gameState.rpg.inventory) return false;
  setRpgInventory(removeStackQty(gameState.rpg.inventory, itemId, 1));

  playSound("consume");
  emitPlayerFeedback(
    outcome.verb === "drink" ? `You drink the ${def.name.toLowerCase()}.` : `You eat the ${def.name.toLowerCase()}.`,
    "info",
  );

  let harmed = false;
  let restoredThirst = false;
  for (const command of outcome.holderCommands) {
    switch (command.kind) {
      case "restore_thirst":
        restoreThirst(command.amount);
        restoredThirst = true;
        break;
      case "restore_hp":
        emitPlayerHpDelta(command.amount);
        break;
      case "damage":
        emitPlayerHpDelta(-command.amount);
        harmed = true;
        break;
      case "add_status":
        // source = the consumed item, so knowledge auto-memory can attribute it.
        applyStatusEffect(command.status, command.durationSec, itemId);
        harmed = true;
        break;
      case "clear_all_statuses":
        clearAllStatusEffects();
        break;
    }
  }

  // Discovery: consuming an item teaches what you just experienced of it.
  learnAbout(itemId, ...propertiesFromConsume({ harmed, restoredThirst }));

  triggerQuestEvent(GameEvent.Consume, itemId);
  return true;
}
