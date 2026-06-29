import { Container, Sprite, Texture, Graphics } from "pixi.js";
import type { World } from "miniplex";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
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
import { getItemDef, resolveItemVisuals } from "$lib/domain/items";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";
import { computeRenderZ } from "$lib/domain/collision";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { syncPlaceItem } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { isValidItemPlacement, type ItemPlacementContext } from "$lib/domain/items/item-placement";
import {
  getAshenmoonItemIconKeyForItemId,
  getAshenmoonItemIconTexture,
} from "$lib/core/assets/ashenmoon-assets";

export class ItemPlacementResource {
  public isPlacementMode = false;
  public currentItemId: string | null = null;
  public previewSprite: Sprite | null = null;
  public previewIndicator: Graphics | null = null;
  public onPlacementCancelCb?: (() => void) | undefined;
  public onPlacementCompleteCb?: (() => void) | undefined;
}

export function getItemTexture(itemId: string): Texture {
  const firstPartyKey = getAshenmoonItemIconKeyForItemId(itemId);
  return getAshenmoonItemIconTexture(firstPartyKey ?? "stick");
}

export function applyGroundItemVisualScale(sprite: Sprite, itemId: string): void {
  const scale = resolveWorldVisualScale({
    spec: resolveItemVisuals(getItemDef(itemId)).ground,
    texture: sprite.texture,
    tilePx: TILE,
  });
  sprite.scale.set(scale.x, scale.y);
}

function itemPlacementContext(map: MapResource, playerPos: { x: number; y: number }): ItemPlacementContext {
  const waterTiles = new Set<string>();
  for (let y = 0; y < map.mapH; y++) {
    for (let x = 0; x < map.mapW; x++) {
      if (map.cells[y * map.mapW + x] === Cell.Water) {
        waterTiles.add(coordKey(x, y));
      }
    }
  }

  return {
    mapW: map.mapW,
    mapH: map.mapH,
    blockedTiles: map.solidCoords,
    waterTiles,
    playerTile: {
      x: Math.floor(playerPos.x / TILE),
      y: Math.floor(playerPos.y / TILE),
    },
    maxDistanceTiles: 4.5,
  };
}

export function isValidItemPlacementGrid(
  mx: number,
  my: number,
  map: MapResource,
  playerPos: { x: number; y: number },
  ecsWorld: World<Entity> = world,
): boolean {
  if (!isValidItemPlacement(mx, my, itemPlacementContext(map, playerPos))) {
    return false;
  }

  // Prevent stacking on existing pickups
  const pickups = ecsWorld.with("pickup", "position").entities;
  for (const p of pickups) {
    const px = Math.round(p.position.x / TILE);
    const py = Math.round(p.position.y / TILE);
    if (px === mx && py === my) {
      return false;
    }
  }

  return true;
}

export function spawnPlacedItemSystem(
  id: string,
  itemId: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  quantity = 1,
): void {
  const ex = gx * TILE;
  const ey = gy * TILE;

  const def = getItemDef(itemId);
  const name = def?.name ?? itemId;

  // Spawns the ECS pickup entity on the ground
  world.add({
    id,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    collider: { isSolid: false },
    interactable: { name, action: "pickup" },
    pickup: { itemId, qty: quantity },
  });

  // Create its PIXI Sprite
  const sprite = new Sprite(getItemTexture(itemId));
  sprite.anchor.set(0.5, 1);
  sprite.x = ex + TILE / 2;
  sprite.y = ey + TILE;
  applyGroundItemVisualScale(sprite, itemId);
  sprite.zIndex = computeRenderZ(sprite.y);

  entityLayer.addChild(sprite);
  entitySprites.set(id, sprite);
}

export async function placeItemSystem(
  itemId: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  cancelPlacement: () => void,
  onCompleteCb: (() => void) | undefined,
): Promise<void> {
  const result = await syncPlaceItem(itemId, 1, gx, gy);
  const player = getPlayerEntity();

  if (!result.ok) {
    spawnEnvFloatingText(
      vfx,
      `placement failed: ${result.error || "unknown error"}`,
      Colors.ui.error,
      player.position!,
      entityLayer,
    );
    return;
  }

  applyRpgState(result.data);

  const placed = result.data.profile.worldEntities
    ?.filter((entity) => entity.kind === "placed_item" && entity.itemId === itemId && entity.x === gx && entity.y === gy)
    .at(-1);
  const id = placed?.id ?? `world_item_${itemId}_${Date.now()}`;
  spawnPlacedItemSystem(id, itemId, gx, gy, world, entityLayer, entitySprites, placed?.quantity ?? 1);

  playSound("pickup");
  spawnEnvFloatingText(vfx, "placed", Colors.ui.success, player.position!, entityLayer);
  spawnEnvParticles(vfx, Colors.building.particle, 8, "smoke", player.position!, entityLayer);

  cancelPlacement();
  onCompleteCb?.();
}

export function updateItemPlacementPreviewSystem(
  inputs: InputResource,
  itemPlacement: ItemPlacementResource,
  map: MapResource,
  playerPos: { x: number; y: number },
  ecsWorld: World<Entity> = world,
): void {
  if (!itemPlacement.isPlacementMode || !itemPlacement.currentItemId || !itemPlacement.previewSprite) {
    return;
  }

  const mx = Math.floor(inputs.mouseWorld.x / TILE);
  const my = Math.floor(inputs.mouseWorld.y / TILE);

  itemPlacement.previewSprite.x = (mx + 0.5) * TILE;
  itemPlacement.previewSprite.y = (my + 1) * TILE;

  if (itemPlacement.previewIndicator) {
    itemPlacement.previewIndicator.x = mx * TILE;
    itemPlacement.previewIndicator.y = my * TILE;
  }

  const valid = isValidItemPlacementGrid(mx, my, map, playerPos, ecsWorld);
  const tintColor = valid ? Colors.building.validPlace : Colors.building.invalidPlace;

  itemPlacement.previewSprite.tint = tintColor;

  if (itemPlacement.previewIndicator) {
    itemPlacement.previewIndicator.clear();
    itemPlacement.previewIndicator.rect(0, 0, TILE, TILE);
    itemPlacement.previewIndicator.stroke({ width: 2, color: tintColor });
    itemPlacement.previewIndicator.fill({ color: tintColor, alpha: 0.15 });
  }
}
