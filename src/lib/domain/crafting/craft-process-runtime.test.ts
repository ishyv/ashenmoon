import { describe, expect, it } from "vitest";
import {
  createCraftProcessRuntime,
  tickCraftProcessRuntime,
  recordMinigameWindow,
  minigamePerformanceOf,
  hasPlayedMinigame,
} from "./craft-process-runtime";
import type { CraftRecipe } from "./recipe-types";

const recipe: CraftRecipe = {
  id: "test_recipe",
  name: "Test",
  description: "",
  costs: [],
  output: { itemId: "wood", qty: 1 },
  process: "assemble",
  durationSec: 10,
};

describe("createCraftProcessRuntime", () => {
  it("starts at zero elapsed, full remaining, not completed, not attended", () => {
    const runtime = createCraftProcessRuntime(recipe, 5, "station_1", { isNearCampfire: false });
    expect(runtime.elapsedSec).toBe(0);
    expect(runtime.durationSec).toBe(10);
    expect(runtime.remainingSec).toBe(10);
    expect(runtime.completed).toBe(false);
    expect(runtime.attended).toBe(false);
    expect(runtime.craftsmanshipLevel).toBe(5);
    expect(runtime.targetStationEntityId).toBe("station_1");
    expect(runtime.minigameKind).toBe("strike"); // process: "assemble"
  });

  it("is immediately completed for a recipe with no duration", () => {
    const { durationSec: _durationSec, ...withoutDuration } = recipe;
    const runtime = createCraftProcessRuntime(withoutDuration, 1, "station_1", { isNearCampfire: false });
    expect(runtime.durationSec).toBe(0);
    expect(runtime.completed).toBe(true);
  });
});

describe("tickCraftProcessRuntime", () => {
  it("advances elapsed/remaining regardless of attendance, and never cancels on range loss", () => {
    let runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    runtime = tickCraftProcessRuntime(runtime, 4, false); // player out of range
    expect(runtime.elapsedSec).toBe(4);
    expect(runtime.remainingSec).toBe(6);
    expect(runtime.completed).toBe(false);
    expect(runtime.attended).toBe(false);
  });

  it("marks attended sticky once true, even if the player later leaves range", () => {
    let runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    runtime = tickCraftProcessRuntime(runtime, 1, true);
    expect(runtime.attended).toBe(true);
    runtime = tickCraftProcessRuntime(runtime, 1, false);
    expect(runtime.attended).toBe(true);
  });

  it("completes once elapsed reaches duration, clamped, and further ticks are no-ops", () => {
    let runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    runtime = tickCraftProcessRuntime(runtime, 15, false);
    expect(runtime.elapsedSec).toBe(10);
    expect(runtime.remainingSec).toBe(0);
    expect(runtime.completed).toBe(true);

    const after = tickCraftProcessRuntime(runtime, 5, true);
    expect(after).toBe(runtime); // untouched, same reference
  });
});

describe("minigame scoring", () => {
  it("performance is 0 and unplayed when no windows were ever recorded", () => {
    const runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    expect(minigamePerformanceOf(runtime)).toBe(0);
    expect(hasPlayedMinigame(runtime)).toBe(false);
  });

  it("becomes played after a single window, win or lose", () => {
    let runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    runtime = recordMinigameWindow(runtime, false);
    expect(hasPlayedMinigame(runtime)).toBe(true);
    expect(minigamePerformanceOf(runtime)).toBe(0);
  });

  it("performance reflects hits/windows", () => {
    let runtime = createCraftProcessRuntime(recipe, 1, "station_1", { isNearCampfire: false });
    runtime = recordMinigameWindow(runtime, true);
    runtime = recordMinigameWindow(runtime, true);
    runtime = recordMinigameWindow(runtime, false);
    runtime = recordMinigameWindow(runtime, false);
    expect(runtime.minigameHits).toBe(2);
    expect(runtime.minigameMisses).toBe(2);
    expect(runtime.minigameWindows).toBe(4);
    expect(minigamePerformanceOf(runtime)).toBe(0.5);
  });
});
