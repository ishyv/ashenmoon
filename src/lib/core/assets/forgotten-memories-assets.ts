/**
 * Texture accessors for the forgotten-memories asset pack.
 *
 * All five sheets are already in BUNDLE_FORGOTTEN_MEMORIES → BUNDLE_CORE,
 * so they are loaded before any accessor is called. No extra loadAssets() needed.
 *
 * Primary slicing source: trees-separated.png (560×640)
 *   Column slots for 4 individual trees (left 320 px, ~80 px each):
 *     0 = red/orange   x=0
 *     1 = teal/blue    x=80
 *     2 = yellow/gold  x=160
 *     3 = pine         x=240
 *   Stump row starts at y=145 (same column widths).
 *   Large 3-tree cluster: x=320, y=0, w=240, h=220.
 *
 * Props sheet: props.png (1024×1024)
 *   Rock cluster: upper-left, approximate x=0, y=210, 115×110 px.
 *   Small bushes: right portion, x≈560, 55×60 px cells, 5 color rows.
 *
 * Coordinates marked "// tune" can be adjusted in one place if a sprite
 * appears clipped or offset — no other code needs changing.
 */

import { Assets, Rectangle, Texture } from "pixi.js";
import { FORGOTTEN_ASSET_PATHS } from "$lib/core/assets/assets";
import { getBuildingTexture, getCursedRockTexture } from "$lib/core/assets/assets";
import type { LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sheet(path: string): Texture {
  const t = Assets.get<Texture>(path);
  if (!t) throw new Error(`[forgotten-memories] not loaded: ${path}`);
  return t;
}

const regionCache = new Map<string, Texture>();

function region(path: string, x: number, y: number, w: number, h: number): Texture {
  const key = `${path}|${x}|${y}|${w}|${h}`;
  let t = regionCache.get(key);
  if (!t) {
    t = new Texture({ source: sheet(path).source, frame: new Rectangle(x, y, w, h) });
    regionCache.set(key, t);
  }
  return t;
}

// ---------------------------------------------------------------------------
// trees-separated.png (560×640) — individual trees and stumps
// ---------------------------------------------------------------------------

const TS = FORGOTTEN_ASSET_PATHS.treesSeparated;

const TS_COL_W  = 80;  // tune: column width per tree
const TS_TREE_H = 145; // tune: tree height (top of crown to ground)
const TS_STUMP_Y = 145; // tune: y where the stump row begins
const TS_STUMP_H = 65;  // tune: stump height

const TS_CLUSTER_X = 320; // tune: x where the large cluster starts
const TS_CLUSTER_W = 240; // tune: cluster width
const TS_CLUSTER_H = 220; // tune: cluster height

/** Individual tree. variant: 0=red, 1=teal, 2=yellow, 3=pine. */
export function getFMTree(variant: 0 | 1 | 2 | 3): Texture {
  return region(TS, variant * TS_COL_W, 0, TS_COL_W, TS_TREE_H);
}

/** Stump matching the given tree variant (same column, stump row). */
export function getFMStump(variant: 0 | 1 | 2 | 3): Texture {
  return region(TS, variant * TS_COL_W, TS_STUMP_Y, TS_COL_W, TS_STUMP_H);
}

/** The large 3-tree cluster from the right portion of trees-separated.png. */
export function getFMCluster(): Texture {
  return region(TS, TS_CLUSTER_X, 0, TS_CLUSTER_W, TS_CLUSTER_H);
}

// ---------------------------------------------------------------------------
// props.png (1024×1024) — rocks and small bushes
// ---------------------------------------------------------------------------

const PROPS = FORGOTTEN_ASSET_PATHS.props;

const FM_ROCK_X = 0;   // tune
const FM_ROCK_Y = 210; // tune
const FM_ROCK_W = 115; // tune
const FM_ROCK_H = 110; // tune

/** Rock cluster (gray stones) — used for cave/den landmark visuals. */
export function getFMRock(): Texture {
  return region(PROPS, FM_ROCK_X, FM_ROCK_Y, FM_ROCK_W, FM_ROCK_H);
}

const FM_BUSH_X0 = 560; // tune: x where the small-bush grid starts
const FM_BUSH_W  = 55;  // tune: bush cell width
const FM_BUSH_H  = 60;  // tune: bush cell height
// Color rows: 0=green, 1=olive, 2=gold, 3=orange, 4=teal

/** Small decorative bush. color 0–4 selects hue row in the props sheet. */
export function getFMBush(color: 0 | 1 | 2 | 3 | 4): Texture {
  return region(PROPS, FM_BUSH_X0, color * FM_BUSH_H, FM_BUSH_W, FM_BUSH_H);
}

// ---------------------------------------------------------------------------
// Landmark dispatch
// ---------------------------------------------------------------------------

/**
 * Returns a sprite texture for the given landmark kind, or null for
 * terrain-marker kinds (old_road, river_crossing, deer_grazing_area, pond)
 * which have no visible object — they stay examineable but invisible.
 */
export function getLandmarkTexture(kind: LandmarkKind): Texture | null {
  switch (kind) {
    case "old_stump":         return getFMStump(0);
    case "fallen_tree":       return getFMStump(2);
    case "huge_dead_tree":    return getFMTree(3);  // pine — most austere silhouette
    case "wolf_den":          return getFMRock();
    case "ruined_watch_post": return getBuildingTexture("Black", "tower");
    case "burned_cart":       return getCursedRockTexture(2);

    case "old_road":
    case "river_crossing":
    case "deer_grazing_area":
    case "pond":
      return null;
  }
}
