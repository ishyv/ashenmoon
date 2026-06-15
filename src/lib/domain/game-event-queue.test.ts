import { describe, expect, it } from "vitest";
import { createGameEventQueue } from "./game-event-queue";

describe("GameEventQueue", () => {
  it("stores events in order and drains them atomically", () => {
    const queue = createGameEventQueue();

    queue.push({ type: "health_changed", entityId: "player", previous: 100, current: 75, max: 100 });
    queue.push({
      type: "damage_applied",
      targetId: "player",
      amount: 25,
      damageType: "physical",
      lethal: false,
    });

    expect(queue.peek()).toEqual([
      { type: "health_changed", entityId: "player", previous: 100, current: 75, max: 100 },
      {
        type: "damage_applied",
        targetId: "player",
        amount: 25,
        damageType: "physical",
        lethal: false,
      },
    ]);

    expect(queue.drain()).toEqual([
      { type: "health_changed", entityId: "player", previous: 100, current: 75, max: 100 },
      {
        type: "damage_applied",
        targetId: "player",
        amount: 25,
        damageType: "physical",
        lethal: false,
      },
    ]);
    expect(queue.peek()).toEqual([]);
  });

  it("exposes a readonly snapshot from peek", () => {
    const queue = createGameEventQueue();
    queue.push({ type: "entity_died", entityId: "wolf_1", cause: "combat" });

    const snapshot = queue.peek();
    queue.push({ type: "status_added", entityId: "player", statusId: "bleeding", source: "hazard" });

    expect(snapshot).toEqual([{ type: "entity_died", entityId: "wolf_1", cause: "combat" }]);
    expect(queue.drain()).toEqual([
      { type: "entity_died", entityId: "wolf_1", cause: "combat" },
      { type: "status_added", entityId: "player", statusId: "bleeding", source: "hazard" },
    ]);
  });
});
