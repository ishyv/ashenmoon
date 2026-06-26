import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { getLocalRpgState, saveLocalRpgState } from "$lib/state/persistence/rpg-commands";
import {
  createDefaultProfile,
  createDefaultSkills,
} from "$lib/domain/rpg-defaults";
import { StorageKeys } from "$lib/domain/game-events";
import { loadSlice, saveSlice } from "$lib/state/persistence/save-load";

/**
 * Unified, reactive root for all persistent game data.
 * Svelte 5 runes ($state) allow us to track deep changes automatically.
 */
export interface GameState {
  rpg: {
    profile: RpgPlayerState["profile"] | null;
    inventory: RpgPlayerState["inventory"] | null;
    skills: RpgPlayerState["skills"] | null;
  };
  survival: {
    thirst: number;
    wasParched: boolean;
    hunger: number;
    wasStarving: boolean;
  };
}

const INITIAL_THIRST = 100;
const INITIAL_HUNGER = 100;

function createInitialState(): GameState {
  return {
    rpg: {
      profile: createDefaultProfile(),
      inventory: { slots: {} },
      skills: createDefaultSkills(),
    },
    survival: {
      thirst: INITIAL_THIRST,
      wasParched: false,
      hunger: INITIAL_HUNGER,
      wasStarving: false,
    },
  };
}

/**
 * The single source of truth for the entire game.
 * Direct mutation of this object triggers the automated save effect.
 */
export const gameState = $state<GameState>(createInitialState());

let persistenceHydrated = false;

export function markGameStateHydrated(): void {
  persistenceHydrated = true;
}

/** Loads persistent RPG state from local browser storage. */
export function loadGameState(): void {
  const rpg = getLocalRpgState();
  gameState.rpg.profile = rpg.profile;
  gameState.rpg.inventory = rpg.inventory;
  gameState.rpg.skills = rpg.skills;

  const savedSurvival = loadSlice<any>(StorageKeys.survival, null);
  if (savedSurvival) {
    gameState.survival.thirst = savedSurvival.thirst ?? INITIAL_THIRST;
    gameState.survival.wasParched = savedSurvival.wasParched ?? false;
    gameState.survival.hunger = savedSurvival.hunger ?? INITIAL_HUNGER;
    gameState.survival.wasStarving = savedSurvival.wasStarving ?? false;
  }

  markGameStateHydrated();
}

/**
 * Automated Persistence Layer.
 * Watches RPG state for deep changes and writes a debounced local save.
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let survivalSaveTimeout: ReturnType<typeof setTimeout> | null = null;

const AUTO_SAVE_DEBOUNCE_MS = 500;

$effect.root(() => {
  $effect(() => {
    const snapshot = $state.snapshot(gameState.rpg);
    if (!persistenceHydrated) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        saveLocalRpgState(snapshot);
      } catch (e) {
        console.error("GameState: Local RPG auto-save failed:", e);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  });

  $effect(() => {
    const snapshot = $state.snapshot(gameState.survival);
    if (!persistenceHydrated) return;

    if (survivalSaveTimeout) clearTimeout(survivalSaveTimeout);
    survivalSaveTimeout = setTimeout(() => {
      try {
        saveSlice(StorageKeys.survival, snapshot);
      } catch (e) {
        console.error("GameState: Survival auto-save failed:", e);
      }
    }, AUTO_SAVE_DEBOUNCE_MS);
  });
});
