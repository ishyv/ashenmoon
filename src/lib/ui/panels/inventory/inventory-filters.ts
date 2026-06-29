import { Category, traitOf, type ItemDefinition } from "$lib/domain/items";
import type { InventoryItemView } from "./types";

export type InventoryFilterId =
  | "all"
  | "consumable"
  | "equipment"
  | "materials"
  | "structures"
  | "knowledge";

export interface InventoryFilterDefinition {
  id: InventoryFilterId;
  label: string;
  ariaLabel: string;
}

export const INVENTORY_FILTERS: readonly InventoryFilterDefinition[] = [
  { id: "all", label: "all", ariaLabel: "show all stash items" },
  { id: "consumable", label: "use", ariaLabel: "show consumable stash items" },
  { id: "equipment", label: "gear", ariaLabel: "show equipment stash items" },
  { id: "materials", label: "mats", ariaLabel: "show material stash items" },
  { id: "structures", label: "build", ariaLabel: "show structure stash items" },
  { id: "knowledge", label: "lore", ariaLabel: "show knowledge stash items" },
];

const MATERIAL_CATEGORIES = new Set<Category>([
  Category.Mineral,
  Category.Timber,
  Category.Component,
  Category.Herb,
  Category.Reagent,
  Category.Fuel,
]);

const EQUIPMENT_CATEGORIES = new Set<Category>([
  Category.Tool,
  Category.Weapon,
  Category.Clothing,
  Category.Container,
]);

export function itemMatchesInventoryFilter(
  def: ItemDefinition | undefined,
  filterId: InventoryFilterId,
): boolean {
  if (filterId === "all") return !!def;
  if (!def) return false;

  if (filterId === "consumable") {
    return !!traitOf(def, "consumable") || def.category === Category.Food || def.category === Category.Medicine;
  }

  if (filterId === "equipment") {
    return (
      EQUIPMENT_CATEGORIES.has(def.category) ||
      !!traitOf(def, "tool") ||
      !!traitOf(def, "weapon") ||
      !!traitOf(def, "wearable")
    );
  }

  if (filterId === "materials") {
    return MATERIAL_CATEGORIES.has(def.category);
  }

  if (filterId === "structures") {
    return def.category === Category.Structure || !!traitOf(def, "placeable");
  }

  return def.category === Category.Knowledge || !!traitOf(def, "blueprint");
}

export function filterInventoryItems(
  items: readonly InventoryItemView[],
  filterId: InventoryFilterId,
  query: string,
  getDefinition: (itemId: string) => ItemDefinition | undefined,
): InventoryItemView[] {
  const normalizedQuery = query.trim().toLowerCase();

  return items.filter((item) => {
    const def = getDefinition(item.itemId);
    if (!itemMatchesInventoryFilter(def, filterId)) return false;
    if (normalizedQuery.length === 0) return true;
    return def?.name.toLowerCase().includes(normalizedQuery) ?? false;
  });
}

export function countInventoryFilters(
  items: readonly InventoryItemView[],
  getDefinition: (itemId: string) => ItemDefinition | undefined,
): Record<InventoryFilterId, number> {
  const counts: Record<InventoryFilterId, number> = {
    all: 0,
    consumable: 0,
    equipment: 0,
    materials: 0,
    structures: 0,
    knowledge: 0,
  };

  for (const item of items) {
    const def = getDefinition(item.itemId);
    for (const filter of INVENTORY_FILTERS) {
      if (itemMatchesInventoryFilter(def, filter.id)) {
        counts[filter.id] += 1;
      }
    }
  }

  return counts;
}
