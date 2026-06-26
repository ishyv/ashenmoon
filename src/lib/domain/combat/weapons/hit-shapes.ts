/**
 * Reusable attack hit shapes. Every weapon attack carves one of these against a
 * set of target points; no attack rolls its own collision code. Pure geometry,
 * no world access — callers pass entity positions in and read booleans out.
 *
 * Conventions match the existing combat code: angles in radians, `direction` is
 * a unit vector, all distances in world px, target points are entity centres.
 */
import type { AttackHitShapeDefinition, Vec2 } from "./weapon-types";

const DEG_TO_RAD = Math.PI / 180;

/** Smallest signed angle between two angles (radians), in [-PI, PI]. */
function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Cone/arc test: a wedge of `arcDegrees` centred on `aimAngle` (optionally
 * rotated by `offsetDegrees`), out to `radiusPx`. A target within `pointRadius`
 * of the wedge counts as hit. Mirrors the swing-cone the basic attack uses today.
 */
export function arcContains(
  origin: Vec2,
  aimAngle: number,
  shape: { radiusPx: number; arcDegrees: number; offsetDegrees?: number },
  point: Vec2,
  pointRadiusPx = 0,
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist > shape.radiusPx + pointRadiusPx) return false;
  if (dist <= pointRadiusPx) return true; // overlapping the origin always counts
  const centre = aimAngle + (shape.offsetDegrees ?? 0) * DEG_TO_RAD;
  const halfArc = (shape.arcDegrees * DEG_TO_RAD) / 2;
  // Allow extra angular slack for nearer/larger targets so a body that clips the
  // edge still registers.
  const angularSlack = Math.atan2(pointRadiusPx, Math.max(dist, 0.0001));
  return Math.abs(angleDelta(Math.atan2(dy, dx), centre)) <= halfArc + angularSlack;
}

/**
 * Capsule test: a `lengthPx` stadium of half-width `widthPx/2` extending from
 * `origin` along `direction`. Used by thrust/lunge attacks. Generalised from
 * `isPointInsideDrivingThrustCapsule`.
 */
export function capsuleContains(
  origin: Vec2,
  direction: Vec2,
  shape: { lengthPx: number; widthPx: number },
  point: Vec2,
  pointRadiusPx = 0,
): boolean {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const along = dx * direction.x + dy * direction.y;
  if (along < -pointRadiusPx || along > shape.lengthPx + pointRadiusPx) return false;
  const perpX = dx - direction.x * along;
  const perpY = dy - direction.y * along;
  return Math.hypot(perpX, perpY) <= shape.widthPx / 2 + pointRadiusPx;
}

/** Circle/point test: everything within `radiusPx` of `origin`. */
export function circleContains(
  origin: Vec2,
  radiusPx: number,
  point: Vec2,
  pointRadiusPx = 0,
): boolean {
  return Math.hypot(point.x - origin.x, point.y - origin.y) <= radiusPx + pointRadiusPx;
}

/**
 * Unified entry point: does `shape` (aimed along `aimAngle` from `origin`) cover
 * `point`? Reach scaling and offset are baked into the shape by the caller.
 */
export function hitShapeContains(args: {
  shape: AttackHitShapeDefinition;
  origin: Vec2;
  aimAngle: number;
  point: Vec2;
  pointRadiusPx?: number;
}): boolean {
  const { shape, origin, aimAngle, point } = args;
  const pad = args.pointRadiusPx ?? 0;
  const direction: Vec2 = { x: Math.cos(aimAngle), y: Math.sin(aimAngle) };
  switch (shape.kind) {
    case "arc":
      return arcContains(origin, aimAngle, shape, point, pad);
    case "capsule":
      return capsuleContains(origin, direction, shape, point, pad);
    case "circle":
      return circleContains(origin, shape.radiusPx, point, pad);
    case "point":
      return circleContains(origin, shape.radiusPx, point, pad);
  }
}
