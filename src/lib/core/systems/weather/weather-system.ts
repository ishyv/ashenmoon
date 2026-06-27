import type { Graphics, Container } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { calculatePlayerWarmth } from "$lib/domain/exposure/player-warmth";
import { gameState } from "$lib/state/game-state.svelte";
import { TIME_WEATHER_CONFIG } from "$lib/domain/weather/time-config";
import {
  createWorldEventState,
  isNight,
  nightEnvironmentModifiers,
  putWorldEventOnCooldown,
  scheduleWorldEvent,
  tickWeatherState,
  tickWorldEventState,
  WORLD_EVENT_FEEDBACK,
  type WorldEventFeedback,
  type WeatherState,
  type WorldEventState,
} from "$lib/domain/weather/weather-events";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import { spawnEnvParticles, type VFXResource } from "$lib/core/vfx/vfx";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system";
import { TILE } from "$lib/core/systems/map/map";
import type { MapResource } from "$lib/core/systems/map/map";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { ANIMAL_DEFINITIONS } from "$lib/domain/animals/animal-behavior";
import {
  resolveWolfCampThreat,
  type WolfCampThreatFactors,
  type WolfCampThreatOutcome,
} from "$lib/domain/threats/wolf-camp-threat";
import type { GameEventQueue } from "$lib/domain/game-event-queue";

const RAW_MEAT_IDS = new Set(["raw_meat", "raw_small_meat", "raw_large_meat", "fatty_meat"]);
const SPOILED_MEAT_IDS = new Set(["spoiled_meat", "rotten_meat"]);

const WOLF_THREAT_FEEDBACK: Record<Exclude<WolfCampThreatOutcome, "none">, WorldEventFeedback> = {
  howl: { message: "a distant howl answers the scent of camp.", tone: "warning", sound: "ambient.wind" },
  circle_camp: { message: "something circles beyond the firelight.", tone: "warning", sound: "ambient.wind" },
  approach_exposed_meat: { message: "brush snaps near the exposed meat.", tone: "warning", sound: "ambient.wind" },
  warning_silhouette: { message: "a lean silhouette pauses between the trees.", tone: "warning", sound: "ambient.wind" },
};

export class WeatherResource {
  public state: WeatherState = { raining: false, rainRemainingSec: 0, timeOfDay: 0.28 };
  public rainCooldownSec: number = ENGINE_CONFIG.RAIN.INITIAL_COOLDOWN_SEC;
  public rainFeedbackTimer = 0;
  
  public worldEventState: WorldEventState = createWorldEventState();
  public forestEventTimer: number = ENGINE_CONFIG.FOREST_EVENT.MIN_INTERVAL_SEC;
  
  public nightOverlayAlpha = 0;
  public rainOverlayTint = 0xffffff;
  
  public coldAccumulator = 0;
  public hypothermiaRefreshTimer = 0;
}

