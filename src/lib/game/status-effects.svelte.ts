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
} from "$lib/rpg/systems/status-types";
import {
  aggregateModifiers,
  applyStatus,
  clearStatus,
  tickStatuses,
} from "$lib/rpg/systems/status-system";
import { GameEvent, StorageKeys } from "./game-events";
import { triggerQuestEvent } from "./quests.svelte";
import { emitPlayerFeedback } from "./player-feedback";

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
let tickAccumulator = 0;

/**
 * Advance statuses. Returns the hp delta from pulses this call (usually 0;
 * negative = damage) for the engine to apply to the player.
 */
export function tickStatusEffects(dt: number): { hpDelta: number } {
  tickAccumulator += dt;
  if (tickAccumulator < 1) return { hpDelta: 0 };

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
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(StorageKeys.statuses);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return;
    statusState.active = parsed.filter(
      (s): s is ActiveStatus =>
        s &&
        typeof s === "object" &&
        typeof s.id === "string" &&
        isStatusId(s.id) &&
        typeof s.remainingSec === "number" &&
        s.remainingSec > 0,
    );
  } catch (e) {
    console.error("Failed to load statuses:", e);
  }
}

function saveStatuses(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.statuses, JSON.stringify(statusState.active));
  } catch (e) {
    console.error("Failed to save statuses:", e);
  }
}
