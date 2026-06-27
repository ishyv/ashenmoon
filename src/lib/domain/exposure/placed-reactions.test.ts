import { describe, expect, it } from "vitest";
import {
  reactionsFor,
  tickPlacedReactions,
  type PlacedExposureContext,
  type PlacedReactionState,
} from "./placed-reactions";
import { ITEM_DEFINITIONS } from "$lib/domain/items";

function ground(
  opts: { radiantHeat?: number; wetness?: number; ambientTemp?: number } = {},
): PlacedExposureContext {
  return {
    location: "ground",
    ambientTemp: opts.ambientTemp ?? 20,
    radiantHeat: opts.radiantHeat ?? 0,
    wetness: opts.wetness ?? 0,
  };
}

function placed(itemId: string, progress: Record<string, number> = {}): PlacedReactionState {
  return { itemId, qty: 1, progress };
}

describe("tickPlacedReactions — cooking by heat", () => {
  it("cooks raw meat held at sustained radiant heat into cooked meat", () => {
    const res = tickPlacedReactions(placed("raw_meat"), ground({ radiantHeat: 600 }), 8);
    const fact = res.facts.find((f) => f.kind === "transformed");
    expect(fact).toEqual({
      kind: "transformed",
      reactionId: "cook",
      intoItemId: "cooked_meat",
      learned: null,
    });
    expect(res.next.itemId).toBe("cooked_meat");
  });

  it("does not accumulate decay while meat is cooking near fire", () => {
    const res = tickPlacedReactions(placed("raw_meat"), ground({ radiantHeat: 600 }), 4);
    expect(res.next.progress.cook).toBeCloseTo(4);
    expect(res.next.progress.decay ?? 0).toBe(0);
    expect(res.facts.some((f) => f.kind === "transformed")).toBe(false);
  });

  it("spoils meat away from heat instead of cooking it", () => {
    // raw_meat decay lifespan is 180s; one long tick crosses it with no heat.
    const res = tickPlacedReactions(placed("raw_meat"), ground({ radiantHeat: 0 }), 180);
    const fact = res.facts.find((f) => f.kind === "transformed");
    expect(fact).toMatchObject({ reactionId: "decay", intoItemId: "spoiled_meat", learned: "perishable" });
    expect(res.next.itemId).toBe("spoiled_meat");
  });

  it("never cooks and decays in the same conditions (mutually exclusive)", () => {
    const cold = tickPlacedReactions(placed("raw_meat"), ground({ radiantHeat: 0 }), 5);
    expect(cold.next.progress.decay).toBeCloseTo(5);
    expect(cold.next.progress.cook ?? 0).toBe(0);

    const hot = tickPlacedReactions(placed("raw_meat"), ground({ radiantHeat: 600 }), 5);
    expect(hot.next.progress.cook).toBeCloseTo(5);
    expect(hot.next.progress.decay ?? 0).toBe(0);
  });
});

describe("tickPlacedReactions — moisture loop", () => {
  it("dampens exposed firewood in rain into damp firewood", () => {
    const res = tickPlacedReactions(placed("firewood_bundle"), ground({ wetness: 1 }), 30);
    expect(res.facts.find((f) => f.kind === "transformed")).toMatchObject({
      reactionId: "dampen",
      intoItemId: "damp_firewood",
    });
    expect(res.next.itemId).toBe("damp_firewood");
  });

  it("does not dampen firewood when it is dry (wetness below threshold)", () => {
    const res = tickPlacedReactions(placed("firewood_bundle"), ground({ wetness: 0 }), 60);
    expect(res.facts.some((f) => f.kind === "transformed")).toBe(false);
    expect(res.next.itemId).toBe("firewood_bundle");
  });

  it("dries damp firewood back to firewood near moderate heat", () => {
    // radiant 120 -> temp 140: above dryTemp 120, below ignition 250.
    const res = tickPlacedReactions(placed("damp_firewood"), ground({ radiantHeat: 120 }), 12);
    expect(res.facts.find((f) => f.kind === "transformed")).toMatchObject({
      reactionId: "dry",
      intoItemId: "firewood_bundle",
    });
  });

  it("does not dry damp firewood with no heat, and inactive progress decays toward zero", () => {
    const res = tickPlacedReactions(placed("damp_firewood", { dry: 5 }), ground({ radiantHeat: 0 }), 2);
    expect(res.facts.some((f) => f.kind === "transformed")).toBe(false);
    expect(res.next.progress.dry).toBeCloseTo(3);
  });
});

describe("tickPlacedReactions — legacy parity", () => {
  it("hardens clay held at radiant heat", () => {
    const res = tickPlacedReactions(placed("clay"), ground({ radiantHeat: 600 }), 2.5);
    expect(res.facts.find((f) => f.kind === "transformed")).toMatchObject({
      reactionId: "temperature",
      intoItemId: "hardened_clay",
      learned: "heat_sensitive",
    });
  });

  it("warns once for a smoldering branch then transforms to charcoal", () => {
    const warn = tickPlacedReactions(placed("branch"), ground({ radiantHeat: 600 }), 1.2);
    expect(warn.facts).toContainEqual({ kind: "warned", reactionId: "ignite", warning: "smoldering..." });

    // already past the warn point: no second warning, not yet transformed.
    const cont = tickPlacedReactions(placed("branch", { ignite: 1.5 }), ground({ radiantHeat: 600 }), 0.6);
    expect(cont.facts.some((f) => f.kind === "warned")).toBe(false);
    expect(cont.facts.some((f) => f.kind === "transformed")).toBe(false);

    const done = tickPlacedReactions(placed("branch", { ignite: 2.0 }), ground({ radiantHeat: 600 }), 0.6);
    expect(done.facts.find((f) => f.kind === "transformed")).toMatchObject({
      reactionId: "ignite",
      intoItemId: "charcoal",
      learned: "flammable",
    });
  });

  it("sealed items take only ambient temperature and do not ignite near fire", () => {
    const ctx: PlacedExposureContext = { location: "sealed", ambientTemp: 20, radiantHeat: 600, wetness: 0 };
    const res = tickPlacedReactions(placed("branch"), ctx, 1.0);
    expect(res.facts).toHaveLength(0);
    expect(res.next.progress.ignite ?? 0).toBe(0);
  });

  it("decays berries twice as fast near heat (legacy rate)", () => {
    const res = tickPlacedReactions(placed("berries", { decay: 10 }), ground({ radiantHeat: 600 }), 5);
    expect(res.next.progress.decay).toBeCloseTo(20);
  });
});

describe("reactionsFor", () => {
  it("exposes cook and decay descriptors for raw meat with their thresholds", () => {
    const ids = reactionsFor(ITEM_DEFINITIONS.raw_meat!).map((d) => d.id);
    expect(ids).toContain("cook");
    expect(ids).toContain("decay");
  });

  it("returns no descriptors for an inert item", () => {
    expect(reactionsFor(ITEM_DEFINITIONS.stone!)).toEqual([]);
  });
});
