import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("pixi.js", () => ({
  AnimatedSprite: class {},
  Assets: { get: vi.fn() },
  Sprite: class {},
  Texture: class {},
}));

import {
  ASHENMOON_ACTOR_PATHS,
  ASHENMOON_CARCASS_PATHS,
  ASHENMOON_GATHERABLE_PATHS,
  ASHENMOON_ITEM_ICON_PATHS,
  ASHENMOON_LANDMARK_PATHS,
  ASHENMOON_PLAYER_ANIMATION_PATHS,
  ASHENMOON_PROP_PATHS,
  ASHENMOON_STRUCTURE_PATHS,
  ASHENMOON_UI_PATHS,
  ASHENMOON_VFX_PATHS,
  BUNDLE_ASHENMOON_FIRST_CAMP,
  getAshenmoonItemIconKeyForItemId,
} from "$lib/core/assets/ashenmoon-assets";
import {
  ASHENMOON_BIOME_COVERAGE,
  ASHENMOON_CARCASS_COVERAGE,
  ASHENMOON_CREATURE_COVERAGE,
  ASHENMOON_GATHERABLE_RENDER_COVERAGE,
  ASHENMOON_LANDMARK_COVERAGE,
  ASHENMOON_STRUCTURE_COVERAGE,
  ASHENMOON_VFX_COVERAGE,
  getAshenmoonItemIconCoverage,
  type AshenmoonAssetCoverage,
} from "$lib/core/assets/ashenmoon-asset-coverage";
import { PLAYER_ANIMATION_CLIPS } from "$lib/domain/animation/player-animation";
import { ANIMAL_DEFINITIONS } from "$lib/domain/animals/animal-behavior";
import { M3_CARCASS_DEFINITIONS } from "$lib/domain/animals/carcass-processing";
import { BUILDING_SPECS } from "$lib/domain/building-specs";
import { GATHERABLE_DEFINITIONS } from "$lib/domain/gathering/gatherables";
import { ITEM_DEFINITIONS } from "$lib/domain/items/item-definitions";
import { LANDMARK_DEFS } from "$lib/domain/worldgen/landmark-definitions";

const REPO_ROOT = process.cwd();

