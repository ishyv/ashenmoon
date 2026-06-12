/**
 * Pure stat math: level growth, the generic modifier pipeline, and the
 * derived-value formulas (mitigation, attack speed, move speed, stamina cost).
 *
 * Stacking order per stat: (base + Σflat) * (1 + ΣpercentAdd) * Πmult.
 * Statuses contribute "mult", future equipment contributes "flat",
 * encumbrance contributes "mult" on moveSpeed.
 */

import {
  layerOf,
  type PlayerStats,
  type StatKey,
} from "./stat-types";
import {
  BASE_COMBAT_STATS,
  BASE_RESISTANCE_STATS,
  BASE_SURVIVAL_STATS,
  BASE_UTILITY_STATS,
  COMBAT_GROWTH_PER_LEVEL,
  MAX_LEVEL,
  MIN_LEVEL,
} from "./player-stat-growth";

export type ModifierOp = "flat" | "percentAdd" | "mult";
export type StatSource = "status" | "equipment" | "encumbrance" | "skill" | "dev";

export interface StatModifier {
  stat: StatKey;
  op: ModifierOp;
  value: number;
  source: StatSource;
}

/** Linear growth on the combat layer; other layers are level-independent. */
export function computeBaseStatsAtLevel(level: number): PlayerStats {
  const lv = Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.floor(level)));
  const steps = lv - 1;
  const combat = { ...BASE_COMBAT_STATS };
  for (const key of Object.keys(combat) as (keyof typeof combat)[]) {
    combat[key] = BASE_COMBAT_STATS[key] + COMBAT_GROWTH_PER_LEVEL[key] * steps;
  }
  return {
    combat,
    survival: { ...BASE_SURVIVAL_STATS },
    resistances: { ...BASE_RESISTANCE_STATS },
    utility: { ...BASE_UTILITY_STATS },
  };
}

export function applyModifiers(base: PlayerStats, mods: StatModifier[]): PlayerStats {
  if (mods.length === 0) return base;

  const result: PlayerStats = {
    combat: { ...base.combat },
    survival: { ...base.survival },
    resistances: { ...base.resistances },
    utility: { ...base.utility },
  };

  const byStat = new Map<StatKey, { flat: number; percentAdd: number; mult: number }>();
  for (const mod of mods) {
    let acc = byStat.get(mod.stat);
    if (!acc) {
      acc = { flat: 0, percentAdd: 0, mult: 1 };
      byStat.set(mod.stat, acc);
    }
    if (mod.op === "flat") acc.flat += mod.value;
    else if (mod.op === "percentAdd") acc.percentAdd += mod.value;
    else acc.mult *= mod.value;
  }

  for (const [stat, acc] of byStat) {
    const layer = result[layerOf(stat)] as unknown as Record<string, number>;
    layer[stat] = (layer[stat] + acc.flat) * (1 + acc.percentAdd) * acc.mult;
  }

  return result;
}

/** League-style mitigation: 100 armor halves incoming physical damage. */
export function mitigatePhysical(raw: number, armor: number): number {
  return raw * (100 / (100 + Math.max(0, armor)));
}

export function mitigateMagic(raw: number, magicResist: number): number {
  return raw * (100 / (100 + Math.max(0, magicResist)));
}

export function attacksPerSecond(baseAttackSpeed: number, bonusPct: number): number {
  return baseAttackSpeed * (1 + bonusPct);
}

export function effectiveMoveSpeed(base: number, bonusPct: number, penaltyPct: number): number {
  return Math.max(0, base * (1 + bonusPct - penaltyPct));
}

export function staminaCost(
  baseCost: number,
  encumbranceMult: number,
  exhaustionMult: number,
): number {
  return baseCost * encumbranceMult * exhaustionMult;
}

/**
 * Adapter from the status system's 2-field aggregate (see `aggregateModifiers`
 * in systems/status-system.ts) into the general pipeline, so status definitions
 * stay untouched while feeding the same calculation path as everything else.
 */
export function statusModifiersToStatModifiers(agg: {
  staminaRegenMult: number;
  moveSpeedMult: number;
}): StatModifier[] {
  const mods: StatModifier[] = [];
  if (agg.staminaRegenMult !== 1) {
    mods.push({ stat: "staminaRegenPerSecond", op: "mult", value: agg.staminaRegenMult, source: "status" });
  }
  if (agg.moveSpeedMult !== 1) {
    mods.push({ stat: "moveSpeed", op: "mult", value: agg.moveSpeedMult, source: "status" });
  }
  return mods;
}
