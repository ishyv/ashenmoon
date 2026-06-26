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
    const result = checkCraft(slots({ stick: 1, flint_shard: 1, grass_fiber: 1 }), "flint_axe", away);
    expect(result.ok).toBe(true);
  });

  it("reports missing materials with shortfall detail", () => {
    const result = checkCraft(slots({ stick: 1 }), "flint_axe", away);
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
    const inv = slots({ stick: 1, flint_shard: 1, grass_fiber: 1 });
    expect(checkCraft(inv, "crude_knife", away)).toEqual({
      ok: false,
      reason: "requires_station",
      requiredContext: "primitive_work_surface",
    });
    expect(checkCraft(inv, "crude_knife", atWorkSurface).ok).toBe(true);
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
    const input = slots({ stick: 2, flint_shard: 1, grass_fiber: 1 });
    const result = resolveCraft(input, "flint_axe", away);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.slots).toEqual({
      stick: { qty: 1 },
      flint_axe: { qty: 1 },
    });
    expect(result.slots.flint_shard).toBeUndefined();
    expect(result.slots.grass_fiber).toBeUndefined();
    // input untouched
    expect(input).toEqual(slots({ stick: 2, flint_shard: 1, grass_fiber: 1 }));
  });

  it("stacks onto an existing output stack", () => {
    const result = resolveCraft(slots({ wood: 5, charcoal: 2 }), "charcoal", near);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 5 - 2 = 3 wood, charcoal 2 + 1 = 3
    expect(result.slots).toEqual({ wood: { qty: 3 }, charcoal: { qty: 3 } });
  });

  it("returns the failure unchanged when the craft is impossible", () => {
    expect(resolveCraft(slots({ stick: 1 }), "flint_axe", away)).toMatchObject({
      ok: false,
      reason: "insufficient_materials",
    });
  });
});
