/**
 * Core environment-signal system.
 *
 * Bridges ECS entity state → pure signal sampler. This is the single public
 * API that all consumers call instead of reaching directly into campfire
 * entities, shelter helpers, or weather state.
 *
 * Call sampleEnvironmentAt() to get the full signal field at any world point.
 * Call syncCampfireEmitters() from tickCampfireEntities to keep campfire emitter
 * arrays in sync with live CampfireState (heat/light radius changes as fire
 * weakens in rain).
 */

import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { OPEN_FLAME_BONUS } from "$lib/domain/exposure/exposure-context";
import { sampleSignals, type PositionedEmitter } from "$lib/domain/environment/sampling";
import type { EnvironmentSample } from "$lib/domain/environment/signals";
import type { WeatherResource } from "$lib/core/systems/weather/weather-system";

/** Center of an entity's tile in world px. */
function centerOf(entity: Entity): { x: number; y: number } {
  const pos = entity.position!;
  return { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
}

/**
 * Sample all environmental signals at a world-pixel point.
 *
 * Collects positioned emitters from every entity that carries the `emitter`
 * component, delegates accumulation to the pure `sampleSignals`, and folds in
 * the global rain condition from WeatherResource.
 *
 * // future: if emitter counts grow, replace the linear scan with a spatial
 * // grid index built once per frame rather than rebuilt per-sample call.
 */
export function sampleEnvironmentAt(
  world: World<Entity>,
  weather: WeatherResource,
  point: { x: number; y: number },
): EnvironmentSample {
  const positioned: PositionedEmitter[] = [];

  for (const entity of world.with("emitter", "position").entities) {
    const center = centerOf(entity);
    for (const em of entity.emitter!) {
      positioned.push({ x: center.x, y: center.y, emitter: em });
    }
  }

  return sampleSignals(point, positioned, { raining: weather.state.raining });
}

/**
 * Synchronise a campfire entity's `emitter` array with its current CampfireState.
 *
 * Call this inside tickCampfireEntities, after the state has been updated, so
 * the emitters always reflect the live heat/light radii (which shrink when the
 * fire gets wet). When the fire is unlit the emitter array is emptied.
 */
export function syncCampfireEmitters(entity: Entity): void {
  const state = entity.campfire;
  if (!state?.isLit || state.heatRadiusPx <= 0) {
    entity.emitter = [];
    return;
  }

  entity.emitter = [
    {
      signal: "heat",
      strength: OPEN_FLAME_BONUS,
      radiusPx: state.heatRadiusPx,
      falloff: "linear",
    },
    {
      signal: "light",
      strength: 1,
      radiusPx: state.lightRadiusPx,
      falloff: "linear",
    },
  ];
}

/**
 * Synchronise a crude_shelter entity's `emitter` array from its campStructure
 * component. Call once when the shelter is built/loaded; the shelter emitter is
 * static (doesn't change unless the building is upgraded or removed).
 */
export function syncShelterEmitter(entity: Entity): void {
  const structure = entity.campStructure;
  if (!structure || structure.type !== "crude_shelter") {
    entity.emitter = [];
    return;
  }

  const radius = structure.protectionRadiusPx ?? 0;
  const protection = structure.rainProtection ?? 0;

  if (radius <= 0 || protection <= 0) {
    entity.emitter = [];
    return;
  }

  entity.emitter = [
    {
      signal: "shelter",
      strength: protection,
      radiusPx: radius,
      falloff: "none",
    },
  ];
}
