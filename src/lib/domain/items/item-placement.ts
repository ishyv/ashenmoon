export interface ItemPlacementContext {
  mapW: number;
  mapH: number;
  blockedTiles: ReadonlySet<string>;
  waterTiles: ReadonlySet<string>;
  playerTile: { x: number; y: number };
  maxDistanceTiles: number;
}

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function isValidItemPlacement(
  x: number,
  y: number,
  context: ItemPlacementContext,
): boolean {
  // 1. Boundary check
  if (x < 0 || y < 0 || x >= context.mapW || y >= context.mapH) {
    return false;
  }

  // 2. Player range check (Chebyshev distance)
  const dist = Math.max(
    Math.abs(x - context.playerTile.x),
    Math.abs(y - context.playerTile.y),
  );
  if (dist > context.maxDistanceTiles) {
    return false;
  }

  const key = tileKey(x, y);

  // 3. Water check
  if (context.waterTiles.has(key)) {
    return false;
  }

  // 4. Blocked/Solid tiles check
  if (context.blockedTiles.has(key)) {
    return false;
  }

  // 5. Cannot place directly on the player's own tile
  if (x === context.playerTile.x && y === context.playerTile.y) {
    return false;
  }

  return true;
}
