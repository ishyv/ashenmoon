import type { Container } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import {
  flashEntity,
  spawnDamageNumber,
  spawnDeathBurst,
  triggerCameraShake,
  type VFXResource,
} from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import type { SoundId } from "$lib/audio/sound-manifest";
import type { QueuedGameEvent } from "$lib/domain/game-event-queue";
import { Colors } from "$lib/utils/colors";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";

export interface FeedbackRouterContext {
  world: World<Entity>;
  vfx: VFXResource;
  entityLayer: Container;
}

export function routeGameEventsToFeedback(
  events: readonly QueuedGameEvent[],
  context: FeedbackRouterContext,
): void {
  for (const event of events) {
    if (event.type === "damage_applied") {
      routeDamageApplied(event, context);
    } else if (event.type === "entity_died") {
      routeEntityDied(event, context);
    } else if (event.type === "feedback_requested") {
      routeFeedbackRequested(event);
    } else if (event.type === "interaction_completed") {
      playSound("craft");
    } else if (event.type === "world_action_completed") {
      playSound("node.deplete");
    }
  }
}

function routeFeedbackRequested(
  event: Extract<QueuedGameEvent, { type: "feedback_requested" }>,
): void {
  if (event.message) emitPlayerFeedback(event.message, event.tone as Parameters<typeof emitPlayerFeedback>[1]);
  if (event.sound) playSound(event.sound as SoundId);
}

function routeEntityDied(
  event: Extract<QueuedGameEvent, { type: "entity_died" }>,
  context: FeedbackRouterContext,
): void {
  const isPlayer = event.faction === "player";
  if (isPlayer) return; // Player death handled separately by engine respawn path.
  const position = event.position;
  if (position) {
    spawnDeathBurst(context.vfx, context.entityLayer, position.x + TILE / 2, position.y + TILE * 0.6, Colors.combat.enemyDeath);
  }
  playSound("enemy.death", position ? { position: { x: position.x + TILE / 2, y: position.y + TILE / 2 } } : {});
}

function routeDamageApplied(
  event: Extract<QueuedGameEvent, { type: "damage_applied" }>,
  context: FeedbackRouterContext,
): void {
  const target = context.world.entities.find((entity) => entity.id === event.targetId);
  const faction = event.targetFaction ?? target?.health?.faction;
  const isPlayer = faction === "player";
  const position = event.targetPosition ?? target?.position;
  if (!position) return;

  const flashX = position.x + TILE / 2;
  const flashY = position.y + TILE;
  const numberY = position.y + TILE * 0.4;
  const hitPos = { x: flashX, y: position.y + TILE / 2 };

  flashEntity(
    context.vfx,
    context.entityLayer,
    event.targetId,
    flashX,
    flashY,
    isPlayer ? Colors.combat.playerHit : Colors.combat.enemyHit,
  );
  spawnDamageNumber(
    context.vfx,
    context.entityLayer,
    flashX,
    numberY,
    event.amount,
    isPlayer ? Colors.combat.playerDmgNum : Colors.combat.enemyDmgNum,
  );
  triggerCameraShake(context.vfx, isPlayer ? 4 : 2.5, 0.12);
  playSound(isPlayer ? "combat.hit.player" : "combat.hit.enemy", { position: hitPos });
}
