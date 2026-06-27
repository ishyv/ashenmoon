import { BUILDING_SPECS } from "$lib/domain/building-specs";
import { traitOf, type ItemDefinition } from "$lib/domain/items";

export type InventoryDoubleClickAction =
  | { kind: "placeBuilding"; buildableId: string }
  | { kind: "placeItem" }
  | { kind: "equip" }
  | { kind: "consume" }
  | { kind: "none" };

export function resolveInventoryDoubleClickAction(def: ItemDefinition | undefined): InventoryDoubleClickAction {
  if (!def) return { kind: "none" };

  const placeable = traitOf(def, "placeable");
  if (placeable) {
    return BUILDING_SPECS[placeable.prefabId]
      ? { kind: "placeBuilding", buildableId: placeable.prefabId }
      : { kind: "placeItem" };
  }

  if (def.category === "tool" || traitOf(def, "wearable")) return { kind: "equip" };
  if (traitOf(def, "consumable")) return { kind: "consume" };

  return { kind: "none" };
}
