/**
 * Target generation. A profile's pattern pool decides the broad *order* of
 * targets around the source (so a node "tends to crack clockwise"), while the
 * exact point inside each zone is jittered so it never plays identically.
 * Pure: all randomness flows through the injected `rng`.
 */

import type {
  FocusedGatherPatternType,
  FocusedGatherProfile,
  FocusedGatherTarget,
  FocusedGatherTargetMovement,
  Vec2,
} from "./focused-gather-types";
import { estimateFocusedGatherFeasibility } from "./focused-gather-feasibility";

/** How far targets spread from the source center, in world pixels (~0.6 tile). */
const SPREAD_RADIUS = 46;
/** Positional jitter as a fraction of SPREAD_RADIUS for structured patterns. */
const PATTERN_JITTER = 0.3;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_FEASIBILITY_REROLLS = 8;

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("cannot pick from an empty focused-gather pattern pool");
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))]!;
}

/** Base offset for target `i` of `count` under a given pattern, in world px. */
function patternOffset(
  pattern: FocusedGatherPatternType,
  i: number,
  count: number,
  rng: () => number,
): Vec2 {
  const top = -Math.PI / 2;
  const r = SPREAD_RADIUS;
  switch (pattern) {
    case "clockwise_arc": {
      const a = top + (2 * Math.PI * i) / count;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }
    case "counterclockwise_arc": {
      const a = top - (2 * Math.PI * i) / count;
      return { x: Math.cos(a) * r, y: Math.sin(a) * r };
    }
    case "cross_fracture": {
      const dirs: Vec2[] = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 },
      ];
      const d = dirs[i % dirs.length]!;
      const scale = 0.6 + 0.4 * Math.floor(i / 4);
      return { x: d.x * r * scale, y: d.y * r * scale };
    }
    case "center_out": {
      const a = i * GOLDEN_ANGLE + top;
      const rad = (r * (i + 1)) / count;
      return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
    }
    case "spiral_in": {
      const a = i * GOLDEN_ANGLE + top;
      const rad = (r * (count - i)) / count;
      return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
    }
    case "zigzag": {
      const denom = Math.max(1, count - 1);
      const side = i % 2 === 0 ? -1 : 1;
      return { x: side * r * 0.8, y: -r + (2 * r * i) / denom };
    }
    case "random_burst":
    default: {
      const a = randRange(rng, 0, Math.PI * 2);
      const rad = randRange(rng, r * 0.2, r);
      return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
    }
  }
}

/**
 * Build the full target list for a session: positions from the chosen pattern,
 * radii randomized within the profile band, spawn waves honoring the
 * simultaneous limit, and a movement behavior per target.
 */
