import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { getLocalRpgState, saveLocalRpgState } from "$lib/state/persistence/rpg-commands";

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
  };
}

/** Initial baseline for a new game. */
export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    fellSweep: { level: 1, xp: 0, nextXp: 100 },
    kiteCombo: { level: 1, xp: 0, nextXp: 100 },
  };
}

export function createDefaultProfile(opts?: {
  hpCurrent?: number;
  weapon?: RpgPlayerState["profile"]["loadout"]["weapon"];
}): RpgPlayerState["profile"] {
  return {
    hpCurrent: opts?.hpCurrent ?? 100,
    stashSize: 20,
    loadout: {
      weapon: opts?.weapon ?? null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
  };
}

function createInitialState(): GameState {
  return {
    rpg: {
      profile: createDefaultProfile(),
      inventory: { slots: {} },
      skills: createDefaultSkills(),
    },
    survival: {
      thirst: 100,
      wasParched: false,
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
  markGameStateHydrated();
}

/**
 * Automated Persistence Layer.
 * Watches RPG state for deep changes and writes a debounced local save.
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

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
    }, 500);
  });
});
