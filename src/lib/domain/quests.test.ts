import { beforeEach, describe, expect, it } from "vitest";
import { GameEvent } from "./game-events";
import { activeQuests, triggerQuestEvent } from "./quests.svelte";

describe("starter quest material tracking", () => {
  beforeEach(() => {
    activeQuests.currentQuestId = "scavenger_tools";
    const quest = activeQuests.quests.scavenger_tools;
    quest.completed = false;
    quest.rewardClaimed = false;
    for (const objective of quest.objectives) {
      objective.current = 0;
      objective.completed = false;
    }
  });

  it("tracks the materials required by the first flint axe recipe", () => {
    triggerQuestEvent(GameEvent.Pickup, "stick");
    triggerQuestEvent(GameEvent.Pickup, "flint_shard");
    triggerQuestEvent(GameEvent.Pickup, "grass_fiber");

    const quest = activeQuests.quests.scavenger_tools;
    expect(quest.objectives.find((o) => o.id === "gather_stick")).toMatchObject({
      current: 1,
      completed: true,
    });
    expect(quest.objectives.find((o) => o.id === "gather_flint")).toMatchObject({
      current: 1,
      completed: true,
    });
    expect(quest.objectives.find((o) => o.id === "gather_fiber")).toMatchObject({
      current: 1,
      completed: true,
    });
  });
});
