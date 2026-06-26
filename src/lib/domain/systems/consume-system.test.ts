import { describe, expect, it } from "vitest";
import { resolveConsume } from "./consume-system";
import { ITEM_DEFINITIONS } from "$lib/domain/items/item-definitions";
import { StatusId } from "./status-types";

const dirtyWater = ITEM_DEFINITIONS.dirty_water!;
const cleanWater = ITEM_DEFINITIONS.clean_water!;
const panacea = ITEM_DEFINITIONS.debug_panacea!;
const stone = ITEM_DEFINITIONS.stone!;
const cookedMeat = ITEM_DEFINITIONS.cooked_meat!;
const berries = ITEM_DEFINITIONS.berries!;

describe("resolveConsume", () => {
  it("returns null for non-consumable items", () => {
    expect(resolveConsume(stone, () => 0.5)).toBeNull();
  });

  it("dirty water restores thirst and sickens when the roll lands", () => {
    const outcome = resolveConsume(dirtyWater, () => 0.0)!;
    expect(outcome.verb).toBe("drink");
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_thirst", amount: 35 });
    expect(outcome.holderCommands).toContainEqual({
      kind: "add_status",
      status: StatusId.Sickness,
      durationSec: 60,
    });
  });

  it("dirty water spares the player when the roll misses", () => {
    const outcome = resolveConsume(dirtyWater, () => 0.99)!;
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_thirst", amount: 35 });
    expect(outcome.holderCommands.some((c) => c.kind === "add_status")).toBe(false);
  });

  it("clean water never sickens", () => {
    const outcome = resolveConsume(cleanWater, () => 0.0)!;
    expect(outcome.holderCommands).toEqual([{ kind: "restore_thirst", amount: 60 }]);
  });

  it("debug panacea clears statuses and restores everything", () => {
    const outcome = resolveConsume(panacea, () => 0.0)!;
    expect(outcome.holderCommands).toContainEqual({ kind: "clear_all_statuses" });
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_thirst", amount: 100 });
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_hp", amount: 100 });
  });

  it("cooked meat restores hp and hunger", () => {
    const outcome = resolveConsume(cookedMeat, () => 0.0)!;
    expect(outcome.verb).toBe("eat");
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_hp", amount: 12 });
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_hunger", amount: 30 });
  });

  it("berries restore hp and hunger", () => {
    const outcome = resolveConsume(berries, () => 0.0)!;
    expect(outcome.verb).toBe("eat");
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_hp", amount: 2 });
    expect(outcome.holderCommands).toContainEqual({ kind: "restore_hunger", amount: 5 });
  });
});
