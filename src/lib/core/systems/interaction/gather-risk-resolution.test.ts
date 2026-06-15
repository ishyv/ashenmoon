import { describe, expect, it } from "vitest";
import { StatusId } from "$lib/domain/systems/status-types";
import { resolveGatherRiskForInteraction } from "./gather-risk-resolution";

describe("resolveGatherRiskForInteraction", () => {
  it("returns null when there is no gatherable id", () => {
    expect(resolveGatherRiskForInteraction({ gatherableId: null, equippedToolId: null })).toBeNull();
  });

  it("returns null when the gatherable is unknown", () => {
    expect(
      resolveGatherRiskForInteraction({
        gatherableId: "missing_gatherable",
        equippedToolId: null,
        rng: () => 0,
      }),
    ).toBeNull();
  });

  it("maps bare-handed cuts to wound outcomes", () => {
    expect(
      resolveGatherRiskForInteraction({
        gatherableId: "flint_shard_pickup",
        equippedToolId: null,
        rng: () => 0,
      }),
    ).toEqual({
      kind: "wound",
      status: StatusId.Cut,
      woundSeverity: "cut",
      durationSec: 20,
      toolQuality: 0,
      feedbackText: "cut",
      knowledgeItemId: "flint_shard",
    });
  });

  it("skips bare-hand-only risks when a tool is equipped", () => {
    expect(
      resolveGatherRiskForInteraction({
        gatherableId: "flint_shard_pickup",
        equippedToolId: "stone_axe",
        rng: () => 0,
      }),
    ).toBeNull();
  });

  it("maps poison risks to status outcomes", () => {
    expect(
      resolveGatherRiskForInteraction({
        gatherableId: "mushroom_patch",
        equippedToolId: null,
        rng: () => 0,
      }),
    ).toEqual({
      kind: "status",
      status: StatusId.Poison,
      durationSec: 30,
      feedbackText: "poison",
    });
  });
});
