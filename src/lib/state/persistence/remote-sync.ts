/**
 * The single seam between the game and persisted RPG state. Every gather,
 * pickup, refuel, and build that must survive a reload goes through here.
 *
 * WHY this is isolated: today these POST to the local SvelteKit `/api/rpg/*`
 * route handlers, which persist via `rpgService`. Keeping all of it behind one module means the storage
 * strategy can change in ONE place without touching any gameplay system. Do not
 * call `fetch` for game state outside this file.
 *
 * Scope: this seam owns the server-backed core (profile/inventory/skills).
 * Locally persisted slices (survival, statuses, knowledge) go through
 * `src/lib/state/persistence/save-load.ts` instead.
 *
 * Behavior contract: fire-and-forget from the caller's view. Failures resolve to
 * `{ ok: false, error }` rather than throwing; callers surface their own
 * feedback. No retries or offline queue (a deliberate non-goal for now).
 */
import type { RpgPlayerState } from "$lib/domain/rpg-types";

export type MaterialGain = { id: string; quantity: number };

export type SyncResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function postJson<T>(url: string, body: unknown): Promise<SyncResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}) as { error?: string });
      return { ok: false, error: err?.error ?? "request failed" };
    }
    return { ok: true, data: (await res.json()) as T };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export interface GatherSync {
  playerState: RpgPlayerState;
  materialsGained: MaterialGain[];
  toolBroken: boolean;
}

/** Resource gather (mine/forest): one swing, one unit of the node's drop. */
export function syncGather(action: string, locationId: string): Promise<SyncResult<GatherSync>> {
  return postJson<GatherSync>("/api/rpg/gather", { action, locationId });
}

/** Ground pickup. `itemId` is the gathered item; `pickupId` the world entity id. */
export function syncPickup(
  itemId: string,
  pickupId: string,
  quantity = 1,
): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return postJson("/api/rpg/gather", { action: "pickup", locationId: itemId, pickupId, quantity });
}

/** Refuel the campfire (consumes wood server-side). */
export function syncRefuel(): Promise<SyncResult<{ playerState: RpgPlayerState }>> {
  return postJson("/api/rpg/gather", { action: "refuel", locationId: "campfire" });
}

/** Place a building; the server deducts materials and returns the new state. */
export function syncBuild(
  type: string,
  x: number,
  y: number,
): Promise<SyncResult<RpgPlayerState>> {
  return postJson<RpgPlayerState>("/api/rpg/build", { type, x, y });
}
