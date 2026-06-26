import { describe, expect, it } from "vitest";
import { DISCOVERY_BARKS, getDiscoveryBark } from "./discovery-barks";

describe("discovery barks", () => {
  it("defines a first pond bark", () => {
    expect(getDiscoveryBark("first_pond")?.text).toContain("Water");
  });

  it("keeps bark text short enough for HUD display", () => {
    for (const bark of Object.values(DISCOVERY_BARKS)) {
      expect(bark.text.length).toBeLessThanOrEqual(96);
    }
  });
});
