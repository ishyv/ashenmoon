/**
 * The craft-time roll: given a recipe, the materials being consumed, and the
 * crafter's Craftsmanship level, decide what quality tier the output gets and
 * whether it's cursed. Pure — `rng` is injected and defaults to `Math.random`
 * only at the call site in crafting-system.ts, mirroring the existing
 * `eurekaRecipesFor(..., rng, ...)` pattern in knowledge-unlock.ts.
 *
 * The five normal tiers (sloppy..fable) come from one weighted-random pick
 * whose weights shift toward the top end as skill/material quality rise.
 * Divine is deliberately NOT in that pool: it can only happen as a second,
 * independent, rare roll that upgrades an already-rolled Fable result — a
 * miracle layered on top of peak mastery, not a reward you can grind toward
 * directly. Possession (the curse layer) is a third, fully orthogonal roll
 * that can land on any tier.
 */
import type { CraftTier, RpgInventorySlot } from "$lib/domain/rpg-types";
import { SKILL_MAX_LEVEL } from "$lib/domain/stats/skill-growth";
import type { CraftRecipe } from "./recipe-types";
import { CRAFT_TIER_ORDER, type CraftOutcomeRoll, type PossessionRoll } from "./tier-types";
import { baseStatsForItem, computeTierStats } from "./tier-stats";
import { CURSE_EFFECT_POOL, type CurseEffectId } from "./curse-effects";
import { divineOutcomePoolFor } from "./divine-outcomes";

type NormalTier = Exclude<CraftTier, "divine">;
type CraftSlotsLike = Readonly<Record<string, RpgInventorySlot>>;

const MASTERY_WEIGHT = 0.7;
const MATERIAL_WEIGHT = 0.3;
const ATTENDED_MASTERY_WEIGHT = 0.6;
const ATTENDED_MATERIAL_WEIGHT = 0.2;
const ATTENDED_MINIGAME_WEIGHT = 0.2;
const FABLE_GATE_SCORE = 0.55;
const MIN_TIER_WEIGHT = 0.5;

/**
 * Whether the player engaged the optional attended-crafting minigame this
 * craft. Omitted entirely (the hand-craft/unattended path) reproduces the
 * original unattended score formula byte-for-byte. `attended: true` with
 * `played: false` (in range the whole time but never actually triggered a
 * scoring window) also falls back to the unattended formula — only actually
 * engaging at least one window changes the math, per "not playing is
 * always safe, playing badly costs a little, playing well is the only path
 * to the top tiers."
 */
export interface CraftAttendance {
  readonly attended: boolean;
  /** True once the player has engaged at least one minigame window, win or lose. */
  readonly played: boolean;
  /** 0..1, e.g. hits / max(1, windows). Ignored unless `attended && played`. */
  readonly minigamePerformance: number;
}

function attendedAndPlayed(attendance: CraftAttendance | undefined): attendance is CraftAttendance {
  return !!attendance?.attended && !!attendance?.played;
}

/** Relative weight + how strongly a tier's odds respond to score. Tunable. */
const TIER_WEIGHT_TABLE: Record<NormalTier, { baseWeight: number; sensitivity: number }> = {
  sloppy: { baseWeight: 20, sensitivity: -0.9 },
  robust: { baseWeight: 25, sensitivity: -0.2 },
  pristine: { baseWeight: 20, sensitivity: 0.6 },
  masterwork: { baseWeight: 10, sensitivity: 1.4 },
  fable: { baseWeight: 10, sensitivity: 2.2 },
};

const DIVINE_BASE_CHANCE = 0.02;
const DIVINE_MASTERY_BOOST = 0.03;
const DIVINE_MAX_CHANCE = 0.08;

const BASE_CURSE_CHANCE = 0.03;
const CURSE_CHANCE_PER_MASTERY = 0.17;
const MAX_CURSE_CHANCE = 0.2;
const BASE_CURSE_CEILING = 1;
const CURSE_CEILING_PER_MASTERY = 4;
export const MAX_CURSE_LEVEL = 5;
const LOW_CURSE_THRESHOLD = 2;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 at level 1, 1 at SKILL_MAX_LEVEL. */
export function masteryScore(craftsmanshipLevel: number): number {
  return clamp01((craftsmanshipLevel - 1) / (SKILL_MAX_LEVEL - 1));
}

function combinedScore(
  craftsmanshipLevel: number,
  materialQuality: number,
  attendance?: CraftAttendance,
): number {
  const mastery = masteryScore(craftsmanshipLevel);
  const material = clamp01(materialQuality);
  if (attendedAndPlayed(attendance)) {
    return mastery * ATTENDED_MASTERY_WEIGHT
      + material * ATTENDED_MATERIAL_WEIGHT
      + clamp01(attendance.minigamePerformance) * ATTENDED_MINIGAME_WEIGHT;
  }
  return mastery * MASTERY_WEIGHT + material * MATERIAL_WEIGHT;
}

function weightedPick<T>(items: readonly T[], weights: readonly number[], rng: () => number): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) {
      const picked = items[i];
      if (picked !== undefined) return picked;
    }
  }
  const fallback = items[items.length - 1];
  if (fallback === undefined) throw new Error("weightedPick: items must be non-empty");
  return fallback;
}

/**
 * Average quality tier of any tiered materials consumed by this craft, 0..1
 * (0 = sloppy, 1 = divine-tier ingredients). Untiered/flat costs (the norm
 * until a later phase tiers raw materials) contribute nothing; when no
 * tiered material is present at all, the score is a neutral 0.5 so the roll
 * leans on `craftsmanshipLevel` alone.
 */
