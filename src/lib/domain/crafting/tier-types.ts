/**
 * Shared vocabulary for the quality-tier + curse roll system. Pure types and
 * constant tables only — the roll algorithms live in tier-roll.ts.
 */
import type { CraftTier } from "$lib/domain/rpg-types";
import type { CurseEffectId } from "./curse-effects";

export type { CraftTier, CurseEffectId };

/** Worst to best. Divine is never picked from this list directly (see tier-roll.ts). */
export const CRAFT_TIER_ORDER: readonly CraftTier[] = [
  "sloppy",
  "robust",
  "pristine",
  "masterwork",
  "fable",
  "divine",
];

export type PossessionRoll =
  | { readonly cursed: false }
  | { readonly cursed: true; readonly curseLevel: number; readonly curseEffectIds: readonly string[] };

export interface DivineOutcome {
  readonly id: string;
  readonly label: string;
  readonly statOverrides: Record<string, number>;
  readonly passiveIds?: readonly string[];
  readonly skillGrantIds?: readonly string[];
}

export interface CraftOutcomeRoll {
  readonly tier: CraftTier;
  /** Present for non-Divine tiers; Divine uses `divineOutcome` instead. */
  readonly rolledStats?: Record<string, number>;
  readonly divineOutcome?: DivineOutcome;
  readonly possession: PossessionRoll;
}
