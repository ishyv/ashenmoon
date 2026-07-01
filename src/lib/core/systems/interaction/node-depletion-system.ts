import { Container, Graphics } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { type VFXResource, spawnEnvFloatingText, triggerCameraShake } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { Colors } from "$lib/utils/colors";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { GameEvent } from "$lib/domain/game-events";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { Cell } from "$lib/domain/worldgen/cell";
import { createGatherableRenderSprite } from "$lib/core/systems/gatherable-render-adapter";
import {
  createTreeFallHazard,
  fallDirectionAwayFromPlayer,
  isPointInTreeFallZone,
} from "$lib/domain/hazards/tree-fall-hazard";
import { emitPlayerHpDelta } from "$lib/ui/player-feedback.svelte";
import { applyWound } from "$lib/state/rpg/wounds.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";

export function depleteNodeSystem(
  world: World<Entity>,
  entity: Entity,
  clearCurrentTarget: (entity: Entity) => void,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  triggerQuestEvent: (evt: string, val?: string) => void,
  map?: MapResource,
): void {
  void dispatchRpgCommand({ type: "depleteNode", nodeId: entity.id }).then((r) => {
    if (r.ok) {
      applyRpgState(r.data.playerState);
    }
  });
  const pos = entity.position!;
  const gx = Math.round(pos.x / TILE);
  const gy = Math.round(pos.y / TILE);
  if (map) {
    const key = `${gx},${gy}`;
    map.solidCoords.delete(key);
    map.customSolids.delete(key);
  }
  const gatherable = entity.resource?.gatherableId ? getGatherableDefinition(entity.resource.gatherableId) : undefined;
  let wasTree = gatherable?.solidKind === "tree";
  let wasRock = gatherable?.solidKind === "rock";

  // Fallbacks if gatherable could not be resolved from gatherableId
  if (!gatherable && entity.resource) {
    const dropName = entity.resource.drop;
    const displayName = entity.interactable?.name.toLowerCase() ?? "";
    if (dropName === "wood" || displayName.includes("tree")) {
      wasTree = true;
    } else if (dropName === "stone" || dropName.includes("ore") || displayName.includes("node") || displayName.includes("vein")) {
      wasRock = true;
    }
  }

  if (wasTree) {
    triggerQuestEvent(GameEvent.Harvest, entity.resource?.drop);
  }

  const sprite = entitySprites.get(entity.id);
  if (sprite) {
    entityLayer.removeChild(sprite);
    sprite.destroy();
    entitySprites.delete(entity.id);
  }
  world.remove(entity);
  vfx.activeShakes.delete(entity.id);
  vfx.baseScales.delete(entity.id);

  clearCurrentTarget(entity);

  // Spray particles
  const burstCount = 22 + Math.floor(Math.random() * 10);
  const burstColor = wasTree ? Colors.particle.treeBurst : Colors.particle.oreBurst;
  for (let i = 0; i < burstCount; i++) {
    const g = new Graphics();
    if (wasTree) {
      g.rect(-3, -2, 6, 4).fill(burstColor);
    } else {
      g.circle(0, 0, 2.5).fill(burstColor);
    }
    g.x = pos.x + TILE / 2 + (Math.random() - 0.5) * 32;
    g.y = pos.y + TILE * 0.65;
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 150;
    vfx.particles.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      gravity: 300,
      life: 0,
      maxLife: 0.55 + Math.random() * 0.4,
    });
    entityLayer.addChild(g);
  }

  // Shockwave ring
  const ringG = new Graphics();
  ringG.x = pos.x + TILE / 2;
  ringG.y = pos.y + TILE;
  entityLayer.addChild(ringG);
  vfx.shockwaveRings.push({
    graphic: ringG,
    life: 0,
    maxLife: 0.35,
    color: wasTree ? Colors.particle.treeRing : Colors.particle.oreRing,
  });

  triggerCameraShake(vfx, 5, 0.18);

  if (wasTree) {
    const player = getPlayerEntity();
    const treeCenter = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE };
    const playerCenter = player.position
      ? { x: player.position.x + TILE / 2, y: player.position.y + TILE / 2 }
      : treeCenter;
    const hazard = createTreeFallHazard(
      treeCenter,
      fallDirectionAwayFromPlayer(treeCenter, playerCenter),
    );

    spawnEnvFloatingText(vfx, "tree cracking", Colors.ui.warning, player.position ?? pos, entityLayer);
    triggerCameraShake(vfx, 2, hazard.dodgeWindowSec);

    const fallingTree = new Graphics();
    fallingTree.rect(-8, -TILE * 1.25, 16, TILE * 1.25).fill(0x34251a);
    fallingTree.rect(-17, -TILE * 1.52, 34, 28).fill(0x263326);
    fallingTree.stroke({ color: 0x080706, width: 5, alpha: 0.95 });
    fallingTree.x = gx * TILE + TILE / 2;
    fallingTree.y = gy * TILE;

    const angles = {
      north: Math.PI,
      south: 0,
      east: Math.PI / 2,
      west: -Math.PI / 2,
    };
    fallingTree.rotation = angles[hazard.direction];

    setTimeout(() => {
      playSound("node.treefall", { position: { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 } });
      const latestPlayer = getPlayerEntity();
      if (latestPlayer.position) {
        const latestCenter = {
          x: latestPlayer.position.x + TILE / 2,
          y: latestPlayer.position.y + TILE / 2,
        };
        if (isPointInTreeFallZone(latestCenter, hazard)) {
          emitPlayerHpDelta(-hazard.damage);
          applyWound({ severity: "deep_cut", contamination: 0.35, source: "hazard:tree_fall" });
          spawnEnvFloatingText(vfx, "tree hit", Colors.ui.error, latestPlayer.position, entityLayer);
        }
      }
      entityLayer.addChild(fallingTree);

      setTimeout(() => {
        const stump = new Graphics();
        stump.ellipse(0, 0, TILE * 0.28, TILE * 0.11).fill(0x34251a);
        stump.ellipse(0, 0, TILE * 0.2, TILE * 0.07).stroke({ color: 0x080706, width: 3, alpha: 0.9 });
        stump.x = gx * TILE + TILE / 2;
        stump.y = gy * TILE + TILE;
        stump.zIndex = Math.round(stump.y);
        entityLayer.addChild(stump);
        entityLayer.removeChild(fallingTree);
        fallingTree.destroy();
      }, 240);
    }, hazard.dodgeWindowSec * 1000);
  } else {
    playSound("node.deplete", { position: { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 } });
  }

  // Spawns 1 to 3 pickups (sticks/branches/leaves/resin for tree, stones for ore/stone) on depletion
  if (wasTree || wasRock) {
    const baseDropId = wasTree ? "stick_pickup" : "loose_stone_pickup";
    let spawnedCount = 0;
    const targetCount = 1 + Math.floor(Math.random() * 3); // 1 to 3 items

    const offsets = [
      { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      { dx: 1, dy: 1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
    ].sort(() => Math.random() - 0.5);

    for (const offset of offsets) {
      if (spawnedCount >= targetCount) break;
      const nx = gx + offset.dx;
      const ny = gy + offset.dy;
      if (map && !map.inBounds(nx, ny)) continue;

      const key = `${nx},${ny}`;
      if (map && map.solidCoords.has(key)) continue;

      const alreadyOccupied = world.entities.some(
        (e) => e.position && Math.round(e.position.x / TILE) === nx && Math.round(e.position.y / TILE) === ny
      );
      if (alreadyOccupied) continue;

      if (map && map.cells[ny * map.mapW + nx] === Cell.Water) continue;

      let dropId = baseDropId;
      if (wasTree) {
        if (spawnedCount === 0) {
          dropId = "stick_pickup";
        } else {
          const roll = Math.random();
          if (roll < 0.35) {
            dropId = "branch_pickup";
          } else if (roll < 0.6) {
            dropId = "green_leaves_pickup";
          } else if (roll < 0.8) {
            dropId = "leaf_litter";
          } else if (roll < 0.9) {
            dropId = "resin_pickup";
          } else {
            dropId = "stick_pickup";
          }
        }
      }

      const dropDef = getGatherableDefinition(dropId);
      if (!dropDef) continue;

      const dropName = dropDef.displayName;
      const dropItem = dropDef.yieldTable[0]?.itemId ?? (wasTree ? "stick" : "stone");
      const dropQty = dropDef.yieldTable[0]?.quantity ?? 1;

      const px = nx * TILE;
      const py = ny * TILE;
      const pickupId = `depletion_drop_${dropId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      world.add({
        id: pickupId,
        position: { x: px, y: py, targetX: px, targetY: py },
        collider: { isSolid: false },
        interactable: { name: dropName, action: "pickup" },
        pickup: { itemId: dropItem, qty: dropQty, gatherableId: dropId },
      });

      const dropSprite = createGatherableRenderSprite(dropDef, px, py);
      entityLayer.addChild(dropSprite);
      entitySprites.set(pickupId, dropSprite);

      spawnedCount++;
    }
  }
}
