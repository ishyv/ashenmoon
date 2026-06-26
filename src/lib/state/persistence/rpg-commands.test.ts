import { beforeEach, describe, expect, it } from "vitest";
import { StorageKeys } from "$lib/domain/game-events";
import { SAVE_VERSION } from "$lib/state/persistence/migrations";
import {
  getLocalRpgState,
  localRpgCommands,
  normalizePlayerState,
  saveLocalRpgState,
} from "$lib/state/persistence/rpg-commands";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";

describe("local RPG commands", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("repairs GameState-shaped corrupted records", () => {
    const normalized = normalizePlayerState({
      rpg: {
        inventory: { slots: { stick: { qty: 2 } } },
        skills: { lumberjacking: { level: 2, xp: 5, nextXp: 200 } },
      },
      survival: { thirst: 100 },
    });

    expect(normalized.inventory.slots.stick).toEqual({ qty: 2 });
    expect(normalized.profile.hpCurrent).toBe(600);
    expect(normalized.skills.lumberjacking).toEqual({ level: 2, xp: 5, nextXp: 200 });
  });

  it("loads and saves RPG state through localStorage", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.stick = { qty: 3 };

    saveLocalRpgState(state);

    expect(JSON.parse(localStorage.getItem(StorageKeys.rpg)!)).toEqual({
      v: SAVE_VERSION,
      data: state,
    });
    expect(getLocalRpgState().inventory.slots.stick).toEqual({ qty: 3 });
  });

  it("crafts from the same persisted inventory populated by pickup", () => {
    localRpgCommands.pickup("stick", "pickup_stick");
    localRpgCommands.pickup("flint_shard", "pickup_flint");
    localRpgCommands.pickup("grass_fiber", "pickup_fiber");

    const next = localRpgCommands.craft("flint_axe", { isNearCampfire: false });

    expect(next.inventory.slots.flint_axe).toEqual({ qty: 1 });
    expect(next.inventory.slots.stick).toBeUndefined();
    expect(next.inventory.slots.flint_shard).toBeUndefined();
    expect(next.inventory.slots.grass_fiber).toBeUndefined();
  });

  it("persists pickup quantities and gathered pickup ids", () => {
    const result = localRpgCommands.pickup("grass_fiber", "pickup_fiber", 2);
    const next = getLocalRpgState();

    expect(result.materialsGained).toEqual([{ id: "grass_fiber", quantity: 2 }]);
    expect(next.inventory.slots.grass_fiber).toEqual({ qty: 2 });
    expect(next.profile.gatheredPickups).toContain("pickup_fiber");
  });

  it("keeps an equipped tool after normal resource gathering and reduces durability", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.stone_pickaxe = { qty: 1 };
    saveLocalRpgState(state);
    localRpgCommands.equipTool("stone_pickaxe");

    const result = localRpgCommands.gather("mine", "stone_mine");

    const weapon = result.playerState.profile.loadout.weapon;
    expect(typeof weapon).toBe("object");
    expect(typeof weapon === "object" ? weapon?.itemId : weapon).toBe("stone_pickaxe");
    expect(typeof weapon === "object" ? weapon?.durability : null).toBe(95);
    expect(result.playerState.inventory.slots.stone).toEqual({ qty: 1 });
  });

  it("equips and unequips tools locally", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.flint_axe = { qty: 1 };
    saveLocalRpgState(state);

    const equipped = localRpgCommands.equipTool("flint_axe");
    const weapon = equipped.profile.loadout.weapon;
    expect(weapon && typeof weapon === "object" ? weapon.itemId : null).toBe("flint_axe");

    const unequipped = localRpgCommands.equipTool(null);
    expect(unequipped.profile.loadout.weapon).toBeNull();
  });

  it("consumes a structure kit and records the building", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots = {
      storage_pile_kit: { qty: 1 },
    };
    saveLocalRpgState(state);

    const next = localRpgCommands.build("storage_pile", 12, 7, "storage_pile_kit");

    expect(next.inventory.slots.storage_pile_kit).toBeUndefined();
    expect(next.profile.stashSize).toBe(40);
    expect(next.profile.buildings).toContainEqual(
      expect.objectContaining({ type: "storage_pile", x: 12, y: 7, sourceItemId: "storage_pile_kit" }),
    );
  });

  it("applies environment reactions and persists the mutated state", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.clay = { qty: 2 };
    saveLocalRpgState(state);

    const result = localRpgCommands.environmentTick({ temperature: 120, humidity: 45, toxins: 0 });

    expect(result.mutated).toBe(true);
    expect(result.reactions.length).toBeGreaterThan(0);
    expect(getLocalRpgState()).toEqual(result.playerState);
  });

  it("deducts items when placeItem is called", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.clay = { qty: 3 };
    saveLocalRpgState(state);

    const next = localRpgCommands.placeItem("clay", 1);
    expect(next.inventory.slots.clay).toEqual({ qty: 2 });
    expect(getLocalRpgState().inventory.slots.clay).toEqual({ qty: 2 });

    const next2 = localRpgCommands.placeItem("clay", 2);
    expect(next2.inventory.slots.clay).toBeUndefined();

    expect(() => localRpgCommands.placeItem("clay", 1)).toThrow("Insufficient clay in inventory");
  });

  it("equips, unequips, and persists gear locally using localRpgCommands", () => {
    const state = createDefaultPlayerState();
    state.inventory.slots.hide_cloak = { qty: 1 };
    saveLocalRpgState(state);

    const equipped = localRpgCommands.equipGear("hide_cloak", "chest");
    const chestSlot = equipped.profile.loadout.chest;
    expect(chestSlot && typeof chestSlot === "object" ? chestSlot.itemId : null).toBe("hide_cloak");
    expect(equipped.inventory.slots.hide_cloak).toBeUndefined();

    // Verify localStorage persistence
    const loaded = getLocalRpgState();
    const loadedChest = loaded.profile.loadout.chest;
    expect(loadedChest && typeof loadedChest === "object" ? loadedChest.itemId : null).toBe("hide_cloak");

    const unequipped = localRpgCommands.equipGear(null, "chest");
    expect(unequipped.profile.loadout.chest).toBeNull();
    expect(unequipped.inventory.slots.hide_cloak).toEqual({ qty: 1 });
  });
});
