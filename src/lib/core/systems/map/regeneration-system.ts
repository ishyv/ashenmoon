import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { gameState } from "$lib/state/game-state.svelte";
import { saveLocalRpgState } from "$lib/state/persistence/rpg-commands";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { WORLDGEN_CONFIG } from "$lib/domain/worldgen/worldgen-config";
import { spawnResourceEntity } from "$lib/core/systems/map/spawn-system";
import { TILE } from "$lib/core/systems/map/map";
import { Graphics } from "pixi.js";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";

export function getReadyRegenNodeIds(
  profile: any,
  spawns: any[],
  landmarks: any[],
  now: number
): string[] {
  const readyIds: string[] = [];
  const depleted = profile.depletedNodes;
  if (!depleted) return readyIds;

  const campX = Math.floor(100 / 2); // map width is 100
  const campY = Math.floor(100 / 2);

  for (const [nodeId, depletedTime] of Object.entries(depleted)) {
    const spawn = spawns.find((s) => s.id === nodeId);
    if (!spawn) {
      readyIds.push(nodeId);
      continue;
    }

    const gatherable = getGatherableDefinition(spawn.gatherableId);
    const cooldownSec = gatherable?.regenCooldownSec ?? WORLDGEN_CONFIG.regenCooldowns[spawn.gatherableId] ?? 300;
    if (now - (depletedTime as number) >= cooldownSec * 1000) {
      let blocked = false;

      // 1. Player buildings
      if (profile.buildings) {
        for (const b of profile.buildings) {
          const dx = spawn.x - b.x;
          const dy = spawn.y - b.y;
          if (Math.hypot(dx, dy) < WORLDGEN_CONFIG.preservation.playerStructureRadius) {
            blocked = true;
            break;
          }
        }
      }

      // 2. Procedural structures/landmarks
      if (!blocked && landmarks) {
        for (const lm of landmarks) {
          const dx = spawn.x - lm.x;
          const dy = spawn.y - lm.y;
          if (Math.hypot(dx, dy) < WORLDGEN_CONFIG.preservation.proceduralStructureRadius) {
            blocked = true;
            break;
          }
        }
      }

      // 3. Camp center
      if (!blocked) {
        const dx = spawn.x - campX;
        const dy = spawn.y - campY;
        if (Math.hypot(dx, dy) < WORLDGEN_CONFIG.preservation.campCenterRadius) {
          blocked = true;
        }
      }

      if (!blocked) {
        readyIds.push(nodeId);
      }
    }
  }
  return readyIds;
}

export function catchUpRegeneration(
  mapSpawns: any[],
  landmarks: any[]
): void {
  const profile = gameState.rpg.profile;
  if (!profile || !profile.depletedNodes) return;

  const readyIds = getReadyRegenNodeIds(profile, mapSpawns, landmarks, Date.now());
  if (readyIds.length > 0) {
    profile.gatheredPickups = profile.gatheredPickups?.filter((id) => !readyIds.includes(id)) ?? [];
    for (const id of readyIds) {
      delete profile.depletedNodes[id];
    }
    saveLocalRpgState({ ...gameState.rpg, profile });
  }
}

export function tickRegenerationSystem(
  engine: any,
  now: number
): void {
  const profile = gameState.rpg.profile;
  if (!profile || !profile.depletedNodes) return;

  const readyIds = getReadyRegenNodeIds(
    profile,
    engine.mapResource.mapData.spawns,
    engine.mapResource.forestMetadata.landmarks,
    now
  );

  if (readyIds.length === 0) return;

  const nodesToRegenerate: string[] = [];

  for (const nodeId of readyIds) {
    const spawn = engine.mapResource.mapData.spawns.find((s: any) => s.id === nodeId);
    if (!spawn) {
      nodesToRegenerate.push(nodeId);
      continue;
    }

    // Occupied check: is any ECS entity currently standing on this tile?
    const isOccupied = world.entities.some((e) => {
      if (!e.position) return false;
      const ex = Math.round(e.position.x / TILE);
      const ey = Math.round(e.position.y / TILE);
      return ex === spawn.x && ey === spawn.y;
    });

    if (isOccupied) {
      // Delay regeneration for occupied tiles to next check
      continue;
    }

    // Spawn the resource node back
    spawnResourceEntity(
      spawn.id,
      spawn.x,
      spawn.y,
      spawn.gatherableId,
      engine.entityLayer,
      engine.entitySprites,
      engine.mapResource,
      engine.runtimeRegistry,
      engine.collisionOverrides
    );

    // Play spawn visual feedback particles if near player
    try {
      const player = getPlayerEntity();
      if (player && player.position) {
        const dist = Math.hypot(spawn.x * TILE - player.position.x, spawn.y * TILE - player.position.y);
        if (dist < 1000) {
          // Burst of green/ambient dust particles
          for (let i = 0; i < 15; i++) {
            const g = new Graphics();
            g.circle(0, 0, 2).fill(0x55aa66);
            g.x = spawn.x * TILE + TILE / 2 + (Math.random() - 0.5) * 24;
            g.y = spawn.y * TILE + TILE / 2 + (Math.random() - 0.5) * 24;
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 40;
            engine.vfxResource.particles.push({
              graphic: g,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 15,
              gravity: 60,
              life: 0,
              maxLife: 0.7 + Math.random() * 0.5,
            });
            engine.entityLayer.addChild(g);
          }
        }
      }
    } catch (e) {
      // Core visual feedback failsafe
    }

    nodesToRegenerate.push(nodeId);
  }

  if (nodesToRegenerate.length > 0) {
    void dispatchRpgCommand({ type: "regenerateNodes", nodeIds: nodesToRegenerate }).then((r) => {
      if (r.ok) {
        applyRpgState(r.data.playerState);
      }
    });
  }
}
