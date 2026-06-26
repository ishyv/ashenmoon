import { Container, Graphics, Sprite, Texture, TilingSprite } from "pixi.js";
import { Cell, type AABB } from "$lib/core/types";
import { computeRenderZ } from "$lib/domain/collision";
import { SeededNoise } from "$lib/utils/noise";
import {
  createEmptyForestMetadata,
  FIRST_CAMP_RELATIVE_LAYOUT,
  materializeFirstCampLayout,
  type ForestAnimalZone,
  type ForestAnimalZoneKind,
  type ForestEventPoint,
  type ForestEventPointKind,
  type ForestMetadata,
  type ForestPoint,
  type ForestResourceCluster,
  type ForestResourceClusterKind,
  type ForestWaterKind,
  type ForestWaterSource,
} from "$lib/domain/worldgen/first-camp-layout";
import {
  FIRST_CAMP_DRESSING,
  isFirstCampFloorOffset,
  materializeCampDressing,
} from "$lib/domain/worldgen/camp-dressing";
import { STRUCTURE_TEMPLATES } from "$lib/domain/worldgen/structures";
import { getAshenmoonGatherableTexture, getAshenmoonPropTexture, getAshenmoonVfxTexture } from "$lib/core/assets/ashenmoon-assets";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { EntityId } from "$lib/domain/game-events";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import type { VFXResource } from "$lib/core/vfx/vfx";

export const TILE = 64;

export interface SpawnNode {
  id: string;
  x: number;
  y: number;
  gatherableId: string;
}

export type {
  ForestAnimalZone,
  ForestAnimalZoneKind,
  ForestEventPoint,
  ForestEventPointKind,
  ForestMetadata,
  ForestPoint,
  ForestResourceCluster,
  ForestResourceClusterKind,
  ForestWaterKind,
  ForestWaterSource,
};

export type SpawnAdder = (gatherableId: string, x: number, y: number, prefix?: string) => void;

export function applyFirstCampForestPass(map: MapResource, addSpawn: SpawnAdder, spawnX: number, spawnY: number): void {
  const { mapW: W, mapH: H } = map;
  const metadata = materializeFirstCampLayout(FIRST_CAMP_RELATIVE_LAYOUT, { mapW: W, mapH: H, spawnX, spawnY });
  const pond = metadata.waterSources[0];
  if (!pond) return;

  // WHY: Milestone 2 needs a guaranteed reachable water source. The procedural
  // noise can still create water elsewhere, but this pond anchors the first loop.
  for (let y = pond.y - 1; y <= pond.y + 1; y++) {
    for (let x = pond.x - 1; x <= pond.x + 1; x++) {
      const idx = y * W + x;
      if (idx >= 0 && idx < map.cells.length) {
        map.cells[idx] = Cell.Water;
        map.solidCoords.add(coordKey(x, y));
      }
    }
  }

  map.forestMetadata.waterSources.push(...metadata.waterSources);
  map.forestMetadata.resourceClusters.push(...metadata.resourceClusters);
  map.forestMetadata.animalZones.push(...metadata.animalZones);
  map.forestMetadata.landmarks.push(...metadata.landmarks);
  map.forestMetadata.campCandidates.push(...metadata.campCandidates);
  map.forestMetadata.eventPoints.push(...metadata.eventPoints);

  for (const spawn of FIRST_CAMP_RELATIVE_LAYOUT.guaranteedSpawns) {
    addSpawn(spawn.gatherableId, spawnX + spawn.dx, spawnY + spawn.dy, spawn.prefix);
  }
}

