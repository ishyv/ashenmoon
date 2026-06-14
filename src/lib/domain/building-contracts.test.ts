import { describe, expect, it } from "vitest";
import { BUILDING_SPECS, M3_BUILDABLE_IDS } from "$lib/domain/building-specs";
import { BUILDABLE_BEHAVIORS, validateBuildableBehaviors } from "$lib/domain/building-behaviors";
import { validatePlaceableBuildingContracts } from "$lib/domain/building-contracts";
import { CRAFT_RECIPES } from "$lib/domain/crafting/recipes";
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";

describe("building registry contracts", () => {
  it("keeps canonical M3 buildable ids registered", () => {
    for (const id of M3_BUILDABLE_IDS) {
      expect(BUILDING_SPECS[id], id).toBeDefined();
    }
    expect(BUILDING_SPECS.simple_barrier).toBeUndefined();
    expect(BUILDING_SPECS.water_collector).toBeUndefined();
  });

  it("maps every placeable item to a known building spec", () => {
    expect(validatePlaceableBuildingContracts()).toEqual([]);
  });

  it("maps every M3 behavior spec to a known buildable", () => {
    expect(validateBuildableBehaviors()).toEqual([]);
    for (const behavior of Object.values(BUILDABLE_BEHAVIORS)) {
      expect(BUILDING_SPECS[behavior.buildableId]).toBeDefined();
    }
  });

  it("makes every structure recipe output a known placeable item", () => {
    const structureRecipes = CRAFT_RECIPES.filter((recipe) => recipe.category === "structures");
    expect(structureRecipes.length).toBeGreaterThan(0);

    for (const recipe of structureRecipes) {
      const output = ITEM_DEFINITIONS[recipe.output.itemId];
      expect(output, recipe.id).toBeDefined();
      expect(traitOf(output, "placeable"), recipe.id).toBeDefined();
    }
  });
});
