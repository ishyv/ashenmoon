import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { playAt } from "$lib/audio/audio-engine";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { applyDamage, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { ANIMAL_ECOLOGY_CONFIG } from "$lib/core/systems/animals/animal-ecology-config";
import { animalCenter } from "$lib/core/systems/animals/animal-runtime";
import { clearBoarTelegraph, syncBoarTelegraph } from "$lib/core/systems/animals/boar-presentation";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import { BOAR_CHARGE_ATTACK, BOAR_COMBAT_TUNING, advanceBoarCombat, resolveBoarChargeOutcome, type BoarChargeOutcome, type BoarCombatRuntime } from "$lib/domain/combat/enemies/boar-combat";
import { enemyAttackHitsTarget } from "$lib/domain/combat/enemies/enemy-attack-resolution";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import type { MapResource } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvParticles, spawnShockwaveRing, triggerCameraShake } from "$lib/core/vfx/vfx";
import { Colors } from "$lib/utils/colors";

export interface BoarChargeBodyInput {
  readonly position: { readonly x: number; readonly y: number };
  readonly lockedDirection: { readonly x: number; readonly y: number };
  readonly speedPxPerSec: number;
  readonly dtSec: number;
  readonly distanceMovedPx?: number;
  readonly maxDistancePx?: number;
  readonly collides: (nextPosition: { readonly x: number; readonly y: number }) => boolean;
}

export interface BoarChargeBodyResult {
  readonly position: { readonly x: number; readonly y: number };
  readonly distanceMovedPx: number;
  readonly outcome: BoarChargeOutcome;
}

export function advanceBoarChargeBody(input: BoarChargeBodyInput): BoarChargeBodyResult {
  const remainingDistancePx = Math.max(0, (input.maxDistancePx ?? BOAR_COMBAT_TUNING.chargeMaxDistancePx) - (input.distanceMovedPx ?? 0));
  const stepPx = Math.min(Math.max(0, input.speedPxPerSec * input.dtSec), remainingDistancePx);
  const nextPosition = {
    x: input.position.x + input.lockedDirection.x * stepPx,
    y: input.position.y + input.lockedDirection.y * stepPx,
  };

  if (input.collides(nextPosition)) {
    return { position: input.position, distanceMovedPx: input.distanceMovedPx ?? 0, outcome: "crash" };
  }

  const distanceMovedPx = (input.distanceMovedPx ?? 0) + stepPx;
  const outcome = resolveBoarChargeOutcome({
    hitPlayer: false,
    hitObstacle: false,
    chargeDistancePx: distanceMovedPx,
    ...(input.maxDistancePx !== undefined ? { maxDistancePx: input.maxDistancePx } : {}),
  });
  return { position: nextPosition, distanceMovedPx, outcome };
}

export function boarChargeContactsPlayer(input: {
  readonly boarCenter: { readonly x: number; readonly y: number };
  readonly playerCenter: { readonly x: number; readonly y: number };
  readonly contactRadiusPx?: number;
}): boolean {
  return Math.hypot(input.boarCenter.x - input.playerCenter.x, input.boarCenter.y - input.playerCenter.y) <= (input.contactRadiusPx ?? 34);
}

function createInitialBoarCombat(entity: Entity): BoarCombatRuntime {
  return {
    state: "graze",
    stateElapsedMs: 0,
    position: animalCenter(entity),
    lockedDirection: null,
    chargeDistancePx: 0,
  };
}

function syncBoarStateToAnimal(entity: Entity, runtime: BoarCombatRuntime): void {
  const animal = entity.animal!;
  animal.behavior = runtime.state;
  if (runtime.lockedDirection && Math.abs(runtime.lockedDirection.x) > 0.1) {
    animal.facingX = runtime.lockedDirection.x < 0 ? -1 : 1;
  }
}

function chargeCollisionFor(entity: Entity, map: MapResource): (nextPosition: { readonly x: number; readonly y: number }) => boolean {
  return (nextPosition) =>
    collidesWithSolid(
      nextPosition.x,
      nextPosition.y + ANIMAL_ECOLOGY_CONFIG.bodyCenterYOffsetPx - 32,
      ANIMAL_ECOLOGY_CONFIG.bodyHalfWidthPx,
      ANIMAL_ECOLOGY_CONFIG.bodyHalfHeightPx,
      map,
    );
}

