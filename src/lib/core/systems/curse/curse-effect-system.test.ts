import { describe, expect, it } from "vitest";
import { collectCursedEquipped } from "./curse-effect-system";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

function loadout(overrides: Partial<RpgPlayerState["profile"]["loadout"]> = {}): RpgPlayerState["profile"]["loadout"] {
  return {
    weapon: null,
    shield: null,
    helmet: null,
    chest: null,
    pants: null,
    boots: null,
    ring: null,
    necklace: null,
    ...overrides,
  };
}

describe("collectCursedEquipped", () => {
  it("returns nothing when nothing is equipped or cursed", () => {
    expect(collectCursedEquipped(undefined)).toEqual([]);
    expect(collectCursedEquipped(loadout())).toEqual([]);
    expect(
      collectCursedEquipped(
        loadout({ weapon: { instanceId: "a", itemId: "flint_axe", durability: 100, tier: "robust" } }),
      ),
    ).toEqual([]);
  });

  it("collects every cursed equipped slot with its curse data", () => {
    const result = collectCursedEquipped(
      loadout({
        weapon: {
          instanceId: "a",
          itemId: "flint_axe",
          durability: 100,
          tier: "masterwork",
          cursed: true,
          curseLevel: 3,
          curseEffectIds: ["self_knockback", "resource_drain"],
        },
        helmet: { instanceId: "b", itemId: "mock_helmet", durability: 100, cursed: true, curseLevel: 1, curseEffectIds: ["mocking_whiff"] },
      }),
    );

    expect(result).toEqual([
      { instanceId: "a", curseLevel: 3, curseEffectIds: ["self_knockback", "resource_drain"] },
      { instanceId: "b", curseLevel: 1, curseEffectIds: ["mocking_whiff"] },
    ]);
  });

  it("defaults curseLevel and curseEffectIds when a cursed instance is missing them", () => {
    const result = collectCursedEquipped(
      loadout({ weapon: { instanceId: "a", itemId: "flint_axe", durability: 100, cursed: true } }),
    );
    expect(result).toEqual([{ instanceId: "a", curseLevel: 1, curseEffectIds: [] }]);
  });

  it("ignores legacy string-shaped loadout slots", () => {
    expect(collectCursedEquipped(loadout({ shield: "mock_shield" }))).toEqual([]);
  });
});
