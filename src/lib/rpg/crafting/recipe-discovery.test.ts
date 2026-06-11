import { describe, expect, it } from "vitest";
import {
  isRecipeKnown,
  listKnownRecipes,
  matchExperiment,
  resolveExperiment,
} from "./experimental";
import type { CraftSlots } from "./crafting-system";

function slots(map: Record<string, number>): CraftSlots {
  return Object.fromEntries(Object.entries(map).map(([id, qty]) => [id, { qty }]));
}

describe("matchExperiment", () => {
  it("matches the exact ingredient set with enough of each", () => {
    const { recipe } = matchExperiment({ oak_wood: 5, stone: 3 });
    expect(recipe?.id).toBe("flint_axe");
  });

  it("does not match when an extra ingredient is present", () => {
    const { recipe, partial } = matchExperiment({ oak_wood: 5, stone: 3, charcoal: 1 });
    expect(recipe).toBeNull();
    expect(partial.length).toBeGreaterThan(0); // shares ingredients -> hints
  });

  it("does not match when short on a material", () => {
    const { recipe } = matchExperiment({ oak_wood: 5, stone: 1 });
    expect(recipe).toBeNull();
  });

  it("returns no partials for wholly unrelated inputs", () => {
    const { recipe, partial } = matchExperiment({ ghost_lily: 9 });
    expect(recipe).toBeNull();
    expect(partial).toHaveLength(0);
  });
});

describe("resolveExperiment", () => {
  it("discovers and crafts a matching recipe, drawing from inventory", () => {
    const inv = slots({ oak_wood: 5, stone: 3 });
    const result = resolveExperiment(inv, { oak_wood: 5, stone: 3 }, { isNearCampfire: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.id).toBe("flint_axe");
    expect(result.slots.flint_axe).toEqual({ qty: 1 });
  });

  it("reports no_match for an unknown combination", () => {
    const result = resolveExperiment(slots({ ghost_lily: 1 }), { ghost_lily: 1 }, { isNearCampfire: false });
    expect(result).toEqual({ ok: false, reason: "no_match" });
  });

  it("surfaces the campfire requirement for smelting experiments", () => {
    const inv = slots({ copper_ore: 3, charcoal: 1 });
    const result = resolveExperiment(inv, { copper_ore: 3, charcoal: 1 }, { isNearCampfire: false });
    expect(result).toEqual({ ok: false, reason: "requires_campfire" });
  });

  it("reports insufficient_materials when the inventory lacks what the inputs claim", () => {
    const result = resolveExperiment(slots({ oak_wood: 1 }), { oak_wood: 5, stone: 3 }, { isNearCampfire: false });
    expect(result).toEqual({ ok: false, reason: "insufficient_materials" });
  });
});

describe("known-recipe mode", () => {
  it("filters the book to unlocked recipes", () => {
    const known = new Set(["flint_axe", "charcoal"]);
    expect(listKnownRecipes(known).map((r) => r.id).sort()).toEqual(["charcoal", "flint_axe"]);
    expect(isRecipeKnown(known, "flint_axe")).toBe(true);
    expect(isRecipeKnown(known, "iron_ingot")).toBe(false);
  });
});
