import { Container, Sprite } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
} from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { Cell } from "$lib/core/types";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { createCampfireState } from "$lib/domain/camp/camp-state";
import { CollisionFootprints, computeRenderZ, resolveCollisionAabb } from "$lib/domain/collision";
import {
  isValidBuildingPlacement,
  type BuildingPlacementContext,
} from "$lib/domain/building";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { GameEvent } from "$lib/domain/game-events";
import { syncBuild } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";

export class BuildingResource {
  public isPlacementMode = false;
  public currentPlacementType: string | null = null;
  public previewSprite: Sprite | null = null;
  public onPlacementCancelCb?: () => void;
  public onPlacementCompleteCb?: () => void;
}

function placementContext(map: MapResource, playerPos: { x: number; y: number }): BuildingPlacementContext {
  const waterTiles = new Set<string>();
  for (let y = 0; y < map.mapH; y++) {
    for (let x = 0; x < map.mapW; x++) {
      if (map.cells[y * map.mapW + x] === Cell.Water) {
        waterTiles.add(coordKey(x, y));
      }
    }
  }

  const spawnX = Math.floor(map.mapW / 2);
  const spawnY = Math.floor(map.mapH / 2);

  return {
    mapW: map.mapW,
    mapH: map.mapH,
    blockedTiles: map.solidCoords,
    waterTiles,
    reservedTiles: new Set([coordKey(spawnX + 2, spawnY - 1)]),
    playerTile: {
      x: Math.floor(playerPos.x / TILE),
      y: Math.floor(playerPos.y / TILE),
    },
    maxDistanceTiles: 4.5,
  };
}

export function isValidPlacement(
  mx: number,
  my: number,
  type: string,
  map: MapResource,
  playerPos: { x: number; y: number },
): boolean {
  return isValidBuildingPlacement(mx, my, type, placementContext(map, playerPos));
}

export function spawnBuildingSystem(
  id: string,
  type: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getBuildingTexture: (color: any, name: any) => any,
): void {
  const ex = gx * TILE;
  const ey = gy * TILE;

  const spec = getBuildingSpec(type);
  const { w, h } = spec.footprint;

  const station = spec.stationId ? { stationId: spec.stationId } : undefined;
  const campfire = spec.stationId === "campfire" ? createCampfireState({ isLit: false }) : undefined;
  const interactable = spec.stationId
    ? { name: spec.displayName, action: "process" as const }
    : type === "crude_shelter" || type === "marker_sign"
      ? { name: spec.displayName, action: "process" as const }
      : undefined;

  world.add({
    id,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    collider: { isSolid: true },
    ...(station ? { station } : {}),
    ...(campfire ? { campfire } : {}),
    ...(interactable ? { interactable } : {}),
  });

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      map.solidCoords.add(coordKey(gx + dx, gy + dy));
      map.customSolids.set(
        coordKey(gx + dx, gy + dy),
        resolveCollisionAabb({ x: (gx + dx) * TILE, y: (gy + dy) * TILE }, CollisionFootprints.building, TILE),
      );
    }
  }

  const tex = getBuildingTexture("yellow", spec.textureType);

  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 1);
  sprite.x = (gx + w / 2) * TILE;
  sprite.y = (gy + h) * TILE;
  sprite.width = spec.sprite.w * TILE;
  sprite.height = spec.sprite.h * TILE;
  sprite.zIndex = computeRenderZ(sprite.y);

  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

export async function placeBuildingSystem(
  type: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getBuildingTexture: (color: any, name: any) => any,
  triggerQuestEvent: (evt: string, val?: any) => void,
  cancelPlacement: () => void,
  onCompleteCb: (() => void) | undefined,
): Promise<void> {
  const result = await syncBuild(type, gx, gy);
  const player = getPlayerEntity();

  if (!result.ok) {
    spawnEnvFloatingText(
      vfx,
      `build failed: ${result.error || "unknown error"}`,
      Colors.ui.error,
      player.position!,
      entityLayer,
    );
    return;
  }

  applyRpgState(result.data);

  const id = result.data.profile.buildings?.at(-1)?.id ?? `building_${type}_${Date.now()}`;
  spawnBuildingSystem(id, type, gx, gy, world, map, entityLayer, entitySprites, getBuildingTexture);

  playSound("build.place");
  spawnEnvFloatingText(vfx, "constructed", Colors.building.success, player.position!, entityLayer);
  spawnEnvParticles(vfx, Colors.building.particle, 15, "smoke", player.position!, entityLayer);

  triggerQuestEvent(GameEvent.Build, type);

  cancelPlacement();
  onCompleteCb?.();
}

export function updatePlacementPreviewSystem(
  inputs: InputResource,
  building: BuildingResource,
  map: MapResource,
  playerPos: { x: number; y: number },
): void {
  if (!building.isPlacementMode || !building.currentPlacementType || !building.previewSprite) {
    return;
  }

  const type = building.currentPlacementType;
  const mx = Math.floor(inputs.mouseWorld.x / TILE);
  const my = Math.floor(inputs.mouseWorld.y / TILE);

  const { w, h } = getBuildingSpec(type).footprint;

  building.previewSprite.x = (mx + w / 2) * TILE;
  building.previewSprite.y = (my + h) * TILE;

  const valid = isValidPlacement(mx, my, type, map, playerPos);
  building.previewSprite.tint = valid ? Colors.building.validPlace : Colors.building.invalidPlace;
}
