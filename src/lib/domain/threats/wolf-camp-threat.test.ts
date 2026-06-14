import { describe, expect, it } from "vitest";
import { resolveWolfCampThreat, type WolfCampThreatFactors } from "$lib/domain/threats/wolf-camp-threat";

const base: WolfCampThreatFactors = {
  isNight: true,
  nearWolfZone: true,
  nearWolfDen: false,
  litFireStrength: 0,
  spikeBarrierCount: 0,
  freshCarcassCount: 0,
  exposedRawMeat: 0,
  exposedSpoiledMeat: 0,
  recentKillSites: 0,
};

describe("resolveWolfCampThreat", () => {
  it("raises threat when raw meat is exposed near camp", () => {
    const quiet = resolveWolfCampThreat(base);
    const exposed = resolveWolfCampThreat({ ...base, exposedRawMeat: 3 });

    expect(exposed.score).toBeGreaterThan(quiet.score);
    expect(exposed.reasons).toContain("exposed raw meat");
  });

  it("lowers threat with fire and spike barriers", () => {
    const exposed = resolveWolfCampThreat({ ...base, exposedRawMeat: 3, freshCarcassCount: 1 });
    const defended = resolveWolfCampThreat({
      ...base,
      exposedRawMeat: 3,
      freshCarcassCount: 1,
      litFireStrength: 1,
      spikeBarrierCount: 3,
    });

    expect(defended.score).toBeLessThan(exposed.score);
    expect(defended.reasons).toEqual(expect.arrayContaining(["lit fire", "spike barriers"]));
  });

  it("does not force raids in the first-pass outcome set", () => {
    const result = resolveWolfCampThreat({
      ...base,
      nearWolfDen: true,
      exposedRawMeat: 5,
      freshCarcassCount: 2,
      recentKillSites: 2,
    });

    expect(["howl", "circle_camp", "approach_exposed_meat", "warning_silhouette"]).toContain(result.outcome);
  });
});