function applyRandomStructuresPass(
  map: MapResource,
  addSpawn: SpawnAdder,
  spawnX: number,
  spawnY: number,
  noiseGen: SeededNoise,
): void {
  const { mapW: W, mapH: H } = map;
  const SPACING = 20;
  const SEPARATION = 4;
  const numCellsX = Math.floor(W / SPACING);
  const numCellsY = Math.floor(H / SPACING);

  const occupiedFootprints = new Set<string>();

  const isOccupied = (x: number, y: number) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return true;
    if (occupiedFootprints.has(coordKey(x, y))) return true;
    if (map.cells[y * W + x] === Cell.Water) return true;
    if (isFirstCampFloorOffset(x - spawnX, y - spawnY)) return true;
    const dx = x - spawnX;
    const dy = y - spawnY;
    if (Math.hypot(dx, dy) < 15) return true;
    return false;
  };

  for (let cy = 0; cy < numCellsY; cy++) {
    for (let cx = 0; cx < numCellsX; cx++) {
      const structureNoise = noiseGen.noise(cx * 41.7 + 13.9, cy * 53.1 + 29.3);
      if (structureNoise > 0.45) continue;

      const structureIdx = Math.floor((structureNoise / 0.45) * STRUCTURE_TEMPLATES.length);
      const template = STRUCTURE_TEMPLATES[structureIdx];
      if (!template) continue;

      const minX = cx * SPACING + SEPARATION;
      const maxX = (cx + 1) * SPACING - SEPARATION - template.width;
      const minY = cy * SPACING + SEPARATION;
      const maxY = (cy + 1) * SPACING - SEPARATION - template.height;

      if (minX >= maxX || minY >= maxY) continue;

      const randomXNoise = noiseGen.noise(cx * 89.3 + cy * 17.4, 91.2);
      const randomYNoise = noiseGen.noise(cx * 33.1, cy * 79.5 + 47.1);

      const gx = minX + Math.floor(randomXNoise * (maxX - minX));
      const gy = minY + Math.floor(randomYNoise * (maxY - minY));

      let fits = true;
      const cxx = gx + Math.floor(template.width / 2);
      const cyy = gy + Math.floor(template.height / 2);

      const centerCell = map.cells[cyy * W + cxx];
      if (centerCell === undefined || !template.allowedBiomes.includes(centerCell)) {
        fits = false;
      }

      for (let dy = 0; dy < template.height; dy++) {
        for (let dx = 0; dx < template.width; dx++) {
          const tx = gx + dx;
          const ty = gy + dy;
          if (isOccupied(tx, ty)) {
            fits = false;
            break;
          }
        }
        if (!fits) break;
      }

      if (!fits) continue;

      for (const comp of template.components) {
        const tx = cxx + comp.dx;
        const ty = cyy + comp.dy;
        if (tx < 0 || tx >= W || ty < 0 || ty >= H) continue;

        occupiedFootprints.add(coordKey(tx, ty));

        if (comp.cellOverride !== undefined) {
          map.cells[ty * W + tx] = comp.cellOverride;
          if (comp.cellOverride === Cell.Water) {
            map.solidCoords.add(coordKey(tx, ty));
          }
        }

        if (comp.gatherableId) {
          addSpawn(comp.gatherableId, tx, ty, `struct_${template.id}`);
        }

        if (comp.landmarkKind) {
          map.forestMetadata.landmarks.push({
            kind: comp.landmarkKind,
            label: comp.landmarkKind.replace(/_/g, " "),
            x: tx,
            y: ty,
          });
        }

        if (comp.animalZoneKind) {
          map.forestMetadata.animalZones.push({
            kind: comp.animalZoneKind,
            x: tx,
            y: ty,
            radiusTiles: comp.animalZoneRadius ?? 3,
          });
        }
      }
    }
  }
}

export class MapResource {
  public mapW = 100;
  public mapH = 100;
  public cells: Cell[] = [];
  public tileSprites: TilingSprite[] = [];
  public solidCoords = new Set<string>();
  public customSolids = new Map<string, AABB>();
  public lastCullKey = "";
  public mapData: { spawns: SpawnNode[] } = { spawns: [] };
  public forestMetadata: ForestMetadata = createEmptyForestMetadata();

  public inBounds(gx: number, gy: number): boolean {
    return gx >= 0 && gy >= 0 && gx < this.mapW && gy < this.mapH;
  }
}

/**
 * Builds the world map layout and deterministically computes cell types
 * and resource node spawns.
 */
