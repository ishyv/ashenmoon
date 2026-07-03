import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { playAt } from "$lib/audio/audio-engine";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyDamage, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { ANIMAL_ECOLOGY_CONFIG } from "$lib/core/systems/animals/animal-ecology-config";
import { animalCenter } from "$lib/core/systems/animals/animal-runtime";
import { moveAnimalToward } from "$lib/core/systems/animals/animal-movement";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import { enemyAttackHitsTarget } from "$lib/domain/combat/enemies/enemy-attack-resolution";
import {
  advanceWolfCombat,
  resolveWolfLungeOutcome,
  WOLF_COMBAT_TUNING,
  WOLF_LUNGE_ATTACK,
  type WolfCombatRuntime,
  type WolfLungeOutcome,
} from "$lib/domain/combat/enemies/wolf-combat";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import type { MapResource } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvParticles, triggerCameraShake } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";

export interface WolfLungeBodyInput {
  readonly position: { readonly x: number; readonly y: number };
  readonly lockedDirection: { readonly x: number; readonly y: number };
  readonly speedPxPerSec: number;
  readonly dtSec: number;
  readonly distanceMovedPx?: number;
  readonly maxDistancePx?: number;
  readonly collides: (nextPosition: { readonly x: number; readonly y: number }) => boolean;
}

export interface WolfLungeBodyResult {
  readonly position: { readonly x: number; readonly y: number };
  readonly distanceMovedPx: number;
  readonly outcome: WolfLungeOutcome;
}

export function advanceWolfLungeBody(input: WolfLungeBodyInput): WolfLungeBodyResult {
  const remainingDistancePx = Math.max(0, (input.maxDistancePx ?? WOLF_COMBAT_TUNING.lungeMaxDistancePx) - (input.distanceMovedPx ?? 0));
  const stepPx = Math.min(Math.max(0, input.speedPxPerSec * input.dtSec), remainingDistancePx);
  const nextPosition = {
    x: input.position.x + input.lockedDirection.x * stepPx,
    y: input.position.y + input.lockedDirection.y * stepPx,
  };

  if (input.collides(nextPosition)) {
    return { position: input.position, distanceMovedPx: input.distanceMovedPx ?? 0, outcome: "miss" };
  }

  const distanceMovedPx = (input.distanceMovedPx ?? 0) + stepPx;
  return {
    position: nextPosition,
    distanceMovedPx,
    outcome: resolveWolfLungeOutcome({
      hitPlayer: false,
      lungeDistancePx: distanceMovedPx,
      ...(input.maxDistancePx !== undefined ? { maxDistancePx: input.maxDistancePx } : {}),
    }),
  };
}

export function wolfLungeContactsPlayer(input: {
  readonly wolfCenter: { readonly x: number; readonly y: number };
  readonly playerCenter: { readonly x: number; readonly y: number };
  readonly contactRadiusPx?: number;
}): boolean {
  return Math.hypot(input.wolfCenter.x - input.playerCenter.x, input.wolfCenter.y - input.playerCenter.y) <= (input.contactRadiusPx ?? WOLF_COMBAT_TUNING.contactRadiusPx);
}

export function buildWolfOutcomeFeedback(outcome: WolfLungeOutcome): { readonly message: string; readonly tone: "good" | "error" } | null {
  switch (outcome) {
    case "miss":
      return { message: "The wolf overextends. Punish the recovery!", tone: "good" };
    case "hit":
      return { message: "The wolf lunge tears into you!", tone: "error" };
    case "continue":
      return null;
  }
}

export function shouldWolfCombatOwnTick(input: {
  readonly existingRuntime: WolfCombatRuntime | null | undefined;
  readonly playerDistancePx: number;
  /** Woodcraft stealth: inflates perceived distance for initial acquisition only. */
  readonly detectionMult?: number;
}): boolean {
  if (!input.existingRuntime) {
    return input.playerDistancePx / (input.detectionMult ?? 1) <= WOLF_COMBAT_TUNING.stalkRadiusPx;
  }
  return !(input.existingRuntime.state === "prowl" && input.playerDistancePx > WOLF_COMBAT_TUNING.disengageRadiusPx);
}

