import { describe, expect, it } from "vitest";
import {
  eurekaRecipesFor,
  EUREKA_CHANCE,
  propertyFromReaction,
  propertiesFromConsume,
} from "./knowledge-unlock";
import type { CraftRecipe } from "$lib/domain/crafting/recipe-types";

// ---------------------------------------------------------------------------
// Minimal recipe fixtures — no real item definitions needed for pure tests.
// ---------------------------------------------------------------------------

function makeRecipe(id: string, ingredientIds: string[], discoverable = true): CraftRecipe {
  return {
    id,
    name: id,
    description: "",
    discoverable,
    costs: ingredientIds.map((itemId) => ({ itemId: itemId as any, name: itemId, required: 1 })),
    output: { itemId: "wood" as any, qty: 1 },
    feedbackTags: [],
  };
}

const CORD = makeRecipe("binding_cord", ["plant_fibre"]);
const AXE = makeRecipe("flint_axe", ["binding_cord", "flint_shard"]);
const BOW = makeRecipe("crude_bow", ["binding_cord", "wood"]);
const HIDDEN = makeRecipe("secret_recipe", ["binding_cord"], false); // not discoverable
const UNRELATED = makeRecipe("campfire_kit", ["stone", "wood"]);

const ALL_RECIPES = [CORD, AXE, BOW, HIDDEN, UNRELATED];

// ---------------------------------------------------------------------------
// eurekaRecipesFor
// ---------------------------------------------------------------------------

describe("eurekaRecipesFor", () => {
  it("returns an empty array when the RNG roll fails (>= chance)", () => {
    const alwaysFail = () => 1.0; // 1.0 >= EUREKA_CHANCE, always fails
    expect(eurekaRecipesFor("binding_cord", new Set(), ALL_RECIPES, alwaysFail)).toEqual([]);
  });

  it("returns an empty array when all downstream recipes are already known", () => {
    const alwaysPass = () => 0.0; // 0.0 < EUREKA_CHANCE, always passes
    const known = new Set(["flint_axe", "crude_bow"]); // both cord-using recipes known
    expect(eurekaRecipesFor("binding_cord", known, ALL_RECIPES, alwaysPass)).toEqual([]);
  });

  it("returns an empty array when no recipe uses the crafted item as ingredient", () => {
    const alwaysPass = () => 0.0;
    // "iron_ore" does not appear in any test fixture recipe's cost list
    expect(eurekaRecipesFor("iron_ore" as any, new Set(), ALL_RECIPES, alwaysPass)).toEqual([]);
  });

  it("never reveals non-discoverable recipes", () => {
    const alwaysPass = () => 0.0;
    // Only secret_recipe uses binding_cord but it has discoverable = false; the
    // two others (flint_axe, crude_bow) should be eligible, not secret_recipe.
    const known = new Set(["flint_axe", "crude_bow"]);
    expect(eurekaRecipesFor("binding_cord", known, ALL_RECIPES, alwaysPass)).toEqual([]);
  });

  it("returns exactly one recipe id on a successful roll", () => {
    const alwaysPass = () => 0.0;
    const result = eurekaRecipesFor("binding_cord", new Set(), ALL_RECIPES, alwaysPass);
    expect(result).toHaveLength(1);
    expect(["flint_axe", "crude_bow"]).toContain(result[0]);
  });

  it("excludes already-known candidates", () => {
    const alwaysPass = () => 0.0;
    // Know axe already — should only be able to reveal bow.
    const result = eurekaRecipesFor("binding_cord", new Set(["flint_axe"]), ALL_RECIPES, alwaysPass);
    expect(result).toEqual(["crude_bow"]);
  });

  it("respects a custom chance parameter", () => {
    // With chance=0 nothing should ever be revealed.
    const alwaysPass = () => 0.0;
    expect(eurekaRecipesFor("binding_cord", new Set(), ALL_RECIPES, alwaysPass, 0)).toEqual([]);
  });

  it("EUREKA_CHANCE constant is the expected 25%", () => {
    expect(EUREKA_CHANCE).toBe(0.25);
  });
});

// ---------------------------------------------------------------------------
// Regression guard — existing unlock rules are unchanged
// ---------------------------------------------------------------------------

describe("propertyFromReaction (regression)", () => {
  it("maps reaction kinds to properties", () => {
    expect(propertyFromReaction("flammable")).toBe("flammable");
    expect(propertyFromReaction("decay")).toBe("perishable");
    expect(propertyFromReaction("temperature")).toBe("heat_sensitive");
  });
});

describe("propertiesFromConsume (regression)", () => {
  it("always includes edible", () => {
    expect(propertiesFromConsume({ harmed: false, restoredThirst: false })).toContain("edible");
  });

  it("adds thirst_value and toxicity from experience", () => {
    expect(propertiesFromConsume({ harmed: true, restoredThirst: true })).toEqual([
      "edible",
      "thirst_value",
      "toxicity",
    ]);
  });
});
