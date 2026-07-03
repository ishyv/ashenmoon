import type { ItemDefinition } from "$lib/domain/items/item-types";
import { materialItems } from "./materials";
import { foodWaterItems } from "./food-water";
import { medicineItems } from "./medicine";
import { toolWeaponItems } from "./tools-weapons";
import { clothingItems } from "./clothing";
import { structureItems } from "./structures";
import { blueprintItems } from "./blueprints";
import { trapItems } from "./traps";

export const allItemDefinitions = {
  ...materialItems,
  ...foodWaterItems,
  ...medicineItems,
  ...toolWeaponItems,
  ...clothingItems,
  ...structureItems,
  ...blueprintItems,
  ...trapItems,
} satisfies Record<string, ItemDefinition>;

export type ValidItemId = keyof typeof allItemDefinitions;
