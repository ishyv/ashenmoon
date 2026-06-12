import { describe, expect, it } from "vitest";
import { gameState } from "$lib/state/game-state.svelte";
import {
  addLocalInventoryQty,
  applyRpgState,
  equipLocalWeapon,
  setLocalHp,
  setRpgInventory,
  setRpgProfile,
  setRpgSkills,
} from "$lib/state/rpg-actions.svelte";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

function state(overrides: Partial<RpgPlayerState> = {}): RpgPlayerState {
  return {
    profile: {
      hpCurrent: 77,
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
      buildings: [],
      gatheredPickups: [],
    },
    inventory: { slots: { stick: { qty: 2 } } },
    skills: {
      lumberjacking: { level: 1, xp: 0, nextXp: 100 },
      mining: { level: 1, xp: 0, nextXp: 100 },
      evade: { level: 1, xp: 0, nextXp: 100 },
    },
    ...overrides,
  };
}

describe("rpg actions", () => {
  it("applies canonical rpg state into gameState.rpg", () => {
    const next = state();
    applyRpgState(next);

    expect(gameState.rpg.profile?.hpCurrent).toBe(77);
    expect(gameState.rpg.inventory?.slots.stick).toEqual({ qty: 2 });
    expect(gameState.rpg.skills?.mining.level).toBe(1);
  });

  it("mutates explicit rpg slices", () => {
    setRpgProfile(state().profile);
    setRpgInventory({ slots: {} });
    setRpgSkills(state().skills);

    addLocalInventoryQty("flint_shard", 2);
    equipLocalWeapon("flint_axe");
    setLocalHp(42);

    expect(gameState.rpg.inventory?.slots.flint_shard).toEqual({ qty: 2 });
    const weapon = gameState.rpg.profile?.loadout.weapon;
    expect(typeof weapon === "object" ? weapon?.itemId : weapon).toBe("flint_axe");
    expect(gameState.rpg.profile?.hpCurrent).toBe(42);
  });
});

