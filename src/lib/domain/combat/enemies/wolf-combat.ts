import type { Vec2 } from "../weapons/weapon-types";
import type { EnemyAttackDefinition } from "./enemy-attack-types";

export type WolfCombatState = "prowl" | "stalk" | "circle" | "lunge_windup" | "lunge" | "recover";
export type WolfLungeOutcome = "hit" | "miss" | "continue";
export type WolfCombatFeedback =
  | "noticed_player"
  | "circle_started"
  | "lunge_windup_started"
  | "lunge_started"
  | "lunge_missed"
  | null;

export interface WolfCombatRuntime {
  readonly state: WolfCombatState;
  readonly stateElapsedMs: number;
  readonly position: Vec2;
  readonly lockedDirection: Vec2 | null;
  readonly lungeDistancePx: number;
  readonly circleSign: 1 | -1;
  readonly feedback?: WolfCombatFeedback;
}

export const WOLF_COMBAT_TUNING = {
  stalkRadiusPx: 230,
  disengageRadiusPx: 300,
  circleRadiusPx: 118,
  lungeTriggerRadiusPx: 86,
  circleCommitMs: 900,
  lungeWindupMs: 420,
  lungeSpeedPxPerSec: 360,
  lungeMaxDistancePx: 118,
  recoverMs: 760,
  contactRadiusPx: 30,
} as const;

export const WOLF_LUNGE_ATTACK: EnemyAttackDefinition = {
  id: "wolf_lunge",
  name: "Wolf Lunge",
  rangePx: WOLF_COMBAT_TUNING.lungeTriggerRadiusPx,
  windupMs: WOLF_COMBAT_TUNING.lungeWindupMs,
  activeMs: 260,
  recoveryMs: WOLF_COMBAT_TUNING.recoverMs,
  cooldownMs: 900,
  damage: 18,
  knockbackPx: 95,
  hitShape: { kind: "capsule", lengthPx: 54, widthPx: 40 },
  telegraph: { kind: "line", windupColor: 0xd8d1ba, activeColor: 0xf0efe5 },
  movement: {
    kind: "lunge",
    speedPxPerSec: WOLF_COMBAT_TUNING.lungeSpeedPxPerSec,
    maxDistancePx: WOLF_COMBAT_TUNING.lungeMaxDistancePx,
    turnLock: true,
  },
};

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(direction: Vec2): Vec2 {
  const len = Math.hypot(direction.x, direction.y);
  if (len <= 0.0001) return { x: 1, y: 0 };
  return { x: direction.x / len, y: direction.y / len };
}

function directionTo(from: Vec2, to: Vec2): Vec2 {
  return normalize({ x: to.x - from.x, y: to.y - from.y });
}

function nextCircleSign(wolf: WolfCombatRuntime, player: Vec2): 1 | -1 {
  if (wolf.circleSign) return wolf.circleSign;
  return wolf.position.y <= player.y ? 1 : -1;
}

export function resolveWolfLungeOutcome(input: {
  readonly hitPlayer: boolean;
  readonly lungeDistancePx: number;
  readonly maxDistancePx?: number;
}): WolfLungeOutcome {
  if (input.hitPlayer) return "hit";
  if (input.lungeDistancePx >= (input.maxDistancePx ?? WOLF_COMBAT_TUNING.lungeMaxDistancePx)) return "miss";
  return "continue";
}

export function advanceWolfCombat(input: {
  readonly wolf: WolfCombatRuntime;
  readonly player: Vec2;
  readonly dtMs: number;
}): WolfCombatRuntime {
  const elapsed = input.wolf.stateElapsedMs + Math.max(0, input.dtMs);
  const playerDistance = distance(input.wolf.position, input.player);
  const base = { ...input.wolf, stateElapsedMs: elapsed, feedback: null as WolfCombatFeedback };

  switch (input.wolf.state) {
    case "prowl":
      if (playerDistance <= WOLF_COMBAT_TUNING.stalkRadiusPx) {
        return { ...base, state: "stalk", stateElapsedMs: 0, feedback: "noticed_player" };
      }
      return base;

    case "stalk":
      if (playerDistance > WOLF_COMBAT_TUNING.disengageRadiusPx) {
        return { ...base, state: "prowl", stateElapsedMs: 0, lockedDirection: null, lungeDistancePx: 0 };
      }
      if (playerDistance <= WOLF_COMBAT_TUNING.circleRadiusPx) {
        return {
          ...base,
          state: "circle",
          stateElapsedMs: 0,
          circleSign: nextCircleSign(input.wolf, input.player),
          feedback: "circle_started",
        };
      }
      return base;

    case "circle":
      if (playerDistance > WOLF_COMBAT_TUNING.disengageRadiusPx) {
        return { ...base, state: "prowl", stateElapsedMs: 0, lockedDirection: null, lungeDistancePx: 0 };
      }
      if (elapsed >= WOLF_COMBAT_TUNING.circleCommitMs && playerDistance <= WOLF_COMBAT_TUNING.lungeTriggerRadiusPx) {
        return {
          ...base,
          state: "lunge_windup",
          stateElapsedMs: 0,
          lockedDirection: directionTo(input.wolf.position, input.player),
          lungeDistancePx: 0,
          feedback: "lunge_windup_started",
        };
      }
      return base;

    case "lunge_windup":
      if (elapsed >= WOLF_COMBAT_TUNING.lungeWindupMs) {
        return {
          ...base,
          state: "lunge",
          stateElapsedMs: 0,
          lockedDirection: input.wolf.lockedDirection ?? directionTo(input.wolf.position, input.player),
          feedback: "lunge_started",
        };
      }
      return base;

    case "lunge":
      return base;

    case "recover":
      if (elapsed >= WOLF_COMBAT_TUNING.recoverMs) {
        return { ...base, state: "prowl", stateElapsedMs: 0, lockedDirection: null, lungeDistancePx: 0 };
      }
      return base;
  }
}
