import { describe, expect, it } from "vitest";
import { gatherWoundChance, rollGatherWound, type GatherNodeKind } from "./gather-risk";
import { StatusId } from "$lib/domain/systems/status-types";

const always = () => 0; // roll below any chance -> wound fires
const never = () => 0.999; // roll above any chance -> no wound

describe("gatherWoundChance", () => {
  it("ranks hard nodes riskier than foliage", () => {
    expect(gatherWoundChance("stone")).toBeGreaterThan(gatherWoundChance("twig"));
    expect(gatherWoundChance("ore")).toBeGreaterThan(gatherWoundChance("tree"));
  });
});

describe("rollGatherWound", () => {
  it("never wounds when a tool is equipped", () => {
    for (const nodeKind of ["stone", "ore", "twig", "tree", "forage"] as GatherNodeKind[]) {
      expect(rollGatherWound({ hasTool: true, nodeKind }, always)).toBeNull();
    }
  });

  it("cuts on hard nodes gathered bare-handed", () => {
    expect(rollGatherWound({ hasTool: false, nodeKind: "stone" }, always)).toEqual({
      status: StatusId.Cut,
      durationSec: 20,
    });
    expect(rollGatherWound({ hasTool: false, nodeKind: "ore" }, always)?.status).toBe(StatusId.Cut);
  });

  it("draws bleeding on soft nodes gathered bare-handed", () => {
    expect(rollGatherWound({ hasTool: false, nodeKind: "forage" }, always)).toEqual({
      status: StatusId.Bleeding,
      durationSec: 15,
    });
  });

  it("misses when the roll exceeds the chance", () => {
    expect(rollGatherWound({ hasTool: false, nodeKind: "stone" }, never)).toBeNull();
  });
});
