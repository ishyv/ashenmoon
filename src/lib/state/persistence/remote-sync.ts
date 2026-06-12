/**
 * The single seam between core systems and persisted RPG state. Every gather,
 * pickup, refuel, and build that must survive a reload goes through here.
 *
 * Behavior contract: fire-and-forget from the caller's view. Failures resolve to
 * `{ ok: false, error }` rather than throwing; callers surface their own
 * feedback. No retries or offline queue (a deliberate non-goal for now).
 */
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { localRpgCommands, type GatherSync, type MaterialGain } from "$lib/state/persistence/rpg-commands";

export type { GatherSync, MaterialGain };

export type SyncResult<T> = { ok: true; data: T } | { ok: false; error: string };

function syncLocal<T>(fn: () => T): Promise<SyncResult<T>> {
  try {
    return Promise.resolve({ ok: true, data: fn() });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Promise.resolve({ ok: false, error: message });
  }
}

/** Resource gather (mine/forest): one swing, one unit of the node's drop. */
export function syncGather(action: string, locationId: string): Promise<SyncResult<GatherSync>> {
  if (action !== "mine" && action !== "forest") {
    return Promise.resolve({ ok: false, error: "Invalid gather action" });
  }
  return syncLocal(() => localRpgCommands.gather(action, locationId));
}

/** Ground pickup. `itemId` is the gathered item; `pickupId` the world entity id. */
export function syncPickup(
  itemId: string,
  pickupId: string,
  quantity = 1,
): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return syncLocal(() => ({ playerState: localRpgCommands.pickup(itemId, pickupId, quantity).playerState }));
}

/** Refuel the campfire (consumes wood from the local RPG save). */
export function syncRefuel(): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return syncLocal(() => ({ playerState: localRpgCommands.refuel().playerState }));
}

/** Place a building; deducts materials and returns the new local state. */
export function syncBuild(
  type: string,
  x: number,
  y: number,
): Promise<SyncResult<RpgPlayerState>> {
  return syncLocal(() => localRpgCommands.build(type, x, y));
}

/** Place an item; deducts the item from inventory and returns the new local state. */
export function syncPlaceItem(
  itemId: string,
  qty = 1,
): Promise<SyncResult<RpgPlayerState>> {
  return syncLocal(() => localRpgCommands.placeItem(itemId, qty));
}
