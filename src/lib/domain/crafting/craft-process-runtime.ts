/**
 * Runtime state for a timed, attendable station craft. Shaped like
 * `WorldActionRuntime` (world-action-runtime.ts) — elapsed/duration/remaining/
 * completed — plus craft-specific fields for the optional attended minigame.
 *
 * Deliberately a new type, not an extension of `StationProcessRuntime`
 * (station-process.ts): that type and its completion path are pure flat-qty
 * stacking with zero concept of `RpgItemInstance`/tier/rng, and every other
 * `STATION_PROCESSES` consumer must keep its current cancel-on-leave
 * behavior untouched.
 *
 * Ticking never cancels on range loss — see interaction-system.ts's
 * `tickActiveCraftProcess`, which is the only thing that decides whether a
 * given tick counts as "attended." This file only advances the clock and
 * the minigame scoreboard.
 */
import type { StationId } from "$lib/domain/stations";
import type { CraftRecipe } from "./recipe-types";
import { minigameKindFor, type MinigameKind } from "./minigame-kind";

export interface CraftProcessRuntime {
  readonly recipe: CraftRecipe;
  /** The station entity this craft is anchored to, for the attendance-range check. */
  readonly targetStationEntityId: string;
  /** Snapshotted at start so a mid-craft level-up doesn't retroactively change odds. */
  readonly craftsmanshipLevel: number;
  /** Craft context captured at start (checkCraft already validated it) — reused unchanged at completion. */
  readonly isNearCampfire: boolean;
  readonly stationId?: StationId;
  readonly elapsedSec: number;
  readonly durationSec: number;
  readonly remainingSec: number;
  readonly completed: boolean;
  /** True once the player has been in range for at least one tick. */
  readonly attended: boolean;
  readonly minigameKind: MinigameKind;
  readonly minigameHits: number;
  readonly minigameMisses: number;
  readonly minigameWindows: number;
}

export function createCraftProcessRuntime(
  recipe: CraftRecipe,
  craftsmanshipLevel: number,
  targetStationEntityId: string,
  context: { isNearCampfire: boolean; stationId?: StationId },
): CraftProcessRuntime {
  const durationSec = Math.max(0, recipe.durationSec ?? 0);
  return {
    recipe,
    targetStationEntityId,
    craftsmanshipLevel,
    isNearCampfire: context.isNearCampfire,
    ...(context.stationId !== undefined ? { stationId: context.stationId } : {}),
    elapsedSec: 0,
    durationSec,
    remainingSec: durationSec,
    completed: durationSec === 0,
    attended: false,
    minigameKind: minigameKindFor(recipe),
    minigameHits: 0,
    minigameMisses: 0,
    minigameWindows: 0,
  };
}

/**
 * Advances the clock by `dtSec` regardless of `attendedThisTick` — the craft
 * always ticks to completion whether or not the player is present. Only the
 * `attended` flag (used to decide minigame eligibility) responds to it.
 */
export function tickCraftProcessRuntime(
  runtime: CraftProcessRuntime,
  dtSec: number,
  attendedThisTick: boolean,
): CraftProcessRuntime {
  if (runtime.completed) return runtime;
  const elapsedSec = Math.min(runtime.durationSec, runtime.elapsedSec + Math.max(0, dtSec));
  return {
    ...runtime,
    elapsedSec,
    remainingSec: Math.max(0, runtime.durationSec - elapsedSec),
    completed: elapsedSec >= runtime.durationSec,
    attended: runtime.attended || attendedThisTick,
  };
}

/** Records one minigame window's outcome. Only call while the player is attending. */
export function recordMinigameWindow(runtime: CraftProcessRuntime, hit: boolean): CraftProcessRuntime {
  return {
    ...runtime,
    minigameHits: runtime.minigameHits + (hit ? 1 : 0),
    minigameMisses: runtime.minigameMisses + (hit ? 0 : 1),
    minigameWindows: runtime.minigameWindows + 1,
  };
}

/** 0..1 score fed into `CraftAttendance.minigamePerformance` at completion. */
export function minigamePerformanceOf(runtime: CraftProcessRuntime): number {
  if (runtime.minigameWindows === 0) return 0;
  return Math.max(0, Math.min(1, runtime.minigameHits / Math.max(1, runtime.minigameWindows)));
}

/** Whether at least one window was engaged — the "played" half of `attendedAndPlayed`. */
export function hasPlayedMinigame(runtime: CraftProcessRuntime): boolean {
  return runtime.minigameWindows > 0;
}
