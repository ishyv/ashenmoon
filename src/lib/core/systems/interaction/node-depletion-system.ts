import { AnimatedSprite, Container, Graphics, Sprite, type Texture } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { type VFXResource, spawnEnvFloatingText, triggerCameraShake } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { Colors } from "$lib/utils/colors";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { GameEvent } from "$lib/domain/game-events";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import {
  createTreeFallHazard,
  fallDirectionAwayFromPlayer,
  isPointInTreeFallZone,
} from "$lib/domain/hazards/tree-fall-hazard";
import { emitPlayerHpDelta } from "$lib/ui/player-feedback.svelte";
import { applyWound } from "$lib/state/rpg/wounds.svelte";

export function depleteNodeSystem(
  world: World<Entity>,
  entity: Entity,
  clearCurrentTarget: (entity: Entity) => void,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  triggerQuestEvent: (evt: string, val?: string) => void,
  getTreeFrames: () => Texture[],
  getStumpTexture: () => Texture,
  map?: MapResource,
): void {
  const pos = entity.position!;
  const gx = Math.round(pos.x / TILE);
  const gy = Math.round(pos.y / TILE);
  if (map) {
    const key = `${gx},${gy}`;
    map.solidCoords.delete(key);
    map.customSolids.delete(key);
  }
  const gatherable = entity.resource?.gatherableId ? getGatherableDefinition(entity.resource.gatherableId) : undefined;
  const wasTree = gatherable?.solidKind === "tree";
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

    const fallFrames = getTreeFrames().slice(1);
    const fallingSprite = new AnimatedSprite(fallFrames);
    fallingSprite.anchor.set(0.5, 1);
    fallingSprite.x = gx * TILE + TILE / 2;
    fallingSprite.y = gy * TILE + TILE;
    fallingSprite.scale.set((TILE * 1.5) / 256);
    fallingSprite.loop = false;
    fallingSprite.animationSpeed = 0.16;

    const angles = {
      north: Math.PI,
      south: 0,
      east: Math.PI / 2,
      west: -Math.PI / 2,
    };
    fallingSprite.rotation = angles[hazard.direction];

    fallingSprite.onComplete = () => {
      const stump = new Sprite(getStumpTexture());
      stump.anchor.set(0.5, 1);
      stump.x = gx * TILE + TILE / 2;
      stump.y = gy * TILE + TILE;
      stump.width = TILE * 0.8;
      stump.height = TILE * 0.8;
      entityLayer.addChild(stump);

      entityLayer.removeChild(fallingSprite);
      fallingSprite.destroy();
    };

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
      entityLayer.addChild(fallingSprite);
      fallingSprite.play();
    }, hazard.dodgeWindowSec * 1000);
  } else {
    playSound("node.deplete", { position: { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 } });
  }
}
