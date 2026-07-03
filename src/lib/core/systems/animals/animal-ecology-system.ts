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
  stealthDetectionMult,
  type AnimalDecision,
  type AnimalSpeciesId,
} from "$lib/domain/animals/animal-behavior";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { spawnAnimal } from "$lib/core/systems/map/spawn-system";
import { planInitialAnimalSpawns } from "$lib/core/systems/animals/animal-spawning";
import { animalCenter, animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { gameState } from "$lib/state/game-state.svelte";
import { devFlags } from "$lib/state/dev-flags.svelte";
import {
  handleScaredAnimal,
  moveAnimalToward,
  updateWanderOrGraze,
  updateFollowerSteering,
} from "$lib/core/systems/animals/animal-movement";
import { syncAnimalSprite } from "$lib/core/systems/animals/animal-sprite-sync";
import { playAnimalSound } from "$lib/core/systems/animals/animal-audio";
import {
  tryAnimalAttackPlayer,
  tryAnimalAttackPrey,
} from "$lib/core/systems/animals/animal-combat-bridge";
import { updateBoarCombatEntity } from "$lib/core/systems/animals/boar-combat-system";
import { updateWolfCombatEntity } from "$lib/core/systems/animals/wolf-combat-system";
import { spawnCarcassEntity, buildCarcassSprite } from "$lib/core/systems/animals/carcass-runtime";
import { despawnEntity } from "$lib/core/systems/combat/combat";
import { M3_CARCASS_DEFINITIONS } from "$lib/domain/animals/carcass-processing";
import { computeRenderZ } from "$lib/domain/collision";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { coordKey } from "$lib/utils/coord-utils";
import { Cell } from "$lib/core/types";
import { tickNeeds, evaluateLifeStage, getLifeStageStats } from "$lib/domain/animals/needs";
import { scanPerceivedTargets } from "$lib/domain/animals/perception";
import { selectAnimalBehavior } from "$lib/domain/animals/behavior-selector";
import { birthOffspring, shouldRetreatToDen, initiateMating } from "$lib/domain/animals/reproduction";

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

function tickAnimalNeeds(entity: Entity, dt: number, isRaining: boolean, isHot: boolean): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];
  animal.attackCooldownSec = Math.max(0, animal.attackCooldownSec - dt);

  if (entity.needs) {
    tickNeeds(entity.needs, def, dt, isRaining, isHot);
    animal.hunger = entity.needs.hunger;

    const nextStage = evaluateLifeStage(entity.needs);
    if (nextStage === "dead") {
      if (animal.dyingSec === undefined) {
        animal.dyingSec = AWARENESS_DECAY_HOLD_SEC;
      }
    } else if (nextStage !== entity.needs.lifeStage) {
      entity.needs.lifeStage = nextStage;
      const stats = getLifeStageStats(nextStage, def);
      if (entity.health) {
        const hpPercent = entity.health.current / entity.health.max;
        entity.health.max = stats.maxHealth;
        entity.health.current = Math.round(stats.maxHealth * hpPercent);
      }
      if (entity.mover) {
        entity.mover.speed = stats.moveSpeed;
      }
      if (stats.damage !== undefined) {
        animal.damage = stats.damage;
      }
    }
  } else {
    const hungerRate = isRaining && def.temperament === "predator"
      ? def.hungerDecayPerMinute * 1.5
      : def.hungerDecayPerMinute;
    animal.hunger = Math.min(100, animal.hunger + (hungerRate / 60) * dt);
  }
}

/**
 * Updates the animal's awareness tier based on player distance.
 * Transitions: unaware → curious → alert (→ flee is set by chooseAnimalBehavior).
 * Awareness decays when the player leaves both detection rings for AWARENESS_DECAY_HOLD_SEC.
 */
