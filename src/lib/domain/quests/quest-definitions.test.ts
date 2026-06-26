import { describe, expect, it } from "vitest";
import { INITIAL_QUESTS } from "./quest-definitions";

describe("quest definitions", () => {
  it("frames the first quest around survival stakes", () => {
    const quest = INITIAL_QUESTS.lost_in_woods;
    expect(quest).toBeDefined();

    expect(quest!.title).toBe("First Night in Ashenmoor");
    expect(quest!.description).toContain("fire is dead");
    expect(quest!.objectives.map((objective) => objective.label)).toEqual([
      "Cleanse dirty water at the fire",
      "Drink clean water before thirst worsens",
      "Wake the campfire",
    ]);
  });
});