function staticPath(assetPath: string): string {
  return join(REPO_ROOT, "static", assetPath.replace(/^\/assets\//, "assets/"));
}

function readSvgTag(assetPath: string): string {
  return readFileSync(staticPath(assetPath), "utf8").split("\n").find((line) => line.includes("<svg")) ?? "";
}

describe("Ashenmoon first-party asset manifest", () => {
  it("contains unique bundle paths", () => {
    expect(new Set(BUNDLE_ASHENMOON_FIRST_CAMP).size).toBe(BUNDLE_ASHENMOON_FIRST_CAMP.length);
  });

  it("points every first-camp asset key at an existing file", () => {
    const paths = [
      ...Object.values(ASHENMOON_ACTOR_PATHS),
      ...Object.values(ASHENMOON_PLAYER_ANIMATION_PATHS).flat(),
      ...Object.values(ASHENMOON_PROP_PATHS),
      ...Object.values(ASHENMOON_GATHERABLE_PATHS),
      ...Object.values(ASHENMOON_ITEM_ICON_PATHS),
      ...Object.values(ASHENMOON_UI_PATHS),
      ...Object.values(ASHENMOON_STRUCTURE_PATHS),
      ...Object.values(ASHENMOON_LANDMARK_PATHS),
      ...Object.values(ASHENMOON_CARCASS_PATHS),
      ...Object.values(ASHENMOON_VFX_PATHS),
    ];

    const missing = paths.filter((path) => !existsSync(staticPath(path)));
    expect(missing).toEqual([]);
  });

  it("declares real frame assets for every player animation clip", () => {
    const manifest = ASHENMOON_PLAYER_ANIMATION_PATHS as Readonly<Record<string, readonly string[] | undefined>>;
    const missingManifestEntries = PLAYER_ANIMATION_CLIPS
      .map((clip) => clip.id)
      .filter((clipId) => !manifest[clipId]?.length);
    const missingFiles = Object.values(manifest)
      .flatMap((paths) => paths ?? [])
      .filter((path) => !existsSync(staticPath(path)));

    expect(missingManifestEntries).toEqual([]);
    expect(missingFiles).toEqual([]);
  });

  it("keeps player animation SVGs on the shared lean-survivor canvas contract", () => {
    const invalid = Object.values(ASHENMOON_PLAYER_ANIMATION_PATHS)
      .flat()
      .map((path) => [path, readSvgTag(path)] as const)
      .filter(([, svg]) => !svg.includes('width="160" height="220" viewBox="0 0 160 220"'))
      .map(([path]) => path);

    expect(invalid).toEqual([]);
  });
});

describe("Ashenmoon whole-game asset coverage", () => {
  it("declares coverage for every current gatherable render kind", () => {
    const renderKinds = new Set(Object.values(GATHERABLE_DEFINITIONS).map((definition) => definition.renderKind));

    const missing = [...renderKinds].filter((renderKind) => !ASHENMOON_GATHERABLE_RENDER_COVERAGE[renderKind]);
    expect(missing).toEqual([]);
  });

  it("declares coverage for every current buildable structure", () => {
    const missing = Object.keys(BUILDING_SPECS).filter(
      (buildableId) => !hasCoverage(ASHENMOON_STRUCTURE_COVERAGE, buildableId),
    );
    expect(missing).toEqual([]);
  });

  it("declares coverage for every current animal and carcass species", () => {
    const missingAnimals = Object.keys(ANIMAL_DEFINITIONS).filter(
      (speciesId) => !hasCoverage(ASHENMOON_CREATURE_COVERAGE, speciesId),
    );
    const missingCarcasses = Object.keys(M3_CARCASS_DEFINITIONS).filter(
      (speciesId) => !hasCoverage(ASHENMOON_CARCASS_COVERAGE, speciesId),
    );

    expect(missingAnimals).toEqual([]);
    expect(missingCarcasses).toEqual([]);
  });

  it("declares coverage for every current landmark kind", () => {
    const missing = Object.keys(LANDMARK_DEFS).filter(
      (landmarkKind) => !hasCoverage(ASHENMOON_LANDMARK_COVERAGE, landmarkKind),
    );
    expect(missing).toEqual([]);
  });

  it("classifies every current item icon as covered or explicitly deferred", () => {
    const invalid = Object.keys(ITEM_DEFINITIONS)
      .map((itemId) => [itemId, getAshenmoonItemIconCoverage(itemId)] as const)
      .filter(([, coverage]) => !isExplicitCoverage(coverage));

    expect(invalid).toEqual([]);
  });

  it("routes placeable core items through first-party Ashenmoon icon keys", () => {
    expect(getAshenmoonItemIconKeyForItemId("stone")).toBe("stone");
    expect(getAshenmoonItemIconKeyForItemId("wood")).toBe("wood");
    expect(getAshenmoonItemIconKeyForItemId("branch")).toBe("branch");
    expect(getAshenmoonItemIconKeyForItemId("firewood_bundle")).toBe("firewoodBundle");
    expect(getAshenmoonItemIconKeyForItemId("flint_shard")).toBe("flint");
    expect(getAshenmoonItemIconKeyForItemId("dirty_water")).toBe("dirtyWater");
  });

  it("does not collapse canonical non-stick item ids to the stick icon", () => {
    const collapsedToStick = Object.keys(ITEM_DEFINITIONS).filter(
      (itemId) => itemId !== "stick" && getAshenmoonItemIconKeyForItemId(itemId) === "stick",
    );
    const missing = Object.keys(ITEM_DEFINITIONS).filter(
      (itemId) => !itemId.startsWith("blueprint_") && getAshenmoonItemIconKeyForItemId(itemId) === null,
    );

    expect(collapsedToStick).toEqual([]);
    expect(missing).toEqual([]);
  });

  it("keeps deferred canon coverage explicit", () => {
    const coverageEntries = [
      ...Object.entries(ASHENMOON_BIOME_COVERAGE),
      ...Object.entries(ASHENMOON_CARCASS_COVERAGE),
      ...Object.entries(ASHENMOON_CREATURE_COVERAGE),
      ...Object.entries(ASHENMOON_GATHERABLE_RENDER_COVERAGE),
      ...Object.entries(ASHENMOON_LANDMARK_COVERAGE),
      ...Object.entries(ASHENMOON_STRUCTURE_COVERAGE),
      ...Object.entries(ASHENMOON_VFX_COVERAGE),
    ];

    const invalid = coverageEntries.filter(([, coverage]) => !isExplicitCoverage(coverage));
    expect(invalid).toEqual([]);
  });
});

function isExplicitCoverage(coverage: AshenmoonAssetCoverage | undefined): boolean {
  if (!coverage) return false;
  if (!coverage.reason.trim()) return false;
  if (coverage.status === "asset") return coverage.key !== undefined;
  return coverage.fallback !== undefined;
}

function hasCoverage(coverageMap: Readonly<Record<string, AshenmoonAssetCoverage>>, id: string): boolean {
  return coverageMap[id] !== undefined;
}
