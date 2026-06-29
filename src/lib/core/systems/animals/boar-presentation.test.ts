import { describe, expect, it } from "vitest";
import { buildBoarTelegraphCue } from "$lib/core/systems/animals/boar-presentation";
import { BOAR_COMBAT_TUNING, type BoarCombatRuntime } from "$lib/domain/combat/enemies/boar-combat";

function runtime(overrides: Partial<BoarCombatRuntime>): BoarCombatRuntime {
  return {
    state: "charge_windup",
    stateElapsedMs: 0,
    position: { x: 0, y: 0 },
    lockedDirection: { x: 1, y: 0 },
    chargeDistancePx: 0,
    ...overrides,
  };
}

describe("boar telegraph presentation cues", () => {
  it("does not show a telegraph outside locked windup", () => {
    expect(buildBoarTelegraphCue(runtime({ state: "threaten" }))).toBeNull();
    expect(buildBoarTelegraphCue(runtime({ lockedDirection: null }))).toBeNull();
  });

  it("ramps urgency during windup so the final charge moment reads hotter", () => {
    const early = buildBoarTelegraphCue(runtime({ stateElapsedMs: 0 }));
    const late = buildBoarTelegraphCue(runtime({ stateElapsedMs: BOAR_COMBAT_TUNING.chargeWindupMs }));

    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(late!.dangerAlpha).toBeGreaterThan(early!.dangerAlpha);
    expect(late!.coreWidthPx).toBeGreaterThanOrEqual(early!.coreWidthPx);
  });

  it("uses combat range rather than a magic tile multiplier for line length", () => {
    const cue = buildBoarTelegraphCue(runtime({}));

    expect(cue?.lengthPx).toBe(BOAR_COMBAT_TUNING.chargeMaxDistancePx);
  });
});
