/**
 * The single seam between core systems and persisted RPG state. Every gather,
 * pickup, refuel, and build that must survive a reload goes through here.
 *
 * Behavior contract: fire-and-forget from the caller's view. Failures resolve to
 * `{ ok: false, error }` rather than throwing; callers surface their own
 * feedback. No retries or offline queue (a deliberate non-goal for now).
 */
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import type { GatherSync, MaterialGain } from "$lib/domain/rpg-reducer";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";

export type { GatherSync, MaterialGain };

export type SyncResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function syncLocal<T>(fn: () => T | Promise<T>): Promise<SyncResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/** Resource gather (mine/forest): one swing, one unit of the node's drop. */
export function syncGather(action: string, locationId: string): Promise<SyncResult<GatherSync>> {
  if (action !== "mine" && action !== "forest") {
    return Promise.resolve({ ok: false, error: "Invalid gather action" });
  }
  return dispatchRpgCommand({ type: "gather", action, locationId }) as Promise<SyncResult<GatherSync>>;
}

/** Ground pickup. `itemId` is the gathered item; `pickupId` the world entity id. */
export function syncPickup(
  itemId: string,
  pickupId: string,
  quantity = 1,
): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return dispatchRpgCommand({ type: "pickup", itemId, pickupId, quantity }) as Promise<SyncResult<{ playerState: RpgPlayerState }>>;
}

/** Refuel the campfire (consumes wood from the local RPG save). */
export function syncRefuel(): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return dispatchRpgCommand({ type: "refuel" }) as Promise<SyncResult<{ playerState: RpgPlayerState }>>;
}

/** Place a building; deducts materials and returns the new local state. */
export function syncBuild(
  type: string,
  x: number,
  y: number,
  sourceItemId?: string,
): Promise<SyncResult<RpgPlayerState>> {
  return syncLocal(async () => {
    const result = await dispatchRpgCommand({
      type: "build",
      buildingType: type,
      x,
      y,
      ...(sourceItemId ? { sourceItemId } : {}),
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.playerState;
  });
}

/** Place an item; deducts the item from inventory and returns the new local state. */
export function syncPlaceItem(
  itemId: string,
  qty = 1,
  x?: number,
  y?: number,
): Promise<SyncResult<RpgPlayerState>> {
  return syncLocal(async () => {
    const result = await dispatchRpgCommand({
      type: "placeItem",
      itemId,
      quantity: qty,
      ...(typeof x === "number" ? { x } : {}),
      ...(typeof y === "number" ? { y } : {}),
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.playerState;
  });
}

/** Upgrade a building; deducts materials and returns the new local state. */
export function syncUpgradeBuilding(
  buildingId: string,
): Promise<SyncResult<RpgPlayerState>> {
  return syncLocal(async () => {
    const result = await dispatchRpgCommand({
      type: "upgradeBuilding",
      buildingId,
    });
    if (!result.ok) throw new Error(result.error);
    return result.data.playerState;
  });
}
