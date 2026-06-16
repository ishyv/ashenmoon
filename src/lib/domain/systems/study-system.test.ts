import { describe, expect, it } from "vitest";
import { resolveStudyBlueprint } from "./study-system";

function slots(map: Record<string, number>) {
  return Object.fromEntries(Object.entries(map).map(([id, qty]) => [id, { qty }]));
}

describe("resolveStudyBlueprint", () => {
  it("consumes the blueprint and returns its recipeId", () => {
    const inv = slots({ blueprint_twist_bark_rope: 1 });
    const result = resolveStudyBlueprint(inv, "blueprint_twist_bark_rope");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipeId).toBe("twist_bark_rope");
    expect(result.slots["blueprint_twist_bark_rope"]).toBeUndefined();
  });

  it("decrements qty when more than one blueprint is held", () => {
    const inv = slots({ blueprint_twist_bark_rope: 3 });
    const result = resolveStudyBlueprint(inv, "blueprint_twist_bark_rope");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.slots["blueprint_twist_bark_rope"] as { qty: number }).qty).toBe(2);
  });

  it("fails when the item is not in inventory", () => {
    const result = resolveStudyBlueprint(slots({}), "blueprint_twist_bark_rope");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_in_inventory");
  });

  it("fails when the item is not a blueprint", () => {
    const result = resolveStudyBlueprint(slots({ stick: 5 }), "stick");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_a_blueprint");
  });
});