function generateTargetCandidate(
  profile: FocusedGatherProfile,
  sourceCenter: Vec2,
  rng: () => number = Math.random,
): FocusedGatherTarget[] {
  const pattern = pick(rng, profile.patternPool);
  const count = Math.max(1, Math.floor(profile.targetCount));
  const limit = Math.max(1, Math.floor(profile.simultaneousTargetLimit));
  const targets: FocusedGatherTarget[] = [];

  let waveSpawn = 0;
  for (let i = 0; i < count; i++) {
    // Advance the clock at the start of each new wave (not within a wave).
    if (i % limit === 0) {
      waveSpawn += i === 0 ? 0 : randRange(rng, profile.spawnDelayMinMs, profile.spawnDelayMaxMs);
    }

    const movement: FocusedGatherTargetMovement = pick(rng, profile.movementTypes);

    let finalPos = { x: sourceCenter.x, y: sourceCenter.y };
    let finalRadius = profile.baseCircleRadius;

    // Retry position generation to prevent overlap with active circles
    for (let attempt = 0; attempt < 50; attempt++) {
      const offset = patternOffset(pattern, i, count, rng);
      let jitter = { x: 0, y: 0 };
      if (pattern !== "random_burst") {
        jitter = {
          x: randRange(rng, -1, 1) * SPREAD_RADIUS * PATTERN_JITTER,
          y: randRange(rng, -1, 1) * SPREAD_RADIUS * PATTERN_JITTER,
        };
      }

      let radius = randRange(rng, profile.minCircleRadius, profile.baseCircleRadius);
      const pos = {
        x: sourceCenter.x + offset.x + jitter.x,
        y: sourceCenter.y + offset.y + jitter.y,
      };

      // If colliding, apply dynamic offset that increases with the number of attempts
      if (attempt > 5) {
        const resolveScale = (attempt - 5) / 10; // scales up to 4.5 at attempt 50
        const angle = randRange(rng, 0, Math.PI * 2);
        const distPush = SPREAD_RADIUS * 0.5 * resolveScale;
        pos.x += Math.cos(angle) * distPush;
        pos.y += Math.sin(angle) * distPush;
        
        // Also slightly reduce the radius (clamped to minCircleRadius) to make it easier to fit
        radius = Math.max(profile.minCircleRadius, radius - resolveScale * 0.5);
      }

      // Check collision/overlap with any target active at the same time
      let overlaps = false;
      const targetLifetime = profile.targetLifetimeMs;
      const targetSpawn = waveSpawn;
      const targetExpiry = waveSpawn + targetLifetime;

      for (const prev of targets) {
        const timeOverlaps = targetSpawn < prev.expiresAtMs && targetExpiry > prev.spawnAtMs;
        if (!timeOverlaps) continue;

        const dx = pos.x - prev.position.x;
        const dy = pos.y - prev.position.y;
        const dist = Math.hypot(dx, dy);
        const minDist = radius + prev.radius + 10; // 10px minimum gap to keep circles clean and distinct
        if (dist < minDist) {
          overlaps = true;
          break;
        }
      }

      finalPos = pos;
      finalRadius = radius;

      if (!overlaps) {
        break;
      }
    }

    targets.push({
      id: `fg-t${i}`,
      patternId: pattern,
      orderIndex: i,
      spawnAtMs: waveSpawn,
      expiresAtMs: waveSpawn + profile.targetLifetimeMs,
      position: finalPos,
      radius: finalRadius,
      movement,
      state: "pending",
    });
  }

  return targets;
}

function generateFallbackTargets(
  profile: FocusedGatherProfile,
  sourceCenter: Vec2,
): FocusedGatherTarget[] {
  const baseCount = Math.max(1, Math.min(3, Math.floor(profile.targetCount)));
  const safeLifetimeMs = Math.max(profile.targetLifetimeMs, 900);
  const safeDelayMs = safeLifetimeMs + Math.max(50, profile.spawnDelayMaxMs);
  const movement = profile.movementTypes.includes("static") ? "static" : profile.movementTypes[0] ?? "static";

  for (let count = baseCount; count >= 1; count--) {
    const targets: FocusedGatherTarget[] = [];
    const radius = Math.max(profile.minCircleRadius, profile.baseCircleRadius);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(3, count);
      const distance = count === 1 ? 0 : SPREAD_RADIUS * 0.45;
      const spawnAtMs = i * safeDelayMs;
      targets.push({
        id: `fg-t${i}`,
        patternId: "center_out",
        orderIndex: i,
        spawnAtMs,
        expiresAtMs: spawnAtMs + safeLifetimeMs,
        position: {
          x: sourceCenter.x + Math.cos(angle) * distance,
          y: sourceCenter.y + Math.sin(angle) * distance,
        },
        radius,
        movement,
        state: "pending",
      });
    }
    if (estimateFocusedGatherFeasibility(targets, profile).feasible) return targets;
  }

  return [{
    id: "fg-t0",
    patternId: "center_out",
    orderIndex: 0,
    spawnAtMs: 0,
    expiresAtMs: Math.max(profile.targetLifetimeMs, 900),
    position: sourceCenter,
    radius: Math.max(profile.minCircleRadius, profile.baseCircleRadius),
    movement,
    state: "pending",
  }];
}

export function generateTargets(
  profile: FocusedGatherProfile,
  sourceCenter: Vec2,
  rng: () => number = Math.random,
): FocusedGatherTarget[] {
  for (let attempt = 0; attempt < MAX_FEASIBILITY_REROLLS; attempt++) {
    const targets = generateTargetCandidate(profile, sourceCenter, rng);
    if (estimateFocusedGatherFeasibility(targets, profile).feasible) return targets;
  }

  return generateFallbackTargets(profile, sourceCenter);
}
