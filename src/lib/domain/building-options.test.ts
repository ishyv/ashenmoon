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
});
