import { describe, expect, it } from "vitest";
import {
  createCampfireState,
  detectCampClusters,
  shelterExposureMitigation,
  tickCampfire,
  tickDryingRack,
  type CampStructure,
  type DryingRackState,
} from "./camp-state";

describe("campfire state", () => {
  it("burns fuel while lit and goes out when fuel is exhausted", () => {
    const started = createCampfireState({ fuelRemainingMs: 1_000, isLit: true });

    const next = tickCampfire(started, 1.5, { raining: false, sheltered: false });

    expect(next.isLit).toBe(false);
    expect(next.fuelRemainingMs).toBe(0);
  });

  it("keeps heat and light radius only while lit", () => {
    expect(createCampfireState({ isLit: true }).heatRadiusPx).toBeGreaterThan(0);
    expect(tickCampfire(createCampfireState({ isLit: false }), 1, { raining: false, sheltered: false }).heatRadiusPx).toBe(0);
  });

  it("rain makes an exposed fire burn down faster and wetter", () => {
    const base = createCampfireState({ fuelRemainingMs: 10_000, isLit: true });

    const dry = tickCampfire(base, 1, { raining: false, sheltered: false });
    const wet = tickCampfire(base, 1, { raining: true, sheltered: false });

    expect(wet.fuelRemainingMs).toBeLessThan(dry.fuelRemainingMs);
    expect(wet.wetness).toBeGreaterThan(dry.wetness);
  });
});

describe("drying rack state", () => {
  it("progresses exposed slots while dry and reverses while raining", () => {
    const rack: DryingRackState = {
      slots: [{ inputItemId: "raw_meat", outputItemId: "dried_meat", progressMs: 2_000, requiredMs: 10_000 }],
      exposedToRain: true,
    };

    const dry = tickDryingRack(rack, 1, { raining: false });
    const rainy = tickDryingRack(rack, 1, { raining: true });

    expect(dry.slots[0]?.progressMs).toBeGreaterThan(2_000);
    expect(rainy.slots[0]?.progressMs).toBeLessThan(2_000);
  });
});

describe("camp clusters", () => {
  it("detects camp when campfire and another camp structure are close", () => {
    const structures: CampStructure[] = [
      { id: "a", type: "campfire", x: 100, y: 100 },
      { id: "b", type: "primitive_work_surface", x: 180, y: 110 },
      { id: "c", type: "drying_rack", x: 700, y: 700 },
    ];

    expect(detectCampClusters(structures, 220)).toEqual([
      {
        campfireId: "a",
        structureIds: ["a", "b"],
        center: { x: 140, y: 105 },
      },
    ]);
  });

  it("shelter reduces cold and rain exposure within radius", () => {
    const mitigation = shelterExposureMitigation(
      { id: "shelter", type: "crude_shelter", x: 0, y: 0, protectionRadiusPx: 160, coldResistanceBonus: 0.35, rainProtection: 0.5 },
      { x: 80, y: 0 },
    );

    expect(mitigation.coldMultiplier).toBeCloseTo(0.65);
    expect(mitigation.rainMultiplier).toBeCloseTo(0.5);
  });
});