export function collectWolfCampThreatFactors(input: {
  readonly world: World<Entity>;
  readonly map: MapResource;
  readonly playerEntity: Entity;
  readonly timeOfDay: number;
  readonly nearWolfZone: boolean;
}): WolfCampThreatFactors {
  const playerPosition = input.playerEntity.position;
  const playerTile = playerPosition
    ? { x: Math.round(playerPosition.x / TILE), y: Math.round(playerPosition.y / TILE) }
    : null;

  const nearWolfDen = !!playerTile && input.map.forestMetadata.landmarks.some((landmark) => {
    if (landmark.kind !== "wolf_den") return false;
    return Math.hypot(landmark.x - playerTile.x, landmark.y - playerTile.y) <= ENGINE_CONFIG.FOREST_EVENT.ANIMAL_ZONE_RADIUS_TILES;
  });

  let litFireStrength = 0;
  for (const entity of input.world.with("campfire").entities) {
    if (!entity.campfire?.isLit) continue;
    litFireStrength = Math.max(litFireStrength, Math.min(1, entity.campfire.heatRadiusPx / (TILE * 4.5)));
  }

  let exposedRawMeat = 0;
  let exposedSpoiledMeat = 0;
  for (const entity of input.world.with("pickup").entities) {
    const itemId = entity.pickup!.itemId;
    if (RAW_MEAT_IDS.has(itemId)) exposedRawMeat += entity.pickup!.qty;
    if (SPOILED_MEAT_IDS.has(itemId)) exposedSpoiledMeat += entity.pickup!.qty;
  }

  return {
    isNight: isNight(input.timeOfDay),
    nearWolfZone: input.nearWolfZone,
    nearWolfDen,
    litFireStrength,
    spikeBarrierCount: input.world.with("campStructure").entities
      .filter((entity) => entity.campStructure!.type === "spike_barrier").length,
    freshCarcassCount: input.world.with("carcass").entities
      .filter((entity) => entity.carcass!.state === "fresh" || entity.carcass!.state === "partially_processed").length,
    exposedRawMeat,
    exposedSpoiledMeat,
    recentKillSites: input.map.forestMetadata.eventPoints.filter((point) => point.kind === "corpse_site").length,
  };
}

export function weatherTickSystem(
  world: World<Entity>,
  weather: WeatherResource,
  vfx: VFXResource,
  map: MapResource,
  playerEntity: Entity,
  entityLayer: Container,
  dt: number,
  isNearForestAnimalZone: (kind: string, radius: number) => boolean,
  hasPredatorAndPreyAnimals: () => boolean,
  worldEventTimeOfDay: () => "day" | "dusk" | "night",
  events?: GameEventQueue,
): void {
  // Rain cycle
  if (!weather.state.raining) {
    weather.rainCooldownSec -= dt;
    if (weather.rainCooldownSec <= 0) {
      weather.state = tickWeatherState(weather.state, dt, { forceRain: true });
      const minCooldown = TIME_WEATHER_CONFIG.rainCooldownMinSec;
      const maxCooldown = TIME_WEATHER_CONFIG.rainCooldownMaxSec;
      weather.rainCooldownSec = minCooldown + Math.random() * (maxCooldown - minCooldown);
      const rain = WORLD_EVENT_FEEDBACK.rain;
      events?.push({ type: "feedback_requested", channel: "ui", message: rain.message, tone: rain.tone, ...(rain.sound ? { sound: rain.sound } : {}) });
    } else {
      weather.state = tickWeatherState(weather.state, dt);
    }
  } else {
    weather.state = tickWeatherState(weather.state, dt);
    weather.rainFeedbackTimer -= dt;
    if (weather.rainFeedbackTimer <= 0) {
      weather.rainFeedbackTimer = ENGINE_CONFIG.RAIN.FEEDBACK_INTERVAL_SEC;
      spawnEnvParticles(
        vfx,
        ENGINE_CONFIG.RAIN.PARTICLE_COLOR,
        5,
        "bubble",
        playerEntity.position!,
        entityLayer
      );
    }
  }

  weather.worldEventState = tickWorldEventState(weather.worldEventState, dt);

  // Random Forest Events
  weather.forestEventTimer -= dt;
  if (weather.forestEventTimer <= 0) {
    weather.forestEventTimer =
      ENGINE_CONFIG.FOREST_EVENT.MIN_INTERVAL_SEC +
      Math.random() * ENGINE_CONFIG.FOREST_EVENT.RANDOM_EXTRA_SEC;
    
    const nearWolfZone = isNearForestAnimalZone(
      "wolf_territory",
      ENGINE_CONFIG.FOREST_EVENT.ANIMAL_ZONE_RADIUS_TILES
    );
    const wolfThreat = resolveWolfCampThreat(collectWolfCampThreatFactors({
      world,
      map,
      playerEntity,
      timeOfDay: weather.state.timeOfDay,
      nearWolfZone,
    }));

    if (wolfThreat.outcome !== "none" && weather.worldEventState.cooldowns.wolf_howl <= 0) {
      const wf = WOLF_THREAT_FEEDBACK[wolfThreat.outcome];
      events?.push({ type: "feedback_requested", channel: "ui", message: wf.message, tone: wf.tone, ...(wf.sound ? { sound: wf.sound } : {}) });
      weather.worldEventState = putWorldEventOnCooldown(weather.worldEventState, "wolf_howl");

      for (const entity of world.with("animal", "position").entities) {
        const def = ANIMAL_DEFINITIONS[entity.animal!.speciesId];
        if (def.temperament === "fearful" || def.temperament === "timid") {
          entity.animal!.scareSec = 4 + Math.random() * 3;
        }
      }
    }

    const event = scheduleWorldEvent(weather.worldEventState, {
      nearWolfTerritory: false,
      hasCorpseOrFoodPoi: map.forestMetadata.eventPoints.length > 0,
      hasPredatorAndPrey: hasPredatorAndPreyAnimals(),
      timeOfDay: worldEventTimeOfDay(),
      raining: weather.state.raining,
    });
    
    if (event) {
      const feedback = WORLD_EVENT_FEEDBACK[event.type];
      events?.push({ type: "feedback_requested", channel: "ui", message: feedback.message, tone: feedback.tone, ...(feedback.sound ? { sound: feedback.sound } : {}) });
      weather.worldEventState = putWorldEventOnCooldown(weather.worldEventState, event.type);

      if (event.type === "wolf_howl") {
        for (const entity of world.with("animal", "position").entities) {
          const def = ANIMAL_DEFINITIONS[entity.animal!.speciesId];
          if (def.temperament === "fearful" || def.temperament === "timid") {
            entity.animal!.scareSec = 4 + Math.random() * 3;
          }
        }
      }
    }
  }
}

