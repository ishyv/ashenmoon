import type { Container } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import {
  flashEntity,
  spawnDamageNumber,
  spawnDeathBurst,
  spawnEnvFloatingText,
  spawnEnvParticles,
  spawnSlashArc,
  triggerCameraShake,
  type VFXResource,
} from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { resolveCombatSound } from "$lib/audio/audio-feedback";
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
    } else if (event.type === "placed_item_reacted") {
      routePlacedItemReacted(event, context);
    } else if (event.type === "attack_started") {
      routeAttackStarted(event, context);
    } else if (event.type === "attack_missed") {
      playSound(resolveCombatSound({ phase: "miss", weaponCategory: event.soundProfile }));
    } else if (event.type === "interaction_completed") {
      playSound("craft");
    } else if (event.type === "world_action_completed") {
      playSound("node.deplete");
    }
  }
}

/**
 * The weapon swing: its arc VFX and swing sound. Impact feedback (flash, damage
 * number, hit sound) still rides `damage_applied`, emitted when a swing connects.
 */
function routeAttackStarted(
  event: Extract<QueuedGameEvent, { type: "attack_started" }>,
  context: FeedbackRouterContext,
): void {
  spawnSlashArc(
    context.vfx,
    context.entityLayer,
    event.origin.x,
    event.origin.y,
    event.aimAngle,
    event.reachPx,
    (event.arcDegrees * Math.PI) / 360, // half-angle in radians
    Colors.combat.slashArc,
  );
  playSound(resolveCombatSound({ phase: "swing", weaponCategory: event.soundProfile }), {
    conditions: { weaponCategory: event.soundProfile },
  });
}

/**
 * World-item environmental reaction: floating bark at the item, smoke when it
 * starts to smolder, and a craft sound when it finishes transforming. Knowledge
 * unlocks ride the rpg event queue, not this presentation path.
 */
function routePlacedItemReacted(
  event: Extract<QueuedGameEvent, { type: "placed_item_reacted" }>,
  context: FeedbackRouterContext,
): void {
  const color =
    event.outcome === "transformed"
      ? Colors.ui.success
      : event.outcome === "destroyed"
        ? Colors.ui.muted
        : Colors.ui.warning;

  spawnEnvFloatingText(context.vfx, event.message, color, event.position, context.entityLayer, event.entityId);

  if (event.reactionId === "ignite" && event.outcome === "warned") {
    spawnEnvParticles(context.vfx, Colors.vfx.smoke, 5, "smoke", event.position, context.entityLayer);
  }
  if (event.outcome === "transformed") {
    playSound("craft");
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

  const species = target?.animal?.speciesId ?? "humanoid";
  playSound(isPlayer ? "combat.hit.player" : resolveCombatSound({ phase: "hit", targetMaterial: "flesh" }), {
    position: hitPos,
    conditions: { targetSpecies: species }
  });
}
