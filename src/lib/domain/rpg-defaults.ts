import type { RpgPlayerState } from "./rpg-types";

/**
 * Initial baseline for character skills.
 */
export function createDefaultSkills(): RpgPlayerState["skills"] {
  return {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    fellSweep: { level: 1, xp: 0, nextXp: 100 },
    kiteCombo: { level: 1, xp: 0, nextXp: 100 },
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
