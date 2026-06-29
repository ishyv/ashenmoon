import { describe, it, expect } from "vitest";
import { VISUAL_MANIFEST } from "../../../domain/visual/visual-manifest.js";
import { VISUAL_COVERAGE } from "../../../domain/visual/visual-coverage.js";
import { VFX_DEFINITIONS } from "../../vfx/vfx-definitions.js";
import { VISUAL_SOUND } from "./visual-sound-map.js";
import type { VfxId, VisualSoundId } from "../../../domain/visual/visual-definitions.js";

// Collect all VfxIds referenced across every state of every VisualDefinition.
function collectVfxIds(entry: (typeof VISUAL_MANIFEST)[keyof typeof VISUAL_MANIFEST]): VfxId[] {
  return Object.values(entry.states).flatMap((state) => [
    ...((state.particles as VfxId[] | undefined) ?? []),
    ...((state.enterOneShots as VfxId[] | undefined) ?? []),
  ]);
}

// Collect all VisualSoundIds referenced across every state of every VisualDefinition.
function collectSoundIds(
  entry: (typeof VISUAL_MANIFEST)[keyof typeof VISUAL_MANIFEST],
): VisualSoundId[] {
  return Object.values(entry.states).flatMap((state) => [
    ...((state.soundLoops as VisualSoundId[] | undefined) ?? []),
    ...((state.enterSfx as VisualSoundId[] | undefined) ?? []),
  ]);
}

describe("visual-coverage: manifest integrity", () => {
  const manifestEntries = Object.entries(VISUAL_MANIFEST) as [
    keyof typeof VISUAL_MANIFEST,
    (typeof VISUAL_MANIFEST)[keyof typeof VISUAL_MANIFEST],
  ][];

  it("every entity kind in VISUAL_MANIFEST has a VISUAL_COVERAGE entry", () => {
    for (const [kind] of manifestEntries) {
      expect(
        VISUAL_COVERAGE[kind as keyof typeof VISUAL_COVERAGE],
        `${kind}: missing VISUAL_COVERAGE entry`,
      ).toBeDefined();
    }
  });

  it("every VISUAL_COVERAGE entry corresponds to a VISUAL_MANIFEST entry", () => {
    for (const kind of Object.keys(VISUAL_COVERAGE) as (keyof typeof VISUAL_COVERAGE)[]) {
      expect(
        VISUAL_MANIFEST[kind as keyof typeof VISUAL_MANIFEST],
        `${kind}: VISUAL_COVERAGE entry has no matching VISUAL_MANIFEST entry`,
      ).toBeDefined();
    }
  });

  it("all VfxIds referenced in manifest states exist in VFX_DEFINITIONS", () => {
    for (const [kind, def] of manifestEntries) {
      for (const id of collectVfxIds(def)) {
        expect(
          VFX_DEFINITIONS[id],
          `${kind}: VfxId "${id}" referenced in states but not found in VFX_DEFINITIONS`,
        ).toBeDefined();
      }
    }
  });

  it("all VisualSoundIds referenced in manifest states exist in VISUAL_SOUND", () => {
    for (const [kind, def] of manifestEntries) {
      for (const id of collectSoundIds(def)) {
        expect(
          VISUAL_SOUND[id],
          `${kind}: VisualSoundId "${id}" referenced in states but not found in VISUAL_SOUND`,
        ).toBeDefined();
      }
    }
  });

  it("no VisualDefinition references an unknown state id in its rules", () => {
    for (const [kind, def] of manifestEntries) {
      for (const rule of def.rules) {
        expect(
          def.states[rule.state],
          `${kind}: rule "${rule.id}" references unknown state "${rule.state}"`,
        ).toBeDefined();
      }
    }
  });

  it("no VisualDefinition fallbackState references an unknown state", () => {
    for (const [kind, def] of manifestEntries) {
      expect(
        def.states[def.fallbackState],
        `${kind}: fallbackState "${def.fallbackState}" is not in states`,
      ).toBeDefined();
    }
  });
});
