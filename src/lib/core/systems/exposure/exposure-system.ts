/**
 * Placed-reaction gatherer.
 *
 * Thin bridge between ECS world state and the pure reaction engine
 * (`domain/exposure/placed-reactions`). For each item sitting in the world it
 * samples the environment at the item's tile, advances the item's reactions, and
 * translates the returned facts into events. It owns no VFX/sound/knowledge:
 * presentation rides the engine event queue (feedback-router), knowledge rides
 * the rpg event queue. Reactions step on a slow cadence, not every frame.
 */

import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { getAmbientEnvironment, TILE, type MapResource } from "$lib/core/systems/map/map";
import { getItemDef } from "$lib/domain/items";
import {
  tickPlacedReactions,
  type PlacedExposureContext,
  type PlacedReactionFact,
  type PlacedReactionState,
} from "$lib/domain/exposure/placed-reactions";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system";
import type { WeatherResource } from "$lib/core/systems/weather/weather-system";
import type { GameEventQueue, QueuedGameEvent } from "$lib/domain/game-event-queue";
import { rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";
import type { ExposureResource } from "./exposure-resource";

/** Reactions evolve over seconds; step at most this often regardless of fps. */
const REACTION_STEP_SEC = 0.3;

export function tickPlacedReactionSystem(
  world: World<Entity>,
  map: MapResource,
  res: ExposureResource,
  dt: number,
  weather: WeatherResource,
  eventQueue: GameEventQueue,
): void {
  res.accumulatorSec += dt;
  if (res.accumulatorSec < REACTION_STEP_SEC) return;
  const elapsed = res.accumulatorSec;
  res.accumulatorSec = 0;

  for (const entity of world.with("pickup", "position").entities) {
    const pickup = entity.pickup!;
    const pos = entity.position!;

    const def = getItemDef(pickup.itemId);
    if (!def) continue;

    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const env = getAmbientEnvironment(map, gx, gy, 0);
    const center = { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
    const signals = sampleEnvironmentAt(world, weather, center);

    const ctx: PlacedExposureContext = {
      location: "ground",
      ambientTemp: env.temperature,
      radiantHeat: signals.heat,
      wetness: signals.wetness,
    };

    const state: PlacedReactionState = {
      itemId: pickup.itemId,
      qty: pickup.qty,
      progress: pickup.reactions ?? {},
    };

    const { next, facts } = tickPlacedReactions(state, ctx, elapsed);

    for (const fact of facts) {
      const event = toPlacedEvent(entity.id, { x: pos.x, y: pos.y }, state.itemId, fact);
      eventQueue.push(event);
      // Knowledge/recipe ride the rpg queue (no player bark for world items).
      if (fact.kind !== "warned") rpgEventQueue.push(event);
    }

    if (next.itemId.length === 0) {
      // Destroyed: the item vanished from the world.
      world.remove(entity);
    } else {
      pickup.itemId = next.itemId;
      pickup.reactions = { ...next.progress };
    }
  }
}

function toPlacedEvent(
  entityId: string,
  position: { x: number; y: number },
  itemId: string,
  fact: PlacedReactionFact,
): Extract<QueuedGameEvent, { type: "placed_item_reacted" }> {
  const base = {
    type: "placed_item_reacted" as const,
    entityId,
    position,
    reactionId: fact.reactionId,
    itemId,
  };

  if (fact.kind === "warned") {
    return { ...base, outcome: "warned", message: fact.warning };
  }
  if (fact.kind === "transformed") {
    const name = getItemDef(fact.intoItemId)?.name.toLowerCase() ?? fact.intoItemId;
    return { ...base, outcome: "transformed", intoItemId: fact.intoItemId, message: `transformed: ${name}` };
  }
  return { ...base, outcome: "destroyed", message: "rotted away" };
}