export function buildMapSystem(map: MapResource, seed = 12345, options?: { carveCamp?: boolean | undefined }): void {
  const { mapW: W, mapH: H } = map;
  map.cells = [];
  map.solidCoords.clear();
  map.customSolids.clear();
  map.mapData = { spawns: [] };
  map.forestMetadata = createEmptyForestMetadata();

  const noiseGen = new SeededNoise(seed);

  const spawnX = Math.floor(W / 2);
  const spawnY = Math.floor(H / 2);

  const spawnsList: SpawnNode[] = [];
  let devSpawnIdSeq = 1;
  const occupiedSpawns = new Set<string>();
  const addSpawn = (gatherableId: string, x: number, y: number, prefix = "node") => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const key = coordKey(x, y);
    if (occupiedSpawns.has(key)) return;
    if (map.cells[y * W + x] === Cell.Water) return;
    occupiedSpawns.add(key);
    spawnsList.push({
      id: `${prefix}_${gatherableId}_${devSpawnIdSeq++}`,
      x,
      y,
      gatherableId,
    });
  };

  const carveCamp = options?.carveCamp ?? true;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inCamp = carveCamp && isFirstCampFloorOffset(x - spawnX, y - spawnY);
      if (inCamp) {
        map.cells.push(Cell.Camp);
        continue;
      }

      const nx = (x - spawnX) * 0.08;
      const ny = (y - spawnY) * 0.08;

      const heightNoise = noiseGen.fbm(nx + 100, ny + 100, 3);
      const tempNoise = noiseGen.fbm(nx - 100, ny - 100, 2);
      const moistureNoise = noiseGen.fbm(nx + 200, ny - 200, 2);

      const dx = x - spawnX;
      const dy = y - spawnY;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);

      let height = heightNoise;
      let temp = tempNoise;
      let moisture = moistureNoise;

      if (distFromCenter < 12) {
        const t = distFromCenter / 12;
        height = height * t + 0.5 * (1 - t);
        temp = temp * t + 0.45 * (1 - t);
        moisture = moisture * t + 0.45 * (1 - t);
      }

      let cellType = Cell.Meadows;
      if (height < 0.22) {
        cellType = Cell.Water;
      } else if (temp < 0.25) {
        cellType = Cell.Frostbane;
      } else if (temp > 0.7) {
        if (moisture < 0.4) {
          cellType = Cell.ScorchedWastes;
        } else {
          cellType = Cell.FungalMire;
        }
      } else if (moisture > 0.65) {
        cellType = Cell.CrimsonGrove;
      } else {
        cellType = Cell.Meadows;
      }

      map.cells.push(cellType);

      if (cellType === Cell.Water) {
        map.solidCoords.add(coordKey(x, y));
      }

      if (cellType !== Cell.Water) {
        const cellHash = noiseGen.noise(x * 12.3 + 4.5, y * 5.6 + 7.8);
        if (cellHash < 0.055) {
          let resourceKind: "tree" | "ore" | null = null;
          if (cellType === Cell.ScorchedWastes) {
            resourceKind = "ore";
          } else {
            resourceKind = (cellHash / 0.055) < 0.6 ? "tree" : "ore";
          }

          if (resourceKind) {
            const gatherableId =
              cellType === Cell.ScorchedWastes
                ? "copper_ore_vein"
                : cellType === Cell.CrimsonGrove
                  ? resourceKind === "tree"
                    ? "crimson_ash_tree"
                    : "iron_ore_vein"
                  : cellType === Cell.FungalMire
                    ? resourceKind === "tree"
                      ? "spore_mangrove_tree"
                      : "toxic_copper_node"
                    : cellType === Cell.Frostbane
                      ? resourceKind === "tree"
                        ? "frost_pine_tree"
                        : "glacial_silver_vein"
                      : resourceKind === "tree"
                        ? "oak_tree"
                        : "stone_node";
            addSpawn(gatherableId, x, y);
          }
        }
      }
    }
  }

  applyRandomStructuresPass(map, addSpawn, spawnX, spawnY, noiseGen);
  applyFirstCampForestPass(map, addSpawn, spawnX, spawnY);

  // Scattered bare-hand materials around spawn.
  const pickupCounts: Record<string, number> = {
    stick_pickup: 0,
    loose_stone_pickup: 0,
    flint_shard_pickup: 0,
    leaf_litter: 0,
    bark_strip: 0,
    grass_patch: 0,
    moss_patch: 0,
    berry_bush: 0,
    mushroom_patch: 0,
    clay_deposit: 0,
    water_source: 0,
  };
  const pickupTargets: Record<string, number> = {
    stick_pickup: 10,
    loose_stone_pickup: 8,
    flint_shard_pickup: 5,
    leaf_litter: 8,
    bark_strip: 6,
    grass_patch: 8,
    moss_patch: 5,
    berry_bush: 5,
    mushroom_patch: 5,
    clay_deposit: 0,
    water_source: 0,
  };
  const pickupKinds = Object.keys(pickupTargets);
  const hasNeededPickups = () => pickupKinds.some((kind) => (pickupCounts[kind] ?? 0) < (pickupTargets[kind] ?? 0));

  for (let r = 3; r < 14 && hasNeededPickups(); r++) {
    for (let theta = 0; theta < 360; theta += 15) {
      const rad = (theta * Math.PI) / 180;
      const x = Math.round(spawnX + r * Math.cos(rad));
      const y = Math.round(spawnY + r * Math.sin(rad));
      if (x < 0 || x >= W || y < 0 || y >= H) continue;

      const cellIdx = y * W + x;
      if (map.cells[cellIdx] === Cell.Meadows) {
        const alreadySpawned = spawnsList.some((s) => s.x === x && s.y === y);
        if (alreadySpawned) continue;

        const hash = noiseGen.noise(x * 17.1 + 8.3, y * 9.2 + 2.7);
        const normalizedHash = Math.abs(hash % 1);
        const gatherableId = pickupKinds[Math.floor(normalizedHash * pickupKinds.length)] ?? "stick_pickup";
        if ((pickupCounts[gatherableId] ?? 0) < (pickupTargets[gatherableId] ?? 0)) {
          addSpawn(gatherableId, x, y, "pickup");
          pickupCounts[gatherableId] = (pickupCounts[gatherableId] ?? 0) + 1;
        }
      }
    }
  }

  // Clustered local debris near trees and ores
  applyLocalResourceDebrisPass(map, addSpawn, occupiedSpawns, spawnsList, noiseGen);

  // Global wilderness pickups
  applyGlobalWildernessPickupsPass(map, addSpawn, occupiedSpawns, noiseGen);

  map.mapData = { spawns: spawnsList };
}

