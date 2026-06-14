import { Container, Graphics, Sprite, TilingSprite } from "pixi.js";
import { Cell, type AABB } from "$lib/core/types";
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
  getBiomeTileTexture,
  getWaterBackgroundTexture,
  getTreeTexture,
  getRockTexture,
  getTreeVariantTexture,
  getRockVariantTexture,
  getWoodItemTexture,
  getBushTexture,
  getCloudTexture,
} from "$lib/core/assets/assets";
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

type SpawnAdder = (gatherableId: string, x: number, y: number, prefix?: string) => void;

function applyFirstCampForestPass(map: MapResource, addSpawn: SpawnAdder, spawnX: number, spawnY: number): void {
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
export function buildMapSystem(map: MapResource): void {
  const { mapW: W, mapH: H } = map;
  map.cells = [];
  map.solidCoords.clear();
  map.customSolids.clear();
  map.mapData = { spawns: [] };
  map.forestMetadata = createEmptyForestMetadata();

  const noiseGen = new SeededNoise(12345);

  const spawnX = Math.floor(W / 2);
  const spawnY = Math.floor(H / 2);
  const campX1 = spawnX - 2;
  const campX2 = spawnX + 2;
  const campY1 = spawnY - 2;
  const campY2 = spawnY + 2;

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

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inCamp = x >= campX1 && x <= campX2 && y >= campY1 && y <= campY2;
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
        const g = new Graphics();
        g.rect(px, py, TILE, TILE).fill(Colors.world.camp);
        tileLayer.addChild(g);
        map.tileSprites.push(null as any);
      } else if (cell === Cell.Water) {
        const waterTex = getWaterBackgroundTexture();
        const ts = new TilingSprite({ texture: waterTex, width: TILE, height: TILE });
        ts.x = px;
        ts.y = py;
        tileLayer.addChild(ts);
        map.tileSprites.push(ts);
      } else {
        let variant: 1 | 2 | 3 | 4 | 5 = 1;
        if (cell === Cell.ScorchedWastes) variant = 2;
        else if (cell === Cell.CrimsonGrove) variant = 3;
        else if (cell === Cell.FungalMire) variant = 4;
        else if (cell === Cell.Frostbane) variant = 5;

        const tex = getBiomeTileTexture(variant);
        const ts = new TilingSprite({ texture: tex, width: TILE, height: TILE });
        ts.x = px;
        ts.y = py;
        tileLayer.addChild(ts);
        map.tileSprites.push(ts);
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

  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      const cell = map.cells[gy * W + gx];
      if (cell !== Cell.Meadows && cell !== Cell.CrimsonGrove) continue;
      if (map.solidCoords.has(coordKey(gx, gy))) continue;

      const hash = (gx * 1031 + gy * 2053) & 0xffff;
      if (hash > 0xffff * 0.06) continue;

      const variant = ((hash % 4) + 1) as 1 | 2 | 3 | 4;
      const bush = new Sprite(getBushTexture(variant));
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
    const variant = ((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
    const cloud = new Sprite(getCloudTexture(variant));
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

