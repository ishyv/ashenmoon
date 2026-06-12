import { describe, expect, it } from "vitest";
import {
  createWorldEventState,
  nightEnvironmentModifiers,
  putWorldEventOnCooldown,
  scheduleWorldEvent,
  tickWeatherState,
} from "./weather-events";

describe("weather and night", () => {
  it("advances rain state and reports changed weather", () => {
    const next = tickWeatherState({ raining: false, rainRemainingSec: 0, timeOfDay: 0.3 }, 1, { forceRain: true });

    expect(next.raining).toBe(true);
    expect(next.rainRemainingSec).toBeGreaterThan(0);
  });

  it("reduces visibility and temperature at night", () => {
    const night = nightEnvironmentModifiers({ timeOfDay: 0.9, nearLitCampfire: false, shelterColdMultiplier: 1 });
    const warm = nightEnvironmentModifiers({ timeOfDay: 0.9, nearLitCampfire: true, shelterColdMultiplier: 1 });

    expect(night.visibilityMultiplier).toBeLessThan(1);
    expect(night.temperatureDelta).toBeLessThan(0);
    expect(warm.temperatureDelta).toBeGreaterThan(night.temperatureDelta);
  });
});

describe("world event scheduler", () => {
  it("can trigger wolf howl near territory without forcing an attack", () => {
    const state = createWorldEventState();
    const event = scheduleWorldEvent(state, {
      nearWolfTerritory: true,
      hasCorpseOrFoodPoi: false,
      hasPredatorAndPrey: false,
      timeOfDay: "night",
      raining: false,
    }, () => 0);

    expect(event?.type).toBe("wolf_howl");
    expect(event?.forcesCombat).toBe(false);
  });

  it("targets bird flock reveal at a valid point of interest", () => {
    const state = createWorldEventState();
    const event = scheduleWorldEvent(state, {
      nearWolfTerritory: false,
      hasCorpseOrFoodPoi: true,
      hasPredatorAndPrey: false,
      timeOfDay: "day",
      raining: false,
    }, () => 0.2);

    expect(event?.type).toBe("bird_flock_reveal");
  });

  it("puts selected events on cooldown", () => {
    const state = putWorldEventOnCooldown(createWorldEventState(), "wolf_howl");

    expect(state.cooldowns.wolf_howl).toBeGreaterThan(0);
  });
});