/**
 * Draws the ground cells as tiling Biome Sprites.
 */
export function drawTerrainSystem(map: MapResource, tileLayer: Container): void {
  const { mapW: W, mapH: H } = map;
  map.tileSprites = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = map.cells[y * W + x]!;
      const px = x * TILE;
      const py = y * TILE;

      if (cell === Cell.Camp) {
        const hash = (x * 928371 + y * 689287) & 0xffff;
        const base = hash % 3 === 0
          ? Colors.world.campDryGrass
          : hash % 3 === 1
            ? Colors.world.campPath
            : Colors.world.camp;

        const g = new Graphics();
        g.rect(px, py, TILE, TILE).fill(base);

        if ((hash & 3) === 0) {
          g.circle(px + TILE * 0.35, py + TILE * 0.42, TILE * 0.08).fill({ color: Colors.world.campAsh, alpha: 0.35 });
        }
        if ((hash & 7) === 0) {
          g.rect(px + TILE * 0.18, py + TILE * 0.68, TILE * 0.46, TILE * 0.06).fill({ color: Colors.world.campAsh, alpha: 0.22 });
        }

        tileLayer.addChild(g);
        map.tileSprites.push(null as any);
      } else if (cell === Cell.Water) {
        const hash = (x * 1103515245 + y * 12345) & 0xffff;
        const g = new Graphics();
        g.rect(px, py, TILE, TILE).fill(0x17242a);
        g.rect(px, py, TILE, TILE).fill({ color: 0x314b55, alpha: 0.32 });
        if ((hash & 3) === 0) {
          g.ellipse(px + TILE * 0.5, py + TILE * 0.5, TILE * 0.32, TILE * 0.08).stroke({ color: 0x87a9ad, width: 2, alpha: 0.28 });
        }
        if ((hash & 7) === 0) {
          g.circle(px + TILE * 0.25, py + TILE * 0.72, TILE * 0.06).fill({ color: 0x87a9ad, alpha: 0.18 });
        }
        tileLayer.addChild(g);
        map.tileSprites.push(null as any);
      } else {
        const hash = (x * 928371 + y * 689287) & 0xffff;
        const base = cell === Cell.ScorchedWastes
          ? 0x3a2318
          : cell === Cell.CrimsonGrove
            ? 0x332026
            : cell === Cell.FungalMire
              ? 0x263326
              : cell === Cell.Frostbane
                ? 0x314b55
                : 0x263326;
        const accent = cell === Cell.ScorchedWastes
          ? 0xc54f2f
          : cell === Cell.CrimsonGrove
            ? 0x8d2b35
            : cell === Cell.FungalMire
              ? 0x7b8156
              : cell === Cell.Frostbane
                ? 0x87a9ad
                : 0x7b8156;
        const g = new Graphics();
        g.rect(px, py, TILE, TILE).fill(base);
        if ((hash & 1) === 0) {
          g.circle(px + (hash % TILE), py + ((hash >> 5) % TILE), 2).fill({ color: accent, alpha: 0.18 });
        }
        if ((hash & 5) === 0) {
          g.rect(px + TILE * 0.15, py + TILE * 0.72, TILE * 0.55, 2).fill({ color: 0x080706, alpha: 0.08 });
        }
        tileLayer.addChild(g);
        map.tileSprites.push(null as any);
      }
    }
  }
}

