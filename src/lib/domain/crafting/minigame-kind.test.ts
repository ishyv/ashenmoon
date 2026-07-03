import { describe, expect, it } from "vitest";
import { minigameKindFor } from "./minigame-kind";
import type { CraftRecipe } from "./recipe-types";

function recipe(overrides: Partial<CraftRecipe>): CraftRecipe {
  return {
    id: "test",
    name: "Test",
    description: "",
    costs: [],
    output: { itemId: "wood", qty: 1 },
    ...overrides,
  };
}

describe("minigameKindFor", () => {
  it("maps assemble to strike", () => {
    expect(minigameKindFor(recipe({ process: "assemble" }))).toBe("strike");
  });

  it("maps heat/boil/burn to tension", () => {
    expect(minigameKindFor(recipe({ process: "heat" }))).toBe("tension");
    expect(minigameKindFor(recipe({ process: "boil" }))).toBe("tension");
    expect(minigameKindFor(recipe({ process: "burn" }))).toBe("tension");
  });

  it("maps dry/smoke to sequence", () => {
    expect(minigameKindFor(recipe({ process: "dry" }))).toBe("sequence");
    expect(minigameKindFor(recipe({ process: "smoke" }))).toBe("sequence");
  });

  it("falls back to strike for an unmapped or missing process", () => {
    expect(minigameKindFor(recipe({ process: "store" }))).toBe("strike");
    expect(minigameKindFor(recipe({}))).toBe("strike");
  });

  it("an explicit minigameKind always wins over the process-derived default", () => {
    expect(minigameKindFor(recipe({ process: "heat", minigameKind: "sequence" }))).toBe("sequence");
  });
});
