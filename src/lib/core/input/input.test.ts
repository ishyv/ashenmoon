import { describe, expect, it } from "vitest";
import { InputResource } from "./input";
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

describe("InputResource primary mouse attack arbitration", () => {
  it("short clicks under the swipe threshold queue a normal attack", () => {
    const input = new InputResource();

    input.handlePrimaryMouseDown({
      nowMs: 1000,
      screen: { x: 100, y: 100 },
      world: { x: 320, y: 320 },
    });
    input.handlePrimaryMouseUp({
      nowMs: 1120,
      screen: { x: 120, y: 100 },
      world: { x: 340, y: 320 },
    });

    expect(input.pendingAttack).toBe(true);
    expect(input.pendingDrivingThrust).toBeNull();
    expect(input.pendingFellSweep).toBe(false);
  });

  it("short swipes over the threshold queue Driving Thrust", () => {
    const input = new InputResource();

    input.handlePrimaryMouseDown({
      nowMs: 1000,
      screen: { x: 100, y: 100 },
      world: { x: 320, y: 320 },
    });
    input.handlePrimaryMouseMove({
      screen: { x: 145, y: 100 },
      world: { x: 365, y: 320 },
    });
    input.handlePrimaryMouseUp({
      nowMs: 1120,
      screen: { x: 145, y: 100 },
      world: { x: 365, y: 320 },
    });

    expect(input.pendingAttack).toBe(false);
    expect(input.pendingDrivingThrust?.direction).toEqual({ x: 1, y: 0 });
    expect(input.pendingFellSweep).toBe(false);
  });

  it("long holds queue Fell Sweep instead of Driving Thrust", () => {
    const input = new InputResource();

    input.handlePrimaryMouseDown({
      nowMs: 1000,
      screen: { x: 100, y: 100 },
      world: { x: 320, y: 320 },
    });
    input.handlePrimaryMouseMove({
      screen: { x: 180, y: 100 },
      world: { x: 400, y: 320 },
    });
    input.handlePrimaryMouseUp({
      nowMs: 1300,
      screen: { x: 180, y: 100 },
      world: { x: 400, y: 320 },
    });

    expect(input.pendingAttack).toBe(false);
    expect(input.pendingDrivingThrust).toBeNull();
    expect(input.pendingFellSweep).toBe(true);
  });
});
