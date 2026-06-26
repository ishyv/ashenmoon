import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function readProjectFile(path: string): string {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("legacy asset runtime guard", () => {
  it("ensures legacy asset modules are deleted from the disk", () => {
    expect(existsSync(join(ROOT, "src/lib/core/assets/forest-pack-assets.ts"))).toBe(false);
    expect(existsSync(join(ROOT, "src/lib/core/assets/animal-pack-assets.ts"))).toBe(false);
  });

  it("keeps first-loop gatherable render adapters off legacy asset-pack helpers", () => {
    const source = readProjectFile("src/lib/core/systems/gatherable-render-adapter.ts");
    expect(source).not.toContain("getCursedRockTexture");
    expect(source).toContain('getAshenmoonGatherableTexture("cursedRock1")');
  });

  it("keeps ambient map dressing off old bush/cloud sprites", () => {
    const source = readProjectFile("src/lib/core/systems/map/map.ts");
    expect(source).not.toContain("getBushTexture");
    expect(source).not.toContain("getCloudTexture");
    expect(source).toContain('getAshenmoonGatherableTexture("berryBush")');
  });

  it("keeps building placement and preview fallbacks on first-party Ashenmoon structures", () => {
    const engine = readProjectFile("src/lib/core/engine.ts");
    const building = readProjectFile("src/lib/core/systems/building/building-system.ts");

    expect(engine).not.toContain('getBuildingTexture("yellow", spec.textureType)');
    expect(building).not.toContain('getBuildingTexture("yellow", spec.textureType)');
    expect(engine).toContain('getAshenmoonStructureTexture(structureKey ?? "legacyHouse")');
    expect(building).toContain('getAshenmoonStructureTexture(structureKey ?? "legacyHouse")');
  });

  it("keeps landmark and placed-item runtime fallbacks off external paths", () => {
    const spawn = readProjectFile("src/lib/core/systems/map/spawn-system.ts");
    expect(spawn).not.toContain("getPixel16WoodsDecoration");
    expect(spawn).not.toContain("getTopdownForestDecoration");
  });

  it("keeps eager preload bundle first-party only", () => {
    const assets = readProjectFile("src/lib/core/assets/assets.ts");
    expect(assets).not.toContain("BUNDLE_EXTERNAL_FOREST");
    expect(assets).not.toContain("BUNDLE_NEW_ANIMALS");
  });
});
