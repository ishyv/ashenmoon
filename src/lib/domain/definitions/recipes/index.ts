import type { RecipeInput } from "$lib/domain/crafting/recipe-types";
import { processingRecipes } from "./processing";
import { fuelRecipes } from "./fuel";
import { foodRecipes } from "./food";
import { medicineRecipes } from "./medicine";
import { toolRecipes } from "./tools";
import { clothingRecipes } from "./clothing";
import { structureRecipes } from "./structures";
import { trapRecipes } from "./traps";

export const allRecipes: readonly RecipeInput[] = [
  ...processingRecipes,
  ...fuelRecipes,
  ...foodRecipes,
  ...medicineRecipes,
  ...toolRecipes,
  ...clothingRecipes,
  ...structureRecipes,
  ...trapRecipes,
];
