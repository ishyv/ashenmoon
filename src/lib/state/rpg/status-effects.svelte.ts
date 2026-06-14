/**
 * Reactive wrapper over the pure status system (mirrors `stamina.svelte.ts`).
 * Owns the active-status list the HUD reads, persists it across refreshes,
 * and emits symptom feedback + quest events when statuses land/expire.
 *
 * The engine drives time: it calls `tickStatusEffects(dt)` each frame and
 * applies the returned hp delta to the player entity (this module never
 * touches health directly).
 */

import {
  STATUS_DEFINITIONS,
  isStatusId,
  type ActiveStatus,
  type StatusId,
} from "$lib/domain/systems/status-types";
import {
  aggregateModifiers,
  applyStatus,
  clearStatus,
  tickStatuses,
} from "$lib/domain/systems/status-system";
import { GameEvent, StorageKeys } from "$lib/domain/game-events";
import { triggerQuestEvent } from "$lib/state/rpg/quests.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

export const statusState = $state<{ active: ActiveStatus[] }>({ active: [] });

export function applyStatusEffect(id: StatusId, durationSec: number, source?: string): void {
  const had = statusState.active.some((s) => s.id === id);
  statusState.active = applyStatus(statusState.active, id, durationSec, source);
  if (!had) {
    const def = STATUS_DEFINITIONS[id];
    emitPlayerFeedback(`${def.icon} ${def.applyMessage}`, "danger");
    triggerQuestEvent(GameEvent.StatusApplied, id);
  }
  saveStatuses();
}

export function clearStatusEffect(id: StatusId): void {
  const had = statusState.active.some((s) => s.id === id);
  statusState.active = clearStatus(statusState.active, id);
  if (had) {
    emitPlayerFeedback(STATUS_DEFINITIONS[id].expireMessage, "info");
  }
  saveStatuses();
}

export function clearAllStatusEffects(): void {
  if (statusState.active.length === 0) return;
  statusState.active = [];
  emitPlayerFeedback("You feel completely restored.", "good");
  saveStatuses();
}

/** Current combined modifiers (stamina regen, move speed) from active statuses. */
export function getStatusModifiers(): { staminaRegenMult: number; moveSpeedMult: number } {
  return aggregateModifiers(statusState.active);
}

// Statuses advance once per accumulated second — pulse/expiry feedback doesn't
// need frame resolution, and this keeps per-frame work near zero.
const STATUS_TICK_INTERVAL_SEC = 1;
let tickAccumulator = 0;

/**
 * Advance statuses. Returns the hp delta from pulses this call (usually 0;
 * negative = damage) for the engine to apply to the player.
 */
export function tickStatusEffects(dt: number): { hpDelta: number } {
  tickAccumulator += dt;
  if (tickAccumulator < STATUS_TICK_INTERVAL_SEC) return { hpDelta: 0 };

  const slice = tickAccumulator;
  tickAccumulator = 0;

  const prev = statusState.active;
  const result = tickStatuses(prev, slice);
  const changed = result.next !== prev;
  if (changed) {
    statusState.active = result.next;
  }

  for (const id of result.pulses) {
    const msg = STATUS_DEFINITIONS[id].pulseMessage;
    if (msg) emitPlayerFeedback(msg, "warning");
  }
  for (const id of result.expired) {
    emitPlayerFeedback(STATUS_DEFINITIONS[id].expireMessage, "info");
    triggerQuestEvent(GameEvent.StatusExpired, id);
  }
  if (changed) {
    saveStatuses();
  }

  return { hpDelta: result.hpDelta };
}

export function loadStatuses(): void {
  const stored = loadSlice<unknown[]>(StorageKeys.statuses, []);
  if (!Array.isArray(stored)) return;
  statusState.active = stored.filter((s): s is ActiveStatus => {
    if (!s || typeof s !== "object") return false;
    const rec = s as Record<string, unknown>;
    return (
      typeof rec.id === "string" &&
      isStatusId(rec.id) &&
      typeof rec.remainingSec === "number" &&
      rec.remainingSec > 0
    );
  });
}

function saveStatuses(): void {
  saveSlice(StorageKeys.statuses, statusState.active);
}

