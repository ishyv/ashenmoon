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

  it("handles equipping and unequipping wearable gear, transferring items between inventory and slots", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.hide_cloak = { qty: 1 };

    // 1. Equip hide_cloak
    const equipped = reduceRpgCommand(state, {
      type: "equipGear",
      itemId: "hide_cloak",
      slot: "chest",
    });

    const chestSlot = equipped.playerState.profile.loadout.chest;
    expect(chestSlot && typeof chestSlot === "object" ? chestSlot.itemId : null).toBe("hide_cloak");
    expect(equipped.playerState.inventory.slots.hide_cloak).toBeUndefined();

    // 2. Unequip hide_cloak
    const unequipped = reduceRpgCommand(equipped.playerState, {
      type: "equipGear",
      itemId: null,
      slot: "chest",
    });

    expect(unequipped.playerState.profile.loadout.chest).toBeNull();
    expect(unequipped.playerState.inventory.slots.hide_cloak).toEqual({ qty: 1 });
  });

  it("handles swapping equipped gear correctly", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.hide_cloak = { qty: 1 };
    state.inventory.slots.fur_lined_wrap = { qty: 1 };

    // Equip hide_cloak
    const step1 = reduceRpgCommand(state, {
      type: "equipGear",
      itemId: "hide_cloak",
      slot: "chest",
    });

    // Swap to fur_lined_wrap
    const step2 = reduceRpgCommand(step1.playerState, {
      type: "equipGear",
      itemId: "fur_lined_wrap",
      slot: "chest",
    });

    const chestSlot = step2.playerState.profile.loadout.chest;
    expect(chestSlot && typeof chestSlot === "object" ? chestSlot.itemId : null).toBe("fur_lined_wrap");
    expect(step2.playerState.inventory.slots.hide_cloak).toEqual({ qty: 1 });
    expect(step2.playerState.inventory.slots.fur_lined_wrap).toBeUndefined();
  });

  it("throws an error when trying to equip an item not in inventory or with wrong slot type", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.hide_cloak = { qty: 1 };

    // Item not in inventory
    expect(() =>
      reduceRpgCommand(state, {
        type: "equipGear",
        itemId: "fur_lined_wrap",
        slot: "chest",
      })
    ).toThrow("Item not in inventory");

    // Wrong slot type (hide_cloak is wearable body, cannot go to helmet)
    expect(() =>
      reduceRpgCommand(state, {
        type: "equipGear",
        itemId: "hide_cloak",
        slot: "helmet",
      })
    ).toThrow("cannot be equipped in slot helmet");
  });
});
