import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import type { Container } from "pixi.js";

/**
 * Smoothly fades roof and walls when the player goes inside or stands behind a building.
 */
export function runBuildingInteriorSystem(
  world: World<Entity>,
  entitySprites: Map<string, Container>,
  dt: number,
): void {
  const player = getPlayerEntity();
  if (!player || !player.position) return;

  const px = player.position.x;
  const py = player.position.y;
  const pTileX = Math.floor(px / TILE);
  const pTileY = Math.floor(py / TILE);

  // Query all building entities
  const buildingEntities = world.with("building", "position").entities;

  for (const e of buildingEntities) {
    const container = entitySprites.get(e.id);
    if (!container) continue;

    // The shellContainer is the second child of the building container
    const shellContainer = container.children[1] as Container;
    if (!shellContainer) continue;

    const spec = getBuildingSpec(e.building.type);
    const bTileX = Math.floor(e.position.x / TILE);
    const bTileY = Math.floor(e.position.y / TILE);

    const isInside =
      pTileX >= bTileX &&
      pTileX < bTileX + spec.footprint.w &&
      pTileY >= bTileY &&
      pTileY < bTileY + spec.footprint.h;

    const isBehind =
      pTileX >= bTileX &&
      pTileX < bTileX + spec.footprint.w &&
      pTileY >= bTileY - 2 &&
      pTileY < bTileY;

    // Determine target alpha:
    // - 0.15 when player is inside the building footprint
    // - 0.35 when player is standing directly behind/north of the building
    // - 1.0 otherwise
    let targetAlpha = 1.0;
    if (isInside) {
      targetAlpha = 0.15;
    } else if (isBehind) {
      targetAlpha = 0.35;
    }

    // Smoothly lerp towards target alpha
    const lerpSpeed = 10 * dt; // Adjust speed relative to frame delta
    shellContainer.alpha += (targetAlpha - shellContainer.alpha) * Math.min(lerpSpeed, 1.0);
  }
}