function interpolateColor(color1: number, color2: number, ratio: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return (r << 16) | (g << 8) | b;
}

export function getCycleColorAndAlpha(timeOfDay: number): { color: number; alpha: number } {
  const startDawn = TIME_WEATHER_CONFIG.dayStartFraction - 0.06;
  const peakDawn = TIME_WEATHER_CONFIG.dayStartFraction;
  const endDawn = TIME_WEATHER_CONFIG.dayStartFraction + 0.06;

  const startDusk = TIME_WEATHER_CONFIG.nightStartFraction - 0.06;
  const peakDusk = TIME_WEATHER_CONFIG.nightStartFraction;
  const endDusk = TIME_WEATHER_CONFIG.nightStartFraction + 0.06;

  const maxDark = TIME_WEATHER_CONFIG.maxNightDarkness;
  const duskColor = TIME_WEATHER_CONFIG.colors.dusk;
  const nightColor = TIME_WEATHER_CONFIG.colors.night;
  const dawnColor = TIME_WEATHER_CONFIG.colors.dawn;

  if (timeOfDay >= startDawn && timeOfDay < endDawn) {
    // Dawn transition
    const ratio = (timeOfDay - startDawn) / (endDawn - startDawn);
    if (ratio < 0.5) {
      // Night -> Dawn
      const alpha = maxDark - (maxDark - 0.4) * (ratio * 2);
      return { color: interpolateColor(nightColor, dawnColor, ratio * 2), alpha };
    } else {
      // Dawn -> Day
      const subRatio = (ratio - 0.5) * 2;
      const alpha = 0.4 * (1 - subRatio);
      return { color: dawnColor, alpha };
    }
  } else if (timeOfDay >= endDawn && timeOfDay < startDusk) {
    // Clear Day
    return { color: 0xffffff, alpha: 0 };
  } else if (timeOfDay >= startDusk && timeOfDay < endDusk) {
    // Dusk transition
    const ratio = (timeOfDay - startDusk) / (endDusk - startDusk);
    if (ratio < 0.5) {
      // Day -> Dusk
      const alpha = 0.4 * (ratio * 2);
      return { color: duskColor, alpha };
    } else {
      // Dusk -> Night
      const subRatio = (ratio - 0.5) * 2;
      const alpha = 0.4 + (maxDark - 0.4) * subRatio;
      return { color: interpolateColor(duskColor, nightColor, subRatio), alpha };
    }
  } else {
    // Night
    return { color: nightColor, alpha: maxDark };
  }
}

