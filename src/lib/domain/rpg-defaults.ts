import type { RpgPlayerState } from "./rpg-types";
import { HOTBAR_SIZE } from "./hotbar-types";

/**
 * Initial baseline for character skills.
 */
export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    combat: { level: 1, xp: 0, nextXp: 100 },
    fellSweep: { level: 1, xp: 0, nextXp: 100 },
    kiteCombo: { level: 1, xp: 0, nextXp: 100 },
    vigilance: { level: 1, xp: 0, nextXp: 100 },
    woodcraft: { level: 1, xp: 0, nextXp: 100 },
    craftsmanship: { level: 1, xp: 0, nextXp: 100 },
  };
}

/**
 * Initial baseline for character profile.
 */
export function createDefaultProfile(opts?: {
  hpCurrent?: number;
  weapon?: RpgPlayerState["profile"]["loadout"]["weapon"];
}): RpgPlayerState["profile"] {
  return {
    hpCurrent: opts?.hpCurrent ?? 600,
    worldSeed: Math.floor(Math.random() * 1000000),
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
    buildings: [],
    worldEntities: [],
    gatheredPickups: [],
    depletedNodes: {},
    hotbar: Array(HOTBAR_SIZE).fill(null),
  };
}

/**
 * Initial baseline for a new game state.
 */
export function createDefaultPlayerState(): RpgPlayerState {
  return {
    profile: createDefaultProfile(),
    inventory: { slots: {} },
    skills: createDefaultSkills(),
    runSettings: { deathMode: "respawn" },
  };
}
