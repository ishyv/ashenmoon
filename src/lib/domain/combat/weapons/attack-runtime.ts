/**
 * Live state of the player's in-progress weapon attack. Owned by CombatResource,
 * advanced by weapon-attack-system. Pure data + a small phase helper; no core or
 * Pixi imports, so the core CombatResource can hold it without a dependency cycle.
 */
import type { AttackPlan } from "./attack-resolution";
import type { Vec2 } from "./weapon-types";

export type WeaponAttackPhase = "windup" | "active" | "recovery";

export interface WeaponAttackRuntime {
  active: boolean;
  plan: AttackPlan | null;
  weaponDefId: string;
  attackId: string;
  animationProfile: string;
  soundProfile: string;
  phase: WeaponAttackPhase;
  elapsedMs: number;
  /** Attacker centre at the moment of commitment (world px). */
  origin: Vec2;
  /** Aim direction angle (radians). */
  aimAngle: number;
  /** Entities already hit during this swing (no double-hits). */
  hitEntityIds: Set<string>;
  /** Whether this swing connected with anything. */
  didHit: boolean;
  /** True for exactly the frame the attack first enters its active window. */
  justBecameActive: boolean;
  /** Signed forward movement already applied by the attack movement curve. */
  movementAppliedPx: number;
}

export interface WeaponComboRuntime {
  weaponDefId: string;
  lastAttackId: string;
  expiresAtMs: number;
  depth: number;
}

export function createInitialWeaponAttackRuntime(): WeaponAttackRuntime {
  return {
    active: false,
    plan: null,
    weaponDefId: "",
    attackId: "",
    animationProfile: "",
    soundProfile: "",
    phase: "windup",
    elapsedMs: 0,
    origin: { x: 0, y: 0 },
    aimAngle: 0,
    hitEntityIds: new Set(),
    didHit: false,
    justBecameActive: false,
    movementAppliedPx: 0,
  };
}

export function createInitialWeaponComboRuntime(): WeaponComboRuntime {
  return {
    weaponDefId: "",
    lastAttackId: "",
    expiresAtMs: 0,
    depth: 0,
  };
}

/** Phase the attack is in at `elapsedMs`, given its plan timings. */
export function phaseAtElapsed(plan: AttackPlan, elapsedMs: number): WeaponAttackPhase | "done" {
  if (elapsedMs < plan.windupMs) return "windup";
  if (elapsedMs < plan.windupMs + plan.activeMs) return "active";
  if (elapsedMs < plan.windupMs + plan.activeMs + plan.recoveryMs) return "recovery";
  return "done";
}
