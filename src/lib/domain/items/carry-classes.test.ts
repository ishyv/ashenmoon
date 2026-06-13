import { describe, expect, it } from "vitest";
import {
  Category,
  Rarity,
  carryClassOf,
  DEFAULT_CARRY_CLASS,
  type CarryClass,
  type ItemDefinition,
} from "./item-types";
import { ITEM_DEFINITIONS, ITEM_TRAIT_INDEX } from "./item-definitions";
import { isStashable } from "./item-registry";
import { canEnterGrid } from "$lib/domain/systems/inventory-system";

function def(carry?: CarryClass): ItemDefinition {
  return {
    id: "synthetic" as ItemDefinition["id"],
    name: "Synthetic",
    description: "",
    rarity: Rarity.Common,
    category: Category.Tool,
    physical: {
      carryClass: carry ?? DEFAULT_CARRY_CLASS,
      weight: 1,
      stackLimit: 20,
    },
    traits: [],
  };
}

describe("carryClassOf", () => {
  it("defaults to pack when unspecified", () => {
    expect(carryClassOf(def())).toBe(DEFAULT_CARRY_CLASS);
    expect(DEFAULT_CARRY_CLASS).toBe("pack");
  });

  it("returns the explicit class", () => {
    expect(carryClassOf(def("pocket"))).toBe("pocket");
    expect(carryClassOf(def("haul"))).toBe("haul");
  });
});

describe("canEnterGrid / isStashable", () => {
  it("allows pocket and pack, blocks haul", () => {
    expect(canEnterGrid("pocket")).toBe(true);
    expect(canEnterGrid("pack")).toBe(true);
    expect(canEnterGrid("haul")).toBe(false);
  });

  it("isStashable mirrors the carry class", () => {
    expect(isStashable(def("pack"))).toBe(true);
    expect(isStashable(def("haul"))).toBe(false);
  });
});

describe("content tagging", () => {
  it("tags survival items as pocket", () => {
    expect(carryClassOf(ITEM_DEFINITIONS.clean_water!)).toBe("pocket");
    expect(carryClassOf(ITEM_DEFINITIONS.dirty_water!)).toBe("pocket");
  });

  it("requires physical data on milestone items", () => {
    for (const itemId of [
      "stick",
      "branch",
      "flint_shard",
      "grass_fiber",
      "leaves",
      "bark",
      "berries",
      "mushroom",
      "dirty_water",
      "clean_water",
      "clay",
      "moss",
      "ash",
      "charcoal",
      "weak_medicine",
      "debug_panacea",
    ]) {
      const defn = ITEM_DEFINITIONS[itemId]!;
      expect(defn, itemId).toBeDefined();
      expect(defn.physical.weight, itemId).toBeGreaterThan(0);
      expect(["pocket", "pack", "haul"], itemId).toContain(defn.physical.carryClass);
    }
  });

  it("indexes haul items (none yet, but the set exists and excludes stashables)", () => {
    expect(ITEM_TRAIT_INDEX.haul instanceof Set).toBe(true);
    expect(ITEM_TRAIT_INDEX.haul.has("clean_water")).toBe(false);
  });
});
