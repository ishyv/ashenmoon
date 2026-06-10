import type { RpgPlayerState } from "$shared/bridge-types";

export let offlinePlayerState: any = {
  profile: {
    hpCurrent: 100,
    stashSize: 20,
    loadout: {
      weapon: null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
    buildings: [], // Store placed buildings as { id, type, x, y }
    gatheredPickups: [],
  },
  inventory: { slots: {} },
  skills: {
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    superGather: { level: 1, xp: 0, nextXp: 100 },
  },
};

export function resetOfflineState(): void {
  offlinePlayerState.profile.loadout.weapon = null;
  offlinePlayerState.inventory.slots = {};
  offlinePlayerState.profile.hpCurrent = 100;
  offlinePlayerState.profile.buildings = [];
  offlinePlayerState.profile.gatheredPickups = [];
}

