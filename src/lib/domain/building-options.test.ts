import { describe, expect, it } from "vitest";
import { buildOptionsFromInventory } from "$lib/domain/building-options";
import { reduceRpgCommand } from "$lib/domain/rpg-reducer";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

describe("inventory-derived building options", () => {
  it("shows owned placeable structure kits as build options", () => {
    const options = buildOptionsFromInventory({
      rain_catcher_kit: { qty: 1 },
      stick: { qty: 12 },
    });

    expect(options).toEqual([
      expect.objectContaining({
        buildableId: "rain_catcher",
        sourceItemId: "rain_catcher_kit",
        available: 1,
      }),
    ]);
  });

  it("placing from a kit consumes one kit and records the placed structure", () => {
    const state: RpgPlayerState = {
      ...createDefaultPlayerState(),
      inventory: { slots: { spike_barrier_kit: { qty: 1 } } },
    };

    const result = reduceRpgCommand(
      state,
      { type: "build", buildingType: "spike_barrier", sourceItemId: "spike_barrier_kit", x: 12, y: 7 },
      { now: () => 123 },
    );

    expect(result.playerState.inventory.slots.spike_barrier_kit).toBeUndefined();
    expect(result.playerState.profile.buildings).toEqual([
      {
        id: "building_spike_barrier_123",
        type: "spike_barrier",
        x: 12,
        y: 7,
        sourceItemId: "spike_barrier_kit",
      },
    ]);
  });

  it("rejects a kit whose placeable trait does not match the requested structure", () => {
    const state: RpgPlayerState = {
      ...createDefaultPlayerState(),
      inventory: { slots: { rain_catcher_kit: { qty: 1 } } },
    };

    expect(() =>
      reduceRpgCommand(state, {
        type: "build",
        buildingType: "spike_barrier",
        sourceItemId: "rain_catcher_kit",
        x: 12,
        y: 7,
      }),
    ).toThrow("Invalid building kit");
  });

  it("placing a blueprint registers stage 0 and charges stakes", () => {
    const state: RpgPlayerState = {
      ...createDefaultPlayerState(),
      inventory: { slots: { stick: { qty: 5 } } },
    };

    const result = reduceRpgCommand(
      state,
      { type: "build", buildingType: "house1", x: 10, y: 10 },
      { now: () => 123 },
    );

    expect(result.playerState.inventory.slots.stick).toEqual({ qty: 3 });
    expect(result.playerState.profile.buildings).toEqual([
      {
        id: "building_house1_123",
        type: "house1",
        x: 10,
        y: 10,
        stage: 0,
      },
    ]);
  });

  it("upgrading checks inventory, deducts resources, and increments stage", () => {
    const state: RpgPlayerState = {
      ...createDefaultPlayerState(),
      inventory: { slots: { stone: { qty: 14 }, clay: { qty: 7 } } },
      profile: {
        hpCurrent: 600,
        worldSeed: 123,
        stashSize: 20,
        loadout: {
          weapon: null, shield: null, helmet: null, chest: null, pants: null, boots: null, ring: null, necklace: null
        },
        buildings: [
          {
            id: "building_house1_123",
            type: "house1",
            x: 10,
            y: 10,
            stage: 0,
          },
        ],
      },
    };

    // Stage 1 cost: stone: 12, clay: 6
    const result = reduceRpgCommand(
      state,
      { type: "upgradeBuilding", buildingId: "building_house1_123" },
      { now: () => 124 },
    );

    expect(result.playerState.inventory.slots.stone).toEqual({ qty: 2 });
    expect(result.playerState.inventory.slots.clay).toEqual({ qty: 1 });
    const buildings = (result as any).playerState.profile.buildings;
    expect(buildings).toBeDefined();
    expect(buildings[0].stage).toBe(1);
  });

  it("prevents upgrading past stage 5", () => {
    const state: RpgPlayerState = {
      ...createDefaultPlayerState(),
      profile: {
        hpCurrent: 600,
        worldSeed: 123,
        stashSize: 20,
        loadout: {
          weapon: null, shield: null, helmet: null, chest: null, pants: null, boots: null, ring: null, necklace: null
        },
        buildings: [
          {
            id: "building_house1_123",
            type: "house1",
            x: 10,
            y: 10,
            stage: 5,
          },
        ],
      },
    };

    expect(() =>
      reduceRpgCommand(
        state,
        { type: "upgradeBuilding", buildingId: "building_house1_123" },
      )
    ).toThrow("Building already fully constructed");
  });
});
