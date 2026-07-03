import { describe, expect, it } from "vitest";
import {
  masteryScore,
  materialQualityScore,
  rollCraftTier,
  rollDivineUpgrade,
  rollPossession,
  selectCurseEffects,
  rollCraftOutcome,
  MAX_CURSE_LEVEL,
} from "./tier-roll";
import { GENERIC_DIVINE_OUTCOMES } from "./divine-outcomes";
import type { CraftRecipe } from "./recipe-types";
import type { CraftTier } from "$lib/domain/rpg-types";

/** Deterministic rng that yields a fixed sequence; throws if over-consumed so a wrong call count fails loudly. */
function queueRng(values: readonly number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`queueRng exhausted after ${i} calls`);
    return values[i++]!;
  };
}

const testRecipe: CraftRecipe = {
  id: "test_recipe",
  name: "Test Recipe",
  description: "",
  costs: [],
  output: { itemId: "wood", qty: 1 }, // "wood" has zero scalable traits -> defaultTierStats consumes 0 rng calls
  tiered: true,
};

describe("masteryScore", () => {
  it("is 0 at level 1 and 1 at the level cap", () => {
    expect(masteryScore(1)).toBe(0);
    expect(masteryScore(20)).toBe(1);
  });

  it("is clamped for out-of-range levels", () => {
    expect(masteryScore(0)).toBe(0);
    expect(masteryScore(999)).toBe(1);
  });
});

describe("rollCraftTier", () => {
  it("never selects fable when the combined score is below the gate", () => {
    // level 1 + no material bonus => score well under the 0.55 gate.
    for (let i = 0; i <= 10; i++) {
      const tier = rollCraftTier(1, 0, queueRng([i / 10]));
      expect(tier).not.toBe("fable");
    }
  });

  it("stays capped below fable when score clears the gate but the craft is unattended", () => {
    // level 20 + full material bonus => score 1.0, well over the gate, but no attendance passed.
    // A near-1 roll would land on fable if it were in the pool — proves the gate excludes it regardless of score.
    const tier = rollCraftTier(20, 1, queueRng([0.999999]));
    expect(tier).not.toBe("fable");
  });

  it("can select fable once score clears the gate AND the craft was attended and played", () => {
    const tier = rollCraftTier(20, 1, queueRng([0.999999]), { attended: true, played: true, minigamePerformance: 1 });
    expect(tier).toBe("fable");
  });

  it("stays capped below fable when attended and played but the score is below the gate", () => {
    // Attendance alone is not a bypass — the score half of the AND is still enforced.
    const tier = rollCraftTier(1, 0, queueRng([0.999999]), { attended: true, played: true, minigamePerformance: 1 });
    expect(tier).not.toBe("fable");
  });

  it("stays capped below fable when attended but never played a window", () => {
    const tier = rollCraftTier(20, 1, queueRng([0.999999]), { attended: true, played: false, minigamePerformance: 0 });
    expect(tier).not.toBe("fable");
  });

  it("always returns one of the five non-divine tiers", () => {
    const tiers: CraftTier[] = ["sloppy", "robust", "pristine", "masterwork", "fable"];
    for (let i = 0; i < 20; i++) {
      const tier = rollCraftTier(10, 0.5, queueRng([i / 20]));
      expect(tiers).toContain(tier);
    }
  });

  it("is byte-identical to the pre-attendance formula when attendance is omitted, false, or unplayed", () => {
    for (const roll of [0, 0.1, 0.25, 0.5, 0.75, 0.999999]) {
      const baseline = rollCraftTier(12, 0.4, queueRng([roll]));
      expect(rollCraftTier(12, 0.4, queueRng([roll]), { attended: false, played: false, minigamePerformance: 0 })).toBe(baseline);
      expect(rollCraftTier(12, 0.4, queueRng([roll]), { attended: true, played: false, minigamePerformance: 1 })).toBe(baseline);
    }
  });
});

describe("rollDivineUpgrade", () => {
  it("is always false for a non-fable tier, regardless of the roll", () => {
    expect(rollDivineUpgrade("masterwork", 20, queueRng([]))).toBe(false);
    expect(rollDivineUpgrade("sloppy", 20, queueRng([]))).toBe(false);
  });

  it("can upgrade a fable result to divine on a favorable roll", () => {
    expect(rollDivineUpgrade("fable", 20, queueRng([0.0001]))).toBe(true);
  });

  it("rejects an unfavorable roll even at max mastery", () => {
    expect(rollDivineUpgrade("fable", 20, queueRng([0.999]))).toBe(false);
  });

  it("is harder to trigger at low mastery than at high mastery", () => {
    // A roll that succeeds at max mastery should fail at level 1's lower chance.
    const roll = 0.03;
    expect(rollDivineUpgrade("fable", 20, queueRng([roll]))).toBe(true);
    expect(rollDivineUpgrade("fable", 1, queueRng([roll]))).toBe(false);
  });
});

