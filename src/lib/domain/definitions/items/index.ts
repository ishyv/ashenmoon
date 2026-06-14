import type { ItemDefinition } from "$lib/domain/items/item-types";
import { materialItems } from "./materials";
import { foodWaterItems } from "./food-water";
import { medicineItems } from "./medicine";
import { toolWeaponItems } from "./tools-weapons";
import { clothingItems } from "./clothing";
import { structureItems } from "./structures";

export const allItemDefinitions: Record<string, ItemDefinition> = {
  ...materialItems,
  ...foodWaterItems,
  ...medicineItems,
  ...toolWeaponItems,
  ...clothingItems,
  ...structureItems,
};
