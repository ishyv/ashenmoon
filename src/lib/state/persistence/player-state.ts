/**
 * Serializable player-state types: the canonical description of what a save
 * contains. The reactive orchestrators in `src/lib/domain/*.svelte.ts` and
 * `src/lib/state/*.svelte.ts` own the
 * live runtime state; this module describes the snapshot that gets persisted
 * and hydrated.
 *
 * Layering note: the server-backed core (`RpgPlayerState`) lives in
 * `src/lib/domain/rpg-types.ts` and is imported type-only here.
 */
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { SAVE_VERSION } from "$lib/state/persistence/migrations";

export { SAVE_VERSION };

/** Locally persisted hydration/thirst slice. */
export interface SurvivalSnapshot {
  readonly thirst: number;
}

/** A persisted active status effect. Mirrors status-system's `ActiveStatus`. */
export interface StatusSnapshot {
  readonly id: string;
  readonly remainingSec: number;
  readonly source?: string;
}

/**
 * Discovered item knowledge: item id -> the set of property keys the player has
 * learned (taste, toxicity, flammability hints, ...). Populated by the
 * knowledge system; empty until the player discovers anything.
 */
export type KnowledgeSnapshot = Readonly<Record<string, readonly string[]>>;

/**
 * The full player save. The server-backed `rpg` core is synced separately via
 * the `/api/rpg/*` endpoints; the remaining slices persist locally. Composed
 * here so a future unified save/load can address them as one snapshot.
 */
export interface PlayerStateSnapshot {
  readonly version: number;
  /** profile + inventory + skills. Null before the first server load. */
  readonly rpg: RpgPlayerState | null;
  readonly survival: SurvivalSnapshot;
  readonly statuses: readonly StatusSnapshot[];
  readonly knowledge: KnowledgeSnapshot;
}

export type { RpgPlayerState };
