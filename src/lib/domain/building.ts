import { getBuildingSpec } from "$lib/domain/building-specs";

export interface BuildingPlacementContext {
  mapW: number;
  mapH: number;
  blockedTiles: ReadonlySet<string>;
  waterTiles: ReadonlySet<string>;
  reservedTiles: ReadonlySet<string>;
  playerTile: { x: number; y: number };
  maxDistanceTiles: number;
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isValidBuildingPlacement(
  x: number,
  y: number,
  type: string,
  context: BuildingPlacementContext,
): boolean {
  const { w, h } = getBuildingSpec(type).footprint;

  if (x < 0 || y < 0 || x + w > context.mapW || y + h > context.mapH) return false;

  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const dist = Math.max(
    Math.abs(centerX - (context.playerTile.x + 0.5)),
    Math.abs(centerY - (context.playerTile.y + 0.5)),
  );
  if (dist > context.maxDistanceTiles) return false;

  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      const key = tileKey(tx, ty);
      if (context.waterTiles.has(key)) return false;
      if (context.blockedTiles.has(key)) return false;
      if (context.reservedTiles.has(key)) return false;
      if (tx === context.playerTile.x && ty === context.playerTile.y) return false;
    }
  }

  return true;
}

