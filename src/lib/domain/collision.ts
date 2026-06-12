export interface CollisionFootprint {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface AABB {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CollisionShape {
  solid: boolean;
  footprint?: CollisionFootprint;
}

export const DEFAULT_TILE_SIZE = 64;

export const PLAYER_BODY = {
  hx: DEFAULT_TILE_SIZE * 0.3,
  hy: DEFAULT_TILE_SIZE * 0.16,
  cy: DEFAULT_TILE_SIZE * 0.84,
} as const;

export const CollisionFootprints = {
  rock: { minX: 0.18, maxX: 0.82, minY: 0.58, maxY: 0.9 },
  tree: { minX: 0.4, maxX: 0.6, minY: 0.7, maxY: 0.98 },
  campfire: { minX: 0.25, maxX: 0.75, minY: 0.35, maxY: 0.82 },
  npc: { minX: 0.32, maxX: 0.68, minY: 0.7, maxY: 1 },
  building: { minX: 0, maxX: 1, minY: 0, maxY: 1 },
} as const satisfies Record<string, CollisionFootprint>;

export function isValidCollisionFootprint(value: CollisionFootprint): boolean {
  return (
    Number.isFinite(value.minX) &&
    Number.isFinite(value.maxX) &&
    Number.isFinite(value.minY) &&
    Number.isFinite(value.maxY) &&
    value.minX >= 0 &&
    value.minY >= 0 &&
    value.maxX <= 1 &&
    value.maxY <= 1 &&
    value.minX < value.maxX &&
    value.minY < value.maxY
  );
}

export function resolveCollisionAabb(
  origin: { x: number; y: number },
  footprint: CollisionFootprint,
  tileSize = DEFAULT_TILE_SIZE,
): AABB {
  return {
    minX: origin.x + footprint.minX * tileSize,
    maxX: origin.x + footprint.maxX * tileSize,
    minY: origin.y + footprint.minY * tileSize,
    maxY: origin.y + footprint.maxY * tileSize,
  };
}

export function resolveFootprintAabb(
  gx: number,
  gy: number,
  footprint: CollisionFootprint,
  tileSize = DEFAULT_TILE_SIZE,
): AABB {
  return resolveCollisionAabb({ x: gx * tileSize, y: gy * tileSize }, footprint, tileSize);
}

export function playerBodyAabb(cx: number, cy: number): AABB {
  return {
    minX: cx - PLAYER_BODY.hx,
    maxX: cx + PLAYER_BODY.hx,
    minY: cy - PLAYER_BODY.hy,
    maxY: cy + PLAYER_BODY.hy,
  };
}

export function intersectsAabb(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

export function computeRenderZ(worldY: number, bias = 0): number {
  return Math.round(worldY * 10 + bias);
}
