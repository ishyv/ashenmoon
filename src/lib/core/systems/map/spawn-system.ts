import { Container, Graphics, Sprite, AnimatedSprite, Texture } from "pixi.js";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { getPrefabDefinition } from "$lib/domain/definition-registry";
import { composeEntityFromPrefab } from "$lib/core/runtime/prefabs";
import { createGatherableRenderSprite } from "$lib/core/systems/gatherable-render-adapter";
import { spawnBuildingSystem } from "$lib/core/systems/building/building-system";
import {
  getBuildingTexture,
  getWoodItemTexture,
  getParticleFXFrames,
  getWarriorFrames,
  getShadowTexture,
  getIconSheetTexture,
  type UnitColor,
} from "$lib/core/assets/assets";
import { getItemDef } from "$lib/domain/items/item-definitions";
import { EntityId, GameEvent } from "$lib/domain/game-events";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import { createLitCampfireState } from "$lib/core/systems/camp/campfire-runtime-system";
import { CollisionFootprints, resolveCollisionAabb, type CollisionFootprint } from "$lib/domain/collision";
import { coordKey } from "$lib/utils/coord-utils";
import type { InteractionResource } from "$lib/core/systems/interaction/interaction-system";
import type { RuntimeRegistry } from "$lib/core/runtime/runtime";
import { makeEnemyEntity, GRUNT, type EnemyArchetype } from "$lib/core/systems/enemy-ai/enemy-ai";
import { createAnimalSprite } from "$lib/core/systems/animals/animal-rendering";
import { ANIMAL_DEFINITIONS, type AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { LANDMARK_DEFS, type LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";

export function spawnEnemy(
  gx: number,
  gy: number,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  enemyColors: Map<string, UnitColor>,
  map: MapResource,
  enemySeq: number,
  arch: EnemyArchetype = GRUNT
): string | null {
  if (!map.inBounds(gx, gy)) return null;
  if (map.solidCoords.has(coordKey(gx, gy))) return null;

  const id = `enemy_${enemySeq}`;
  const ex = gx * TILE;
  const ey = gy * TILE;
  world.add(makeEnemyEntity(id, ex, ey, arch));
  enemyColors.set(id, arch.color);

  const sprite = new AnimatedSprite(getWarriorFrames("idle", arch.color));
  sprite.animationSpeed = ENGINE_CONFIG.NPC_VISUALS.ANIM_SPEED;
  sprite.play();
  sprite.anchor.set(0.5, 1);
  sprite.scale.set((TILE * ENGINE_CONFIG.NPC_VISUALS.SCALE) / 192);
  sprite.x = ex + TILE / 2;
  sprite.y = ey + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);
  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
  return id;
}

export function spawnAnimal(
  gx: number,
  gy: number,
  speciesId: AnimalSpeciesId,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  map: MapResource,
  animalSeq: number
): string | null {
  if (!map.inBounds(gx, gy)) return null;
  if (map.solidCoords.has(coordKey(gx, gy))) return null;

  const def = ANIMAL_DEFINITIONS[speciesId];
  const id = `animal_${speciesId}_${animalSeq}`;
  const ex = gx * TILE;
  const ey = gy * TILE;
  const entity: Entity = {
    id,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    animal: {
      speciesId,
      behavior: "idle",
      hunger: def.initialHunger,
      threatened: false,
      attackCooldownSec: 0,
      home: { x: ex + TILE / 2, y: ey + TILE / 2 },
      wanderTimerSec: 0,
    },
    mover: { speed: def.moveSpeed },
    knockback: { vx: 0, vy: 0, timer: 0 },
    health: { current: def.maxHealth, max: def.maxHealth, faction: "hostile", invulnTimer: 0 },
    loot: { xpReward: def.xpReward },
  };
  world.add(entity);

  const sprite = createAnimalSprite(speciesId, ex, ey);
  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
  return id;
}


export function spawnResourceEntity(
  id: string,
  gx: number,
  gy: number,
  gatherableId: string,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  map: MapResource,
  runtimeRegistry: RuntimeRegistry,
  collisionOverrides: Map<string, CollisionFootprint>
): void {
  const ex = gx * TILE;
  const ey = gy * TILE;

  const gatherable = getGatherableDefinition(gatherableId);
  if (!gatherable) return;

  const nodeName = gatherable.displayName;
  const drop = gatherable.yieldTable[0];
  const dropName = drop?.itemId ?? "stick";
  const dropQty = drop?.quantity ?? 1;
  const isPickup = gatherable.interactionKind !== "repeated_action";
  const prefab = getPrefabDefinition(gatherableId);
  
  const entity = prefab
    ? composeEntityFromPrefab(prefab, runtimeRegistry.components, { id: gatherableId, gx, gy, entityId: id })
    : null;

  if (isPickup) {
    world.add(entity ?? {
      id,
      position: { x: ex, y: ey, targetX: ex, targetY: ey },
      collider: { isSolid: false },
      interactable: { name: nodeName, action: "pickup" },
      pickup: { itemId: dropName, qty: dropQty, gatherableId },
    });
  } else {
    world.add(entity ?? {
      id,
      position: { x: ex, y: ey, targetX: ex, targetY: ey },
      collider: { isSolid: true },
      interactable: { name: nodeName, action: "gather" },
      resource: {
        hp: gatherable?.depletion?.hp ?? 15,
        maxHp: gatherable?.depletion?.hp ?? 15,
        drop: dropName,
        gatherableId,
        ...(gatherable.syncAction ? { rpgAction: gatherable.syncAction } : {}),
        ...(gatherable.syncLocationId ? { rpgLocationId: gatherable.syncLocationId } : {}),
      },
    });

    const override = collisionOverrides.get(gatherableId);
    const footprint = override ?? gatherable.collision?.footprint ?? null;
    if (gatherable.collision?.solid !== false && footprint) {
      map.solidCoords.add(coordKey(gx, gy));
      map.customSolids.set(
        coordKey(gx, gy),
        resolveCollisionAabb({ x: gx * TILE, y: gy * TILE }, footprint, TILE),
      );
    }
  }

  const sprite = createGatherableRenderSprite(gatherable, ex, ey);
  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

export function spawnCampSystem(
  spawnX: number,
  spawnY: number,
  startX: number,
  startY: number,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  interaction: InteractionResource,
  map: MapResource,
  lightTexture: Texture,
  setTileFootprint: (gx: number, gy: number, footprint: CollisionFootprint) => void
): { campfireGlow: Sprite } {
  // Campfire entity
  const campfireContainer = new Container();
  campfireContainer.x = startX + TILE / 2;
  campfireContainer.y = startY + TILE / 2;
  campfireContainer.zIndex = computeRenderZ(startY + TILE * ENGINE_CONFIG.CAMPFIRE_VISUALS.Z_OFFSET_TILES);

  const log1 = new Sprite(getWoodItemTexture());
  log1.anchor.set(0.5, 0.5);
  log1.rotation = -ENGINE_CONFIG.CAMPFIRE_VISUALS.LOG_ROTATION;
  log1.scale.set((TILE * ENGINE_CONFIG.CAMPFIRE_VISUALS.LOG_SCALE) / 64);

  const log2 = new Sprite(getWoodItemTexture());
  log2.anchor.set(0.5, 0.5);
  log2.rotation = ENGINE_CONFIG.CAMPFIRE_VISUALS.LOG_ROTATION;
  log2.scale.set((TILE * ENGINE_CONFIG.CAMPFIRE_VISUALS.LOG_SCALE) / 64);

  // Add warm campfire light glow behind logs
  const campfireGlow = new Sprite(lightTexture);
  campfireGlow.anchor.set(0.5);
  campfireGlow.blendMode = "add";
  campfireGlow.alpha = 0.5;
  campfireGlow.scale.set(1.5);
  campfireContainer.addChild(campfireGlow);

  campfireContainer.addChild(log1);
  campfireContainer.addChild(log2);

  const fireFrames = getParticleFXFrames("fire1");
  const campfire = new AnimatedSprite(fireFrames);
  campfire.animationSpeed = ENGINE_CONFIG.CAMPFIRE_VISUALS.FIRE_ANIM_SPEED;
  campfire.play();
  campfire.anchor.set(0.5, 0.75);
  campfire.scale.set((TILE * ENGINE_CONFIG.CAMPFIRE_VISUALS.FIRE_SCALE) / 48);
  campfireContainer.addChild(campfire);

  entityLayer.addChild(campfireContainer);
  interaction.campfireSprite = campfire;
  entitySprites.set(EntityId.Campfire, campfireContainer);

  world.add({
    id: EntityId.Campfire,
    position: { x: startX, y: startY, targetX: startX, targetY: startY },
    interactable: { name: "Campfire", action: "refuel" },
    collider: { isSolid: true },
    station: { stationId: "campfire" },
    campfire: createLitCampfireState(90_000),
  });
  setTileFootprint(spawnX, spawnY, CollisionFootprints.campfire);

  // NPC Vane
  const npcGx = spawnX + 2;
  const npcGy = spawnY - 1;
  const npcEx = npcGx * TILE;
  const npcEy = npcGy * TILE;

  world.add({
    id: EntityId.NpcVane,
    position: { x: npcEx, y: npcEy, targetX: npcEx, targetY: npcEy },
    interactable: { name: "Commander Vane", action: "talk" },
    collider: { isSolid: true },
  });
  setTileFootprint(npcGx, npcGy, CollisionFootprints.npc);

  const vaneFrames = getWarriorFrames("idle", "yellow");
  const vaneSprite = new AnimatedSprite(vaneFrames);
  vaneSprite.animationSpeed = ENGINE_CONFIG.NPC_VISUALS.ANIM_SPEED;
  vaneSprite.play();
  vaneSprite.anchor.set(0.5, 1);
  vaneSprite.x = npcEx + TILE / 2;
  vaneSprite.y = npcEy + TILE;
  vaneSprite.zIndex = computeRenderZ(vaneSprite.y);
  vaneSprite.scale.set((TILE * ENGINE_CONFIG.NPC_VISUALS.SCALE) / 192);
  entityLayer.addChild(vaneSprite);
  entitySprites.set(EntityId.NpcVane, vaneSprite);

  return { campfireGlow };
}

let dropSeq = 0;

/**
 * Spawns a ground pickup entity at the given pixel position.
 * Spawns a generic ground pickup entity at the given pixel position.
 */
export function spawnItemDrop(
  itemId: string,
  qty: number,
  px: number,
  py: number,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
): void {
  const id = `drop_${itemId}_${++dropSeq}`;
  const def = getItemDef(itemId);

  world.add({
    id,
    position: { x: px, y: py, targetX: px, targetY: py },
    collider: { isSolid: false },
    interactable: { name: def?.name ?? itemId, action: "pickup" },
    pickup: { itemId, qty },
  });

  const iconSheet = def?.iconSheet;
  const sprite = new Sprite(
    iconSheet
      ? getIconSheetTexture(iconSheet)
      : (def?.iconUrl
        ? Texture.from(def.iconUrl)
        : getWoodItemTexture()),
  );
  sprite.anchor.set(0.5, 1);
  sprite.x = px + TILE / 2;
  sprite.y = py + TILE;
  sprite.scale.set((TILE * 0.4) / 32);
  sprite.zIndex = computeRenderZ(sprite.y);
  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

const LANDMARK_COLORS: Partial<Record<LandmarkKind, number>> = {
  huge_dead_tree:    0x5a4a3a,
  ruined_watch_post: 0x6b5a4a,
  old_road:          0x7a6a5a,
  burned_cart:       0x3a3330,
  wolf_den:          0x4a3a2a,
  river_crossing:    0x7a7a8a,
  deer_grazing_area: 0x5a7a4a,
  fallen_tree:       0x6a5a3a,
  old_stump:         0x5a4a2a,
  pond:              0x2a4a6a,
};

let landmarkSeq = 0;

/**
 * Spawns a landmark entity at the given tile position.
 * Uses a colored Graphics rect as placeholder visual.
 */
export function spawnLandmark(
  kind: LandmarkKind,
  gx: number,
  gy: number,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  map: MapResource,
): void {
  const def = LANDMARK_DEFS[kind];
  if (!def) return;

  const ex = gx * TILE;
  const ey = gy * TILE;
  const entityId = `landmark_${kind}_${++landmarkSeq}`;

  world.add({
    id: entityId,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    ...(def.solid ? { collider: { isSolid: true } } : {}),
    interactable: { name: def.displayName, action: "examine" },
    landmark: { kind, depleted: false },
  });

  if (def.solid) {
    map.solidCoords.add(coordKey(gx, gy));
  }

  const color = LANDMARK_COLORS[kind] ?? 0x6a5a4a;
  const g = new Graphics();
  g.rect(0, 0, TILE, TILE).fill({ color, alpha: 0.85 });
  g.x = ex;
  g.y = ey;
  g.zIndex = computeRenderZ(ey + TILE);
  entityLayer.addChild(g);
  entitySprites.set(entityId, g);
}
