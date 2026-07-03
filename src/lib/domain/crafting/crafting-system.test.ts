import { describe, expect, it } from "vitest";
import { canCraft, checkCraft, resolveCraft, type CraftSlots } from "./crafting-system";
import { assertValidCraftRecipes, getRecipe, validateCraftRecipes } from "./recipes";

const near = { isNearCampfire: true };
const away = { isNearCampfire: false };
const atWorkSurface = { isNearCampfire: false, stationId: "primitive_work_surface" as const };

function slots(map: Record<string, number>): CraftSlots {
  return Object.fromEntries(Object.entries(map).map(([id, qty]) => [id, { qty }]));
}

describe("recipe definitions", () => {
  it("validate against the item registry", () => {
    expect(validateCraftRecipes()).toEqual([]);
    expect(() => assertValidCraftRecipes()).not.toThrow();
  });

  it("flag unknown item ids", () => {
    const bad = [
      { id: "ghost", name: "Ghost", description: "", costs: [{ itemId: "nope", name: "Nope", required: 1 }], output: { itemId: "ghost", qty: 1 } },
    ] as any;
    const problems = validateCraftRecipes(bad, new Set(["ghost"]));
    expect(problems).toContain("recipe ghost cost references unknown item: nope");
  });
});

describe("checkCraft", () => {
  it("rejects unknown recipes", () => {
    expect(checkCraft(slots({}), "nonsense", near)).toEqual({ ok: false, reason: "unknown_recipe" });
  });

  it("succeeds when materials suffice", () => {
    const result = checkCraft(slots({ stick: 1, flint_shard: 1, grass_fiber: 1 }), "flint_axe", atWorkSurface);
    expect(result.ok).toBe(true);
  });

  it("reports missing materials with shortfall detail", () => {
    const result = checkCraft(slots({ stick: 1 }), "flint_axe", atWorkSurface);
    expect(result).toMatchObject({
      ok: false,
      reason: "insufficient_materials",
      missing: [
        { itemId: "flint_shard", required: 1, have: 0 },
        { itemId: "grass_fiber", required: 1, have: 0 },
      ],
    });
  });

  it("requires a campfire for smelting recipes", () => {
    const inv = slots({ copper_ore: 3, charcoal: 1 });
    expect(checkCraft(inv, "copper_ingot", away)).toEqual({ ok: false, reason: "requires_campfire" });
    expect(canCraft(inv, "copper_ingot", near)).toBe(true);
  });

  it("enforces station context for work-surface recipes", () => {
    const inv = slots({ dried_hide: 1, grass_cord: 2, bone_needle: 1 });
    expect(checkCraft(inv, "hide_footwraps", away)).toEqual({
      ok: false,
      reason: "requires_station",
      requiredContext: "primitive_work_surface",
    });
    expect(checkCraft(inv, "hide_footwraps", atWorkSurface).ok).toBe(true);
  });

  it("crude_knife is craftable at a work surface", () => {
    const inv = slots({ stick: 1, flint_shard: 1, grass_fiber: 1 });
    expect(checkCraft(inv, "crude_knife", atWorkSurface).ok).toBe(true);
  });

  it("tinder bundle is craftable from early dry leaves and bark", () => {
    const inv = slots({ dry_leaves: 4, bark: 1 });
    expect(checkCraft(inv, "tinder_bundle", away).ok).toBe(true);
  });

  it("crude dressing requires early forest dressing materials", () => {
    const inv = slots({ green_leaves: 2, moss: 1, grass_fiber: 2 });
    expect(checkCraft(inv, "moss_dressing", away).ok).toBe(true);
  });

  it("keeps recipe definitions descriptive enough for station and feedback UI", () => {
    expect(getRecipe("crude_knife")).toMatchObject({
      category: "tools",
      requiredContext: "primitive_work_surface",
      process: "assemble",
      discoverable: true,
      feedbackTags: expect.arrayContaining(["binding", "tool"]),
    });
  });
});

