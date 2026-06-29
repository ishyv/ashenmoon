import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { LitCampfire } from "$lib/core/systems/camp/campfire-runtime-system";
import type { CombatConfig, CombatResource } from "$lib/core/systems/combat/combat";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import type { VFXResource } from "$lib/core/vfx/vfx";
import {
  ANIMAL_DEFINITIONS,
  chooseAnimalBehavior,
  curiousRadiusPx,
  type AnimalDecision,
  type AnimalSpeciesId,
} from "$lib/domain/animals/animal-behavior";
import { spawnAnimal } from "$lib/core/systems/map/spawn-system";
import { planInitialAnimalSpawns } from "$lib/core/systems/animals/animal-spawning";
import { animalCenter, animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { gameState } from "$lib/state/game-state.svelte";
import {
  handleScaredAnimal,
  moveAnimalToward,
  updateWanderOrGraze,
} from "$lib/core/systems/animals/animal-movement";
import { syncAnimalSprite } from "$lib/core/systems/animals/animal-sprite-sync";
import {
  tryAnimalAttackPlayer,
  tryAnimalAttackPrey,
} from "$lib/core/systems/animals/animal-combat-bridge";
import { updateBoarCombatEntity } from "$lib/core/systems/animals/boar-combat-system";
import { spawnCarcassEntity, buildCarcassSprite } from "$lib/core/systems/animals/carcass-runtime";
import { despawnEntity } from "$lib/core/systems/combat/combat";
import { M3_CARCASS_DEFINITIONS } from "$lib/domain/animals/carcass-processing";
import { computeRenderZ } from "$lib/domain/collision";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { coordKey } from "$lib/utils/coord-utils";
import { Cell } from "$lib/core/types";

type AnimalTimeOfDay = "day" | "dusk" | "night";

const AWARENESS_DECAY_HOLD_SEC = 4.0;   // time threat must be gone before awareness drops
const CARCASS_DEATH_FADE_SEC   = 0.8;   // must match dyingSec set in enemy-death-system

export function spawnInitialAnimalsSystem(
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  animalSeq: number,
): number {
  const plan = planInitialAnimalSpawns(map.forestMetadata.animalZones, animalSeq);
  for (const spawn of plan.spawns) {
    spawnAnimal(spawn.x, spawn.y, spawn.speciesId, entityLayer, entitySprites, map, spawn.seq);
  }
  return plan.nextSeq;
}

function tickAnimalNeeds(entity: Entity, dt: number, isRaining: boolean): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const hungerRate = isRaining && def.temperament === "predator"
    ? def.hungerDecayPerMinute * 1.5  // wolves get hungrier faster in rain
    : def.hungerDecayPerMinute;
  animal.hunger = Math.min(100, animal.hunger + (hungerRate / 60) * dt);
  animal.attackCooldownSec = Math.max(0, animal.attackCooldownSec - dt);
}

/**
 * Updates the animal's awareness tier based on player distance.
 * Transitions: unaware → curious → alert (→ flee is set by chooseAnimalBehavior).
 * Awareness decays when the player leaves both detection rings for AWARENESS_DECAY_HOLD_SEC.
 */
function tickAwareness(entity: Entity, playerDistPx: number, isRaining: boolean, dt: number): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];

  const alertR = isRaining && def.diet === "herbivore" ? def.detectionRadiusPx * 0.8 : def.detectionRadiusPx;
  const curiousR = curiousRadiusPx(def) * (isRaining && def.diet === "herbivore" ? 0.8 : 1);

  if (playerDistPx <= alertR) {
    animal.awarenessLevel = "alert";
    animal.awarenessDecaySec = AWARENESS_DECAY_HOLD_SEC;
  } else if (playerDistPx <= curiousR) {
    if (animal.awarenessLevel === "unaware") {
      animal.awarenessLevel = "curious";
    }
    animal.awarenessDecaySec = AWARENESS_DECAY_HOLD_SEC;
  } else {
    // Player is out of all rings — tick the decay timer.
    if (animal.awarenessDecaySec > 0) {
      animal.awarenessDecaySec -= dt;
    } else {
      // Step down one tier.
      if (animal.awarenessLevel === "fleeing" || animal.awarenessLevel === "alert") {
        animal.awarenessLevel = "curious";
        animal.awarenessDecaySec = AWARENESS_DECAY_HOLD_SEC * 0.5;
      } else if (animal.awarenessLevel === "curious") {
        animal.awarenessLevel = "unaware";
      }
    }
  }

  // Keep fleeing level in sync so chooseAnimalBehavior can read it.
  if (animal.behavior === "flee") {
    animal.awarenessLevel = "fleeing";
  }
}

