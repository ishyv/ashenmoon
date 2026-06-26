import { beforeEach, describe, expect, it } from "vitest";
import { gameState } from "$lib/state/game-state.svelte";
import { statusState } from "$lib/state/rpg/status-effects.svelte";
import { tickHunger, restoreHunger, setHunger, hungerConfig } from "$lib/state/rpg/survival.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";

describe("survival hunger state ticking", () => {
  beforeEach(() => {
    gameState.survival.hunger = 100;
    gameState.survival.wasStarving = false;
    statusState.active = [];
    rpgEventQueue.drain();
  });

  it("drains hunger over time", () => {
    tickHunger(60, { moving: false, laboring: false }); // 60 seconds idle
    const expectedDrain = hungerConfig.baseDrainPerSec * 60;
    expect(gameState.survival.hunger).toBeCloseTo(100 - expectedDrain);
  });

  it("applies Starving status when hunger reaches 0", () => {
    setHunger(0);
    expect(gameState.survival.hunger).toBe(0);
    expect(gameState.survival.wasStarving).toBe(true);
    expect(statusState.active.some((s) => s.id === StatusId.Starving)).toBe(true);
  });

  it("clears Starving status when hunger is restored", () => {
    setHunger(0);
    expect(gameState.survival.wasStarving).toBe(true);
    expect(statusState.active.some((s) => s.id === StatusId.Starving)).toBe(true);

    restoreHunger(10);
    expect(gameState.survival.hunger).toBe(10);
    expect(gameState.survival.wasStarving).toBe(false);
    expect(statusState.active.some((s) => s.id === StatusId.Starving)).toBe(false);
  });
});
