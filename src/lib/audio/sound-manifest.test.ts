import { describe, expect, it } from "vitest";
import { AUDIO_BUS_IDS, SOUNDS, gatherSoundId } from "./sound-manifest";
import { RECIPES } from "./recipes";
import { getEffectiveVolume, resolveSoundDef, startLoop, stopLoop } from "./audio-engine";
import { getAllManifestSamples } from "./sample-loader";
import { getMissingSampleMetadata } from "./sound-assets";
import {
  resolveCombatSound,
  resolveCraftSound,
  resolveGatherSound,
  resolveImpactSound,
  registerAudioSourceProfile,
} from "./audio-feedback";

describe("sound manifest", () => {
  it("points every sound at a defined recipe", () => {
    for (const [id, def] of Object.entries(SOUNDS)) {
      expect(RECIPES[def.recipe], `${id} -> ${def.recipe}`).toBeTypeOf("function");
      for (const variant of def.variations ?? []) {
        if (variant.recipe) expect(RECIPES[variant.recipe], `${id} variation -> ${variant.recipe}`).toBeTypeOf("function");
      }
    }
  });

  it("treats master as a first-class bus id while definitions use routable child buses", () => {
    expect(AUDIO_BUS_IDS).toEqual(["master", "music", "sfx", "ui", "ambient", "entities"]);
    for (const [id, def] of Object.entries(SOUNDS)) {
      expect(def.bus, `${id} bus`).not.toBe("master");
      expect(AUDIO_BUS_IDS).toContain(def.bus);
    }
  });

  it("keeps every layered sound pointed at a registered child sound", () => {
    for (const [id, def] of Object.entries(SOUNDS)) {
      for (const layer of def.layers ?? []) {
        expect(SOUNDS[layer.soundId], `${id} layer -> ${layer.soundId}`).toBeDefined();
      }
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

  it("requires metadata for every declared sample", () => {
    expect(getMissingSampleMetadata()).toEqual([]);
  });

  it("maps physical audio events to material-specific sounds", () => {
    expect(resolveImpactSound({ sourceProfileId: "axe", targetMaterial: "wood", intensity: 0.8 })).toBe("impact.wood.heavy");
    expect(resolveImpactSound({ sourceProfileId: "pickaxe", targetMaterial: "stone" })).toBe("impact.stone");
    expect(resolveGatherSound({ material: "clay" })).toBe("gather.clay.pull");
    expect(resolveGatherSound({ legacyGatherSound: "chop" })).toBe("gather.chop");
    expect(resolveCraftSound({ outcome: "discovered" })).toBe("recipe.discovered");
    expect(resolveCraftSound({ outcome: "failure" })).toBe("craft.failure");
    expect(resolveCraftSound({ outcome: "success", feedbackTags: ["binding"] })).toBe("craft.bind");
    expect(resolveCombatSound({ phase: "miss" })).toBe("combat.miss.air");
    expect(resolveCombatSound({ phase: "hit", targetMaterial: "hide" })).toBe("impact.hide");
  });

  it("resolves combat sounds from registered source profiles instead of weapon-name unions", () => {
    registerAudioSourceProfile({
      id: "chain_whip",
      tags: ["sharp", "heavy"],
      defaultIntensity: 0.8,
    });

    expect(resolveCombatSound({ phase: "swing", sourceProfileId: "chain_whip" })).toBe("player.swing.heavy");
    expect(resolveImpactSound({ sourceProfileId: "chain_whip", targetMaterial: "wood" })).toBe("impact.wood.heavy");
  });

  it("calculates effective engine volume with master, bus, request, distance, and clamping", () => {
    expect(getEffectiveVolume({ bus: "sfx", baseVolume: 0.5, requestVolume: 0.5, distanceFalloff: 0.5 })).toBeCloseTo(0.08, 5);
    expect(getEffectiveVolume({ bus: "master", baseVolume: 2, requestVolume: 2 })).toBe(1);
    expect(getEffectiveVolume({ bus: "ui", baseVolume: -1 })).toBe(0);
  });

  it("starts and stops keyed generated loops without requiring a browser AudioContext", () => {
    const key = startLoop("rain.loop", "test:rain");
    expect(key).toBe("test:rain");
    stopLoop(key);
  });
});
