/**
 * Reactive wrapper over the pure status system (mirrors `stamina.svelte.ts`).
 * Owns the active-status list the HUD reads and persists it across refreshes.
 * Feedback/quest side effects are emitted as events and consumed by the RPG
 * feedback router, keeping this wrapper focused on state.
 *
 * The engine drives time: it calls `tickStatusEffects(dt)` each frame and
 * applies the returned hp delta to the player entity (this module never
 * touches health directly).
 */

import {
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
import { StorageKeys } from "$lib/domain/game-events";
import { playerRpgEntityId, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

export const statusState = $state<{ active: ActiveStatus[] }>({ active: [] });

export function applyStatusEffect(id: StatusId, durationSec: number, source?: string, nonLethal?: boolean): void {
  const had = statusState.active.some((s) => s.id === id);
  const list = applyStatus(statusState.active, id, durationSec, source);
  statusState.active = nonLethal
    ? list.map((s) => (s.id === id ? { ...s, nonLethal: true } : s))
    : list;
  if (!had) {
    rpgEventQueue.push({
      type: "status_added",
      entityId: playerRpgEntityId(),
      statusId: id,
      ...(source !== undefined ? { source } : {}),
    });
  }
  saveStatuses();
}

export function clearStatusEffect(id: StatusId): void {
  const had = statusState.active.some((s) => s.id === id);
  statusState.active = clearStatus(statusState.active, id);
  if (had) {
    rpgEventQueue.push({ type: "status_cleared", entityId: playerRpgEntityId(), statusId: id });
  }
  saveStatuses();
}

export function clearAllStatusEffects(): void {
  if (statusState.active.length === 0) return;
  statusState.active = [];
  rpgEventQueue.push({ type: "status_all_cleared", entityId: playerRpgEntityId() });
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
export function tickStatusEffects(dt: number): { hpDelta: number; nonLethalHpDelta: number } {
  tickAccumulator += dt;
  if (tickAccumulator < STATUS_TICK_INTERVAL_SEC) return { hpDelta: 0, nonLethalHpDelta: 0 };

  const slice = tickAccumulator;
  tickAccumulator = 0;

  const prev = statusState.active;
  const result = tickStatuses(prev, slice);
  const changed = result.next !== prev;
  if (changed) {
    statusState.active = result.next;
  }

  for (const id of result.pulses) {
    rpgEventQueue.push({ type: "status_pulsed", entityId: playerRpgEntityId(), statusId: id });
  }
  for (const id of result.expired) {
    rpgEventQueue.push({ type: "status_expired", entityId: playerRpgEntityId(), statusId: id });
  }
  if (changed) {
    saveStatuses();
  }

  return { hpDelta: result.hpDelta, nonLethalHpDelta: result.nonLethalHpDelta };
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

