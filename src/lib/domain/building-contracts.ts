import { BUILDING_SPECS, validateBuildingSpecs } from "$lib/domain/building-specs";
import { validateBuildableBehaviors } from "$lib/domain/building-behaviors";
import { CRAFT_RECIPES, type CraftRecipe } from "$lib/domain/crafting/recipes";
import { ITEM_DEFINITIONS, traitOf, type ItemDefinition } from "$lib/domain/items";

export function validatePlaceableBuildingContracts(input: {
  readonly items?: Readonly<Record<string, ItemDefinition>>;
  readonly recipes?: readonly CraftRecipe[];
  readonly buildingSpecs?: Readonly<Record<string, unknown>>;
} = {}): string[] {
  const items = input.items ?? ITEM_DEFINITIONS;
  const recipes = input.recipes ?? CRAFT_RECIPES;
  const buildingSpecs = input.buildingSpecs ?? BUILDING_SPECS;
  const problems: string[] = [];

  for (const [itemId, item] of Object.entries(items)) {
    const placeable = traitOf(item, "placeable");
    if (!placeable) continue;
    if (!buildingSpecs[placeable.prefabId]) {
      problems.push(`placeable item ${itemId} references missing building spec ${placeable.prefabId}`);
    }
  }

  for (const recipe of recipes.filter((recipe) => recipe.category === "structures")) {
    const output = items[recipe.output.itemId];
    if (!output) {
      problems.push(`structure recipe ${recipe.id} outputs missing item ${recipe.output.itemId}`);
      continue;
    }
    if (!traitOf(output, "placeable")) {
      problems.push(`structure recipe ${recipe.id} outputs non-placeable item ${recipe.output.itemId}`);
    }
  }

  return problems;
}

export function validateBuildingRegistryContracts(): string[] {
  return [
    ...validateBuildingSpecs(BUILDING_SPECS),
    ...validateBuildableBehaviors(),
    ...validatePlaceableBuildingContracts(),
  ];
}