/**
 * Cull tiles/entities that reside outside the camera frame to optimize rendering.
 */
export function cullViewportSystem(
  map: MapResource,
  playerPos: { x: number; y: number },
  zoom: number,
  screen: { width: number; height: number },
  entitySprites: Map<string, Container>
): void {
  const pgx = Math.round(playerPos.x / TILE);
  const pgy = Math.round(playerPos.y / TILE);

  const radiusX = Math.ceil(screen.width / 2 / zoom / TILE) + 1;
  const radiusY = Math.ceil(screen.height / 2 / zoom / TILE) + 1;

  const cullKey = `${pgx},${pgy},${radiusX},${radiusY}`;
  if (cullKey === map.lastCullKey) {
    return;
  }
  map.lastCullKey = cullKey;

  const minX = pgx - radiusX;
  const maxX = pgx + radiusX;
  const minY = pgy - radiusY;
  const maxY = pgy + radiusY;

  // Ground tiles
  const { mapW: W, mapH: H } = map;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      const sprite = map.tileSprites[idx];
      if (sprite) {
        sprite.visible = x >= minX && x <= maxX && y >= minY && y <= maxY;
      }
    }
  }

  // Entities culling
  for (const [id, sprite] of entitySprites.entries()) {
    if (id === EntityId.Player) continue;
    const ex = sprite.x;
    const ey = sprite.y;

    const egx = Math.round((ex - TILE / 2) / TILE);
    const egy = Math.round((ey - TILE) / TILE);

    sprite.visible = egx >= minX - 1 && egx <= maxX + 1 && egy >= minY - 1 && egy <= maxY + 1;
  }
}

/**
 * Computes climate metrics based on biome cell kind and campfire heat.
 */
export function getAmbientEnvironment(
  map: MapResource,
  gx: number,
  gy: number,
  campfireHeatRadius: number
): { temperature: number; humidity: number; toxins: number } {
  if (!map.inBounds(gx, gy)) {
    return { temperature: 20, humidity: 40, toxins: 0 };
  }

  const cellIdx = gy * map.mapW + gx;
  const cell = map.cells[cellIdx] ?? Cell.Meadows;

  let temperature = 22;
  let humidity = 45;
  let toxins = 0;

  switch (cell) {
    case Cell.Frostbane:
      temperature = -10;
      humidity = 80;
      toxins = 0;
      break;
    case Cell.ScorchedWastes:
      temperature = 50;
      humidity = 10;
      toxins = 0;
      break;
    case Cell.FungalMire:
      temperature = 35;
      humidity = 90;
      toxins = 45;
      break;
    case Cell.CrimsonGrove:
      temperature = 30;
      humidity = 70;
      toxins = 10;
      break;
    case Cell.Water:
      temperature = 18;
      humidity = 95;
      toxins = 0;
      break;
    case Cell.Camp:
    case Cell.Meadows:
    default:
      temperature = 22;
      humidity = 45;
      toxins = 0;
      break;
  }

  const spawnX = Math.floor(map.mapW / 2);
  const spawnY = Math.floor(map.mapH / 2);
  const dx = gx - spawnX;
  const dy = gy - spawnY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist <= campfireHeatRadius) {
    const intensity = 1 - dist / campfireHeatRadius;
    temperature = Math.round(temperature + intensity * 25);
    humidity = Math.max(10, Math.round(humidity - intensity * 20));
  }

  return { temperature, humidity, toxins };
}