function replaceCarcassSprite(entity: Entity, entityLayer: Container, entitySprites: Map<string, Container>): void {
  if (!entity.carcass || !entity.position) return;
  const oldSprite = entitySprites.get(entity.id);
  if (oldSprite) {
    entityLayer.removeChild(oldSprite);
    oldSprite.destroy({ children: true });
  }
  const cx = entity.position.x + TILE / 2;
  const cy = entity.position.y + TILE * 0.72;
  const sprite = buildCarcassSprite(entity.carcass.speciesId, entity.carcass.state, cx, cy);
  sprite.zIndex = computeRenderZ(cy);
  entityLayer.addChild(sprite);
  entitySprites.set(entity.id, sprite);
}

/** Ages carcass entities and advances their state based on elapsed time. */
function tickCarcassAge(ecsWorld: World<Entity>, dt: number, entityLayer: Container, entitySprites: Map<string, Container>): void {
  for (const entity of ecsWorld.with("carcass", "position").entities) {
    const carcass = entity.carcass!;
    const previousState = carcass.state;
    if (carcass.state === "rotten") continue;

    carcass.ageSec += dt;
    const def = M3_CARCASS_DEFINITIONS[carcass.speciesId];
    if (def) {
      if (carcass.state === "fresh" && carcass.ageSec >= def.freshDurationSec) {
        carcass.state = "spoiling";
      } else if (carcass.state === "spoiling" && carcass.ageSec >= def.freshDurationSec + def.spoilingDurationSec) {
        carcass.state = "rotten";
      }
    }

    if (carcass.state !== previousState) {
      replaceCarcassSprite(entity, entityLayer, entitySprites);
    }
  }
}

function applyAnimalDecision(input: {
  entity: Entity;
  decision: AnimalDecision;
  map: MapResource;
  dt: number;
  player: Entity;
  config: CombatConfig;
  combat: CombatResource;
  vfx: VFXResource;
  entityLayer: Container;
  entitySprites: Map<string, Container>;
  ecsWorld: World<Entity>;
  litCampfires: readonly LitCampfire[];
  animalsById: ReadonlyMap<string, Entity>;
  events?: GameEventQueue;
}): void {
  const {
    entity,
    decision,
    map,
    dt,
    player,
    config,
    combat,
    vfx,
    entityLayer,
    entitySprites,
    ecsWorld,
    litCampfires,
    animalsById,
    events,
  } = input;
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  const playerCenter = animalCenter(player);
  const pos = animalCenter(entity);

  // Orient toward the player if interacting with them and not moving
  if (decision.behavior === "attack" || decision.behavior === "threaten" || decision.behavior === "curious") {
    const dx = playerCenter.x - pos.x;
    if (Math.abs(dx) > 0.1) {
      animal.facingX = dx < 0 ? -1 : 1;
    }
  }

  if (decision.behavior === "flee") {
    // When fleeing fire, flee from the nearest campfire; otherwise from player.
    const fleeFrom = decision.targetKind === "fire" && litCampfires.length > 0
      ? litCampfires.reduce((nearest, f) =>
          Math.hypot(f.x - pos.x, f.y - pos.y) < Math.hypot(nearest.x - pos.x, nearest.y - pos.y) ? f : nearest
        )
      : playerCenter;
    moveAnimalToward(entity, map, fleeFrom.x, fleeFrom.y, def.fleeSpeed, dt, true);
    return;
  }

  if (decision.behavior === "curious") {
    // Slow walk toward player — curiosity, not aggression.
    moveAnimalToward(entity, map, playerCenter.x, playerCenter.y, def.moveSpeed * 0.4, dt);
    return;
  }

  if (decision.behavior === "alert") {
    // Freeze in place — wide eyes, assessing threat.
    return;
  }

  if (decision.behavior === "charge") {
    // Boar dash: fast dash toward player; damage on contact range.
    animal.wanderTimerSec = Math.max(animal.wanderTimerSec - dt, 0);
    moveAnimalToward(entity, map, playerCenter.x, playerCenter.y, def.fleeSpeed * 1.4, dt);
    if (Math.hypot(playerCenter.x - pos.x, playerCenter.y - pos.y) <= (def.attackRadiusPx ?? TILE)) {
      tryAnimalAttackPlayer(entity, player, config, combat, vfx, entityLayer, events);
    }
    return;
  }

  if (decision.behavior === "hunt" && decision.targetId) {
    // Store huntTargetId for pack coordination (read by chooseAnimalBehavior next tick).
    animal.huntTargetId = decision.targetId;
    const target = animalsById.get(decision.targetId);
    if (target?.position) {
      const targetCenter = animalCenter(target);
      moveAnimalToward(entity, map, targetCenter.x, targetCenter.y, def.moveSpeed, dt);
      tryAnimalAttackPrey(entity, target, config, vfx, entityLayer, entitySprites, ecsWorld, events);
    }
    return;
  }

  // Clear huntTargetId when not actively hunting.
  if (animal.huntTargetId && decision.behavior !== "hunt") {
    delete animal.huntTargetId;
  }

  if (decision.behavior === "attack" && def.damage && Math.hypot(playerCenter.x - pos.x, playerCenter.y - pos.y) <= (def.attackRadiusPx ?? TILE)) {
    tryAnimalAttackPlayer(entity, player, config, combat, vfx, entityLayer, events);
    return;
  }

  if (decision.behavior === "threaten") {
    animal.threatened = true;
    // Init charge timer when boar first threatens — used if player backs into charge range.
    if (def.id === "boar" && animal.wanderTimerSec <= 0) {
      animal.wanderTimerSec = 1.5;
    }
    return;
  }

  if (decision.behavior === "rest") {
    // Herbivore sheltering in rain — stand still, clear wander state.
    delete animal.wanderTarget;
    return;
  }

  if (decision.behavior === "wander" || decision.behavior === "graze") {
    updateWanderOrGraze(entity, map, dt);
  }
}

