/**
 * Pure status-effect logic: applying, clearing, ticking, and aggregating
 * modifiers. No reactive state, no rendering — the caller (the engine via
 * `status-effects.svelte.ts`) owns when ticks happen and what feedback plays.
 *
 * INVARIANT: at most one ActiveStatus per StatusId; re-applying refreshes the
 * duration (taking the longer of the two) instead of stacking.
 */

import {
  STATUS_DEFINITIONS,
  StatusId,
  type ActiveStatus,
} from "./status-types";

/** Result of advancing statuses by a time slice. */
export interface StatusTickResult {
  next: ActiveStatus[];
  /** Statuses that ran out during this tick (each reported exactly once). */
  expired: StatusId[];
  /** Statuses whose pulse fired during this tick. */
  pulses: StatusId[];
  /** Total hp change from lethal pulses this tick (negative = damage, can reach 0). */
  hpDelta: number;
  /** Total hp change from non-lethal pulses this tick (negative = damage, floors at 1). */
  nonLethalHpDelta: number;
}

export function applyStatus(
  list: ActiveStatus[],
  id: StatusId,
  durationSec: number,
  source?: string,
): ActiveStatus[] {
  const existing = list.find((s) => s.id === id);
  if (existing) {
    return list.map((s) =>
      s.id === id
        ? { ...s, remainingSec: Math.max(s.remainingSec, durationSec), ...(source !== undefined ? { source } : {}) }
        : s,
    );
  }
  return [...list, { id, remainingSec: durationSec, ...(source !== undefined ? { source } : {}) }];
}

export function clearStatus(list: ActiveStatus[], id: StatusId): ActiveStatus[] {
  if (!list.some((s) => s.id === id)) return list;
  return list.filter((s) => s.id !== id);
}

export function hasStatus(list: ActiveStatus[], id: StatusId): boolean {
  return list.some((s) => s.id === id);
}

/**
 * Advance all statuses by `dtSec`. Pulse cadence is derived from remaining
 * time: a pulse fires whenever the countdown crosses a multiple of
 * `pulseEverySec`, so cadence stays correct across uneven tick sizes.
 */
export function tickStatuses(list: ActiveStatus[], dtSec: number): StatusTickResult {
  if (list.length === 0 || dtSec <= 0) {
    return { next: list, expired: [], pulses: [], hpDelta: 0, nonLethalHpDelta: 0 };
  }

  const next: ActiveStatus[] = [];
  const expired: StatusId[] = [];
  const pulses: StatusId[] = [];
  let hpDelta = 0;
  let nonLethalHpDelta = 0;

  for (const status of list) {
    const def = STATUS_DEFINITIONS[status.id];
    const before = status.remainingSec;
    const after = before - dtSec;

    if (def.pulse && def.pulseEverySec && def.pulseEverySec > 0) {
      // Number of pulse boundaries crossed in [after, before).
      const crossed =
        Math.ceil(before / def.pulseEverySec) - Math.ceil(Math.max(after, 0) / def.pulseEverySec);
      if (crossed > 0) {
        pulses.push(status.id);
        const delta = (def.pulse.hpDelta ?? 0) * crossed;
        if (status.nonLethal) {
          nonLethalHpDelta += delta;
        } else {
          hpDelta += delta;
        }
      }
    }

    if (after <= 0) {
      expired.push(status.id);
    } else {
      next.push({ ...status, remainingSec: after });
    }
  }

  return { next, expired, pulses, hpDelta, nonLethalHpDelta };
}

/** Combined continuous modifiers from every active status. */
export function aggregateModifiers(list: ActiveStatus[]): {
  staminaRegenMult: number;
  moveSpeedMult: number;
} {
  let staminaRegenMult = 1;
  let moveSpeedMult = 1;
  for (const status of list) {
    const mods = STATUS_DEFINITIONS[status.id].modifiers;
    if (!mods) continue;
    if (mods.staminaRegenMult !== undefined) staminaRegenMult *= mods.staminaRegenMult;
    if (mods.moveSpeedMult !== undefined) moveSpeedMult *= mods.moveSpeedMult;
  }
  return { staminaRegenMult, moveSpeedMult };
}