function applyBoarChargeHit(input: {
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
    BOAR_CHARGE_ATTACK.damage,
    origin.x,
    origin.y,
    BOAR_CHARGE_ATTACK.knockbackPx,
    input.config,
    input.vfx,
    input.entityLayer,
    input.combat,
    input.events,
    getPlayerStats().combat.armor,
  );

  if ((input.player.health?.current ?? previousHealth) === previousHealth) return;
  applyStatusEffect(StatusId.Injured, 15, "hazard:boar-charge");
  input.events?.push({ type: "feedback_requested", channel: "ui", message: "The boar charge hammers you sideways!", tone: "error" });
}

function playBoarFeedback(entity: Entity, feedback: string | null, vfx: VFXResource, entityLayer: Container, events?: GameEventQueue): void {
  const pos = animalCenter(entity);
  if (feedback === "noticed_player" || feedback === "threat_started") {
    playAt("boar.snort", pos);
    if (feedback === "threat_started") {
      spawnEnvParticles(vfx, Colors.resource.wood, 5, "smoke", { x: pos.x - 32, y: pos.y - 32 }, entityLayer);
      events?.push({ type: "feedback_requested", channel: "ui", message: "The boar lowers its head.", tone: "warning" });
    }
  } else if (feedback === "charge_windup_started") {
    playAt("boar.snort", pos, { gain: 1.15 });
    events?.push({ type: "feedback_requested", channel: "ui", message: "The boar is lining up a charge!", tone: "danger" });
  } else if (feedback === "charge_started") {
    playAt("boar.charge", pos);
  }
}

export function updateBoarCombatEntity(input: {
  readonly entity: Entity;
  readonly player: Entity;
  readonly map: MapResource;
  readonly dt: number;
  readonly config: CombatConfig;
  readonly combat: CombatResource;
  readonly vfx: VFXResource;
  readonly entityLayer: Container;
  readonly entitySprites: Map<string, Container>;
  readonly events?: GameEventQueue;
}): boolean {
  const { entity, player, map, dt, config, combat, vfx, entityLayer, entitySprites, events } = input;
  if (!entity.position || !entity.animal || entity.animal.speciesId !== "boar" || !player.position) return false;

  const currentRuntime = entity.animal.boarCombat ?? createInitialBoarCombat(entity);
  let runtime = advanceBoarCombat({
    boar: { ...currentRuntime, position: animalCenter(entity) },
    player: animalCenter(player),
    dtMs: dt * 1000,
  });

  playBoarFeedback(entity, runtime.feedback, vfx, entityLayer, events);

  if (runtime.state === "charge" && runtime.lockedDirection) {
    const movement = BOAR_CHARGE_ATTACK.movement;
    const speedPxPerSec = movement?.speedPxPerSec ?? 520;
    const movementResult = advanceBoarChargeBody({
      position: animalCenter(entity),
      lockedDirection: runtime.lockedDirection,
      speedPxPerSec,
      dtSec: dt,
      distanceMovedPx: runtime.chargeDistancePx,
      maxDistancePx: movement?.maxDistancePx ?? BOAR_COMBAT_TUNING.chargeMaxDistancePx,
      collides: chargeCollisionFor(entity, map),
    });

    const hitPlayer = boarChargeContactsPlayer({ boarCenter: movementResult.position, playerCenter: animalCenter(player) }) || enemyAttackHitsTarget({
      attack: BOAR_CHARGE_ATTACK,
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
      runtime = { ...runtime, chargeDistancePx: movementResult.distanceMovedPx };
    } else {
      if (outcome === "hit") {
        applyBoarChargeHit({ entity, player, config, combat, vfx, entityLayer, ...(events !== undefined ? { events } : {}) });
        triggerCameraShake(vfx, 4, 0.16);
      } else if (outcome === "crash") {
        const pos = animalCenter(entity);
        playAt("boar.charge", pos, { gain: 0.8 });
        spawnShockwaveRing(vfx, entityLayer, pos.x, pos.y, Colors.resource.wood, 0.35);
        triggerCameraShake(vfx, 5, 0.18);
        events?.push({ type: "feedback_requested", channel: "ui", message: "The boar crashes and stumbles!", tone: "good" });
      }
      runtime = {
        ...runtime,
        state: outcome === "crash" ? "crash" : "recover",
        stateElapsedMs: 0,
        chargeDistancePx: 0,
      };
    }
  }

  entity.animal.boarCombat = runtime;
  syncBoarStateToAnimal(entity, runtime);
  syncBoarTelegraph(entity, runtime, entitySprites, entityLayer);

  if (runtime.state !== "charge_windup") {
    clearBoarTelegraph(entity.id, entitySprites, entityLayer);
  }

  return true;
}
