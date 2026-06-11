import type { RpgPlayerState } from "$lib/domain/rpg-types";
import { StorageKeys } from "$lib/domain/game-events";

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
    superGather: { level: 1, xp: 0, nextXp: 100 },
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

/**
 * Loads the full game state from the server.
 */
export async function loadGameState(): Promise<void> {
  try {
    const res = await fetch("/api/state");
    if (res.ok) {
      const data = await res.json();
      if (data) {
        // Deep merge/assignment to maintain reactivity
        Object.assign(gameState, data);
        markGameStateHydrated();
      }
    }
  } catch (e) {
    console.error("GameState: Failed to load state from server:", e);
  }
}

/**
 * Automated Persistence Layer.
 * Watches the `gameState` for any deep changes and syncs them to the server
 * using a debounced write to prevent performance issues.
 */
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

$effect.root(() => {
  $effect(() => {
    // Svelte 5 automatically tracks every reactive property accessed here.
    // By taking a full snapshot, we track everything in gameState.
    const snapshot = $state.snapshot(gameState);
    if (!persistenceHydrated) return;

    // Debounce the save operation (500ms)
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        });
      } catch (e) {
        console.error("GameState: Auto-save failed:", e);
      }
    }, 500);
  });
});
