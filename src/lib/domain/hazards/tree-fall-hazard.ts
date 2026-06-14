// TODO: I've never seem this working while manually testing, likely this doesn't works.
 
export type TreeFallDirection = "north" | "south" | "east" | "west";

export interface Point {
  x: number;
  y: number;
}

export interface TreeFallHazard {
  origin: Point;
  direction: TreeFallDirection;
  length: number;
  width: number;
  dodgeWindowSec: number;
  damage: number;
}

export function fallDirectionAwayFromPlayer(tree: Point, player: Point): TreeFallDirection {
  const dx = player.x - tree.x;
  const dy = player.y - tree.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? "east" : "west";
  return dy < 0 ? "south" : "north";
}

export function createTreeFallHazard(
  origin: Point,
  direction: TreeFallDirection,
): TreeFallHazard {
  return {
    origin,
    direction,
    length: 128,
    width: 54,
    dodgeWindowSec: 0.55,
    damage: 18,
  };
}

export function isPointInTreeFallZone(point: Point, hazard: TreeFallHazard): boolean {
  const halfWidth = hazard.width / 2;
  const dx = point.x - hazard.origin.x;
  const dy = point.y - hazard.origin.y;

  switch (hazard.direction) {
    case "north":
      return dy <= 0 && dy >= -hazard.length && Math.abs(dx) <= halfWidth;
    case "south":
      return dy >= 0 && dy <= hazard.length && Math.abs(dx) <= halfWidth;
    case "east":
      return dx >= 0 && dx <= hazard.length && Math.abs(dy) <= halfWidth;
    case "west":
      return dx <= 0 && dx >= -hazard.length && Math.abs(dy) <= halfWidth;
  }
}
