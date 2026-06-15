import { describe, expect, it } from "vitest";
import { createGameEventQueue } from "$lib/domain/game-event-queue";
import {
  enqueuePickupInteractionEvents,
  enqueueStationProcessCompletedEvents,
  enqueueWorldActionCompletedEvent,
} from "./interaction-events";

describe("interaction event adapters", () => {
  it("enqueues item and completion facts for pickup interactions", () => {
    const queue = createGameEventQueue();

    enqueuePickupInteractionEvents({
      queue,
      actorId: "player",
      targetId: "flint_1",
      itemId: "flint_shard",
      qty: 1,
    });

    expect(queue.drain()).toEqual([
      {
        type: "item_gained",
        actorId: "player",
        itemId: "flint_shard",
        qty: 1,
        source: "flint_1",
      },
      {
        type: "interaction_completed",
        actorId: "player",
        targetId: "flint_1",
        actionId: "pickup",
      },
    ]);
  });

  it("allows callers without an event queue during migration", () => {
    expect(() =>
      enqueuePickupInteractionEvents({
        actorId: "player",
        targetId: "stick_1",
        itemId: "stick",
        qty: 1,
      }),
    ).not.toThrow();
  });

  it("enqueues item and completion facts for station process completion", () => {
    const queue = createGameEventQueue();

    enqueueStationProcessCompletedEvents({
      queue,
      actorId: "player",
      targetId: "campfire",
      processId: "boil_water",
      outputItemId: "clean_water",
      outputQty: 1,
    });

    expect(queue.drain()).toEqual([
      {
        type: "item_gained",
        actorId: "player",
        itemId: "clean_water",
        qty: 1,
        source: "boil_water",
      },
      {
        type: "interaction_completed",
        actorId: "player",
        targetId: "campfire",
        actionId: "process",
      },
    ]);
  });

  it("enqueues completion facts for timed world actions", () => {
    const queue = createGameEventQueue();

    enqueueWorldActionCompletedEvent({
      queue,
      actorId: "player",
      targetId: "boar_carcass",
      actionId: "harvest_meat",
    });

    expect(queue.drain()).toEqual([
      {
        type: "world_action_completed",
        actorId: "player",
        targetId: "boar_carcass",
        actionId: "harvest_meat",
      },
    ]);
  });
});
