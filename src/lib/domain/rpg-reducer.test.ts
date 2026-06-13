import { describe, expect, it } from "vitest";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";
import type { RpgEnvironmentTickResult } from "$lib/domain/rpg-types";
import {
  reduceRpgCommand,
  type RpgReducerCommand,
} from "$lib/domain/rpg-reducer";

describe("RPG reducer", () => {
  it("applies equip then gather against the provided state snapshot", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.stone_pickaxe = { qty: 1 };

    const equipped = reduceRpgCommand(state, { type: "equipTool", itemId: "stone_pickaxe" });
    const gathered = reduceRpgCommand(equipped.playerState, {
      type: "gather",
      action: "mine",
      locationId: "stone_mine",
    });

    const weapon = gathered.playerState.profile.loadout.weapon;
    expect(weapon && typeof weapon === "object" ? weapon.itemId : null).toBe("stone_pickaxe");
    expect(weapon && typeof weapon === "object" ? weapon.durability : null).toBe(95);
    expect(gathered.playerState.inventory.slots.stone).toEqual({ qty: 1 });
  });

  it("does not mutate the input state object", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.grass_fiber = { qty: 1 };

    const result = reduceRpgCommand(state, {
      type: "pickup",
      itemId: "grass_fiber",
      pickupId: "pickup_fiber",
      quantity: 2,
    });

    expect(state.inventory.slots.grass_fiber).toEqual({ qty: 1 });
    expect(state.profile.gatheredPickups).toEqual([]);
    expect(result.playerState.inventory.slots.grass_fiber).toEqual({ qty: 3 });
    expect(result.playerState.profile.gatheredPickups).toContain("pickup_fiber");
  });

  it("returns environment tick metadata with the updated state", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.clay = { qty: 2 };

    const result = reduceRpgCommand(state, {
      type: "environmentTick",
      environment: { temperature: 120, humidity: 45, toxins: 0 },
    } satisfies RpgReducerCommand) as RpgEnvironmentTickResult;

    expect(result.mutated).toBe(true);
    expect(result.reactions.length).toBeGreaterThan(0);
    expect(result.playerState.inventory.slots.clay).toBeUndefined();
  });
});
