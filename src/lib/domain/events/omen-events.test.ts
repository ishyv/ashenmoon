import { describe, expect, it } from "vitest";
import { FIRST_NIGHT_OMENS, shouldTriggerOmen } from "./omen-events";

describe("omen events", () => {
  it("defines a wolf howl omen", () => {
    expect(FIRST_NIGHT_OMENS.wolf_howl.text).toContain("howl");
  });

  it("triggers after the player has water and fire progress", () => {
    expect(shouldTriggerOmen({ cleanWaterDrunk: true, campfireWoken: true, alreadyTriggered: false })).toBe(true);
  });

  it("does not retrigger", () => {
    expect(shouldTriggerOmen({ cleanWaterDrunk: true, campfireWoken: true, alreadyTriggered: true })).toBe(false);
  });
});
