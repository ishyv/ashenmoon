import { describe, expect, it } from "vitest";
import { SOUNDS, gatherSoundId } from "./sound-manifest";
import { RECIPES } from "./recipes";
import { resolveSoundDef } from "./audio-engine";
import { getAllManifestSamples } from "./sample-loader";

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

  it("resolves conditional variations correctly", () => {
    const hitDef = SOUNDS["combat.hit.enemy"];
    expect(hitDef).toBeDefined();

    // 1. Matches variation with precise condition
    const wolfResult = resolveSoundDef(hitDef, { targetSpecies: "wolf" });
    expect(wolfResult.recipe).toBe("chop");
    expect(wolfResult.gain).toBe(1.1);

    // 2. Matches other variation
    const boarResult = resolveSoundDef(hitDef, { targetSpecies: "boar" });
    expect(boarResult.recipe).toBe("fall");
    expect(boarResult.gain).toBe(1.2);

    // 3. Falls back to default if conditions mismatch
    const fallbackResult = resolveSoundDef(hitDef, { targetSpecies: "missing" });
    expect(fallbackResult.recipe).toBe(hitDef.recipe);
    expect(fallbackResult.gain).toBe(hitDef.gain ?? 1);

    // 4. Falls back to default when no conditions are passed
    const noConditionsResult = resolveSoundDef(hitDef);
    expect(noConditionsResult.recipe).toBe(hitDef.recipe);
  });

  it("collects all manifest samples correctly including variations", () => {
    const samples = getAllManifestSamples();
    expect(Array.isArray(samples)).toBe(true);
    // Since there are currently no samples in the manifest, the list is empty,
    // but the function must run cleanly without throwing.
    expect(samples.length).toBe(0);
  });
});

