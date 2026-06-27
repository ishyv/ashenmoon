import { TIME_WEATHER_CONFIG } from "./time-config";
import { OPEN_FLAME_BONUS } from "$lib/domain/exposure/exposure-context";

export type WorldEventSoundId = "ambient.wind" | "node.deplete";

export interface WeatherState {
  raining: boolean;
  rainRemainingSec: number;
  /** 0..1 fraction of day; 0.75+ is night in this first pass. */
  timeOfDay: number;
}

export interface WorldEventState {
  cooldowns: Record<WorldEventType, number>;
}

export type WorldEventType = "wolf_howl" | "animal_hunt" | "bird_flock_reveal" | "rain";

export interface WorldEvent {
  type: WorldEventType;
  forcesCombat: boolean;
}

export interface WorldEventFeedback {
  readonly message: string;
  readonly tone: "info" | "warning";
  readonly sound?: WorldEventSoundId;
}

export const WORLD_EVENT_FEEDBACK: Record<WorldEventType, WorldEventFeedback> = {
  wolf_howl: { message: "a distant howl echoes through the trees.", tone: "warning", sound: "ambient.wind" },
  animal_hunt: { message: "a frantic chase crashes through the brush.", tone: "warning", sound: "node.deplete" },
  bird_flock_reveal: { message: "birds burst from the canopy ahead.", tone: "info", sound: "node.deplete" },
  rain: { message: "rain begins to patter.", tone: "info", sound: "ambient.wind" },
};

export const WORLD_EVENT_COOLDOWNS_SEC: Record<WorldEventType, number> = {
  wolf_howl: 180,
  animal_hunt: 120,
  bird_flock_reveal: 150,
  rain: 420,
};

export function tickWeatherState(
  state: WeatherState,
  dtSec: number,
  opts: { forceRain?: boolean } = {},
): WeatherState {
  const increment = (dtSec * TIME_WEATHER_CONFIG.timeSpeedMultiplier) / TIME_WEATHER_CONFIG.dayDurationSeconds;
  const timeOfDay = (state.timeOfDay + increment) % 1;
  if (opts.forceRain) {
    const rainDuration = TIME_WEATHER_CONFIG.rainDurationMinSec + Math.random() * (TIME_WEATHER_CONFIG.rainDurationMaxSec - TIME_WEATHER_CONFIG.rainDurationMinSec);
    return { raining: true, rainRemainingSec: Math.max(state.rainRemainingSec, rainDuration), timeOfDay };
  }

  const rainRemainingSec = Math.max(0, state.rainRemainingSec - dtSec);
  return {
    raining: rainRemainingSec > 0,
    rainRemainingSec,
    timeOfDay,
  };
}

export function isNight(timeOfDay: number): boolean {
  const start = TIME_WEATHER_CONFIG.nightStartFraction;
  const end = TIME_WEATHER_CONFIG.dayStartFraction;
  if (start > end) {
    return timeOfDay >= start || timeOfDay < end;
  } else {
    return timeOfDay >= start && timeOfDay < end;
  }
}

export function nightEnvironmentModifiers(input: {
  timeOfDay: number;
  nearLitCampfire: boolean;
  shelterColdMultiplier: number;
}): { visibilityMultiplier: number; temperatureDelta: number } {
  if (!isNight(input.timeOfDay)) return { visibilityMultiplier: 1, temperatureDelta: 0 };
  const warmth = input.nearLitCampfire ? 10 : 0;
  return {
    visibilityMultiplier: input.nearLitCampfire ? 0.72 : 0.42,
    temperatureDelta: Math.round((-12 * input.shelterColdMultiplier) + warmth),
  };
}

const MAX_PLAYER_RADIANT_WARMTH_C = 10;

export function effectivePlayerTemperature(input: {
  ambientTemperature: number;
  nightTemperatureDelta: number;
  radiantHeat: number;
}): number {
  const radiantWarmth = Math.min(
    MAX_PLAYER_RADIANT_WARMTH_C,
    Math.max(0, input.radiantHeat / OPEN_FLAME_BONUS) * MAX_PLAYER_RADIANT_WARMTH_C,
  );

  return Math.round(input.ambientTemperature + input.nightTemperatureDelta + radiantWarmth);
}

export function createWorldEventState(): WorldEventState {
  return {
    cooldowns: {
      wolf_howl: 0,
      animal_hunt: 0,
      bird_flock_reveal: 0,
      rain: 0,
    },
  };
}

export function tickWorldEventState(state: WorldEventState, dtSec: number): WorldEventState {
  return {
    cooldowns: Object.fromEntries(
      Object.entries(state.cooldowns).map(([key, value]) => [key, Math.max(0, value - dtSec)]),
    ) as Record<WorldEventType, number>,
  };
}

export function scheduleWorldEvent(
  state: WorldEventState,
  context: {
    nearWolfTerritory: boolean;
    hasCorpseOrFoodPoi: boolean;
    hasPredatorAndPrey: boolean;
    timeOfDay: "day" | "dusk" | "night";
    raining: boolean;
  },
  rng: () => number = Math.random,
): WorldEvent | null {
  const candidates: WorldEvent[] = [];
  if (context.nearWolfTerritory && state.cooldowns.wolf_howl <= 0) {
    candidates.push({ type: "wolf_howl", forcesCombat: false });
  }
  if (context.hasPredatorAndPrey && state.cooldowns.animal_hunt <= 0) {
    candidates.push({ type: "animal_hunt", forcesCombat: true });
  }
  if (context.hasCorpseOrFoodPoi && state.cooldowns.bird_flock_reveal <= 0) {
    candidates.push({ type: "bird_flock_reveal", forcesCombat: false });
  }
  if (!context.raining && state.cooldowns.rain <= 0 && context.timeOfDay !== "night") {
    candidates.push({ type: "rain", forcesCombat: false });
  }

  if (candidates.length === 0) return null;
  return candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))] ?? null;
}

export function putWorldEventOnCooldown(state: WorldEventState, eventType: WorldEventType): WorldEventState {
  return {
    cooldowns: {
      ...state.cooldowns,
      [eventType]: WORLD_EVENT_COOLDOWNS_SEC[eventType],
    },
  };
}
