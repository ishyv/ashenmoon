import { describe, expect, it } from "vitest";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";
import type { RpgEnvironmentTickResult } from "$lib/domain/rpg-types";
import { ITEM_DEFINITIONS, Item, Wearable, Tool, EquippableVisuals, Rarity, Category } from "$lib/domain/items";
import {
  reduceRpgCommand,
  type RpgReducerCommand,
} from "$lib/domain/rpg-reducer";

function getSlotItemId(slot: any): string | null {
  if (!slot) return null;
  return typeof slot === "string" ? slot : slot.itemId;
}

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

  it("records placed inventory items as world entities", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.clay = { qty: 2 };

    const result = reduceRpgCommand(state, {
      type: "placeItem",
      itemId: "clay",
      quantity: 1,
      x: 12,
      y: 7,
    } satisfies RpgReducerCommand, { now: () => 123 });

    expect(result.playerState.inventory.slots.clay).toEqual({ qty: 1 });
    expect(result.playerState.profile.worldEntities).toContainEqual({
      id: "world_item_clay_123",
      kind: "placed_item",
      itemId: "clay",
      x: 12,
      y: 7,
      quantity: 1,
    });
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

  it("enforces two-handed weapon and shield constraints", () => {
    ITEM_DEFINITIONS.mock_two_handed_pick = Item({
      id: "mock_two_handed_pick" as any,
      name: "Mock Two Handed Pick",
      description: "Two handed mining tool",
      rarity: Rarity.Common,
      category: Category.Tool,
      physical: { carryClass: "pack", weight: 2, stackLimit: 1 }
    }).with(
      Tool({ toolKind: "mining", power: 1 }),
      EquippableVisuals({ slots: ["weapon"], handUsage: "two-handed" })
    );

    ITEM_DEFINITIONS.mock_shield = Item({
      id: "mock_shield" as any,
      name: "Mock Shield",
      description: "A shield",
      rarity: Rarity.Uncommon,
      category: Category.Clothing,
      physical: { carryClass: "pack", weight: 2, stackLimit: 1 }
    }).with(
      Wearable("hands"),
      EquippableVisuals({ slots: ["shield"], handUsage: "one-handed" })
    );

    const state = createDefaultPlayerState();
    state.inventory.slots.mock_two_handed_pick = { qty: 1 };
    state.inventory.slots.mock_shield = { qty: 1 };

    // 1. Equip shield
    let step = reduceRpgCommand(state, { type: "equipGear", itemId: "mock_shield", slot: "shield" });
    expect(getSlotItemId(step.playerState.profile.loadout.shield)).toBe("mock_shield");

    // 2. Equip two-handed weapon -> should unequip shield
    step = reduceRpgCommand(step.playerState, { type: "equipTool", itemId: "mock_two_handed_pick" });
    expect(getSlotItemId(step.playerState.profile.loadout.weapon)).toBe("mock_two_handed_pick");
    expect(step.playerState.profile.loadout.shield).toBeNull();
    expect(step.playerState.inventory.slots.mock_shield).toEqual({ qty: 1 });

    // 3. Equip shield back -> should unequip weapon
    step = reduceRpgCommand(step.playerState, { type: "equipGear", itemId: "mock_shield", slot: "shield" });
    expect(getSlotItemId(step.playerState.profile.loadout.shield)).toBe("mock_shield");
    expect(step.playerState.profile.loadout.weapon).toBeNull();

    // Clean up
    delete ITEM_DEFINITIONS.mock_two_handed_pick;
    delete ITEM_DEFINITIONS.mock_shield;
  });

  it("enforces multi-slot armor constraints and blocking", () => {
    ITEM_DEFINITIONS.mock_robe = Item({
      id: "mock_robe" as any,
      name: "Mock Robe",
      description: "Full body robe",
      rarity: Rarity.Common,
      category: Category.Clothing,
      physical: { carryClass: "pack", weight: 1, stackLimit: 1 }
    }).with(
      Wearable("body"),
      EquippableVisuals({ slots: ["chest", "pants"] })
    );

    ITEM_DEFINITIONS.mock_pants = Item({
      id: "mock_pants" as any,
      name: "Mock Pants",
      description: "Simple trousers",
      rarity: Rarity.Common,
      category: Category.Clothing,
      physical: { carryClass: "pack", weight: 1, stackLimit: 1 }
    }).with(
      Wearable("legs" as any), // pants maps to legs in Wearable, but let's pass legs directly
      EquippableVisuals({ slots: ["pants"] })
    );

    const state = createDefaultPlayerState();
    state.inventory.slots.mock_robe = { qty: 1 };
    state.inventory.slots.mock_pants = { qty: 1 };

    // 1. Equip pants
    let step = reduceRpgCommand(state, { type: "equipGear", itemId: "mock_pants", slot: "pants" });
    expect(getSlotItemId(step.playerState.profile.loadout.pants)).toBe("mock_pants");

    // 2. Equip robe -> should auto-unequip pants since robe covers pants slot
    step = reduceRpgCommand(step.playerState, { type: "equipGear", itemId: "mock_robe", slot: "chest" });
    expect(getSlotItemId(step.playerState.profile.loadout.chest)).toBe("mock_robe");
    expect(step.playerState.profile.loadout.pants).toBeNull();
    expect(step.playerState.inventory.slots.mock_pants).toEqual({ qty: 1 });

    // 3. Try to equip pants while robe is active -> should fail because pants slot is covered by robe
    expect(() =>
      reduceRpgCommand(step.playerState, { type: "equipGear", itemId: "mock_pants", slot: "pants" })
    ).toThrow("blocked by equipped mock_robe");

    // Clean up
    delete ITEM_DEFINITIONS.mock_robe;
    delete ITEM_DEFINITIONS.mock_pants;
  });
});