/**
 * Scatters bushes and ambient clouds across the world.
 */
export function spawnDecorationsSystem(
  map: MapResource,
  vfx: VFXResource,
  entityLayer: Container,
): void {
  const { mapW: W, mapH: H } = map;

  spawnFirstCampWaterCues(map, entityLayer);
  spawnFirstCampDressing(map, entityLayer);

  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      const cell = map.cells[gy * W + gx];
      if (cell !== Cell.Meadows && cell !== Cell.CrimsonGrove) continue;
      if (map.solidCoords.has(coordKey(gx, gy))) continue;

      const hash = (gx * 1031 + gy * 2053) & 0xffff;
      if (hash > 0xffff * 0.06) continue;

      const variant = ((hash % 4) + 1) as 1 | 2 | 3 | 4;
      const bush = new Sprite(getAshenmoonGatherableTexture("berryBush"));
      bush.anchor.set(0.5, 1);
      bush.x = gx * TILE + TILE / 2 + ((hash >> 8) % 10) - 5;
      bush.y = gy * TILE + TILE + ((hash >> 4) % 10) - 5;
      bush.scale.set(TILE / 80);
      bush.alpha = 0.7 + (hash & 0x0f) / 60;
      entityLayer.addChild(bush);
    }
  }

  // Ambient cloud drift
  for (let i = 0; i < ENGINE_CONFIG.CLOUDS.COUNT; i++) {
    const cloud = new Sprite(getAshenmoonVfxTexture("weatherFog"));
    cloud.anchor.set(0.5, 0.5);
    cloud.x = (i / ENGINE_CONFIG.CLOUDS.COUNT) * W * TILE + Math.random() * TILE * 10;
    cloud.y = Math.random() * H * TILE;
    cloud.scale.set(0.7 + Math.random() * 0.7);
    cloud.alpha = 0.28 + Math.random() * 0.2;
    entityLayer.addChild(cloud);
    vfx.clouds.push({
      sprite: cloud,
      vx: ENGINE_CONFIG.CLOUDS.MIN_VX + Math.random() * ENGINE_CONFIG.CLOUDS.RANDOM_VX,
    });
  }
}

function addStaticCue(
  entityLayer: Container,
  texture: Texture,
  gx: number,
  gy: number,
  options: { widthTiles?: number; heightTiles?: number; anchorBottom?: boolean; alpha?: number } = {},
): void {
  const sprite = new Sprite(texture);
  if (options.anchorBottom) {
    sprite.anchor.set(0.5, 1);
    sprite.x = gx * TILE + TILE / 2;
    sprite.y = gy * TILE + TILE;
    sprite.height = (options.heightTiles ?? 1) * TILE;
    sprite.scale.x = sprite.scale.y;
  } else {
    sprite.x = gx * TILE;
    sprite.y = gy * TILE;
    sprite.width = (options.widthTiles ?? 1) * TILE;
    sprite.height = (options.heightTiles ?? 1) * TILE;
  }
  sprite.alpha = options.alpha ?? 1;
  sprite.zIndex = -10_000 + gy;
  entityLayer.addChild(sprite);
}

function spawnFirstCampDressing(map: MapResource, entityLayer: Container): void {
  const spawn = { x: Math.floor(map.mapW / 2), y: Math.floor(map.mapH / 2) };
  const props = materializeCampDressing(FIRST_CAMP_DRESSING, spawn);

  for (const prop of props) {
    const texture = prop.kind === "firepit"
      ? getAshenmoonPropTexture("firepitCold")
      : prop.kind === "wreckage"
        ? getAshenmoonPropTexture("brokenWagon")
        : prop.kind === "supply_scraps"
          ? getAshenmoonPropTexture("supplyScraps")
          : prop.kind === "trampled_path"
            ? getAshenmoonPropTexture("trampledPath")
            : getAshenmoonPropTexture("ashRing");
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);
    sprite.x = prop.x * TILE + TILE / 2;
    sprite.y = prop.y * TILE + TILE;
    sprite.scale.set((TILE * (prop.kind === "wreckage" ? 1.45 : 1.0)) / Math.max(texture.width, texture.height));
    sprite.alpha = prop.kind === "trampled_path" || prop.kind === "ash_ring" ? 0.82 : 1;
    sprite.zIndex = computeRenderZ(sprite.y, prop.kind === "trampled_path" || prop.kind === "ash_ring" ? -12 : -2);
    entityLayer.addChild(sprite);
  }
}

