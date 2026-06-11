/**
 * The localStorage seam for player-state slices. Orchestrators (`survival`,
 * `status-effects`, knowledge) read and write through here instead of touching
 * `localStorage` and `JSON` directly, so storage mechanics, SSR guards, and
 * versioning live in one place.
 *
 * Each slice is stored under its own key (see `StorageKeys`) wrapped in a
 * `Versioned<T>` envelope. Server-backed core state (profile/inventory/skills)
 * is NOT handled here, that flows through `src/lib/game/persistence.ts` to the
 * `/api/rpg/*` endpoints.
 */
import { migrateSlice, SAVE_VERSION, type Versioned } from "./migrations";

/** Returns the Storage object when available (browser only), else null. */
function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Read a slice, returning `fallback` when absent, unparseable, or running
 * server-side. Legacy unversioned payloads are migrated transparently. Domain
 * validation is the caller's job.
 */
export function loadSlice<T>(key: string, fallback: T): T {
  const s = storage();
  if (!s) return fallback;
  try {
    const stored = s.getItem(key);
    if (stored === null) return fallback;
    const migrated = migrateSlice<T>(JSON.parse(stored));
    return migrated.data ?? fallback;
  } catch (e) {
    console.error(`failed to load save slice "${key}":`, e);
    return fallback;
  }
}

/** Write a slice under the current save version. No-op server-side. */
export function saveSlice<T>(key: string, data: T): void {
  const s = storage();
  if (!s) return;
  try {
    const envelope: Versioned<T> = { v: SAVE_VERSION, data };
    s.setItem(key, JSON.stringify(envelope));
  } catch (e) {
    console.error(`failed to save slice "${key}":`, e);
  }
}

/** Remove a slice. No-op server-side. */
export function clearSlice(key: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(key);
  } catch (e) {
    console.error(`failed to clear slice "${key}":`, e);
  }
}