export function animalEcologySystem(
  ecsWorld: World<Entity>,
  map: MapResource,
  dt: number,
  player: Entity,
  config: CombatConfig,
  combat: CombatResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  litCampfires: readonly LitCampfire[],
  timeOfDay: AnimalTimeOfDay,
  isRaining: boolean,
  animalSeq: number,
  events?: GameEventQueue,
): number {
  if (!player.position) return animalSeq;
  const playerCenter = animalCenter(player);

  tickCarcassAge(ecsWorld, dt, entityLayer, entitySprites);

  const animals = ecsWorld.with("animal", "position").entities;
  const runtimes = animals.map(animalCenterRuntime);
  const animalsById = new Map(animals.map((entity) => [entity.id, entity]));

  // Collect entities that complete their death fade this tick — despawn after loop.
  const toFinalizeDeath: Entity[] = [];

  for (const entity of animals) {
    const animal = entity.animal!;

    // Handle death fade: tick down, then hand off to finalizer.
    if (animal.dyingSec !== undefined && animal.dyingSec > 0) {
      animal.dyingSec -= dt;
      syncAnimalSprite(entity, entitySprites, entityLayer);
      if (animal.dyingSec <= 0) {
        animal.dyingSec = -1;
        toFinalizeDeath.push(entity);
      }
      continue;
    }
    if (animal.dyingSec === -1) continue; // already queued for removal

    tickAnimalNeeds(entity, dt, isRaining);

    const playerDistPx = Math.hypot(playerCenter.x - (entity.position!.x + TILE / 2), playerCenter.y - (entity.position!.y + TILE / 2));
    tickAwareness(entity, playerDistPx, isRaining, dt);

    if (handleScaredAnimal(entity, map, dt)) {
      syncAnimalSprite(entity, entitySprites, entityLayer);
      continue;
    }

    if (updateBoarCombatEntity({
      entity,
      player,
      map,
      dt,
      config,
      combat,
      vfx,
      entityLayer,
      entitySprites,
      ...(events !== undefined ? { events } : {}),
    })) {
      syncAnimalSprite(entity, entitySprites, entityLayer);
      continue;
    }

    const runtime = runtimes.find((candidate) => candidate.id === entity.id)!;
    const decision = chooseAnimalBehavior(runtime, {
      player: playerCenter,
      litCampfires,
      nearbyAnimals: runtimes.filter((candidate) => candidate.id !== entity.id),
      timeOfDay,
      isRaining,
    });
    animal.behavior = decision.behavior;
    applyAnimalDecision({
      entity,
      decision,
      map,
      dt,
      player,
      config,
      combat,
      vfx,
      entityLayer,
      entitySprites,
      ecsWorld,
      litCampfires,
      animalsById,
      ...(events !== undefined ? { events } : {}),
    });

    syncAnimalSprite(entity, entitySprites, entityLayer);
  }

  // Finalize deaths after the loop — safe to mutate the ECS world here.
  for (const entity of toFinalizeDeath) {
    if (entity.animal && entity.position) {
      spawnCarcassEntity({
        sourceEntityId: entity.id,
        speciesId: entity.animal.speciesId,
        x: entity.position.x,
        y: entity.position.y,
        entityLayer,
        entitySprites,
      });
    }
    despawnEntity(ecsWorld, entity, entityLayer, entitySprites, vfx);
  }

  const CHUNK_SIZE = 16;
  const MAX_ANIMALS_PER_CHUNK = 3;

  function isCellInsideAnyBuilding(gx: number, gy: number): boolean {
    for (const b of gameState.rpg.profile?.buildings ?? []) {
      const spec = getBuildingSpec(b.type);
      const { w, h } = spec.footprint;
      if (gx >= b.x && gx < b.x + w && gy >= b.y && gy < b.y + h) {
        return true;
      }
    }
    return false;
  }

  function getAnimalCountInChunk(world: World<Entity>, chunkX: number, chunkY: number): number {
    let count = 0;
    const animals = world.with("animal", "position").entities;
    for (const e of animals) {
      if (e.animal!.dyingSec !== undefined) continue;
      const ax = Math.floor(e.position!.x / TILE);
      const ay = Math.floor(e.position!.y / TILE);
      const cx = Math.floor(ax / CHUNK_SIZE);
      const cy = Math.floor(ay / CHUNK_SIZE);
      if (cx === chunkX && cy === chunkY) {
        count++;
      }
    }
    return count;
  }

  let nextSeq = animalSeq;
  const activeAnimalsCount = animals.filter(e => e.animal && e.animal.dyingSec === undefined).length;
  if (activeAnimalsCount < 20) {
    if (Math.random() < 0.18 * dt) {
      const pgx = Math.floor(player.position.x / TILE);
      const pgy = Math.floor(player.position.y / TILE);
      const r = 6 + Math.floor(Math.random() * 10);
      const angle = Math.random() * Math.PI * 2;
      const gx = Math.round(pgx + Math.cos(angle) * r);
      const gy = Math.round(pgy + Math.sin(angle) * r);

      if (map.inBounds(gx, gy)) {
        const cellType = map.cells[gy * map.mapW + gx] ?? Cell.Meadows;
        const isNotWater = cellType !== Cell.Water;
        const isNotSolid = !map.solidCoords.has(coordKey(gx, gy));
        const insideBuilding = isCellInsideAnyBuilding(gx, gy);

        if (isNotWater && isNotSolid && !insideBuilding) {
          const chunkX = Math.floor(gx / CHUNK_SIZE);
          const chunkY = Math.floor(gy / CHUNK_SIZE);
          const chunkCount = getAnimalCountInChunk(ecsWorld, chunkX, chunkY);
          
          if (chunkCount < MAX_ANIMALS_PER_CHUNK) {
            const speciesId = chooseSpeciesForBiome(cellType);
            spawnAnimal(gx, gy, speciesId, entityLayer, entitySprites, map, nextSeq);
            nextSeq++;
          }
        }
      }
    }
  }
  return nextSeq;
}

function chooseSpeciesForBiome(cellType: Cell): AnimalSpeciesId {
  const roll = Math.random();
  switch (cellType) {
    case Cell.Frostbane:
      return roll < 0.6 ? "wolf" : "deer";
    case Cell.CrimsonGrove:
      return roll < 0.6 ? "boar" : "wolf";
    case Cell.FungalMire:
      return roll < 0.6 ? "boar" : "rabbit";
    case Cell.ScorchedWastes:
      return roll < 0.6 ? "wolf" : "boar";
    case Cell.Meadows:
    case Cell.Camp:
    default:
      if (roll < 0.5) return "rabbit";
      if (roll < 0.85) return "deer";
      return "boar";
  }
}
