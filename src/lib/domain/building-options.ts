import { BUILDING_SPECS } from "$lib/domain/building-specs";
import { ITEM_DEFINITIONS, traitOf, type ItemDefinition } from "$lib/domain/items";
import type { RpgInventorySlot } from "$lib/domain/rpg-types";

export interface BuildPlacementOption {
  readonly buildableId: string;
  readonly sourceItemId: string;
  readonly sourceItemName: string;
  readonly available: number;
  readonly name: string;
  readonly description: string;
}

function slotQty(slot: RpgInventorySlot | undefined): number {
  if (!slot) return 0;
  return "qty" in slot ? slot.qty : slot.instances.length;
}

export function placeableBuildableId(item: ItemDefinition | undefined): string | null {
  return traitOf(item, "placeable")?.prefabId ?? null;
}

export function buildOptionsFromInventory(
  slots: Readonly<Record<string, RpgInventorySlot>>,
  items: Readonly<Record<string, ItemDefinition>> = ITEM_DEFINITIONS,
): BuildPlacementOption[] {
  return Object.entries(slots)
    .flatMap(([itemId, slot]) => {
      const available = slotQty(slot);
      if (available <= 0) return [];

      const item = items[itemId];
      if (!item) return [];
      const buildableId = placeableBuildableId(item);
      if (!buildableId) return [];

      const spec = BUILDING_SPECS[buildableId];
      if (!spec) return [];

      return [{
        buildableId,
        sourceItemId: itemId,
        sourceItemName: item.name,
        available,
        name: spec.displayName,
        description: spec.description,
      }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
