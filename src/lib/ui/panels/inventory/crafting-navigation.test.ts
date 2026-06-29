import { describe, expect, it } from "vitest";
import {
  EMPTY_RECIPE_HISTORY,
  adjacentRecipeId,
  currentRecipeFromHistory,
  selectRecipeInHistory,
  stepRecipeHistory,
} from "./crafting-navigation";

describe("crafting navigation", () => {
  it("pushes selected recipes and keeps the current entry stable", () => {
    let history = selectRecipeInHistory(EMPTY_RECIPE_HISTORY, "stick_bundle");
    history = selectRecipeInHistory(history, "stone_axe");

    expect(history).toEqual({ entries: ["stick_bundle", "stone_axe"], index: 1 });
    expect(selectRecipeInHistory(history, "stone_axe")).toBe(history);
  });

  it("steps back and forward within history boundaries", () => {
    let history = selectRecipeInHistory(EMPTY_RECIPE_HISTORY, "stick_bundle");
    history = selectRecipeInHistory(history, "stone_axe");

    const back = stepRecipeHistory(history, -1);
    expect(currentRecipeFromHistory(back)).toBe("stick_bundle");
    expect(stepRecipeHistory(back, -1)).toBe(back);

    const forward = stepRecipeHistory(back, 1);
    expect(currentRecipeFromHistory(forward)).toBe("stone_axe");
    expect(stepRecipeHistory(forward, 1)).toBe(forward);
  });

  it("drops forward history when drilling into a new component", () => {
    let history = selectRecipeInHistory(EMPTY_RECIPE_HISTORY, "parent");
    history = selectRecipeInHistory(history, "component");
    history = stepRecipeHistory(history, -1);
    history = selectRecipeInHistory(history, "other_component");

    expect(history).toEqual({ entries: ["parent", "other_component"], index: 1 });
  });

  it("finds previous and next recipe ids from the filtered order", () => {
    const recipeIds = ["a", "b", "c"];

    expect(adjacentRecipeId(recipeIds, "b", -1)).toBe("a");
    expect(adjacentRecipeId(recipeIds, "b", 1)).toBe("c");
    expect(adjacentRecipeId(recipeIds, "a", -1)).toBeNull();
    expect(adjacentRecipeId(recipeIds, "c", 1)).toBeNull();
    expect(adjacentRecipeId(recipeIds, "missing", 1)).toBe("a");
  });
});
