import { describe, expect, it } from "vitest";
import { StatusId } from "$lib/domain/systems/status-types";
import {
  M3_CARCASS_DEFINITIONS,
  resolveCarcassProcessing,
  resolveCarcassToolQuality,
  resolveSpoilageStage,
  type CarcassRuntimeState,
} from "./carcass-processing";

function freshRabbit(): CarcassRuntimeState {
  return {
    speciesId: "rabbit",
    state: "fresh",
    ageSec: 0,
    processedActions: [],
  };
}

describe("M3 carcass processing", () => {
  it("defines rabbit carcass yields as processing actions instead of instant loot", () => {
    const rabbit = M3_CARCASS_DEFINITIONS.rabbit;

    expect(rabbit.actions.harvest_meat.yields).toContainEqual({ itemId: "raw_small_meat", qty: 1 });
    expect(rabbit.actions.remove_hide.yields).toContainEqual({ itemId: "rabbit_pelt", qty: 1 });
    expect(rabbit.actions.extract_bone.yields).toContainEqual({ itemId: "small_bone", qty: 1 });
  });

  it("makes crude knife processing faster and cleaner than bare hands", () => {
    const bare = resolveCarcassProcessing({
      carcass: freshRabbit(),
      action: "harvest_meat",
      toolQuality: "bare_hands",
    });
    const knife = resolveCarcassProcessing({
      carcass: freshRabbit(),
      action: "harvest_meat",
      toolQuality: "crude_knife",
    });

    expect(bare.ok).toBe(true);
    expect(knife.ok).toBe(true);
    if (!bare.ok || !knife.ok) return;
    expect(knife.durationSec).toBeLessThan(bare.durationSec);
    expect(knife.risks.find((risk) => risk.status === StatusId.Cut)?.chance).toBeLessThan(
      bare.risks.find((risk) => risk.status === StatusId.Cut)?.chance ?? 1,
    );
    expect(knife.yields).toEqual([{ itemId: "raw_small_meat", qty: 1 }]);
  });

  it("does not allow the same carcass action to be processed twice", () => {
    const result = resolveCarcassProcessing({
      carcass: {
        ...freshRabbit(),
        processedActions: ["harvest_meat"],
      },
      action: "harvest_meat",
      toolQuality: "crude_knife",
    });

    expect(result).toEqual({
      ok: false,
      reason: "already_processed",
      feedback: "nothing useful remains for that cut.",
    });
  });

  it("rots old carcasses enough to block useful processing", () => {
    const result = resolveCarcassProcessing({
      carcass: {
        ...freshRabbit(),
        state: "rotten",
        ageSec: 999,
      },
      action: "harvest_meat",
      toolQuality: "crude_knife",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("rotten");
  });

  it("ages raw meat into spoiled and then rotten meat", () => {
    expect(resolveSpoilageStage("raw_meat", 0)?.itemId).toBe("raw_meat");
    expect(resolveSpoilageStage("raw_meat", 181)?.itemId).toBe("spoiled_meat");
    expect(resolveSpoilageStage("raw_meat", 421)?.itemId).toBe("rotten_meat");
  });

  it("resolves carcass tool quality from equipped tool and available sharp flint", () => {
    expect(resolveCarcassToolQuality({ equippedItemId: "crude_knife", hasSharpFlint: false })).toBe("crude_knife");
    expect(resolveCarcassToolQuality({ equippedItemId: null, hasSharpFlint: true })).toBe("sharp_flint");
    expect(resolveCarcassToolQuality({ equippedItemId: null, hasSharpFlint: false })).toBe("bare_hands");
  });
});