function tickAwareness(entity: Entity, playerDistPx: number, isRaining: boolean, dt: number, detectionMult = 1): void {
  const animal = entity.animal!;
  const def = ANIMAL_DEFINITIONS[animal.speciesId];

  const alertR = isRaining && def.diet === "herbivore" ? def.detectionRadiusPx * 0.8 : def.detectionRadiusPx;
  const curiousR = curiousRadiusPx(def) * (isRaining && def.diet === "herbivore" ? 0.8 : 1);

  // Stealth shrinks effective detection by inflating perceived distance.
  const effectiveDist = playerDistPx / detectionMult;
  if (effectiveDist <= alertR) {
    if (animal.awarenessLevel === "unaware" && animal.speciesId === "rabbit") {
      playAnimalSound(entity, "animal.thump");
    }
    animal.awarenessLevel = "alert";
    animal.awarenessDecaySec = AWARENESS_DECAY_HOLD_SEC;
  } else if (effectiveDist <= curiousR) {
    if (animal.awarenessLevel === "unaware") {
      animal.awarenessLevel = "curious";
      if (animal.speciesId === "rabbit") {
        playAnimalSound(entity, "animal.thump");
      }
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
    const target = animalsById.get(decision.targetId) || ecsWorld.with("trap", "position").entities.find((e) => e.id === decision.targetId);
    if (target?.position) {
      const targetCenter = target.trap
        ? { x: target.position.x + TILE / 2, y: target.position.y + TILE / 2 }
        : animalCenter(target);
      moveAnimalToward(entity, map, targetCenter.x, targetCenter.y, def.moveSpeed, dt);
      if (!target.trap) {
        tryAnimalAttackPrey(entity, target as Entity, config, vfx, entityLayer, entitySprites, ecsWorld, events);
      }
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

  if (decision.behavior === "sleep") {
    if (decision.targetId) {
      const shelter = ecsWorld.entities.find((e) => e.id === decision.targetId);
      if (shelter?.position) {
        const dist = Math.hypot(shelter.position.x - pos.x, shelter.position.y - pos.y);
        if (dist > 48) {
          moveAnimalToward(entity, map, shelter.position.x, shelter.position.y, def.moveSpeed, dt);
          return;
        }
      }
    }
    delete animal.wanderTarget;
    if (entity.needs) {
      entity.needs.energy = Math.min(100, entity.needs.energy + (17.5 / 60) * dt);
    }
    return;
  }

  if (decision.behavior === "drink" && decision.targetId) {
    const match = decision.targetId.match(/water_(\d+)_(\d+)/);
    if (match) {
      const wx = parseInt(match[1]!) * TILE + TILE / 2;
      const wy = parseInt(match[2]!) * TILE + TILE / 2;
      const dist = Math.hypot(wx - pos.x, wy - pos.y);
      if (dist <= 48) {
        if (entity.needs) {
          entity.needs.thirst = 0;
        }
        delete animal.wanderTarget;
      } else {
        moveAnimalToward(entity, map, wx, wy, def.moveSpeed, dt);
      }
    }
    return;
  }

  if (decision.behavior === "mate" && decision.targetId) {
    const mate = animalsById.get(decision.targetId);
    if (mate && mate.position) {
      const dist = Math.hypot(mate.position.x - pos.x, mate.position.y - pos.y);
      if (dist <= 48) {
        if (entity.needs && mate.needs) {
          const res = initiateMating(entity as any, mate as any);
          if (res.success) {
            entity.needs.gestationTimerSec = res.gestationTimerSec;
          }
        }
        delete animal.wanderTarget;
      } else {
        moveAnimalToward(entity, map, mate.position.x, mate.position.y, def.moveSpeed, dt);
      }
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
  let nextSeq = animalSeq;

  // Woodcraft stealth reduces how far animals sense the player this tick.
  const detectionMult = stealthDetectionMult(getPlayerStats().utility.stealth);

  tickCarcassAge(ecsWorld, dt, entityLayer, entitySprites);

  const animals = ecsWorld.with("animal", "position").entities;
  const runtimes = animals.map(animalCenterRuntime);
  const animalsById = new Map(animals.map((entity) => [entity.id, entity]));

  const nearbyDecoys = ecsWorld.with("trap", "position").entities
    .filter((e) => e.trap?.type === "decoy" && e.trap?.state === "set")
    .map((e) => ({
      id: e.id,
      x: e.position!.x + TILE / 2,
      y: e.position!.y + TILE / 2,
    }));

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

    const gx = Math.floor((entity.position!.x + TILE / 2) / TILE);
    const gy = Math.floor((entity.position!.y + TILE / 2) / TILE);
    const cell = map.cells[gy * map.mapW + gx];
    const isHot = cell === Cell.ScorchedWastes;

    tickAnimalNeeds(entity, dt, isRaining, isHot);

    const playerDistPx = devFlags.spectatorEnabled
      ? 999999
      : Math.hypot(playerCenter.x - (entity.position!.x + TILE / 2), playerCenter.y - (entity.position!.y + TILE / 2));
    tickAwareness(entity, playerDistPx, isRaining, dt, detectionMult);

    if (handleScaredAnimal(entity, map, dt)) {
      syncAnimalSprite(entity, entitySprites, entityLayer, dt);
      continue;
    }

    if (entity.follower && updateFollowerSteering(entity, ecsWorld, map, dt)) {
      syncAnimalSprite(entity, entitySprites, entityLayer, dt);
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

    if (updateWolfCombatEntity({
      entity,
      player,
      map,
      dt,
      config,
      combat,
      vfx,
      entityLayer,
      detectionMult,
      ...(events !== undefined ? { events } : {}),
    })) {
      syncAnimalSprite(entity, entitySprites, entityLayer);
      continue;
    }

    const def = ANIMAL_DEFINITIONS[animal.speciesId];

    // 1. Scan Perception if senses component exists
    if (entity.senses && entity.position) {
      const nearbyAnimals = animals
        .filter((a) => a.id !== entity.id)
        .map((a) => ({
          id: a.id,
          speciesId: a.animal!.speciesId,
          x: a.position!.x + TILE / 2,
          y: a.position!.y + TILE / 2,
        }));
      const playerEntity = {
        id: player.id,
        x: playerCenter.x,
        y: playerCenter.y,
        isPlayer: true,
      };
      const plantPool = ["grass_patch", "mushroom_patch", "wild_herb_patch", "mossPatch"];
      const foodNodes = ecsWorld.with("resource", "position").entities
        .filter((r) => r.resource?.gatherableId && plantPool.includes(r.resource.gatherableId))
        .map((r) => ({
          id: r.id,
          x: r.position!.x + TILE / 2,
          y: r.position!.y + TILE / 2,
        }));
      const shelters = ecsWorld.with("nest", "position").entities
        .map((n) => ({
          id: n.id,
          x: n.position!.x + TILE / 2,
          y: n.position!.y + TILE / 2,
        }));

      const radiusTiles = Math.ceil(def.detectionRadiusPx * 2 / TILE);
      const egx = Math.floor(entity.position.x / TILE);
      const egy = Math.floor(entity.position.y / TILE);
      const waterTiles: { x: number; y: number }[] = [];
      for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
        for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
          const tx = egx + dx;
          const ty = egy + dy;
          if (map.inBounds(tx, ty)) {
            const cell = map.cells[ty * map.mapW + tx];
            if (cell === Cell.Water) {
              waterTiles.push({ x: tx, y: ty });
            }
          }
        }
      }

      entity.senses.perceivedEntities = scanPerceivedTargets({
        ax: entity.position.x + TILE / 2,
        ay: entity.position.y + TILE / 2,
        speciesId: animal.speciesId,
        detectionRadiusPx: def.detectionRadiusPx,
        temperament: def.temperament,
        nearbyAnimals,
        player: devFlags.spectatorEnabled ? undefined : playerEntity,
        waterTiles,
        foodNodes,
        shelters,
        ...(def.preySpecies ? { preySpecies: def.preySpecies } : {}),
      });
      entity.senses.lastScanSec = 0;
    }

    // 2. Handle pregnancy den-retreat hideout and birth
    let retreated = false;
    if (entity.needs && shouldRetreatToDen(entity.needs)) {
      const nests = ecsWorld.with("nest", "position").entities;
      const myNests = nests.filter((n) => n.nest!.speciesId === animal.speciesId);
      if (myNests.length > 0) {
        let closestNest = myNests[0]!;
        let minDist = Infinity;
        const ax = entity.position!.x;
        const ay = entity.position!.y;
        for (const n of myNests) {
          const d = Math.hypot(n.position!.x - ax, n.position!.y - ay);
          if (d < minDist) {
            minDist = d;
            closestNest = n;
          }
        }

        const npx = closestNest.position!.x;
        const npy = closestNest.position!.y;
        const distToNest = Math.hypot(npx - ax, npy - ay);

        if (distToNest <= 48) {
          const sprite = entitySprites.get(entity.id);
          if (sprite) sprite.visible = false;

          entity.position!.x = npx;
          entity.position!.y = npy;
          entity.position!.targetX = npx;
          entity.position!.targetY = npy;

          tickNeeds(entity.needs, def, dt, isRaining, isHot);

          if (entity.needs.gestationTimerSec === 0) {
            const offspring = birthOffspring(entity.id, animal.speciesId, ax, ay, npx, npy);
            for (const spec of offspring) {
              const kitGx = Math.floor(spec.x / TILE);
              const kitGy = Math.floor(spec.y / TILE);
              const kitId = spawnAnimal(kitGx, kitGy, spec.speciesId, entityLayer, entitySprites, map, nextSeq++);
              if (kitId) {
                const kitEntity = ecsWorld.entities.find((e) => e.id === kitId);
                if (kitEntity) {
                  kitEntity.needs = {
                    hunger: 0,
                    thirst: 0,
                    energy: 100,
                    ageSec: 0,
                    lifeStage: "juvenile",
                  };
                  kitEntity.follower = {
                    targetEntityId: entity.id,
                    maxSeparationPx: 64,
                  };
                  const stats = getLifeStageStats("juvenile", def);
                  if (kitEntity.health) {
                    kitEntity.health.max = stats.maxHealth;
                    kitEntity.health.current = stats.maxHealth;
                  }
                  if (kitEntity.mover) {
                    kitEntity.mover.speed = stats.moveSpeed;
                  }
                  if (kitEntity.interactable) {
                    kitEntity.interactable.name = `${def.name} (Juvenile) (Lvl 1)`;
                  }
                }
              }
            }

            entity.needs.gestationTimerSec = undefined;
            if (sprite) sprite.visible = true;
          }
        } else {
          moveAnimalToward(entity, map, npx, npy, def.moveSpeed, dt);
          const sprite = entitySprites.get(entity.id);
          if (sprite) sprite.visible = true;
        }

        syncAnimalSprite(entity, entitySprites, entityLayer, dt);
        retreated = true;
      }
    }

    if (retreated) continue;

    // 3. Choose Decision
    const runtime = runtimes.find((candidate) => candidate.id === entity.id)!;
    let decision: AnimalDecision;
    if (entity.needs && entity.senses) {
      decision = selectAnimalBehavior(
        entity.needs,
        entity.senses.perceivedEntities,
        def,
        {
          timeOfDay,
          isRaining,
          isHot,
          hasDen: entity.home?.nestId !== undefined,
        }
      );
      animal.behavior = decision.behavior;
    } else {
      decision = chooseAnimalBehavior(runtime, {
        player: playerCenter,
        litCampfires,
        nearbyAnimals: runtimes.filter((candidate) => candidate.id !== entity.id),
        timeOfDay,
        isRaining,
        nearbyDecoys,
        detectionMult,
      });
      animal.behavior = decision.behavior;
    }

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

    syncAnimalSprite(entity, entitySprites, entityLayer, dt);
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
