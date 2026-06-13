import type { Graphics, Container } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import {
  createWorldEventState,
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
import { isPointNearLitCampfire } from "$lib/core/systems/camp/campfire-runtime-system";
import { TILE } from "$lib/core/systems/map/map";
import type { MapResource } from "$lib/core/systems/map/map";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { ANIMAL_DEFINITIONS } from "$lib/domain/animals/animal-behavior";

export class WeatherResource {
  public state: WeatherState = { raining: false, rainRemainingSec: 0, timeOfDay: 0.28 };
  public worldEventState: WorldEventState = createWorldEventState();
  public rainCooldownSec: number = ENGINE_CONFIG.RAIN.INITIAL_COOLDOWN_SEC;
  public rainFeedbackTimer = 0;
  public forestEventTimer = 0;
  public nightOverlayAlpha = 0;
  public rainOverlayTint = 0xffffff;
  public coldAccumulator = 0;
  public hypothermiaRefreshTimer = 0;
  public feedbackEvents: WorldEventFeedback[] = [];
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
  worldEventTimeOfDay: () => "day" | "dusk" | "night"
): void {
  // Rain cycle
  if (!weather.state.raining) {
    weather.rainCooldownSec -= dt;
    if (weather.rainCooldownSec <= 0) {
      weather.state = tickWeatherState(weather.state, dt, { forceRain: true });
      weather.rainCooldownSec = ENGINE_CONFIG.RAIN.NEXT_COOLDOWN_SEC;
      weather.feedbackEvents.push(WORLD_EVENT_FEEDBACK.rain);
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
    
    const event = scheduleWorldEvent(weather.worldEventState, {
      nearWolfTerritory: isNearForestAnimalZone(
        "wolf_territory",
        ENGINE_CONFIG.FOREST_EVENT.ANIMAL_ZONE_RADIUS_TILES
      ),
      hasCorpseOrFoodPoi: map.forestMetadata.eventPoints.length > 0,
      hasPredatorAndPrey: hasPredatorAndPreyAnimals(),
      timeOfDay: worldEventTimeOfDay(),
      raining: weather.state.raining,
    });
    
    if (event) {
      const feedback = WORLD_EVENT_FEEDBACK[event.type];
      weather.feedbackEvents.push(feedback);
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
    const nearCampfire = isPointNearLitCampfire(world, {
      x: playerEntity.position.x + TILE / 2,
      y: playerEntity.position.y + TILE / 2,
    });

    const nightMods = nightEnvironmentModifiers({
      timeOfDay: weather.state.timeOfDay,
      nearLitCampfire: nearCampfire,
      shelterColdMultiplier: shelterColdMultiplierAt(pgx, pgy),
    });

    const targetAlpha = 1 - nightMods.visibilityMultiplier;
    weather.nightOverlayAlpha += (targetAlpha - weather.nightOverlayAlpha) * Math.min(1, dt * 0.5);
    nightOverlay.alpha = weather.nightOverlayAlpha;

    const { temperatureDelta } = nightMods;
    if (temperatureDelta < 0) {
      weather.coldAccumulator = Math.min(100, weather.coldAccumulator + (-temperatureDelta * 0.08 * dt * coldBuildRateMult));
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
