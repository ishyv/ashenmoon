import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusId } from "$lib/domain/systems/status-types";
import { flushRpgFeedbackEvents, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import { recipeKnowledge, recipeKnown } from "$lib/state/rpg/crafting.svelte";
import { playSound } from "$lib/audio/audio-engine";

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

describe("RPG feedback router", () => {
  beforeEach(() => {
    rpgEventQueue.drain();
    recipeKnowledge.known = new Set();
    vi.mocked(playSound).mockClear();
  });

  it("routes crafted item events through sound and recipe learning", () => {
    rpgEventQueue.push({
      type: "item_crafted",
      actorId: "player",
      recipeId: "flint_axe",
      itemId: "flint_axe",
      qty: 1,
    });

    flushRpgFeedbackEvents();

    expect(playSound).toHaveBeenCalledWith("craft.bind");
    expect(recipeKnown("flint_axe")).toBe(true);
  });

  it("routes discovered recipe events through the same craft feedback path", () => {
    rpgEventQueue.push({
      type: "recipe_discovered",
      actorId: "player",
      recipeId: "binding_cord",
    });

    flushRpgFeedbackEvents();

    expect(playSound).toHaveBeenCalledWith("recipe.discovered");
    expect(recipeKnown("binding_cord")).toBe(true);
  });

  it("routes craft failures to the failure sound without touching status routing", () => {
    rpgEventQueue.push({
      type: "craft_failed",
      actorId: "player",
      recipeId: "flint_axe",
      reason: "insufficient_materials",
    });
    rpgEventQueue.push({
      type: "status_added",
      entityId: "player",
      statusId: StatusId.Bleeding,
      source: "hazard:test",
    });

    flushRpgFeedbackEvents();

    expect(playSound).toHaveBeenCalledWith("craft.failure");
    expect(recipeKnown("flint_axe")).toBe(false);
  });
});
