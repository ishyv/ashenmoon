export interface Vec2 {
  x: number;
  y: number;
}

export interface DrivingThrustConfig {
  minSwipeDistancePx: number;
  maxSwipeDistancePx: number;
  baseThrustDistancePx: number;
  maxThrustDistancePx: number;
  thrustDistancePerLevelPx: number;
  hitboxWidthPx: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  cooldownMs: number;
  staminaCost: number;
  minRequiredStamina: number;
  damageMultiplier: number;
  secondaryDamageMultiplier: number;
  knockbackForce: number;
  bleedChancePct: number;
  secondaryBleedChancePct: number;
  bleedDurationSec: number;
  bleedTickEverySec: number;
  bleedDamagePerTick: number;
}

export interface DrivingThrustPendingInput {
  direction: Vec2;
  screenStart: Vec2;
  screenEnd: Vec2;
  worldStart: Vec2;
  worldEnd: Vec2;
}

export type DrivingThrustPhase = "idle" | "windup" | "active" | "recovery";

export interface DrivingThrustState {
  phase: DrivingThrustPhase;
  elapsedMs: number;
  direction: Vec2;
  origin: Vec2;
  intendedDistancePx: number;
  actualDistancePx: number;
  traveledDistancePx: number;
  hitEntityIds: Set<string>;
}

export interface DrivingThrustHitbox {
  origin: Vec2;
  direction: Vec2;
  lengthPx: number;
  widthPx: number;
}

export interface PointerAttackIntentConfig {
  tapMaxDurationMs: number;
  tapMaxDistancePx: number;
  thrustMinHoldMs: number;
  thrustMaxHoldMs: number;
  thrustMinDistancePx: number;
  thrustMinSpeedPxPerMs: number;
  fullSwipeMinHoldMs: number;
  fullSwipeMinDistancePx: number;
  deadzonePx: number;
}

export interface PointerAttackInput {
  start: Vec2;
  end: Vec2;
  downAtMs: number;
  upAtMs: number;
}

export type PointerAttackArmedIntent = "none" | "driving_thrust" | "full_swipe";

export type PointerAttackIntent =
  | { kind: "basic_attack"; direction: Vec2 }
  | { kind: "driving_thrust"; direction: Vec2 }
  | { kind: "full_swipe"; direction: Vec2; holdDurationMs: number }
  | { kind: "none"; reason: "too_short" | "too_small" | "ambiguous" };

export type DrivingThrustSwipeResult =
  | ({ triggered: true; direction: Vec2; swipeDistancePx: number } & DrivingThrustPendingInput)
  | { triggered: false; reason: "too_short" | "zero_world_delta"; swipeDistancePx: number };

export type DrivingThrustStartResult =
  | { ok: true }
  | { ok: false; reason: "cooldown" | "insufficient_stamina" };

export const DEFAULT_DRIVING_THRUST_CONFIG: DrivingThrustConfig = {
  minSwipeDistancePx: 52,
  maxSwipeDistancePx: 500,
  baseThrustDistancePx: 180,
  maxThrustDistancePx: 280,
  thrustDistancePerLevelPx: 8,
  hitboxWidthPx: 42,
  windupMs: 120,
  activeMs: 140,
  recoveryMs: 260,
  cooldownMs: 3500,
  staminaCost: 18,
  minRequiredStamina: 12,
  damageMultiplier: 1.8,
  secondaryDamageMultiplier: 1.2,
  knockbackForce: 2.2,
  bleedChancePct: 28,
  secondaryBleedChancePct: 14,
  bleedDurationSec: 6,
  bleedTickEverySec: 2,
  bleedDamagePerTick: 2,
};