export function weatherOverlaySystem(
  world: World<Entity>,
  weather: WeatherResource,
  playerEntity: Entity,
  nightOverlay: Graphics,
  worldContainer: Container,
  shelterColdMultiplierAt: (gx: number, gy: number) => number,
  dt: number,
  coldBuildRateMult = 1
): void {
  if (nightOverlay && playerEntity.position) {
    const pgx = Math.round(playerEntity.position.x / TILE);
    const pgy = Math.round(playerEntity.position.y / TILE);
    const playerCenter = {
      x: playerEntity.position.x + TILE / 2,
      y: playerEntity.position.y + TILE / 2,
    };
    const signals = sampleEnvironmentAt(world, weather, playerCenter);
    const nearCampfire = signals.heat > 0;

    const nightMods = nightEnvironmentModifiers({
      timeOfDay: weather.state.timeOfDay,
      nearLitCampfire: nearCampfire,
      shelterColdMultiplier: shelterColdMultiplierAt(pgx, pgy),
    });

    const { color: targetColor, alpha: targetAlphaBase } = getCycleColorAndAlpha(weather.state.timeOfDay);

    // Scale darkness slightly near campfires
    const darknessFactor = nearCampfire ? 0.65 : 1.0;
    const targetAlpha = targetAlphaBase * darknessFactor;

    weather.nightOverlayAlpha += (targetAlpha - weather.nightOverlayAlpha) * Math.min(1, dt * 0.8);
    
    // Smoothly redraw overlay with new interpolated color
    nightOverlay.clear().rect(0, 0, 4096, 4096).fill({ color: targetColor });
    nightOverlay.alpha = weather.nightOverlayAlpha;

    const { temperatureDelta } = nightMods;
    if (temperatureDelta < 0) {
      const warmth = gameState.rpg ? calculatePlayerWarmth(gameState.rpg) : 0;
      const effectiveCold = Math.max(0, -temperatureDelta - warmth);
      weather.coldAccumulator = Math.min(100, weather.coldAccumulator + (effectiveCold * 0.08 * dt * coldBuildRateMult));
    } else {
      weather.coldAccumulator = Math.max(0, weather.coldAccumulator - (temperatureDelta * 0.2 * dt));
    }
    weather.hypothermiaRefreshTimer = Math.max(0, weather.hypothermiaRefreshTimer - dt);
    if (weather.coldAccumulator >= 50 && weather.hypothermiaRefreshTimer <= 0) {
      applyStatusEffect(StatusId.Hypothermia, 6, "cold");
      weather.hypothermiaRefreshTimer = 3;
    }
  }

  // Overcast world tint
  const targetTint = weather.state.raining ? ENGINE_CONFIG.RAIN.WORLD_TINT : 0xffffff;
  if (weather.rainOverlayTint !== targetTint) {
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * Math.min(1, dt * 0.8));
    const ra = (weather.rainOverlayTint >> 16) & 0xff;
    const ga = (weather.rainOverlayTint >> 8) & 0xff;
    const ba = weather.rainOverlayTint & 0xff;
    const rb = (targetTint >> 16) & 0xff;
    const gb = (targetTint >> 8) & 0xff;
    const bb = targetTint & 0xff;
    
    weather.rainOverlayTint = (lerp(ra, rb) << 16) | (lerp(ga, gb) << 8) | lerp(ba, bb);
    worldContainer.tint = weather.rainOverlayTint;
  }
}
