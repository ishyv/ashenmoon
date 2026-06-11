/**
 * Save-format versioning. Every locally persisted slice is wrapped in a
 * `Versioned<T>` envelope so the storage format can evolve without silently
 * corrupting older saves. `migrateSlice` brings any stored payload (including
 * legacy unversioned ones written before the envelope existed) up to the
 * current `SAVE_VERSION`.
 *
 * Pure: no localStorage, no I/O. The save-load layer owns the storage calls.
 */

/** Current on-disk save version. Bump when a slice's shape changes. */
export const SAVE_VERSION = 1;

/** A persisted value tagged with the version it was written under. */
export interface Versioned<T> {
  readonly v: number;
  readonly data: T;
}

/** True if `raw` already carries a version envelope. */
export function isVersioned(raw: unknown): raw is Versioned<unknown> {
  return (
    !!raw &&
    typeof raw === "object" &&
    "v" in raw &&
    "data" in raw &&
    typeof (raw as { v: unknown }).v === "number"
  );
}

/**
 * Normalize any stored payload to the current save version.
 *
 * - Versioned payloads run through the upgrade chain (a no-op at v1).
 * - Legacy unversioned payloads are adopted as-is; v1 introduced the envelope,
 *   so a bare value is by definition pre-v1 data in its v1 shape.
 *
 * Domain validation (clamping, filtering invalid entries) stays in the calling
 * orchestrator; this only handles the version envelope.
 */
export function migrateSlice<T>(raw: unknown): Versioned<T> {
  if (isVersioned(raw)) {
    let data = raw.data as T;
    // Upgrade chain for future versions, e.g.:
    //   if (raw.v < 2) data = upgradeV1toV2(data);
    return { v: SAVE_VERSION, data };
  }
  return { v: SAVE_VERSION, data: raw as T };
}
