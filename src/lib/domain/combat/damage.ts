import { mitigateMagic, mitigatePhysical } from "$lib/domain/stats/stat-calculation";

export type DamageType = "physical" | "magic" | "true";

export interface DamageableHealth {
  readonly current: number;
  readonly max: number;
  readonly faction: string;
  readonly invulnTimer: number;
}

export interface DamageRequest {
  readonly health: DamageableHealth | undefined;
  readonly amount: number;
  readonly damageType: DamageType;
  readonly armor?: number;
  readonly magicResist?: number;
  readonly damageMultiplier?: number;
}

export type DamageSkipReason = "missing_health" | "invulnerable" | "already_dead";

export type DamageResult =
  | {
      readonly applied: true;
      readonly previousHealth: number;
      readonly nextHealth: number;
      readonly damageApplied: number;
      readonly lethal: boolean;
    }
  | {
      readonly applied: false;
      readonly reason: DamageSkipReason;
      readonly previousHealth: number | null;
      readonly nextHealth: number | null;
      readonly damageApplied: 0;
      readonly lethal: false;
    };

function mitigatedDamage(request: DamageRequest): number {
  const base = Math.max(0, request.amount);
  const mitigated =
    request.damageType === "physical"
      ? mitigatePhysical(base, request.armor ?? 0)
      : request.damageType === "magic"
        ? mitigateMagic(base, request.magicResist ?? 0)
        : base;
  return Math.round(mitigated) * (request.damageMultiplier ?? 1);
}

/**
 * Pure damage resolution. It decides the health delta and lethal state, but it
 * does not mutate entities or trigger feedback. Runtime systems apply this
 * result and emit events/adapters around it.
 */
export function resolveDamage(request: DamageRequest): DamageResult {
  const health = request.health;
  if (!health) {
    return {
      applied: false,
      reason: "missing_health",
      previousHealth: null,
      nextHealth: null,
      damageApplied: 0,
      lethal: false,
    };
  }

  if (health.invulnTimer > 0) {
    return {
      applied: false,
      reason: "invulnerable",
      previousHealth: health.current,
      nextHealth: health.current,
      damageApplied: 0,
      lethal: false,
    };
  }

  if (health.current <= 0) {
    return {
      applied: false,
      reason: "already_dead",
      previousHealth: health.current,
      nextHealth: health.current,
      damageApplied: 0,
      lethal: false,
    };
  }

  const damageApplied = Math.round(mitigatedDamage(request));
  const nextHealth = Math.max(0, health.current - damageApplied);

  return {
    applied: true,
    previousHealth: health.current,
    nextHealth,
    damageApplied,
    lethal: nextHealth <= 0,
  };
}
