import { beforeEach, describe, expect, it } from "vitest";
import {
  critSetup,
  addCritSetupStack,
  resetCritSetup,
  tickCritSetupDecay,
  consumeCritSetupForMultiplier,
} from "$lib/state/rpg/crit-setup.svelte";
import { CRIT_SETUP_CAP, CRIT_SETUP_DECAY_INTERVAL_SEC } from "$lib/domain/combat/crit";

describe("crit-setup stack state", () => {
  beforeEach(() => {
    critSetup.stacks = 0;
    critSetup.decayTimer = 0;
  });

  describe("addCritSetupStack", () => {
    it("accumulates under the cap", () => {
      addCritSetupStack(1);
      addCritSetupStack(2);
      expect(critSetup.stacks).toBe(3);
    });

    it("clamps to CRIT_SETUP_CAP when adding past it", () => {
      addCritSetupStack(CRIT_SETUP_CAP + 5);
      expect(critSetup.stacks).toBe(CRIT_SETUP_CAP);
    });

    it("resets decayTimer to CRIT_SETUP_DECAY_INTERVAL_SEC on each call", () => {
      addCritSetupStack(1);
      expect(critSetup.decayTimer).toBe(CRIT_SETUP_DECAY_INTERVAL_SEC);
      critSetup.decayTimer = 0.5;
      addCritSetupStack(1);
      expect(critSetup.decayTimer).toBe(CRIT_SETUP_DECAY_INTERVAL_SEC);
    });
  });

  describe("resetCritSetup", () => {
    it("zeroes both stacks and decayTimer from a nonzero state", () => {
      critSetup.stacks = 7;
      critSetup.decayTimer = 2.3;
      resetCritSetup();
      expect(critSetup.stacks).toBe(0);
      expect(critSetup.decayTimer).toBe(0);
    });
  });

  describe("tickCritSetupDecay", () => {
    it("drops exactly one stack and resets the timer when stacks remain > 0", () => {
      critSetup.stacks = 3;
      critSetup.decayTimer = 4.0;
      tickCritSetupDecay(4.0);
      expect(critSetup.stacks).toBe(2);
      expect(critSetup.decayTimer).toBe(CRIT_SETUP_DECAY_INTERVAL_SEC);
    });

    it("drops the final stack to 0 without resetting the timer", () => {
      critSetup.stacks = 1;
      critSetup.decayTimer = 4.0;
      tickCritSetupDecay(4.0);
      expect(critSetup.stacks).toBe(0);
      expect(critSetup.decayTimer).toBeLessThanOrEqual(0);
    });

    it("is a no-op when stacks are already 0", () => {
      critSetup.stacks = 0;
      critSetup.decayTimer = 0;
      tickCritSetupDecay(10);
      expect(critSetup.stacks).toBe(0);
      expect(critSetup.decayTimer).toBe(0);
    });
  });

  describe("consumeCritSetupForMultiplier", () => {
    it("returns the multiplier for current stacks, then resets", () => {
      critSetup.stacks = 5;
      critSetup.decayTimer = 2.0;
      const multiplier = consumeCritSetupForMultiplier();
      expect(multiplier).toBeCloseTo(2.25);
      expect(critSetup.stacks).toBe(0);
      expect(critSetup.decayTimer).toBe(0);

      const second = consumeCritSetupForMultiplier();
      expect(second).toBeCloseTo(1.5);
    });
  });
});