describe("rollPossession", () => {
  it("chance rises with mastery: a roll that misses at level 1 can hit at level 20", () => {
    const roll = 0.05;
    expect(rollPossession(1, queueRng([roll])).cursed).toBe(false);
    // At level 20 the same roll clears the (now higher) chance threshold, so a second
    // rng() call happens for the curse-level ceiling roll.
    expect(rollPossession(20, queueRng([roll, 0])).cursed).toBe(true);
  });

  it("curse level ceiling rises with mastery", () => {
    const result = rollPossession(20, queueRng([0, 0.999999]));
    expect(result.cursed).toBe(true);
    if (!result.cursed) return;
    expect(result.curseLevel).toBeLessThanOrEqual(MAX_CURSE_LEVEL);
    expect(result.curseLevel).toBeGreaterThanOrEqual(1);
  });

  it("low mastery caps curse level at the level-1 ceiling", () => {
    const result = rollPossession(1, queueRng([0, 0.999999]));
    expect(result.cursed).toBe(true);
    if (!result.cursed) return;
    expect(result.curseLevel).toBe(1); // ceiling is 1 at zero mastery
  });
});

describe("selectCurseEffects", () => {
  it("picks exactly one effect at low curse level", () => {
    const effects = selectCurseEffects(1, queueRng([0.5]));
    expect(effects.length).toBe(1);
  });

  it("picks three to five effects at high curse level, all distinct", () => {
    // rng[0] rolls the count (3 + floor(0.99*3) = 5); the remaining 5 values each pick one effect.
    const effects = selectCurseEffects(5, queueRng([0.99, 0.1, 0.2, 0.3, 0.4, 0.5]));
    expect(effects.length).toBe(5);
    expect(new Set(effects).size).toBe(effects.length);
  });
});

describe("rollCraftOutcome", () => {
  it("only reaches divine by first rolling fable (attended and played), then a successful divine upgrade", () => {
    // 1) tier pick -> fable (near-1 roll, score cleared via max mastery, attended+played)
    // 2) divine upgrade roll -> succeeds
    // 3) possession chance roll -> misses (cursed: false, no further roll consumed)
    // 4) divine outcome pool pick -> index 0
    const outcome = rollCraftOutcome(
      testRecipe, {}, 20, queueRng([0.999999, 0.0001, 0.5, 0]),
      { attended: true, played: true, minigamePerformance: 1 },
    );
    expect(outcome.tier).toBe("divine");
    expect(outcome.divineOutcome).toEqual(GENERIC_DIVINE_OUTCOMES[0]);
    expect(outcome.possession).toEqual({ cursed: false });
    expect(outcome.rolledStats).toBeUndefined();
  });

  it("cannot reach divine (or fable) on an otherwise-identical unattended craft", () => {
    // Same rng sequence as the attended case above, but no attendance passed —
    // tier pick lands on masterwork instead of fable, so no divine-upgrade roll is
    // even attempted (rollDivineUpgrade short-circuits for a non-fable tier).
    const outcome = rollCraftOutcome(testRecipe, {}, 20, queueRng([0.999999, 0.5]));
    expect(outcome.tier).not.toBe("fable");
    expect(outcome.tier).not.toBe("divine");
  });

  it("rolls normal tier stats when no divine upgrade happens", () => {
    // 1) tier pick -> masterwork (fable gated out at low score)
    // 2) no divine-upgrade roll consumed (tier isn't fable)
    // 3) possession chance roll -> misses
    // "wood" has no scalable base stats, so computeTierStats consumes zero further rng calls.
    const outcome = rollCraftOutcome(testRecipe, {}, 1, queueRng([0.999999, 0.99]));
    expect(outcome.tier).toBe("masterwork");
    expect(outcome.rolledStats).toEqual({});
    expect(outcome.possession).toEqual({ cursed: false });
    expect(outcome.divineOutcome).toBeUndefined();
  });
});

describe("materialQualityScore", () => {
  const recipe: CraftRecipe = {
    id: "test_recipe_mats",
    name: "Test",
    description: "",
    costs: [{ itemId: "wood", name: "Wood", required: 1 }],
    output: { itemId: "wood", qty: 1 },
  };

  it("defaults to neutral 0.5 when no tiered material is present", () => {
    expect(materialQualityScore({}, recipe)).toBe(0.5);
    expect(materialQualityScore({ wood: { qty: 3 } }, recipe)).toBe(0.5);
  });

  it("reflects the tier of consumed tiered materials", () => {
    const slots = {
      wood: { instances: [{ instanceId: "a", durability: 100, tier: "divine" as CraftTier }] },
    };
    expect(materialQualityScore(slots, recipe)).toBe(1);
  });
});
