import type { Vec2 } from "../weapons/weapon-types";
import type { EnemyAttackDefinition } from "./enemy-attack-types";

export type BoarCombatState =
  | "graze"
  | "alert"
  | "threaten"
  | "charge_windup"
  | "charge"
  | "crash"
  | "recover"
  | "reset";

export type BoarCombatFeedback =
  | "noticed_player"
  | "threat_started"
  | "charge_windup_started"
  | "charge_started"
  | null;

export type BoarChargeOutcome = "crash" | "hit" | "miss" | "continue";

export interface BoarCombatRuntime {
  readonly state: BoarCombatState;
  readonly stateElapsedMs: number;
  readonly position: Vec2;
  readonly lockedDirection: Vec2 | null;
  readonly chargeDistancePx: number;
}

export interface BoarCombatAdvanceInput {
  readonly boar: BoarCombatRuntime;
  readonly player: Vec2;
  readonly dtMs: number;
}

export interface BoarCombatAdvanceResult extends BoarCombatRuntime {
  readonly feedback: BoarCombatFeedback;
  readonly activeAttack?: EnemyAttackDefinition;
}

export const BOAR_COMBAT_TUNING = {
  awarenessRadiusPx: 155,
  threatRadiusPx: 116,
  alertMs: 800,
  threatenMs: 900,
  chargeWindupMs: 700,
  crashMs: 1500,
  recoverMs: 1000,
  chargeMaxDistancePx: 240,
} as const;

export const BOAR_CHARGE_ATTACK: EnemyAttackDefinition = {
  id: "boar.charge",
  name: "Boar Charge",
  rangePx: BOAR_COMBAT_TUNING.chargeMaxDistancePx,
  windupMs: BOAR_COMBAT_TUNING.chargeWindupMs,
  activeMs: 300,
  recoveryMs: 800,
  cooldownMs: 1200,
  damage: 28,
  knockbackPx: 96,
  hitShape: { kind: "capsule", lengthPx: BOAR_COMBAT_TUNING.chargeMaxDistancePx, widthPx: 34 },
  telegraph: { kind: "line", windupColor: 0xff7a33 },
  movement: { kind: "charge", speedPxPerSec: 440, maxDistancePx: BOAR_COMBAT_TUNING.chargeMaxDistancePx, turnLock: true },
  statusEffects: [{ kind: "bleed", chancePct: 28, magnitude: 2, durationSec: 6, tickEverySec: 1 }],
};

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function directionFromTo(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 0.0001) return { x: 1, y: 0 };
  return { x: dx / len, y: dy / len };
}

function resultFrom(
  boar: BoarCombatRuntime,
  state: BoarCombatState,
  feedback: BoarCombatFeedback,
  overrides: Partial<BoarCombatRuntime> = {},
  activeAttack?: EnemyAttackDefinition,
): BoarCombatAdvanceResult {
  return {
    ...boar,
    state,
    stateElapsedMs: state === boar.state ? boar.stateElapsedMs : 0,
    ...overrides,
    feedback,
    ...(activeAttack ? { activeAttack } : {}),
  };
}

export function advanceBoarCombat(input: BoarCombatAdvanceInput): BoarCombatAdvanceResult {
  const elapsed = input.boar.stateElapsedMs + Math.max(0, input.dtMs);
  const boar = { ...input.boar, stateElapsedMs: elapsed };
  const playerDistance = distance(boar.position, input.player);

  switch (boar.state) {
    case "graze":
    case "reset":
      if (playerDistance <= BOAR_COMBAT_TUNING.awarenessRadiusPx) {
        return resultFrom(boar, "alert", "noticed_player");
      }
      return resultFrom(boar, boar.state, null);

    case "alert":
      if (playerDistance > BOAR_COMBAT_TUNING.awarenessRadiusPx) return resultFrom(boar, "graze", null);
      if (playerDistance <= BOAR_COMBAT_TUNING.threatRadiusPx && elapsed >= BOAR_COMBAT_TUNING.alertMs) {
        return resultFrom(boar, "threaten", "threat_started");
      }
      return resultFrom(boar, "alert", null);

    case "threaten":
      if (playerDistance > BOAR_COMBAT_TUNING.awarenessRadiusPx) return resultFrom(boar, "reset", null);
      if (elapsed >= BOAR_COMBAT_TUNING.threatenMs) {
        return resultFrom(
          boar,
          "charge_windup",
          "charge_windup_started",
          { lockedDirection: directionFromTo(boar.position, input.player) },
        );
      }
      return resultFrom(boar, "threaten", null);

    case "charge_windup":
      if (elapsed >= BOAR_COMBAT_TUNING.chargeWindupMs) {
        return resultFrom(boar, "charge", "charge_started", {}, BOAR_CHARGE_ATTACK);
      }
      return resultFrom(boar, "charge_windup", null);

    case "charge":
      return resultFrom(boar, "charge", null, {}, BOAR_CHARGE_ATTACK);

    case "crash":
      if (elapsed >= BOAR_COMBAT_TUNING.crashMs) return resultFrom(boar, "recover", null);
      return resultFrom(boar, "crash", null);

    case "recover":
      if (elapsed >= BOAR_COMBAT_TUNING.recoverMs) return resultFrom(boar, "reset", null, { lockedDirection: null });
      return resultFrom(boar, "recover", null);
  }
}

export function resolveBoarChargeOutcome(input: {
  readonly hitPlayer: boolean;
  readonly hitObstacle: boolean;
  readonly chargeDistancePx: number;
  readonly maxDistancePx?: number;
}): BoarChargeOutcome {
  if (input.hitObstacle) return "crash";
  if (input.hitPlayer) return "hit";
  if (input.chargeDistancePx >= (input.maxDistancePx ?? BOAR_COMBAT_TUNING.chargeMaxDistancePx)) return "miss";
  return "continue";
}
