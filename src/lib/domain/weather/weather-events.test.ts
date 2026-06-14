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

import { TIME_WEATHER_CONFIG } from "./time-config";
import { isNight } from "./weather-events";

describe("TIME_WEATHER_CONFIG customization", () => {
  it("adjusts time progression speed based on config", () => {
    const originalSpeed = TIME_WEATHER_CONFIG.timeSpeedMultiplier;
    const originalDuration = TIME_WEATHER_CONFIG.dayDurationSeconds;

    try {
      // Setup double speed and short duration
      TIME_WEATHER_CONFIG.timeSpeedMultiplier = 2.0;
      TIME_WEATHER_CONFIG.dayDurationSeconds = 600;

      const state = { raining: false, rainRemainingSec: 0, timeOfDay: 0.0 };
      // 300 real-world seconds with speedMultiplier 2.0 on 600 duration should advance timeOfDay by (300 * 2) / 600 = 1.0 (back to 0.0)
      const next = tickWeatherState(state, 150);
      expect(next.timeOfDay).toBe(0.5);
    } finally {
      // Always restore
      TIME_WEATHER_CONFIG.timeSpeedMultiplier = originalSpeed;
      TIME_WEATHER_CONFIG.dayDurationSeconds = originalDuration;
    }
  });

  it("updates night checking thresholds dynamically", () => {
    const originalStart = TIME_WEATHER_CONFIG.nightStartFraction;
    const originalEnd = TIME_WEATHER_CONFIG.dayStartFraction;

    try {
      // Customize night to start at 0.50 and end at 0.10 (wrapped around)
      TIME_WEATHER_CONFIG.nightStartFraction = 0.50;
      TIME_WEATHER_CONFIG.dayStartFraction = 0.10;

      expect(isNight(0.60)).toBe(true);
      expect(isNight(0.30)).toBe(false);
      expect(isNight(0.05)).toBe(true);
      expect(isNight(0.20)).toBe(false);
    } finally {
      TIME_WEATHER_CONFIG.nightStartFraction = originalStart;
      TIME_WEATHER_CONFIG.dayStartFraction = originalEnd;
    }
  });
});

