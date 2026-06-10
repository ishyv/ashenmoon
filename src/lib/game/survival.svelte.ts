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
} from "$lib/rpg/systems/thirst-logic";
import { StatusId } from "$lib/rpg/systems/status-types";
import { applyStatusEffect } from "./status-effects.svelte";
import { emitPlayerFeedback } from "./player-feedback";
import { StorageKeys } from "./game-events";

export const thirstConfig = $state<ThirstConfig>({ ...DEFAULT_THIRST_CONFIG });

export const thirst = $state<{
  current: number;
  /** bumped on restores so the bar can animate the change. */
  event: { seq: number; mode: "drain" | "burst" };
}>({
  current: 100,
  event: { seq: 0, mode: "drain" },
});

let wasParched = false;
let saveAccumulator = 0;

/** Drain thirst for this frame. Called by the engine each tick. */
export function tickThirst(dt: number, activity: ThirstActivity): void {
  if (thirst.current <= 0 && wasParched) return;

  const drained = computeThirstDrain(dt, activity, thirstConfig);
  thirst.current = Math.max(0, thirst.current - drained);

  if (thirst.current <= 0 && !wasParched) {
    wasParched = true;
    emitPlayerFeedback("Your throat burns. You need water.", "danger");
    // 30s of Exhaustion per crossing; drinking resets the edge below.
    applyStatusEffect(StatusId.Exhaustion, 30, "thirst");
  }

  // Snapshot at most every few seconds — thirst changes every frame and
  // localStorage writes aren't free.
  saveAccumulator += dt;
  if (saveAccumulator >= 5) {
    saveAccumulator = 0;
    saveSurvival();
  }
}

export function restoreThirst(amount: number): void {
  if (amount <= 0) return;
  thirst.current = Math.min(thirstConfig.max, thirst.current + amount);
  thirst.event = { seq: thirst.event.seq + 1, mode: "burst" };
  if (thirst.current > 0) wasParched = false;
  saveSurvival();
}

/** Sets the current value directly (dev/testing), clamped to the pool. */
export function setThirst(value: number): void {
  thirst.current = Math.max(0, Math.min(thirstConfig.max, value));
  if (thirst.current > 0) wasParched = false;
  saveSurvival();
}

export function loadSurvival(): void {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(StorageKeys.survival);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && typeof parsed.thirst === "number") {
      thirst.current = Math.max(0, Math.min(thirstConfig.max, parsed.thirst));
      wasParched = thirst.current <= 0;
    }
  } catch (e) {
    console.error("Failed to load survival state:", e);
  }
}

function saveSurvival(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(StorageKeys.survival, JSON.stringify({ thirst: thirst.current }));
  } catch (e) {
    console.error("Failed to save survival state:", e);
  }
}