function createInitialWolfCombat(entity: Entity): WolfCombatRuntime {
  return {
    state: "prowl",
    stateElapsedMs: 0,
    position: animalCenter(entity),
    lockedDirection: null,
    lungeDistancePx: 0,
    circleSign: 1,
  };
}

function syncWolfStateToAnimal(entity: Entity, runtime: WolfCombatRuntime): void {
  const animal = entity.animal!;
  animal.behavior = runtime.state;
  if (runtime.lockedDirection && Math.abs(runtime.lockedDirection.x) > 0.1) {
    animal.facingX = runtime.lockedDirection.x < 0 ? -1 : 1;
  }
}

function lungeCollisionFor(entity: Entity, map: MapResource): (nextPosition: { readonly x: number; readonly y: number }) => boolean {
  return (nextPosition) =>
    collidesWithSolid(
      nextPosition.x,
      nextPosition.y + ANIMAL_ECOLOGY_CONFIG.bodyCenterYOffsetPx - 32,
      ANIMAL_ECOLOGY_CONFIG.bodyHalfWidthPx,
      ANIMAL_ECOLOGY_CONFIG.bodyHalfHeightPx,
      map,
    );
}

function pushWolfOutcomeFeedback(events: GameEventQueue | undefined, outcome: WolfLungeOutcome): void {
  const feedback = buildWolfOutcomeFeedback(outcome);
  if (!feedback) return;
  events?.push({ type: "feedback_requested", channel: "ui", ...feedback });
}

function playWolfFeedback(entity: Entity, feedback: WolfCombatRuntime["feedback"], vfx: VFXResource, entityLayer: Container, events?: GameEventQueue): void {
  const pos = animalCenter(entity);
  if (feedback === "noticed_player") {
    playAt("wolf.growl.close", pos, { gain: 0.7 });
    events?.push({ type: "feedback_requested", channel: "ui", message: "A wolf starts stalking you.", tone: "warning" });
  } else if (feedback === "circle_started") {
    playAt("wolf.growl.close", pos, { gain: 0.85 });
    events?.push({ type: "feedback_requested", channel: "ui", message: "The wolf circles, looking for your flank.", tone: "warning" });
  } else if (feedback === "lunge_windup_started") {
    spawnEnvParticles(vfx, Colors.combat.windupTint, 3, "sizzle", { x: pos.x - 32, y: pos.y - 32 }, entityLayer);
    events?.push({ type: "feedback_requested", channel: "ui", message: "The wolf crouches to spring!", tone: "danger" });
  } else if (feedback === "lunge_started") {
    playAt("wolf.growl.close", pos, { gain: 1.05 });
  }
}

function applyWolfLungeHit(input: {
  readonly entity: Entity;
  readonly player: Entity;
  readonly config: CombatConfig;
  readonly combat: CombatResource;
  readonly vfx: VFXResource;
  readonly entityLayer: Container;
  readonly events?: GameEventQueue;
}): void {
  const origin = animalCenter(input.entity);
  const previousHealth = input.player.health?.current ?? 0;
  applyDamage(
    input.player,
    WOLF_LUNGE_ATTACK.damage,
    origin.x,
    origin.y,
    WOLF_LUNGE_ATTACK.knockbackPx,
    input.config,
    input.vfx,
    input.entityLayer,
    input.combat,
    input.events,
    getPlayerStats().combat.armor,
  );

  if ((input.player.health?.current ?? previousHealth) === previousHealth) return;
  applyStatusEffect(StatusId.BiteWound, 12, "hazard:wolf-lunge");
  pushWolfOutcomeFeedback(input.events, "hit");
}

function moveWolfPressureState(entity: Entity, player: Entity, map: MapResource, runtime: WolfCombatRuntime, dt: number): void {
  const playerCenter = animalCenter(player);
  if (runtime.state === "stalk") {
    moveAnimalToward(entity, map, playerCenter.x, playerCenter.y, 120, dt);
  } else if (runtime.state === "circle") {
    const pos = animalCenter(entity);
    const dx = pos.x - playerCenter.x;
    const dy = pos.y - playerCenter.y;
    const len = Math.hypot(dx, dy) || 1;
    const tangent = { x: (-dy / len) * runtime.circleSign, y: (dx / len) * runtime.circleSign };
    const desired = {
      x: playerCenter.x + (dx / len) * WOLF_COMBAT_TUNING.circleRadiusPx + tangent.x * 52,
      y: playerCenter.y + (dy / len) * WOLF_COMBAT_TUNING.circleRadiusPx + tangent.y * 52,
    };
    moveAnimalToward(entity, map, desired.x, desired.y, 135, dt);
  }
}

