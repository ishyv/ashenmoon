import { Container, Sprite, AnimatedSprite, Texture } from "pixi.js";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { Cell } from "$lib/core/types";
import { computeRenderZ } from "$lib/domain/collision";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { getPrefabDefinition } from "$lib/domain/definition-registry";
import { composeEntityFromPrefab } from "$lib/core/runtime/prefabs";
import { createGatherableRenderSprite } from "$lib/core/systems/gatherable-render-adapter";
import { spawnBuildingSystem } from "$lib/core/systems/building/building-system";
import type { UnitColor } from "$lib/core/assets/assets";
import {
  createActorStandee,
  createStandeeShadow,
  getAshenmoonActorFrames,
  getAshenmoonItemIconKeyForItemId,
  getAshenmoonItemIconTexture,
  getAshenmoonLandmarkKeyForKind,
  getAshenmoonLandmarkTexture,
  getAshenmoonPropTexture,
} from "$lib/core/assets/ashenmoon-assets";
import { getItemDef } from "$lib/domain/items/item-definitions";
import { resolveItemVisuals } from "$lib/domain/items/item-visuals";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";
import { EntityId, GameEvent } from "$lib/domain/game-events";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import { createLitCampfireState } from "$lib/core/systems/camp/campfire-runtime-system";
import { syncCampfireEmitters } from "$lib/core/systems/environment/environment-signal-system";
import { CollisionFootprints, resolveCollisionAabb, type CollisionFootprint } from "$lib/domain/collision";
import { coordKey } from "$lib/utils/coord-utils";
import type { InteractionResource } from "$lib/core/systems/interaction/interaction-system";
import type { RuntimeRegistry } from "$lib/core/runtime/runtime";
import { makeEnemyEntity, GRUNT, type EnemyArchetype } from "$lib/core/systems/enemy-ai/enemy-ai";
import { createAnimalSprite } from "$lib/core/systems/animals/animal-rendering";
import { ANIMAL_DEFINITIONS, type AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { LANDMARK_DEFS, type LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";

function getBiomeScaling(cellType: Cell): { mult: number; level: number } {
  switch (cellType) {
    case Cell.CrimsonGrove:
      return { mult: 1.8, level: Math.floor(Math.random() * 4) + 4 };
    case Cell.FungalMire:
    case Cell.Frostbane:
      return { mult: 3.0, level: Math.floor(Math.random() * 5) + 8 };
    case Cell.ScorchedWastes:
      return { mult: 5.0, level: Math.floor(Math.random() * 6) + 13 };
    case Cell.Camp:
    case Cell.Meadows:
    default:
      return { mult: 1.0, level: Math.floor(Math.random() * 3) + 1 };
  }
}

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

  const cellType = map.cells[gy * map.mapW + gx] ?? Cell.Meadows;
  const scaling = getBiomeScaling(cellType);
  const hp = Math.round(arch.maxHp * scaling.mult);
  const dmg = Math.round(arch.damage * scaling.mult);
  const xp = Math.round(arch.xpReward * scaling.mult);

  const enemyEntity = makeEnemyEntity(id, ex, ey, {
    ...arch,
    maxHp: hp,
    damage: dmg,
    xpReward: xp,
  });
  enemyEntity.interactable = { name: `Wolf (Lvl ${scaling.level})`, action: "examine" };

  world.add(enemyEntity);
  enemyColors.set(id, arch.color);

  const shadow = createStandeeShadow(0.62);
  shadow.x = ex + TILE / 2;
  shadow.y = ey + TILE - 4;
  shadow.zIndex = computeRenderZ(shadow.y, -5);
  entityLayer.addChild(shadow);

  const sprite = createActorStandee("wolf", TILE * 1.3);
  sprite.animationSpeed = ENGINE_CONFIG.NPC_VISUALS.ANIM_SPEED;
  sprite.play();
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

  const cellType = map.cells[gy * map.mapW + gx] ?? Cell.Meadows;
  const scaling = getBiomeScaling(cellType);
  const hp = Math.round(def.maxHealth * scaling.mult);
  const xp = Math.round(def.xpReward * scaling.mult);
  const dmg = def.damage !== undefined ? Math.round(def.damage * scaling.mult) : undefined;

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
      facingX: 1,
      animState: "idle",
      awarenessLevel: "unaware",
      awarenessDecaySec: 0,
      ...(dmg !== undefined ? { damage: dmg } : {}),
    },
    mover: { speed: def.moveSpeed },
    knockback: { vx: 0, vy: 0, timer: 0 },
    health: { current: hp, max: hp, faction: "hostile", invulnTimer: 0 },
    loot: { xpReward: xp },
    interactable: { name: `${def.name} (Lvl ${scaling.level})`, action: "examine" },
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
): { campfireGlow: Sprite; campfireSprite: AnimatedSprite } {
  // Campfire entity
  const campfireContainer = new Container();
  campfireContainer.x = startX + TILE / 2;
  campfireContainer.y = startY + TILE / 2;
  campfireContainer.zIndex = computeRenderZ(startY + TILE * ENGINE_CONFIG.CAMPFIRE_VISUALS.Z_OFFSET_TILES);

  // Add warm campfire light glow behind logs
  const campfireGlow = new Sprite(lightTexture);
  campfireGlow.anchor.set(0.5);
  campfireGlow.blendMode = "add";
  campfireGlow.alpha = 0.5;
  campfireGlow.scale.set(1.5);
  campfireContainer.addChild(campfireGlow);

  const fireFrames = [getAshenmoonPropTexture("firepitLit"), getAshenmoonPropTexture("firepitLit")];
  const campfire = new AnimatedSprite(fireFrames);
  campfire.animationSpeed = ENGINE_CONFIG.CAMPFIRE_VISUALS.FIRE_ANIM_SPEED;
  campfire.play();
  campfire.anchor.set(0.5, 0.72);
  const campfireScale = resolveWorldVisualScale({
    spec: { widthTiles: 1.45 },
    texture: campfire.texture,
    tilePx: TILE,
  });
  campfire.scale.set(campfireScale.x, campfireScale.y);
  campfireContainer.addChild(campfire);

  entityLayer.addChild(campfireContainer);
  interaction.campfireSprite = campfire;
  entitySprites.set(EntityId.Campfire, campfireContainer);

  const campfireEntity: Entity = {
    id: EntityId.Campfire,
    position: { x: startX, y: startY, targetX: startX, targetY: startY },
    interactable: { name: "Campfire", action: "refuel" },
    collider: { isSolid: true },
    station: { stationId: "campfire" },
    campfire: createLitCampfireState(90_000),
    emitter: [],
  };
  syncCampfireEmitters(campfireEntity);
  world.add(campfireEntity);
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

  const vaneShadow = createStandeeShadow(ENGINE_CONFIG.ACTOR_VISUALS.HUMANOID_SHADOW_SCALE);
  vaneShadow.x = npcEx + TILE / 2;
  vaneShadow.y = npcEy + TILE - 4;
  vaneShadow.zIndex = computeRenderZ(vaneShadow.y, -5);
  entityLayer.addChild(vaneShadow);

  const vaneFrames = getAshenmoonActorFrames("vane");
  const vaneSprite = new AnimatedSprite(vaneFrames);
  vaneSprite.animationSpeed = ENGINE_CONFIG.NPC_VISUALS.ANIM_SPEED;
  vaneSprite.play();
  vaneSprite.anchor.set(0.5, 1);
  vaneSprite.x = npcEx + TILE / 2;
  vaneSprite.y = npcEy + TILE;
  vaneSprite.zIndex = computeRenderZ(vaneSprite.y);
  vaneSprite.scale.set((TILE * ENGINE_CONFIG.ACTOR_VISUALS.HUMANOID_HEIGHT_TILES) / vaneSprite.texture.height);
  entityLayer.addChild(vaneSprite);
  entitySprites.set(EntityId.NpcVane, vaneSprite);

  return { campfireGlow, campfireSprite: campfire };
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

  const sprite = new Sprite(getAshenmoonItemTexture(itemId));
  sprite.anchor.set(0.5, 1);
  sprite.x = px + TILE / 2;
  sprite.y = py + TILE;
  const scale = resolveWorldVisualScale({
    spec: resolveItemVisuals(def).ground,
    texture: sprite.texture,
    tilePx: TILE,
  });
  sprite.scale.set(scale.x, scale.y);
  sprite.zIndex = computeRenderZ(sprite.y);
  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

interface LandmarkVisual {
  readonly texture: Texture;
  readonly heightTiles: number;
}

function getAshenmoonItemTexture(itemId: string): Texture {
  const firstPartyKey = getAshenmoonItemIconKeyForItemId(itemId);
  return firstPartyKey ? getAshenmoonItemIconTexture(firstPartyKey) : getAshenmoonItemIconTexture("stick");
}

function getLandmarkVisual(kind: LandmarkKind): LandmarkVisual | null {
  const firstPartyKey = getAshenmoonLandmarkKeyForKind(kind);
  if (firstPartyKey) {
    const heightTilesByKind: Partial<Record<LandmarkKind, number>> = {
      huge_dead_tree: 2.25,
      ruined_watch_post: 1.55,
      wolf_den: 1.0,
      old_road: 0.5,
      burned_cart: 1.15,
      fallen_tree: 1.1,
      old_stump: 0.85,
      pond: 0.9,
      river_crossing: 0.65,
      deer_grazing_area: 0.65,
      sentry_chest: 1.0,
      skeleton_remains: 0.85,
      cursed_monolith: 1.85,
      bone_pile: 0.9,
    };
    return { texture: getAshenmoonLandmarkTexture(firstPartyKey), heightTiles: heightTilesByKind[kind] ?? 1.0 };
  }

  return null;
}

let landmarkSeq = 0;

/** Spawns a landmark entity at the given tile position. */
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

  const visual = getLandmarkVisual(kind);
  if (visual) {
    const sprite = new Sprite(visual.texture);
    sprite.anchor.set(0.5, 1);
    sprite.x = ex + TILE / 2;
    sprite.y = ey + TILE;
    const scale = resolveWorldVisualScale({
      spec: { heightTiles: visual.heightTiles },
      texture: visual.texture,
      tilePx: TILE,
    });
    sprite.scale.set(scale.x, scale.y);
    sprite.zIndex = computeRenderZ(sprite.y);
    entityLayer.addChild(sprite);
    entitySprites.set(entityId, sprite);
  }
  // Terrain-marker kinds (null texture): entity exists and is examineable, no visual added.
}
