/**
 * Hand-authored Divine outcomes. Divine never uses the generic per-tier
 * multiplier formula (tier-stats.ts) — it's meant to be a miracle, not
 * "Pristine but bigger numbers", so every possible Divine result is a
 * distinct, curated template. Starts as a small generic pool (not tied to a
 * specific recipe); per-recipe curated Divine outcomes can be added later by
 * keying additional entries into RECIPE_DIVINE_OUTCOMES.
 */
import type { DivineOutcome } from "./tier-types";

export const GENERIC_DIVINE_OUTCOMES: readonly DivineOutcome[] = [
  {
    id: "the_whetted_fang",
    label: "the whetted fang",
    statOverrides: { damage: 220, critChance: 15 },
    passiveIds: ["bleed_on_crit"],
  },
  {
    id: "the_last_ember",
    label: "the last ember",
    statOverrides: { warmth: 80, coldResist: 40 },
    passiveIds: ["never_extinguishes"],
  },
  {
    id: "the_patient_hand",
    label: "the patient hand",
    statOverrides: { durability: 999, power: 60 },
    skillGrantIds: ["craftsmanship_mastery_pulse"],
  },
  {
    id: "the_hollow_promise",
    label: "the hollow promise",
    statOverrides: { protection: 90, stealth: 25 },
    passiveIds: ["silent_step"],
  },
];

/** Per-recipe curated Divine pools, keyed by recipe id. Falls back to the generic pool when absent. */
export const RECIPE_DIVINE_OUTCOMES: Readonly<Record<string, readonly DivineOutcome[]>> = {};

/** Which Divine outcome pool applies to a given recipe. */
export function divineOutcomePoolFor(recipeId: string): readonly DivineOutcome[] {
  return RECIPE_DIVINE_OUTCOMES[recipeId] ?? GENERIC_DIVINE_OUTCOMES;
}