describe("resolveCraft", () => {
  it("deducts costs and adds the output without mutating input", () => {
    // bone_needle is not authored with tiered: true — flat qty-stack behavior.
    const input = slots({ small_bone: 2, flint_shard: 1 });
    const result = resolveCraft(input, "bone_needle", atWorkSurface);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.slots).toEqual({
      small_bone: { qty: 1 },
      bone_needle: { qty: 1 },
    });
    expect(result.slots.flint_shard).toBeUndefined();
    // input untouched
    expect(input).toEqual(slots({ small_bone: 2, flint_shard: 1 }));
  });

  it("stacks onto an existing output stack", () => {
    const result = resolveCraft(slots({ wood: 5, charcoal: 2 }), "charcoal", near);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 5 - 2 = 3 wood, charcoal 2 + 1 = 3
    expect(result.slots).toEqual({ wood: { qty: 3 }, charcoal: { qty: 3 } });
  });

  it("returns the failure unchanged when the craft is impossible", () => {
    expect(resolveCraft(slots({ stick: 1 }), "flint_axe", atWorkSurface)).toMatchObject({
      ok: false,
      reason: "insufficient_materials",
    });
  });
});

describe("resolveCraft (tiered recipes)", () => {
  // flint_axe is authored with tiered: true and requiredContext: "primitive_work_surface".
  const input = slots({ stick: 2, flint_shard: 1, grass_fiber: 1 });

  it("produces an instances-shaped output slot instead of a flat qty stack", () => {
    const result = resolveCraft(input, "flint_axe", { ...atWorkSurface, craftsmanshipLevel: 1, rng: () => 0.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outputSlot = result.slots.flint_axe;
    expect(outputSlot && "instances" in outputSlot).toBe(true);
    if (!outputSlot || !("instances" in outputSlot)) return;
    expect(outputSlot.instances).toHaveLength(1);
    expect(outputSlot.instances[0]?.tier).toBeDefined();
    // input untouched
    expect(input).toEqual(slots({ stick: 2, flint_shard: 1, grass_fiber: 1 }));
  });

  it("appends a new instance onto an existing instances stack rather than replacing it", () => {
    const withExisting = {
      ...slots({ stick: 2, flint_shard: 1, grass_fiber: 1 }),
      flint_axe: { instances: [{ instanceId: "prior", durability: 80, tier: "sloppy" as const }] },
    };
    const result = resolveCraft(withExisting, "flint_axe", { ...atWorkSurface, craftsmanshipLevel: 1, rng: () => 0.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const outputSlot = result.slots.flint_axe;
    if (!outputSlot || !("instances" in outputSlot)) throw new Error("expected instances slot");
    expect(outputSlot.instances).toHaveLength(2);
    expect(outputSlot.instances[0]?.instanceId).toBe("prior");
  });

  it("reaches fable only when ctx carries attended-and-played, not on an otherwise-identical unattended craft", () => {
    const rng = () => 0.999999; // biases toward the last (best) weighted candidate whenever it's in the pool
    const unattended = resolveCraft(input, "flint_axe", { ...atWorkSurface, craftsmanshipLevel: 20, rng });
    expect(unattended.ok).toBe(true);
    if (!unattended.ok) return;
    const unattendedSlot = unattended.slots.flint_axe;
    const unattendedTier = unattendedSlot && "instances" in unattendedSlot ? unattendedSlot.instances[0]?.tier : undefined;
    expect(unattendedTier).not.toBe("fable");

    const attended = resolveCraft(input, "flint_axe", {
      ...atWorkSurface,
      craftsmanshipLevel: 20,
      rng,
      attended: true,
      played: true,
      minigamePerformance: 1,
    });
    expect(attended.ok).toBe(true);
    if (!attended.ok) return;
    const attendedSlot = attended.slots.flint_axe;
    const attendedTier = attendedSlot && "instances" in attendedSlot ? attendedSlot.instances[0]?.tier : undefined;
    expect(attendedTier).toBe("fable");
  });

  it("leaves non-tiered recipes byte-identical to the flat-stack behavior (regression guard)", () => {
    // charcoal is not authored with tiered: true; craftsmanshipLevel/rng in ctx must be no-ops for it.
    const result = resolveCraft(slots({ wood: 5, charcoal: 2 }), "charcoal", {
      isNearCampfire: true,
      craftsmanshipLevel: 20,
      rng: () => 0.01,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slots).toEqual({ wood: { qty: 3 }, charcoal: { qty: 3 } });
  });
});
