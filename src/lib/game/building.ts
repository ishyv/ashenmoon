import { Container, Sprite } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "./ecs-miniplex";
import type { InputResource } from "./input";
import { TILE, type MapResource } from "./map";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
} from "./vfx";
import { playCraftSound } from "./audio-synthesis";
import { setRpgState } from "./rpg-state.svelte";
import { Cell } from "./types";
import { Colors } from "./colors";
import { coordKey } from "./coord-utils";
import { getBuildingSpec } from "./building-specs";
import { getPlayerEntity } from "./entity-queries";
import { GameEvent } from "./game-events";
import { syncBuild } from "./persistence";

export class BuildingResource {
  public isPlacementMode = false;
  public currentPlacementType: string | null = null;
  public previewSprite: Sprite | null = null;
  public onPlacementCancelCb?: () => void;
  public onPlacementCompleteCb?: () => void;
}

/**
 * Validates if a building footprint is clear, within range, and not on water.
 */
export function isValidPlacement(
  mx: number,
  my: number,
  type: string,
  map: MapResource,
  playerPos: { x: number; y: number }
): boolean {
  const { w, h } = getBuildingSpec(type).footprint;

  if (mx < 0 || mx + w > map.mapW || my < 0 || my + h > map.mapH) return false;

  const px = Math.floor((playerPos.x + TILE / 2) / TILE);
  const py = Math.floor((playerPos.y + TILE / 2) / TILE);

  const cx = mx + w / 2;
  const cy = my + h / 2;
  const dist = Math.max(Math.abs(cx - (px + 0.5)), Math.abs(cy - (py + 0.5)));
  if (dist > 4.5) return false;

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = mx + dx;
      const ty = my + dy;
      const cellIdx = ty * map.mapW + tx;
      if (map.cells[cellIdx] === Cell.Water) return false;
      if (map.solidCoords.has(coordKey(tx, ty))) return false;

      const ptx = Math.floor(playerPos.x / TILE);
      const pty = Math.floor(playerPos.y / TILE);
      if (tx === ptx && ty === pty) return false;

      const spawnX = Math.floor(map.mapW / 2);
      const spawnY = Math.floor(map.mapH / 2);
      if (tx === spawnX + 2 && ty === spawnY - 1) return false; // NPC Vane coordinate
    }
  }
  return true;
}

/**
 * Spawns the visual structure entity and registers its solids.
 */
export function spawnBuildingSystem(
  id: string,
  type: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getBuildingTexture: (color: any, name: any) => any
): void {
  const ex = gx * TILE;
  const ey = gy * TILE;

  const spec = getBuildingSpec(type);
  const { w, h } = spec.footprint;

  world.add({
    id,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    collider: { isSolid: true },
  });

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      map.solidCoords.add(coordKey(gx + dx, gy + dy));
    }
  }

  const tex = getBuildingTexture("yellow", spec.textureType);

  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5, 1);
  sprite.x = (gx + w / 2) * TILE;
  sprite.y = (gy + h) * TILE;
  sprite.width = spec.sprite.w * TILE;
  sprite.height = spec.sprite.h * TILE;

  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

/**
 * Calls the backend to place the building and deduct resources.
 */
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
  onCompleteCb: (() => void) | undefined
): Promise<void> {
  const result = await syncBuild(type, gx, gy);
  const player = getPlayerEntity();

  if (!result.ok) {
    spawnEnvFloatingText(
      vfx,
      `❌ ${result.error || "Build failed"}`,
      Colors.ui.error,
      player.position!,
      entityLayer
    );
    return;
  }

  setRpgState(result.data);

  const id = `building_${type}_${Date.now()}`;
  spawnBuildingSystem(id, type, gx, gy, world, map, entityLayer, entitySprites, getBuildingTexture);

  playCraftSound();
  spawnEnvFloatingText(vfx, "🔨 Constructed!", Colors.building.success, player.position!, entityLayer);
  spawnEnvParticles(vfx, Colors.building.particle, 15, "smoke", player.position!, entityLayer);

  triggerQuestEvent(GameEvent.Build, type);

  cancelPlacement();
  onCompleteCb?.();
}

/**
 * Updates placement mode preview positions and validates current footprints on mouse move.
 */
export function updatePlacementPreviewSystem(
  inputs: InputResource,
  building: BuildingResource,
  map: MapResource,
  playerPos: { x: number; y: number }
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
