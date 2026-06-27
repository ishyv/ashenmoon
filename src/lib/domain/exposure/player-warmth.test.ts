import { describe, expect, it } from "vitest";
import { calculatePlayerWarmth } from "./player-warmth";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";

describe("calculatePlayerWarmth", () => {
  it("returns 0 warmth for a default player with no gear", () => {
    const state = createDefaultPlayerState();
    expect(calculatePlayerWarmth(state)).toBe(0);
  });

  it("calculates the warmth of equipped clothing", () => {
    const state = createDefaultPlayerState();
    state.profile.loadout.chest = { instanceId: "1", itemId: "hide_cloak", durability: 100 };
    expect(calculatePlayerWarmth(state)).toBe(2);

    state.profile.loadout.helmet = { instanceId: "2", itemId: "fur_lined_wrap", durability: 100 };
    // Cloak (2) + Fur Wrap (3) = 5
    expect(calculatePlayerWarmth(state)).toBe(5);
  });
});