export function materialQualityScore(slots: CraftSlotsLike, recipe: CraftRecipe): number {
  const maxIndex = CRAFT_TIER_ORDER.length - 1;
  const indices: number[] = [];
  for (const cost of recipe.costs) {
    const ids = [cost.itemId, ...(cost.substitutes ?? []).map((s) => s.itemId)];
    for (const id of ids) {
      const slot = slots[id];
      if (!slot || !("instances" in slot)) continue;
      for (const instance of slot.instances) {
        if (instance.tier) indices.push(CRAFT_TIER_ORDER.indexOf(instance.tier));
      }
    }
  }
  if (indices.length === 0) return 0.5;
  const avg = indices.reduce((sum, i) => sum + i, 0) / indices.length;
  return clamp01(avg / maxIndex);
}

/**
 * Weighted pick among the five normal tiers. Fable only enters the pool once
 * `score` clears the gate AND the craft was attended and played — an
 * unattended craft, however skilled, can never reach Fable (and therefore
 * never Divine, which can only upgrade an already-Fable result).
 */
export function rollCraftTier(
  craftsmanshipLevel: number,
  materialQuality: number,
  rng: () => number,
  attendance?: CraftAttendance,
): NormalTier {
  const score = combinedScore(craftsmanshipLevel, materialQuality, attendance);
  const candidates = (Object.keys(TIER_WEIGHT_TABLE) as NormalTier[]).filter(
    (tier) => tier !== "fable" || (score >= FABLE_GATE_SCORE && attendedAndPlayed(attendance)),
  );
  const weights = candidates.map((tier) => {
    const { baseWeight, sensitivity } = TIER_WEIGHT_TABLE[tier];
    return Math.max(MIN_TIER_WEIGHT, baseWeight * (1 + sensitivity * score));
  });
  return weightedPick(candidates, weights, rng);
}

/** Only ever upgrades an already-rolled Fable result — Divine cannot be reached any other way. */
export function rollDivineUpgrade(tier: NormalTier, craftsmanshipLevel: number, rng: () => number): boolean {
  if (tier !== "fable") return false;
  const chance = Math.min(DIVINE_MAX_CHANCE, DIVINE_BASE_CHANCE + DIVINE_MASTERY_BOOST * masteryScore(craftsmanshipLevel));
  return rng() < chance;
}

/** Chance and severity ceiling both rise with mastery; the actual level is random within that ceiling. No cure, no safety net. */
export function rollPossession(
  craftsmanshipLevel: number,
  rng: () => number,
): { cursed: false } | { cursed: true; curseLevel: number } {
  const m = masteryScore(craftsmanshipLevel);
  const chance = Math.min(MAX_CURSE_CHANCE, BASE_CURSE_CHANCE + CURSE_CHANCE_PER_MASTERY * m);
  if (rng() >= chance) return { cursed: false };
  const ceiling = Math.min(MAX_CURSE_LEVEL, BASE_CURSE_CEILING + CURSE_CEILING_PER_MASTERY * m);
  const curseLevel = Math.min(MAX_CURSE_LEVEL, 1 + Math.floor(rng() * ceiling));
  return { cursed: true, curseLevel };
}

/** 1 fixed effect at low curse level; 3-5 rotating effects at high curse level. Drawn without replacement. */
export function selectCurseEffects(curseLevel: number, rng: () => number): readonly CurseEffectId[] {
  const effectCount = curseLevel <= LOW_CURSE_THRESHOLD ? 1 : 3 + Math.floor(rng() * 3);
  const pool = [...CURSE_EFFECT_POOL];
  const picked: CurseEffectId[] = [];
  for (let i = 0; i < effectCount && pool.length > 0; i++) {
    const index = Math.floor(rng() * pool.length);
    const [effect] = pool.splice(index, 1);
    if (effect) picked.push(effect.id);
  }
  return picked;
}

/** Single entry point crafting-system.ts calls for a `tiered` recipe. */
export function rollCraftOutcome(
  recipe: CraftRecipe,
  slots: CraftSlotsLike,
  craftsmanshipLevel: number,
  rng: () => number,
  attendance?: CraftAttendance,
): CraftOutcomeRoll {
  const matScore = materialQualityScore(slots, recipe);
  const baseTier = rollCraftTier(craftsmanshipLevel, matScore, rng, attendance);
  const tier: CraftTier = rollDivineUpgrade(baseTier, craftsmanshipLevel, rng) ? "divine" : baseTier;

  const possessionRoll = rollPossession(craftsmanshipLevel, rng);
  const possession: PossessionRoll = possessionRoll.cursed
    ? {
        cursed: true,
        curseLevel: possessionRoll.curseLevel,
        curseEffectIds: selectCurseEffects(possessionRoll.curseLevel, rng),
      }
    : { cursed: false };

  if (tier === "divine") {
    const pool = divineOutcomePoolFor(recipe.id);
    const divineOutcome = pool[Math.floor(rng() * pool.length)] ?? pool[0];
    if (!divineOutcome) throw new Error(`no Divine outcomes registered for recipe ${recipe.id}`);
    return { tier, divineOutcome, possession };
  }

  const rolledStats = computeTierStats(recipe, baseStatsForItem(recipe.output.itemId), tier, rng);
  return { tier, rolledStats, possession };
}
