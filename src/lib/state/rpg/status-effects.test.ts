import { beforeEach, describe, expect, it } from "vitest";
import { StatusId } from "$lib/domain/systems/status-types";
import {
  applyStatusEffect,
  clearAllStatusEffects,
  statusState,
  tickStatusEffects,
} from "$lib/state/rpg/status-effects.svelte";
import { applyWound, woundState } from "$lib/state/rpg/wounds.svelte";
import { flushRpgFeedbackEvents, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import { registerPlayerFeedback } from "$lib/ui/player-feedback.svelte";

describe("RPG status event routing", () => {
  beforeEach(() => {
    statusState.active = [];
    woundState.active = [];
    rpgEventQueue.drain();
    registerPlayerFeedback(null);
  });

  it("queues status facts instead of emitting feedback directly from the status wrapper", () => {
    applyStatusEffect(StatusId.Bleeding, 5, "hazard:test");

    expect(rpgEventQueue.drain()).toEqual([
      {
        type: "status_added",
        entityId: "player",
        statusId: StatusId.Bleeding,
        source: "hazard:test",
      },
    ]);
  });

  it("queues status pulse and expiry facts during status ticks", () => {
    applyStatusEffect(StatusId.Bleeding, 5, "hazard:test");
    rpgEventQueue.drain();

    const result = tickStatusEffects(5);

    expect(result.hpDelta).toBe(-2);
    expect(rpgEventQueue.drain()).toEqual([
      { type: "status_pulsed", entityId: "player", statusId: StatusId.Bleeding },
      { type: "status_expired", entityId: "player", statusId: StatusId.Bleeding },
    ]);
  });

  it("routes queued status feedback through the feedback router", () => {
    const messages: { text: string; tone: string }[] = [];
    registerPlayerFeedback((text, tone) => messages.push({ text, tone }));

    applyStatusEffect(StatusId.Bleeding, 5, "hazard:test");
    flushRpgFeedbackEvents();

    expect(messages).toEqual([
      { text: "🩸 You are losing blood.", tone: "danger" },
    ]);
  });

  it("queues wound facts while status effects remain separate facts", () => {
    applyWound({ severity: "deep_cut", contamination: 0.2, source: "hazard:test" });

    const events = rpgEventQueue.drain();
    expect(events[0]).toMatchObject({
      type: "wound_added",
      entityId: "player",
      severity: "deep_cut",
      source: "hazard:test",
    });
    expect(events).toContainEqual({
      type: "status_added",
      entityId: "player",
      statusId: StatusId.DeepCut,
      source: "hazard:test",
    });
    expect(events).toContainEqual({
      type: "status_added",
      entityId: "player",
      statusId: StatusId.Bleeding,
      source: "hazard:test",
    });
  });

  it("queues a single all-clear fact when all statuses are cleared", () => {
    applyStatusEffect(StatusId.Bleeding, 5, "hazard:test");
    rpgEventQueue.drain();

    clearAllStatusEffects();

    expect(rpgEventQueue.drain()).toEqual([
      { type: "status_all_cleared", entityId: "player" },
    ]);
  });
});