export const DEFAULT_POINTER_ATTACK_INTENT_CONFIG: PointerAttackIntentConfig = {
  tapMaxDurationMs: 180,
  tapMaxDistancePx: 14,
  thrustMinHoldMs: 120,
  thrustMaxHoldMs: 450,
  thrustMinDistancePx: 52,
  thrustMinSpeedPxPerMs: 0.16,
  fullSwipeMinHoldMs: 500,
  fullSwipeMinDistancePx: 36,
  deadzonePx: 8,
};

export function normalizeVec2(v: Vec2): Vec2 | null {
  const len = Math.hypot(v.x, v.y);
  if (len <= 0.0001) return null;
  return { x: v.x / len, y: v.y / len };
}

export function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function classifyPointerAttackIntent(args: {
  input: PointerAttackInput;
  clickDirection: Vec2;
  config: PointerAttackIntentConfig;
}): PointerAttackIntent {
  const heldMs = Math.max(0, args.input.upAtMs - args.input.downAtMs);
  const dragDistancePx = distanceBetween(args.input.start, args.input.end);
  const dragDirection = normalizeVec2({
    x: args.input.end.x - args.input.start.x,
    y: args.input.end.y - args.input.start.y,
  });

  if (
    heldMs <= args.config.tapMaxDurationMs &&
    dragDistancePx <= args.config.tapMaxDistancePx
  ) {
    return { kind: "basic_attack", direction: args.clickDirection };
  }

  if (
    heldMs >= args.config.fullSwipeMinHoldMs &&
    dragDistancePx >= args.config.fullSwipeMinDistancePx &&
    dragDirection
  ) {
    return { kind: "full_swipe", direction: dragDirection, holdDurationMs: heldMs };
  }

  const swipeSpeedPxPerMs = dragDistancePx / Math.max(1, heldMs);
  if (
    heldMs >= args.config.thrustMinHoldMs &&
    heldMs <= args.config.thrustMaxHoldMs &&
    dragDistancePx >= args.config.thrustMinDistancePx &&
    swipeSpeedPxPerMs >= args.config.thrustMinSpeedPxPerMs &&
    dragDirection
  ) {
    return { kind: "driving_thrust", direction: dragDirection };
  }

  return { kind: "basic_attack", direction: args.clickDirection };
}

export function getPointerAttackArmedIntent(args: {
  start: Vec2;
  current: Vec2;
  downAtMs: number;
  nowMs: number;
  config: PointerAttackIntentConfig;
}): PointerAttackArmedIntent {
  const heldMs = Math.max(0, args.nowMs - args.downAtMs);
  const dragDistancePx = distanceBetween(args.start, args.current);
  const hasDirection = normalizeVec2({
    x: args.current.x - args.start.x,
    y: args.current.y - args.start.y,
  }) !== null;
  if (
    heldMs >= args.config.fullSwipeMinHoldMs &&
    dragDistancePx >= args.config.fullSwipeMinDistancePx &&
    hasDirection
  ) {
    return "full_swipe";
  }

  const swipeSpeedPxPerMs = dragDistancePx / Math.max(1, heldMs);
  if (
    heldMs >= args.config.thrustMinHoldMs &&
    heldMs <= args.config.thrustMaxHoldMs &&
    dragDistancePx >= args.config.thrustMinDistancePx &&
    swipeSpeedPxPerMs >= args.config.thrustMinSpeedPxPerMs &&
    hasDirection
  ) {
    return "driving_thrust";
  }

  return "none";
}

