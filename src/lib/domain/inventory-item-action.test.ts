import { describe, expect, it } from "vitest";
import { BUILDING_SPECS } from "$lib/domain/building-specs";
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import { Category } from "$lib/domain/items/item-types";
import {
  inventoryActionToDoubleClickAction,
  resolveInventoryDoubleClickAction,
  resolveInventoryItemActions,
  resolveInventoryPrimaryAction,
  resolvePrimaryInventoryAction,
  type InventoryItemActionId,
} from "./inventory-item-action";

function actionIds(itemId: string, overrides: Partial<Parameters<typeof resolveInventoryItemActions>[0]> = {}): InventoryItemActionId[] {
  const def = ITEM_DEFINITIONS[itemId];
  return resolveInventoryItemActions({
    def,
    itemId,
    isEquipped: false,
    consumeVerb: traitOf(def, "consumable")?.verb ?? null,
    canConsume: true,
    blueprintKnown: false,
    ...overrides,
  }).map((action) => action.id);
}

function hasAction(itemId: string, actionId: InventoryItemActionId): boolean {
  return actionIds(itemId).includes(actionId);
}

describe("resolveInventoryItemActions capability invariants", () => {
  it("exposes equip for every item with a weapon trait", () => {
    const weaponIds = Object.entries(ITEM_DEFINITIONS)
      .filter(([, def]) => !!traitOf(def, "weapon"))
      .map(([itemId]) => itemId);

    expect(weaponIds.length).toBeGreaterThan(0);
    for (const itemId of weaponIds) {
      expect(hasAction(itemId, "equip"), itemId).toBe(true);
    }
  });

  it("exposes equip for every weapon-slot equippable visual", () => {
    const weaponSlotIds = Object.entries(ITEM_DEFINITIONS)
      .filter(([, def]) => traitOf(def, "equippable_visuals")?.slots.includes("weapon"))
      .map(([itemId]) => itemId);

    expect(weaponSlotIds.length).toBeGreaterThan(0);
    for (const itemId of weaponSlotIds) {
      expect(hasAction(itemId, "equip"), itemId).toBe(true);
    }
  });

  it("exposes equip for every tool category item", () => {
    const toolIds = Object.entries(ITEM_DEFINITIONS)
      .filter(([, def]) => def.category === Category.Tool)
      .map(([itemId]) => itemId);

    expect(toolIds.length).toBeGreaterThan(0);
    for (const itemId of toolIds) {
      expect(hasAction(itemId, "equip"), itemId).toBe(true);
    }
  });

  it("exposes equip for every wearable item", () => {
    const wearableIds = Object.entries(ITEM_DEFINITIONS)
      .filter(([, def]) => !!traitOf(def, "wearable"))
      .map(([itemId]) => itemId);

    expect(wearableIds.length).toBeGreaterThan(0);
    for (const itemId of wearableIds) {
      expect(hasAction(itemId, "equip"), itemId).toBe(true);
    }
  });

  it("exposes study and suppresses place for every blueprint", () => {
    const blueprintIds = Object.entries(ITEM_DEFINITIONS)
      .filter(([, def]) => !!traitOf(def, "blueprint"))
      .map(([itemId]) => itemId);

    expect(blueprintIds.length).toBeGreaterThan(0);
    for (const itemId of blueprintIds) {
      expect(hasAction(itemId, "study"), itemId).toBe(true);
      expect(hasAction(itemId, "place"), itemId).toBe(false);
    }
  });

  it("suppresses place for equipped items", () => {
    expect(actionIds("crude_knife", { isEquipped: true })).toContain("unequip");
    expect(actionIds("crude_knife", { isEquipped: true })).not.toContain("place");
  });

  it("returns no actions for unknown or missing definitions", () => {
    expect(resolveInventoryItemActions({ def: undefined, itemId: "missing", isEquipped: false })).toEqual([]);
  });
});

describe("resolveInventoryItemActions regression cases", () => {
  it("crude knife exposes equip and place", () => {
    expect(actionIds("crude_knife")).toEqual(expect.arrayContaining(["equip", "place"]));
  });

  it("wooden spear exposes equip and place", () => {
    expect(actionIds("wooden_spear")).toEqual(expect.arrayContaining(["equip", "place"]));
  });

  it("hardened spear exposes equip and place", () => {
    expect(actionIds("hardened_spear")).toEqual(expect.arrayContaining(["equip", "place"]));
  });

  it("offers unequip for equipped items without exposing placement", () => {
    const actions = resolveInventoryItemActions({
      def: ITEM_DEFINITIONS.wooden_spear,
      itemId: "wooden_spear",
      isEquipped: true,
    });

    expect(actions).toContainEqual(expect.objectContaining({ id: "unequip", label: "unequip", enabled: true }));
    expect(actions.some((action) => action.id === "place")).toBe(false);
  });
});

describe("inventory primary action routing", () => {
  it("keeps double-click routing derived from the same action resolver", () => {
    for (const [itemId, def] of Object.entries(ITEM_DEFINITIONS)) {
      const actions = resolveInventoryItemActions({
        def,
        itemId,
        isEquipped: false,
        consumeVerb: traitOf(def, "consumable")?.verb ?? null,
        canConsume: true,
        blueprintKnown: false,
      });
      const expected = inventoryActionToDoubleClickAction(resolvePrimaryInventoryAction(actions));

      expect(resolveInventoryPrimaryAction({ def, itemId, isEquipped: false, consumeVerb: traitOf(def, "consumable")?.verb ?? null, canConsume: true })).toEqual(expected);
    }
  });

  it("preserves building-kit double-click priority over generic placement", () => {
    const buildingKit = Object.entries(ITEM_DEFINITIONS).find(([, def]) => {
      const placeable = traitOf(def, "placeable");
      return placeable && BUILDING_SPECS[placeable.prefabId];
    });

    expect(buildingKit).toBeDefined();
    const [itemId, def] = buildingKit!;
    expect(resolveInventoryPrimaryAction({ def, itemId, isEquipped: false })).toEqual({
      kind: "placeBuilding",
      buildableId: traitOf(def, "placeable")!.prefabId,
    });
  });

  it("keeps the legacy double-click wrapper as a resolver-backed compatibility path", () => {
    expect(resolveInventoryDoubleClickAction(ITEM_DEFINITIONS.wooden_spear)).toEqual({ kind: "equip" });
  });

  it("double-click unequips equipped equipment from the same resolver output", () => {
    expect(resolveInventoryPrimaryAction({
      def: ITEM_DEFINITIONS.wooden_spear,
      itemId: "wooden_spear",
      isEquipped: true,
    })).toEqual({ kind: "unequip" });
  });
});
