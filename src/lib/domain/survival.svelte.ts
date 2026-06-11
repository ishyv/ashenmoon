/**
 * Thirst: the primary survival pressure. Reactive ($state) so the HUD bar
 * tracks it without polling — the engine ticks drain each frame (faster while
 * moving or laboring) and drinking calls `restoreThirst()`. Rates live in
 * `thirstConfig`, tunable live through the dev console.
 *
 * Hitting zero applies Exhaustion (edge-triggered, once per crossing) — thirst
 * doesn't kill directly in this slice, it grinds the player down.
 */

import {
  DEFAULT_THIRST_CONFIG,
  computeThirstDrain,
  type ThirstActivity,
  type ThirstConfig,
} from "$lib/domain/systems/thirst-logic";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyStatusEffect } from "$lib/domain/status-effects.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback";
import { gameState } from "$lib/state/game-state.svelte";

export const thirstConfig = $state<ThirstConfig>({ ...DEFAULT_THIRST_CONFIG });

/** Compatibility proxy for UI bars. */
export const thirst = {
  get current() { return gameState.survival.thirst; }
};

/** Event for UI animations, bumped on bursts. */
export const thirstEvent = $state<{ seq: number; mode: "drain" | "burst" }>({
  seq: 0,
  mode: "drain",
});

/** Drain thirst for this frame. Called by the engine each tick. */
export function tickThirst(dt: number, activity: ThirstActivity): void {
  if (gameState.survival.thirst <= 0 && gameState.survival.wasParched) return;

  const drained = computeThirstDrain(dt, activity, thirstConfig);
  gameState.survival.thirst = Math.max(0, gameState.survival.thirst - drained);

  if (gameState.survival.thirst <= 0 && !gameState.survival.wasParched) {
    gameState.survival.wasParched = true;
    emitPlayerFeedback("Your throat burns. You need water.", "danger");
    // 30s of Exhaustion per crossing; drinking resets the edge below.
    applyStatusEffect(StatusId.Exhaustion, 30, "thirst");
  }
}

export function restoreThirst(amount: number): void {
  if (amount <= 0) return;
  gameState.survival.thirst = Math.min(thirstConfig.max, gameState.survival.thirst + amount);
  thirstEvent.seq++;
  thirstEvent.mode = "burst";
  if (gameState.survival.thirst > 0) gameState.survival.wasParched = false;
}

/** Sets the current value directly (dev/testing), clamped to the pool. */
export function setThirst(value: number): void {
  gameState.survival.thirst = Math.max(0, Math.min(thirstConfig.max, value));
  if (gameState.survival.thirst > 0) gameState.survival.wasParched = false;
}

/** Legacy loader: hydrated by gameState directly now, but kept for engine boot sequence. */
export function loadSurvival(): void {
  // gameState is hydrated by loadGameState in +page.svelte or engine.ts
}

