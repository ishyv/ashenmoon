import { describe, expect, it } from "vitest";
import { SOUNDS, gatherSoundId } from "./sound-manifest";
import { RECIPES } from "./recipes";

describe("sound manifest", () => {
  it("points every sound at a defined recipe", () => {
    for (const [id, def] of Object.entries(SOUNDS)) {
      expect(RECIPES[def.recipe], `${id} -> ${def.recipe}`).toBeTypeOf("function");
    }
  });

  it("maps gather sound keys to ids, defaulting to strike", () => {
    expect(gatherSoundId("chop")).toBe("gather.chop");
    expect(gatherSoundId("strike")).toBe("gather.strike");
    expect(gatherSoundId("dig")).toBe("gather.dig");
    expect(gatherSoundId(undefined)).toBe("gather.strike");
  });
});
