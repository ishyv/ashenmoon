import { BUILDING_SPECS } from "$lib/domain/building-specs";
import { traitOf, type ItemDefinition } from "$lib/domain/items";
import { Category } from "$lib/domain/items/item-types";

export type InventoryDoubleClickAction =
  | { kind: "placeBuilding"; buildableId: string }
  | { kind: "placeItem" }
  | { kind: "equip" }
  | { kind: "unequip" }
  | { kind: "consume" }
  | { kind: "study" }
  | { kind: "none" };

export type InventoryItemActionId = "equip" | "unequip" | "place" | "consume" | "study";

export type InventoryPlaceActionKind = "building" | "item";

export interface InventoryItemActionView {
  id: InventoryItemActionId;
  label: string;
  enabled: boolean;
  reason?: string;
  placeKind?: InventoryPlaceActionKind;
  buildableId?: string;
}

export interface ResolveInventoryItemActionsInput {
  def: ItemDefinition | undefined;
  itemId: string;
  isEquipped: boolean;
  canConsume?: boolean;
  consumeVerb?: string | null;
  blueprintKnown?: boolean;
}

export function canEquipFromInventory(def: ItemDefinition): boolean {
  const visual = traitOf(def, "equippable_visuals");
  return def.category === Category.Tool || !!traitOf(def, "weapon") || visual?.slots.includes("weapon") === true;
}

function resolvePlaceAction(def: ItemDefinition, isEquipped: boolean): InventoryItemActionView | null {
  if (isEquipped || traitOf(def, "blueprint")) return null;
  const placeable = traitOf(def, "placeable");
  if (placeable && BUILDING_SPECS[placeable.prefabId]) {
    return {
      id: "place",
      label: "place",
      enabled: true,
      placeKind: "building",
      buildableId: placeable.prefabId,
    };
  }
  return { id: "place", label: "place", enabled: true, placeKind: "item" };
}

/**
 * Single source of truth for inventory item actions.
 *
 * UI surfaces may add layout and dispatch callbacks, but they must not re-decide
 * item capability rules. This keeps double-click behavior and inspect buttons
 * from drifting when new item traits/categories are added.
 */
export function resolveInventoryItemActions(input: ResolveInventoryItemActionsInput): readonly InventoryItemActionView[] {
  const { def } = input;
  if (!def) return [];

  const actions: InventoryItemActionView[] = [];
  if (canEquipFromInventory(def) || traitOf(def, "wearable")) {
    actions.push({
      id: input.isEquipped ? "unequip" : "equip",
      label: input.isEquipped ? "unequip" : "equip",
      enabled: true,
    });
  }

  const consumeVerb = input.consumeVerb ?? null;
  if (consumeVerb) {
    const enabled = input.canConsume ?? true;
    actions.push({
      id: "consume",
      label: consumeVerb,
      enabled,
      ...(!enabled ? { reason: "cannot consume now" } : {}),
    });
  }

  const blueprint = traitOf(def, "blueprint");
  if (blueprint) {
    const known = input.blueprintKnown ?? false;
    actions.push({
      id: "study",
      label: known ? "already known" : "study",
      enabled: !known,
      ...(known ? { reason: "already known" } : {}),
    });
  }

  const place = resolvePlaceAction(def, input.isEquipped);
  if (place) actions.push(place);

  return actions;
}

export function resolvePrimaryInventoryAction(actions: readonly InventoryItemActionView[]): InventoryItemActionView | null {
  return actions.find((action) => action.enabled && action.id === "place" && action.placeKind === "building")
    ?? actions.find((action) => action.enabled && action.id === "unequip")
    ?? actions.find((action) => action.enabled && action.id === "equip")
    ?? actions.find((action) => action.enabled && action.id === "consume")
    ?? actions.find((action) => action.enabled && action.id === "place")
    ?? actions.find((action) => action.enabled && action.id === "study")
    ?? null;
}

export function inventoryActionToDoubleClickAction(action: InventoryItemActionView | null): InventoryDoubleClickAction {
  if (!action) return { kind: "none" };
  if (action.id === "equip") return { kind: "equip" };
  if (action.id === "unequip") return { kind: "unequip" };
  if (action.id === "consume") return { kind: "consume" };
  if (action.id === "study") return { kind: "study" };
  if (action.placeKind === "building" && action.buildableId) return { kind: "placeBuilding", buildableId: action.buildableId };
  return { kind: "placeItem" };
}

export function resolveInventoryDoubleClickAction(def: ItemDefinition | undefined): InventoryDoubleClickAction {
  const actions = resolveInventoryItemActions({
    def,
    itemId: def?.id ?? "",
    isEquipped: false,
  });
  return inventoryActionToDoubleClickAction(resolvePrimaryInventoryAction(actions));
}

export function resolveInventoryPrimaryAction(input: ResolveInventoryItemActionsInput): InventoryDoubleClickAction {
  return inventoryActionToDoubleClickAction(resolvePrimaryInventoryAction(resolveInventoryItemActions(input)));
}
