import { describe, expect, it } from "vitest";
import { InputResource } from "$lib/core/input";
import { InputAction } from "$lib/domain/game-events";

describe("InputResource focused gathering", () => {
  it("pressing the focused gather key queues focused gathering", () => {
    const input = new InputResource();

    input.handleKeyDown("f", false, 1000);

    expect(input.focusedGatherTriggered).toBe(true);
  });

  it("holding the focused gather key does not spam triggers through key repeat", () => {
    const input = new InputResource();

    input.handleKeyDown("f", false, 1000);
    input.focusedGatherTriggered = false;
    input.handleKeyDown("f", true, 1010);

    expect(input.focusedGatherTriggered).toBe(false);
  });

  it("pressing harvest no longer queues focused gathering", () => {
    const input = new InputResource();

    input.handleKeyDown("e", false, 1000);
    input.handleKeyDown("e", false, 1100);

    expect(input.focusedGatherTriggered).toBe(false);
    expect(input.isActionPressed(InputAction.Harvest)).toBe(true);
  });
});