function spawnFirstCampWaterCues(map: MapResource, entityLayer: Container): void {
  const pond = map.forestMetadata.waterSources.find((source) => source.kind === "pond");
  if (!pond) return;

  const waterTexture = getAshenmoonGatherableTexture("reeds");
  for (let y = pond.y - 1; y <= pond.y + 1; y++) {
    for (let x = pond.x - 1; x <= pond.x + 1; x++) {
      if (!map.inBounds(x, y)) continue;
      if (map.cells[y * map.mapW + x] !== Cell.Water) continue;
      addStaticCue(entityLayer, waterTexture, x, y, { alpha: 0.82 });
    }
  }

  const reeds = getAshenmoonGatherableTexture("reeds");
  const pondPlant = getAshenmoonGatherableTexture("reeds");
  for (const cue of [
    { x: pond.x - 2, y: pond.y, texture: reeds, heightTiles: 0.85 },
    { x: pond.x + 2, y: pond.y + 1, texture: reeds, heightTiles: 0.85 },
    { x: pond.x, y: pond.y - 2, texture: pondPlant, heightTiles: 0.5 },
  ]) {
    if (!map.inBounds(cue.x, cue.y)) continue;
    addStaticCue(entityLayer, cue.texture, cue.x, cue.y, {
      anchorBottom: true,
      heightTiles: cue.heightTiles,
      alpha: 0.92,
    });
  }
}

function applyLocalResourceDebrisPass(
  map: MapResource,
  addSpawn: SpawnAdder,
  occupiedSpawns: Set<string>,
  spawnsList: SpawnNode[],
  noiseGen: SeededNoise
): void {
  const { mapW: W, mapH: H } = map;
  const originalSpawns = [...spawnsList];

  for (const spawn of originalSpawns) {
    const isTree = spawn.gatherableId.endsWith("_tree");
    const isOre = spawn.gatherableId === "stone_node" || spawn.gatherableId.includes("ore") || spawn.gatherableId.includes("node");
    if (!isTree && !isOre) continue;

    const debrisId = isTree ? "stick_pickup" : "loose_stone_pickup";
    let spawnedCount = 0;
    const maxDebris = 2;

    for (let dx = -2; dx <= 2 && spawnedCount < maxDebris; dx++) {
      for (let dy = -2; dy <= 2 && spawnedCount < maxDebris; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = spawn.x + dx;
        const ny = spawn.y + dy;
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue;

        const cellType = map.cells[ny * W + nx];
        if (cellType === Cell.Water) continue;

        const key = coordKey(nx, ny);
        if (occupiedSpawns.has(key)) continue;

        const roll = Math.abs(noiseGen.noise(nx * 14.7 + 3.1, ny * 11.2 + 9.8) % 1);
        if (roll < 0.35) {
          addSpawn(debrisId, nx, ny, "pickup");
          spawnedCount++;
        }
      }
    }
  }
}

function applyGlobalWildernessPickupsPass(
  map: MapResource,
  addSpawn: SpawnAdder,
  occupiedSpawns: Set<string>,
  noiseGen: SeededNoise
): void {
  const { mapW: W, mapH: H } = map;
  const pickupKinds = [
    "stick_pickup",
    "loose_stone_pickup",
    "flint_shard_pickup",
    "leaf_litter",
    "bark_strip",
    "grass_patch",
    "moss_patch",
    "berry_bush",
    "mushroom_patch"
  ];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const key = coordKey(x, y);
      if (occupiedSpawns.has(key)) continue;

      const cellType = map.cells[y * W + x];
      if (cellType === Cell.Water) continue;

      const roll = Math.abs(noiseGen.noise(x * 21.3 + 9.2, y * 13.6 + 4.7) % 1);
      if (roll < 0.012) {
        const typeRoll = Math.abs(noiseGen.noise(x * 5.4 + 1.1, y * 8.9 + 6.3) % 1);
        const gatherableId = pickupKinds[Math.floor(typeRoll * pickupKinds.length)] ?? "stick_pickup";
        addSpawn(gatherableId, x, y, "pickup");
      }
    }
  }
}