export function updateWolfCombatEntity(input: {
  readonly entity: Entity;
  readonly player: Entity;
  readonly map: MapResource;
  readonly dt: number;
  readonly config: CombatConfig;
  readonly combat: CombatResource;
  readonly vfx: VFXResource;
  readonly entityLayer: Container;
  readonly events?: GameEventQueue;
  readonly detectionMult?: number;
}): boolean {
  const { entity, player, map, dt, config, combat, vfx, entityLayer, events, detectionMult } = input;
  if (!entity.position || !entity.animal || entity.animal.speciesId !== "wolf" || !player.position) return false;

  const playerDistance = Math.hypot(animalCenter(entity).x - animalCenter(player).x, animalCenter(entity).y - animalCenter(player).y);
  if (!shouldWolfCombatOwnTick({ existingRuntime: entity.animal.wolfCombat, playerDistancePx: playerDistance, detectionMult: detectionMult ?? 1 })) {
    if (entity.animal.wolfCombat?.state === "prowl") delete entity.animal.wolfCombat;
    return false;
  }

  const currentRuntime = entity.animal.wolfCombat ?? createInitialWolfCombat(entity);
  let runtime = advanceWolfCombat({
    wolf: { ...currentRuntime, position: animalCenter(entity) },
    player: animalCenter(player),
    dtMs: dt * 1000,
  });

  playWolfFeedback(entity, runtime.feedback ?? null, vfx, entityLayer, events);
  moveWolfPressureState(entity, player, map, runtime, dt);

  if (runtime.state === "lunge" && runtime.lockedDirection) {
    const movement = WOLF_LUNGE_ATTACK.movement;
    const movementResult = advanceWolfLungeBody({
      position: animalCenter(entity),
      lockedDirection: runtime.lockedDirection,
      speedPxPerSec: movement?.speedPxPerSec ?? WOLF_COMBAT_TUNING.lungeSpeedPxPerSec,
      dtSec: dt,
      distanceMovedPx: runtime.lungeDistancePx,
      maxDistancePx: movement?.maxDistancePx ?? WOLF_COMBAT_TUNING.lungeMaxDistancePx,
      collides: lungeCollisionFor(entity, map),
    });

    const hitPlayer = wolfLungeContactsPlayer({ wolfCenter: movementResult.position, playerCenter: animalCenter(player) }) || enemyAttackHitsTarget({
      attack: WOLF_LUNGE_ATTACK,
      origin: movementResult.position,
      direction: runtime.lockedDirection,
      target: animalCenter(player),
      targetRadiusPx: 14,
    });
    const outcome = hitPlayer ? "hit" : movementResult.outcome;

    if (outcome === "continue") {
      entity.position.x += movementResult.position.x - animalCenter(entity).x;
      entity.position.y += movementResult.position.y - animalCenter(entity).y;
      entity.position.targetX = entity.position.x;
      entity.position.targetY = entity.position.y;
      runtime = { ...runtime, lungeDistancePx: movementResult.distanceMovedPx };
    } else {
      if (outcome === "hit") {
        applyWolfLungeHit({ entity, player, config, combat, vfx, entityLayer, ...(events !== undefined ? { events } : {}) });
        triggerCameraShake(vfx, 3, 0.12);
      } else if (outcome === "miss") {
        const pos = animalCenter(entity);
        spawnEnvParticles(vfx, Colors.combat.windupTint, 3, "smoke", { x: pos.x - 32, y: pos.y - 32 }, entityLayer);
        pushWolfOutcomeFeedback(events, "miss");
      }
      runtime = { ...runtime, state: "recover", stateElapsedMs: 0, lungeDistancePx: 0 };
    }
  }

  entity.animal.wolfCombat = runtime;
  syncWolfStateToAnimal(entity, runtime);
  return true;
}
