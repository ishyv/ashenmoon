import { beforeEach, describe, expect, it, vi } from "vitest";
import { StatusId } from "$lib/domain/systems/status-types";
import {
  flushRpgFeedbackEvents,
  rpgEventQueue,
  type FeedbackFlushContext,
} from "$lib/state/rpg/rpg-feedback-router";
import { recipeKnowledge, recipeKnown } from "$lib/state/rpg/crafting.svelte";
import { playSound } from "$lib/audio/audio-engine";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { SkillKey } from "$lib/domain/game-events";

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/state/rpg/skill-xp", () => ({
  awardSkillXp: vi.fn(),
}));

describe("RPG feedback router", () => {
  beforeEach(() => {
    rpgEventQueue.drain();
    recipeKnowledge.known = new Set();
    vi.mocked(playSound).mockClear();
    vi.mocked(awardSkillXp).mockClear();
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

  it("awards Vigilance xp for item_consumed when a vfx context is provided", () => {
    rpgEventQueue.push({ type: "item_consumed", actorId: "player", itemId: "clean_water" });
    const ctx = { vfx: {}, playerPos: { x: 0, y: 0 }, entityLayer: {} } as unknown as FeedbackFlushContext;

    flushRpgFeedbackEvents(ctx);

    expect(awardSkillXp).toHaveBeenCalledWith(SkillKey.Vigilance, 3, ctx.vfx, ctx.playerPos, ctx.entityLayer);
  });

  it("does not award xp for item_consumed without a vfx context", () => {
    rpgEventQueue.push({ type: "item_consumed", actorId: "player", itemId: "clean_water" });

    flushRpgFeedbackEvents();

    expect(awardSkillXp).not.toHaveBeenCalled();
  });

  it("awards Craftsmanship xp for item_crafted when a vfx context is provided", () => {
    rpgEventQueue.push({ type: "item_crafted", actorId: "player", recipeId: "flint_axe", itemId: "flint_axe", qty: 1 });
    const ctx = { vfx: {}, playerPos: { x: 0, y: 0 }, entityLayer: {} } as unknown as FeedbackFlushContext;

    flushRpgFeedbackEvents(ctx);

    expect(awardSkillXp).toHaveBeenCalledWith(SkillKey.Craftsmanship, 5, ctx.vfx, ctx.playerPos, ctx.entityLayer);
  });

  it("does not award xp for item_crafted without a vfx context", () => {
    rpgEventQueue.push({ type: "item_crafted", actorId: "player", recipeId: "flint_axe", itemId: "flint_axe", qty: 1 });

    flushRpgFeedbackEvents();

    expect(awardSkillXp).not.toHaveBeenCalled();
  });
});
