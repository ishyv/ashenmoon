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
import { isStashable } from "./item-validation";
import { canEnterGrid } from "../systems/inventory-system";

function def(carry?: CarryClass): ItemDefinition {
  return {
    id: "synthetic" as ItemDefinition["id"],
    name: "Synthetic",
    description: "",
    rarity: Rarity.Common,
    category: Category.Tool,
    carry,
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
    expect(carryClassOf(ITEM_DEFINITIONS.clean_water)).toBe("pocket");
    expect(carryClassOf(ITEM_DEFINITIONS.dirty_water)).toBe("pocket");
  });

  it("indexes haul items (none yet, but the set exists and excludes stashables)", () => {
    expect(ITEM_TRAIT_INDEX.haul instanceof Set).toBe(true);
    expect(ITEM_TRAIT_INDEX.haul.has("clean_water")).toBe(false);
  });
});
