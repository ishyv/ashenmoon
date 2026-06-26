/**
 * Thirst and Hunger: the primary survival pressures. Reactive ($state) so the HUD bars
 * track them without polling — the engine ticks drain each frame (faster while
 * moving or laboring). Rates live in configs, tunable live through the dev console.
 *
 * Hitting zero thirst applies Exhaustion, while hitting zero hunger applies
 * Starving status effect (periodic damage and slow).
 */

import {
  DEFAULT_THIRST_CONFIG,
  computeThirstDrain,
  type ThirstActivity,
  type ThirstConfig,
} from "$lib/domain/systems/thirst-logic";
import {
  DEFAULT_HUNGER_CONFIG,
  computeHungerDrain,
  type HungerActivity,
  type HungerConfig,
} from "$lib/domain/systems/hunger-logic";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyStatusEffect, clearStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { gameState } from "$lib/state/game-state.svelte";

// Configs
export const thirstConfig = $state<ThirstConfig>({ ...DEFAULT_THIRST_CONFIG });
export const hungerConfig = $state<HungerConfig>({ ...DEFAULT_HUNGER_CONFIG });

// Compatibility proxies for UI bars
export const thirst = {
  get current() { return gameState.survival.thirst; }
};
export const hunger = {
  get current() { return gameState.survival.hunger; }
};

// Events for UI animations, bumped on bursts
export const thirstEvent = $state<{ seq: number; mode: "drain" | "burst" }>({
  seq: 0,
  mode: "drain",
});
export const hungerEvent = $state<{ seq: number; mode: "drain" | "burst" }>({
  seq: 0,
  mode: "drain",
});

const PARCHED_EXHAUSTION_DURATION_SEC = 30;
const STARVING_DURATION_SEC = 999999;

/** Drain thirst for this frame. Called by the engine each tick. */
export function tickThirst(dt: number, activity: ThirstActivity): void {
  const isRaining = !!activity.raining;
  if (gameState.survival.thirst <= 0 && gameState.survival.wasParched && !isRaining) return;

  const drained = computeThirstDrain(dt, activity, thirstConfig);
  const rainIncome = isRaining ? 0.35 * dt : 0;
  
  const nextThirst = Math.max(0, Math.min(thirstConfig.max, gameState.survival.thirst - drained + rainIncome));
  gameState.survival.thirst = nextThirst;

  if (gameState.survival.thirst <= 0 && !gameState.survival.wasParched) {
    gameState.survival.wasParched = true;
    emitPlayerFeedback("Your throat burns. You need water.", "danger");
    // Exhaustion per crossing; drinking resets the edge below.
    applyStatusEffect(StatusId.Exhaustion, PARCHED_EXHAUSTION_DURATION_SEC, "thirst");
  } else if (gameState.survival.thirst > 0 && gameState.survival.wasParched) {
    gameState.survival.wasParched = false;
  }
}

export function restoreThirst(amount: number): void {
  if (amount <= 0) return;
  gameState.survival.thirst = Math.min(thirstConfig.max, gameState.survival.thirst + amount);
  thirstEvent.seq++;
  thirstEvent.mode = "burst";
  if (gameState.survival.thirst > 0) gameState.survival.wasParched = false;
}

/** Sets the thirst value directly (dev/testing), clamped to the pool. */
export function setThirst(value: number): void {
  gameState.survival.thirst = Math.max(0, Math.min(thirstConfig.max, value));
  if (gameState.survival.thirst > 0) gameState.survival.wasParched = false;
}

/** Drain hunger for this frame. Called by the engine each tick. */
export function tickHunger(dt: number, activity: HungerActivity): void {
  if (gameState.survival.hunger <= 0 && gameState.survival.wasStarving) return;

  const drained = computeHungerDrain(dt, activity, hungerConfig);
  gameState.survival.hunger = Math.max(0, gameState.survival.hunger - drained);

  if (gameState.survival.hunger <= 0 && !gameState.survival.wasStarving) {
    gameState.survival.wasStarving = true;
    emitPlayerFeedback("You are starving!", "danger");
    // Starving is applied with a large duration to represent infinite starving
    applyStatusEffect(StatusId.Starving, STARVING_DURATION_SEC, "hunger");
  }
}

export function restoreHunger(amount: number): void {
  if (amount <= 0) return;
  gameState.survival.hunger = Math.min(hungerConfig.max, gameState.survival.hunger + amount);
  hungerEvent.seq++;
  hungerEvent.mode = "burst";
  if (gameState.survival.hunger > 0 && gameState.survival.wasStarving) {
    gameState.survival.wasStarving = false;
    clearStatusEffect(StatusId.Starving);
  }
}

/** Sets the hunger value directly (dev/testing), clamped to the pool. */
export function setHunger(value: number): void {
  gameState.survival.hunger = Math.max(0, Math.min(hungerConfig.max, value));
  if (gameState.survival.hunger > 0 && gameState.survival.wasStarving) {
    gameState.survival.wasStarving = false;
    clearStatusEffect(StatusId.Starving);
  } else if (gameState.survival.hunger <= 0 && !gameState.survival.wasStarving) {
    gameState.survival.wasStarving = true;
    applyStatusEffect(StatusId.Starving, STARVING_DURATION_SEC, "hunger");
  }
}

/** Legacy loader: hydrated by gameState directly now, but kept for engine boot sequence. */
export function loadSurvival(): void {
  // gameState is hydrated by loadGameState in +page.svelte or engine.ts
}