export function resolveDrivingThrustSwipe(args: {
  screenStart: Vec2;
  screenEnd: Vec2;
  worldStart: Vec2;
  worldEnd: Vec2;
  config: DrivingThrustConfig;
}): DrivingThrustSwipeResult {
  const screenDx = args.screenEnd.x - args.screenStart.x;
  const screenDy = args.screenEnd.y - args.screenStart.y;
  const rawScreenDistance = Math.hypot(screenDx, screenDy);
  const swipeDistancePx = Math.min(rawScreenDistance, args.config.maxSwipeDistancePx);
  if (swipeDistancePx < args.config.minSwipeDistancePx) {
    return { triggered: false, reason: "too_short", swipeDistancePx };
  }

  const worldDirection = normalizeVec2({
    x: args.worldEnd.x - args.worldStart.x,
    y: args.worldEnd.y - args.worldStart.y,
  });
  if (!worldDirection) {
    const screenDirection = normalizeVec2({ x: screenDx, y: screenDy });
    if (!screenDirection) return { triggered: false, reason: "zero_world_delta", swipeDistancePx };
    return {
      triggered: true,
      direction: screenDirection,
      swipeDistancePx,
      screenStart: args.screenStart,
      screenEnd: args.screenEnd,
      worldStart: args.worldStart,
      worldEnd: args.worldEnd,
    };
  }

  return {
    triggered: true,
    direction: worldDirection,
    swipeDistancePx,
    screenStart: args.screenStart,
    screenEnd: args.screenEnd,
    worldStart: args.worldStart,
    worldEnd: args.worldEnd,
  };
}

export function getDrivingThrustDistancePx(config: DrivingThrustConfig, combatLevel: number): number {
  const level = Math.max(1, combatLevel);
  return Math.min(
    config.maxThrustDistancePx,
    config.baseThrustDistancePx + (level - 1) * config.thrustDistancePerLevelPx,
  );
}

export function isPointInsideDrivingThrustCapsule(
  hitbox: DrivingThrustHitbox,
  point: Vec2,
  pointRadiusPx = 0,
): boolean {
  const dx = point.x - hitbox.origin.x;
  const dy = point.y - hitbox.origin.y;
  const along = dx * hitbox.direction.x + dy * hitbox.direction.y;
  if (along < -pointRadiusPx || along > hitbox.lengthPx + pointRadiusPx) return false;
  const perpX = dx - hitbox.direction.x * along;
  const perpY = dy - hitbox.direction.y * along;
  return Math.hypot(perpX, perpY) <= hitbox.widthPx / 2 + pointRadiusPx;
}

export function canStartDrivingThrust(args: {
  nowMs: number;
  cooldownUntilMs: number;
  currentStamina: number;
  config: DrivingThrustConfig;
}): DrivingThrustStartResult {
  if (args.nowMs < args.cooldownUntilMs) return { ok: false, reason: "cooldown" };
  if (args.currentStamina < args.config.minRequiredStamina) {
    return { ok: false, reason: "insufficient_stamina" };
  }
  return { ok: true };
}

export function createInitialDrivingThrustState(): DrivingThrustState {
  return {
    phase: "idle",
    elapsedMs: 0,
    direction: { x: 1, y: 0 },
    origin: { x: 0, y: 0 },
    intendedDistancePx: 0,
    actualDistancePx: 0,
    traveledDistancePx: 0,
    hitEntityIds: new Set(),
  };
}

export function resetDrivingThrustState(state: DrivingThrustState): void {
  state.phase = "idle";
  state.elapsedMs = 0;
  state.direction = { x: 1, y: 0 };
  state.origin = { x: 0, y: 0 };
  state.intendedDistancePx = 0;
  state.actualDistancePx = 0;
  state.traveledDistancePx = 0;
  state.hitEntityIds.clear();
}

export function computeCollisionClippedTravelDistance(args: {
  origin: Vec2;
  direction: Vec2;
  intendedDistancePx: number;
  collidesAt: (x: number, y: number) => boolean;
  stepPx?: number;
}): number {
  const step = Math.max(1, args.stepPx ?? 6);
  let clearDistance = 0;
  for (let d = step; d <= args.intendedDistancePx + 0.001; d += step) {
    const sampleDistance = Math.min(d, args.intendedDistancePx);
    const x = args.origin.x + args.direction.x * sampleDistance;
    const y = args.origin.y + args.direction.y * sampleDistance;
    if (args.collidesAt(x, y)) return clearDistance;
    clearDistance = sampleDistance;
  }
  return clearDistance;
}
