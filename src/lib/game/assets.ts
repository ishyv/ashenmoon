/**
 * Asset manifest and loader for the Tiny Swords Free Pack.
 *
 * Single source of truth for every sprite path and frame-slicing geometry in
 * the pack. Nothing outside this module should hard-code paths or frame counts.
 *
 * Usage pattern
 * -------------
 * 1. Call `await loadGameAssets()` once (engine.init) for the core bundle.
 * 2. Call `await loadAssets([...paths])` before using any other textures —
 *    pass the relevant `ASSET_PATHS.*` values or use a named bundle helper.
 * 3. Then call any sync accessor freely from the render loop.
 *
 * Frame geometry
 * --------------
 * All unit spritesheets use 192×192 frames in a single horizontal row.
 * Frame count is computed automatically from `Math.floor(sheet.width / 192)`.
 *
 * Particle FX sheets use 48×48 frames (PARTICLE_FRAME = 48).
 * Sheep sheets use 96×96 frames (SHEEP_FRAME = 96).
 * These can be adjusted as single-line constants if a sheet differs.
 *
 * Tileset note
 * ------------
 * Tilemap_color1.png (576×384) is a *platform-chunk* sheet, not a repeating
 * floor tileset. The only usable interior grass tile (no border decoration):
 *   col 4, row 1  →  x=128, y=32, w=32, h=32
 */

import { Assets, Rectangle, Texture } from "pixi.js";

const BASE = "/assets/rpg/tiny-swords";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UnitColor = "blue" | "black" | "red" | "purple" | "yellow";

export type BuildingColor = "blue" | "black" | "red" | "purple" | "yellow";
export type BuildingType =
  | "archery"
  | "barracks"
  | "castle"
  | "house1"
  | "house2"
  | "house3"
  | "monastery"
  | "tower";

/** Five directional pairs exposed by the Lancer (mirrored to get the other side). */
export type LancerDir = "up" | "upRight" | "right" | "downRight" | "down";

/** Tool carried by a Pawn. `null` = bare pawn with no tool. */
export type PawnTool = "axe" | "gold" | "hammer" | "knife" | "meat" | "pickaxe" | "wood" | null;

/** Pawn animations. `interact` is only valid for: axe, hammer, knife, pickaxe. */
export type PawnAnim = "idle" | "run" | "interact";

export type ParticleFXKey =
  | "dust1"
  | "dust2"
  | "explosion1"
  | "explosion2"
  | "fire1"
  | "fire2"
  | "fire3"
  | "waterSplash";

export type RibbonColor = "black" | "blue" | "purple" | "red" | "yellow";

/** Animation keys for the Warrior unit. */
export type WarriorAnimKey = "idle" | "run" | "attack" | "attack2" | "guard";

// ---------------------------------------------------------------------------
// Frame geometry constants
// ---------------------------------------------------------------------------

/** All unit sprites (Warrior, Archer, Lancer, Monk, Pawn) share this frame size. */
const UNIT_FRAME = 192;

/** Particle FX sheets (Dust, Explosion, Fire, Water Splash). */
const PARTICLE_FRAME = 48;

/** Sheep animation sheets. */
const SHEEP_FRAME = 96;

export const GRASS_TILE_FRAME = { x: 128, y: 32, w: 32, h: 32 } as const;

// ---------------------------------------------------------------------------
// Path helpers (internal)
// ---------------------------------------------------------------------------

const UNIT_COLOR_LABEL: Record<UnitColor, string> = {
  blue: "Blue",
  black: "Black",
  red: "Red",
  purple: "Purple",
  yellow: "Yellow",
};

const BUILDING_TYPE_LABEL: Record<BuildingType, string> = {
  archery: "Archery",
  barracks: "Barracks",
  castle: "Castle",
  house1: "House1",
  house2: "House2",
  house3: "House3",
  monastery: "Monastery",
  tower: "Tower",
};

const PAWN_TOOL_LABEL: Record<NonNullable<PawnTool>, string> = {
  axe: "Axe",
  gold: "Gold",
  hammer: "Hammer",
  knife: "Knife",
  meat: "Meat",
  pickaxe: "Pickaxe",
  wood: "Wood",
};

const LANCER_DIR_LABEL: Record<LancerDir, string> = {
  up: "Up",
  upRight: "UpRight",
  right: "Right",
  downRight: "DownRight",
  down: "Down",
};

function unitDir(color: UnitColor, unitType: string, file: string): string {
  return `${BASE}/Units/${UNIT_COLOR_LABEL[color]} Units/${unitType}/${file}`;
}

function buildingPath(color: BuildingColor, type: BuildingType): string {
  return `${BASE}/Buildings/${UNIT_COLOR_LABEL[color]} Buildings/${BUILDING_TYPE_LABEL[type]}.png`;
}

// ---------------------------------------------------------------------------
// Asset path manifest
// ---------------------------------------------------------------------------

export const ASSET_PATHS = {
  // ---- Terrain: Tilemaps (5 color variants) --------------------------------
  tilemap: `${BASE}/Terrain/Tileset/Tilemap_color1.png`,
  tilemaps: {
    color2: `${BASE}/Terrain/Tileset/Tilemap_color2.png`,
    color3: `${BASE}/Terrain/Tileset/Tilemap_color3.png`,
    color4: `${BASE}/Terrain/Tileset/Tilemap_color4.png`,
    color5: `${BASE}/Terrain/Tileset/Tilemap_color5.png`,
    shadow: `${BASE}/Terrain/Tileset/Shadow.png`,
    waterBackground: `${BASE}/Terrain/Tileset/Water Background color.png`,
    waterFoam: `${BASE}/Terrain/Tileset/Water Foam.png`,
  },

  // ---- Terrain: Decorations ------------------------------------------------
  decorations: {
    bushes: [
      `${BASE}/Terrain/Decorations/Bushes/Bushe1.png`,
      `${BASE}/Terrain/Decorations/Bushes/Bushe2.png`,
      `${BASE}/Terrain/Decorations/Bushes/Bushe3.png`,
      `${BASE}/Terrain/Decorations/Bushes/Bushe4.png`,
    ] as [string, string, string, string],
    clouds: [
      `${BASE}/Terrain/Decorations/Clouds/Clouds_01.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_02.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_03.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_04.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_05.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_06.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_07.png`,
      `${BASE}/Terrain/Decorations/Clouds/Clouds_08.png`,
    ] as [string, string, string, string, string, string, string, string],
    rocks: [
      `${BASE}/Terrain/Decorations/Rocks/Rock1.png`,
      `${BASE}/Terrain/Decorations/Rocks/Rock2.png`,
      `${BASE}/Terrain/Decorations/Rocks/Rock3.png`,
      `${BASE}/Terrain/Decorations/Rocks/Rock4.png`,
    ] as [string, string, string, string],
    waterRocks: [
      `${BASE}/Terrain/Decorations/Rocks in the Water/Water Rocks_01.png`,
      `${BASE}/Terrain/Decorations/Rocks in the Water/Water Rocks_02.png`,
      `${BASE}/Terrain/Decorations/Rocks in the Water/Water Rocks_03.png`,
      `${BASE}/Terrain/Decorations/Rocks in the Water/Water Rocks_04.png`,
    ] as [string, string, string, string],
    rubberDuck: `${BASE}/Terrain/Decorations/Rubber Duck/Rubber duck.png`,
  },

  // ---- Terrain: Resources --------------------------------------------------
  // Core paths (used by engine.ts directly)
  tree: `${BASE}/Terrain/Resources/Wood/Trees/Tree1.png`,
  rock: `${BASE}/Terrain/Decorations/Rocks/Rock1.png`,
  stump: `${BASE}/Terrain/Resources/Wood/Trees/Stump 1.png`,

  resources: {
    trees: [
      `${BASE}/Terrain/Resources/Wood/Trees/Tree1.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Tree2.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Tree3.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Tree4.png`,
    ] as [string, string, string, string],
    stumps: [
      `${BASE}/Terrain/Resources/Wood/Trees/Stump 1.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Stump 2.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Stump 3.png`,
      `${BASE}/Terrain/Resources/Wood/Trees/Stump 4.png`,
    ] as [string, string, string, string],
    woodItem: `${BASE}/Terrain/Resources/Wood/Wood Resource/Wood Resource.png`,
    goldResource: `${BASE}/Terrain/Resources/Gold/Gold Resource/Gold_Resource.png`,
    goldResourceHighlight: `${BASE}/Terrain/Resources/Gold/Gold Resource/Gold_Resource_Highlight.png`,
    goldStones: [
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 1.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 2.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 3.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 4.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 5.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 6.png`,
    ] as [string, string, string, string, string, string],
    goldStonesHighlight: [
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 1_Highlight.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 2_Highlight.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 3_Highlight.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 4_Highlight.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 5_Highlight.png`,
      `${BASE}/Terrain/Resources/Gold/Gold Stones/Gold Stone 6_Highlight.png`,
    ] as [string, string, string, string, string, string],
    meatItem: `${BASE}/Terrain/Resources/Meat/Meat Resource/Meat Resource.png`,
    sheepIdle: `${BASE}/Terrain/Resources/Meat/Sheep/Sheep_Idle.png`,
    sheepMove: `${BASE}/Terrain/Resources/Meat/Sheep/Sheep_Move.png`,
    sheepGrass: `${BASE}/Terrain/Resources/Meat/Sheep/Sheep_Grass.png`,
    tools: [
      `${BASE}/Terrain/Resources/Tools/Tool_01.png`,
      `${BASE}/Terrain/Resources/Tools/Tool_02.png`,
      `${BASE}/Terrain/Resources/Tools/Tool_03.png`,
      `${BASE}/Terrain/Resources/Tools/Tool_04.png`,
    ] as [string, string, string, string],
  },

  // ---- Particle FX ---------------------------------------------------------
  particles: {
    dust1: `${BASE}/Particle FX/Dust_01.png`,
    dust2: `${BASE}/Particle FX/Dust_02.png`,
    explosion1: `${BASE}/Particle FX/Explosion_01.png`,
    explosion2: `${BASE}/Particle FX/Explosion_02.png`,
    fire1: `${BASE}/Particle FX/Fire_01.png`,
    fire2: `${BASE}/Particle FX/Fire_02.png`,
    fire3: `${BASE}/Particle FX/Fire_03.png`,
    waterSplash: `${BASE}/Particle FX/Water Splash.png`,
  } as const satisfies Record<ParticleFXKey, string>,

  // ---- UI Elements ---------------------------------------------------------
  ui: {
    bars: {
      bigBase: `${BASE}/UI Elements/UI Elements/Bars/BigBar_Base.png`,
      bigFill: `${BASE}/UI Elements/UI Elements/Bars/BigBar_Fill.png`,
      smallBase: `${BASE}/UI Elements/UI Elements/Bars/SmallBar_Base.png`,
      smallFill: `${BASE}/UI Elements/UI Elements/Bars/SmallBar_Fill.png`,
    },
    banners: {
      banner: `${BASE}/UI Elements/UI Elements/Banners/Banner.png`,
      bannerSlots: `${BASE}/UI Elements/UI Elements/Banners/Banner_Slots.png`,
    },
    buttons: {
      roundBlue: `${BASE}/UI Elements/UI Elements/Buttons/TinyRoundBlueButton.png`,
      roundRed: `${BASE}/UI Elements/UI Elements/Buttons/TinyRoundRedButton.png`,
      squareBlue: `${BASE}/UI Elements/UI Elements/Buttons/TinySquareBlueButton.png`,
      squareRed: `${BASE}/UI Elements/UI Elements/Buttons/TinySquareRedButton.png`,
    },
    ribbons: {
      black: `${BASE}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Black.png`,
      blue: `${BASE}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Blue.png`,
      purple: `${BASE}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Purple.png`,
      red: `${BASE}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Red.png`,
      yellow: `${BASE}/UI Elements/UI Banners from the store page/Ribbons/Ribbon_Yellow.png`,
    },
    storeBanner: `${BASE}/UI Elements/UI Banners from the store page/Banner/Banner.png`,
    storeSlots: `${BASE}/UI Elements/UI Banners from the store page/Banner/Slots.png`,
  },

  // ---- Warriors (all colors — flat paths for direct access) ----------------
  warrior: {
    idle: `${BASE}/Units/Blue Units/Warrior/Warrior_Idle.png`,
    run: `${BASE}/Units/Blue Units/Warrior/Warrior_Run.png`,
    attack: `${BASE}/Units/Blue Units/Warrior/Warrior_Attack1.png`,
  },
} as const;

// ---------------------------------------------------------------------------
// Named asset bundles — pass to loadAssets() before using the accessors below
// ---------------------------------------------------------------------------

/** Core bundle: terrain + blue warrior. Loaded by loadGameAssets(). */
export const BUNDLE_CORE = [
  ASSET_PATHS.tilemap,
  ASSET_PATHS.tilemaps.color2,
  ASSET_PATHS.tilemaps.color3,
  ASSET_PATHS.tilemaps.color4,
  ASSET_PATHS.tilemaps.color5,
  ASSET_PATHS.tilemaps.shadow,
  ASSET_PATHS.tilemaps.waterBackground,
  ASSET_PATHS.tilemaps.waterFoam,
  ASSET_PATHS.warrior.idle,
  ASSET_PATHS.warrior.run,
  ASSET_PATHS.warrior.attack,
  ...ASSET_PATHS.resources.trees,
  ...ASSET_PATHS.resources.stumps,
  ...ASSET_PATHS.decorations.rocks,
  ASSET_PATHS.particles.fire1,
  ASSET_PATHS.decorations.rubberDuck,
];

/** All warrior sprites for every color and animation. */
export const BUNDLE_WARRIORS: string[] = (
  ["blue", "black", "red", "purple", "yellow"] as UnitColor[]
).flatMap((c) => [
  unitDir(c, "Warrior", "Warrior_Idle.png"),
  unitDir(c, "Warrior", "Warrior_Run.png"),
  unitDir(c, "Warrior", "Warrior_Attack1.png"),
  unitDir(c, "Warrior", "Warrior_Attack2.png"),
  unitDir(c, "Warrior", "Warrior_Guard.png"),
]);

/** All archer sprites for every color. */
export const BUNDLE_ARCHERS: string[] = (
  ["blue", "black", "red", "purple", "yellow"] as UnitColor[]
).flatMap((c) => [
  unitDir(c, "Archer", "Archer_Idle.png"),
  unitDir(c, "Archer", "Archer_Run.png"),
  unitDir(c, "Archer", "Archer_Shoot.png"),
  unitDir(c, "Archer", "Arrow.png"),
]);

/** All lancer sprites for every color and direction. */
export const BUNDLE_LANCERS: string[] = (
  ["blue", "black", "red", "purple", "yellow"] as UnitColor[]
).flatMap((c) =>
  [
    "Lancer_Idle.png",
    "Lancer_Run.png",
    "Lancer_Up_Attack.png",
    "Lancer_Up_Defence.png",
    "Lancer_UpRight_Attack.png",
    "Lancer_UpRight_Defence.png",
    "Lancer_Right_Attack.png",
    "Lancer_Right_Defence.png",
    "Lancer_DownRight_Attack.png",
    "Lancer_DownRight_Defence.png",
    "Lancer_Down_Attack.png",
    "Lancer_Down_Defence.png",
  ].map((f) => unitDir(c, "Lancer", f)),
);

/** All monk sprites for every color. */
export const BUNDLE_MONKS: string[] = (
  ["blue", "black", "red", "purple", "yellow"] as UnitColor[]
).flatMap((c) => [
  unitDir(c, "Monk", "Idle.png"),
  unitDir(c, "Monk", "Run.png"),
  unitDir(c, "Monk", "Heal.png"),
  unitDir(c, "Monk", "Heal_Effect.png"),
]);

/** All buildings for every color and type. */
export const BUNDLE_BUILDINGS: string[] = (
  ["blue", "black", "red", "purple", "yellow"] as BuildingColor[]
).flatMap((c) =>
  (
    [
      "archery",
      "barracks",
      "castle",
      "house1",
      "house2",
      "house3",
      "monastery",
      "tower",
    ] as BuildingType[]
  ).map((t) => buildingPath(c, t)),
);

/** All particle FX sheets. */
export const BUNDLE_PARTICLES: string[] = Object.values(ASSET_PATHS.particles);

/** Terrain decorations: rocks, bushes, clouds, water rocks. */
export const BUNDLE_TERRAIN_DECO: string[] = [
  ...ASSET_PATHS.decorations.rocks,
  ...ASSET_PATHS.decorations.bushes,
  ...ASSET_PATHS.decorations.clouds,
  ...ASSET_PATHS.decorations.waterRocks,
  ASSET_PATHS.decorations.rubberDuck,
];

/** Resource nodes: all tree/stump variants + gold/wood/meat items. */
export const BUNDLE_RESOURCES: string[] = [
  ...ASSET_PATHS.resources.trees,
  ...ASSET_PATHS.resources.stumps,
  ...ASSET_PATHS.resources.goldStones,
  ...ASSET_PATHS.resources.goldStonesHighlight,
  ...ASSET_PATHS.resources.tools,
  ASSET_PATHS.resources.goldResource,
  ASSET_PATHS.resources.goldResourceHighlight,
  ASSET_PATHS.resources.woodItem,
  ASSET_PATHS.resources.meatItem,
  ASSET_PATHS.resources.sheepIdle,
  ASSET_PATHS.resources.sheepMove,
  ASSET_PATHS.resources.sheepGrass,
];

/** All Tiny Swords UI element sprites. */
export const BUNDLE_UI: string[] = [
  ...Object.values(ASSET_PATHS.ui.bars),
  ...Object.values(ASSET_PATHS.ui.banners),
  ...Object.values(ASSET_PATHS.ui.buttons),
  ...Object.values(ASSET_PATHS.ui.ribbons),
  ASSET_PATHS.ui.storeBanner,
  ASSET_PATHS.ui.storeSlots,
];

// ---------------------------------------------------------------------------
// Texture cache + load helpers
// ---------------------------------------------------------------------------

const textures = new Map<string, Texture>();

/**
 * Loads the core gameplay bundle (terrain + blue warrior). Called once during
 * engine.init(). Subsequent calls are no-ops if the cache is already populated.
 */
export async function loadGameAssets(): Promise<void> {
  if (textures.size > 0) return;
  await loadAssets(BUNDLE_CORE);
}

/**
 * Loads any set of asset paths into the texture cache. Safe to call multiple
 * times with overlapping paths — already-loaded entries are skipped.
 */
export async function loadAssets(paths: readonly string[]): Promise<void> {
  const missing = paths.filter((p) => !textures.has(p));
  if (missing.length === 0) return;
  const loaded = await Assets.load(missing as string[]);
  for (const path of missing) {
    const t = loaded[path];
    if (t) textures.set(path, t);
  }
}

function requireTexture(path: string): Texture {
  const t = textures.get(path);
  if (!t) throw new Error(`Asset not loaded: ${path}. Call loadAssets() with this path first.`);
  return t;
}

/** Slices all frames from a horizontal spritesheet. Count auto-computed from sheet width. */
function sliceSheet(path: string, frameW: number, frameH: number): Texture[] {
  const tex = requireTexture(path);
  const count = Math.floor(tex.source.width / frameW);
  const frames: Texture[] = [];
  for (let i = 0; i < count; i++) {
    frames.push(
      new Texture({ source: tex.source, frame: new Rectangle(i * frameW, 0, frameW, frameH) }),
    );
  }
  return frames;
}

// ---------------------------------------------------------------------------
// Frame caches
// ---------------------------------------------------------------------------

const sheetCache = new Map<string, Texture[]>();
const singleCache = new Map<string, Texture>();

function cachedSheet(path: string, frameW: number, frameH: number): Texture[] {
  let f = sheetCache.get(path);
  if (!f) {
    f = sliceSheet(path, frameW, frameH);
    sheetCache.set(path, f);
  }
  return f;
}

function cachedTexture(path: string): Texture {
  let t = singleCache.get(path);
  if (!t) {
    t = requireTexture(path);
    singleCache.set(path, t);
  }
  return t;
}

// ---------------------------------------------------------------------------
// Grass tile (existing — used by engine.ts)
// ---------------------------------------------------------------------------

let grassTileCache: Texture | null = null;

/**
 * Interior grass fill tile from Tilemap_color1. The only cell in the platform
 * chunk sheet that tiles cleanly without exposing border/cliff decoration.
 */
export function getGrassTileTexture(): Texture {
  if (grassTileCache) return grassTileCache;
  const { x, y, w, h } = GRASS_TILE_FRAME;
  grassTileCache = new Texture({
    source: requireTexture(ASSET_PATHS.tilemap).source,
    frame: new Rectangle(x, y, w, h),
  });
  return grassTileCache;
}

const biomeTileCaches = new Map<number, Texture>();

/** Slices the interior tile frame from any of the five tilemap color sheets. */
export function getBiomeTileTexture(variant: 1 | 2 | 3 | 4 | 5): Texture {
  let cached = biomeTileCaches.get(variant);
  if (!cached) {
    const tilemap = getTilemapTexture(variant);
    const { x, y, w, h } = GRASS_TILE_FRAME;
    cached = new Texture({
      source: tilemap.source,
      frame: new Rectangle(x, y, w, h),
    });
    biomeTileCaches.set(variant, cached);
  }
  return cached;
}

// ---------------------------------------------------------------------------
// Tilemap variants
// ---------------------------------------------------------------------------

/** Grass tilemap. Variant 1–5; variant 1 is pre-loaded by loadGameAssets(). */
export function getTilemapTexture(variant: 1 | 2 | 3 | 4 | 5 = 1): Texture {
  const paths = [
    ASSET_PATHS.tilemap,
    ASSET_PATHS.tilemaps.color2,
    ASSET_PATHS.tilemaps.color3,
    ASSET_PATHS.tilemaps.color4,
    ASSET_PATHS.tilemaps.color5,
  ];
  return cachedTexture(paths[variant - 1]!);
}

export function getWaterFoamTexture(): Texture {
  return cachedTexture(ASSET_PATHS.tilemaps.waterFoam);
}

export function getWaterBackgroundTexture(): Texture {
  return cachedTexture(ASSET_PATHS.tilemaps.waterBackground);
}

export function getShadowTexture(): Texture {
  return cachedTexture(ASSET_PATHS.tilemaps.shadow);
}

// ---------------------------------------------------------------------------
// Warriors — all colors
// ---------------------------------------------------------------------------

const WARRIOR_FILE: Record<WarriorAnimKey, string> = {
  idle: "Warrior_Idle.png",
  run: "Warrior_Run.png",
  attack: "Warrior_Attack1.png",
  attack2: "Warrior_Attack2.png",
  guard: "Warrior_Guard.png",
};

/**
 * Returns all animation frames for the given warrior color and anim key.
 * Frame count is derived from the spritesheet width / 192.
 *
 * Pre-loaded for `color="blue"` via `loadGameAssets()`. Other colors require
 * `await loadAssets(BUNDLE_WARRIORS)` first.
 */
export function getWarriorFrames(anim: WarriorAnimKey, color: UnitColor = "blue"): Texture[] {
  const path = unitDir(color, "Warrior", WARRIOR_FILE[anim]);
  return cachedSheet(path, UNIT_FRAME, UNIT_FRAME);
}

// ---------------------------------------------------------------------------
// Archers — all colors
// ---------------------------------------------------------------------------

/**
 * Archer animation frames. Require `await loadAssets(BUNDLE_ARCHERS)`.
 */
export function getArcherFrames(
  anim: "idle" | "run" | "shoot",
  color: UnitColor = "blue",
): Texture[] {
  const file = {
    idle: "Archer_Idle.png",
    run: "Archer_Run.png",
    shoot: "Archer_Shoot.png",
  }[anim];
  return cachedSheet(unitDir(color, "Archer", file), UNIT_FRAME, UNIT_FRAME);
}

/** Single-frame arrow projectile sprite. */
export function getArrowTexture(color: UnitColor = "blue"): Texture {
  return cachedTexture(unitDir(color, "Archer", "Arrow.png"));
}

// ---------------------------------------------------------------------------
// Lancers — all colors and directions
// ---------------------------------------------------------------------------

function lancerFile(anim: "idle" | "run"): string;
function lancerFile(anim: "attack" | "defence", dir: LancerDir): string;
function lancerFile(anim: "idle" | "run" | "attack" | "defence", dir?: LancerDir): string {
  if (anim === "idle") return "Lancer_Idle.png";
  if (anim === "run") return "Lancer_Run.png";
  const dirLabel = LANCER_DIR_LABEL[dir!];
  const actionLabel = anim === "attack" ? "Attack" : "Defence";
  return `Lancer_${dirLabel}_${actionLabel}.png`;
}

/** Lancer idle/run animation frames. Require `await loadAssets(BUNDLE_LANCERS)`. */
export function getLancerFrames(anim: "idle" | "run", color?: UnitColor): Texture[];
/** Lancer directional attack or defence frames. */
export function getLancerFrames(
  anim: "attack" | "defence",
  color: UnitColor,
  dir: LancerDir,
): Texture[];
export function getLancerFrames(
  anim: "idle" | "run" | "attack" | "defence",
  color: UnitColor = "blue",
  dir?: LancerDir,
): Texture[] {
  const file =
    anim === "idle" || anim === "run"
      ? lancerFile(anim)
      : lancerFile(anim as "attack" | "defence", dir!);
  return cachedSheet(unitDir(color, "Lancer", file), UNIT_FRAME, UNIT_FRAME);
}

// ---------------------------------------------------------------------------
// Monks — all colors
// ---------------------------------------------------------------------------

/**
 * Monk animation frames.
 * Note: Monk files lack the "Monk_" prefix (Idle.png, Run.png, Heal.png).
 * Require `await loadAssets(BUNDLE_MONKS)`.
 */
export function getMonkFrames(
  anim: "idle" | "run" | "heal",
  color: UnitColor = "blue",
): Texture[] {
  const file = { idle: "Idle.png", run: "Run.png", heal: "Heal.png" }[anim];
  return cachedSheet(unitDir(color, "Monk", file), UNIT_FRAME, UNIT_FRAME);
}

/** Heal effect overlay frames (the healing sparkle, not the monk itself). */
export function getMonkHealEffectFrames(color: UnitColor = "blue"): Texture[] {
  return cachedSheet(unitDir(color, "Monk", "Heal_Effect.png"), UNIT_FRAME, UNIT_FRAME);
}

// ---------------------------------------------------------------------------
// Pawns — all colors and tool variants
// ---------------------------------------------------------------------------

function pawnFilename(anim: PawnAnim, tool: PawnTool): string {
  const animLabel = { idle: "Idle", run: "Run", interact: "Interact" }[anim];
  if (tool === null) return `Pawn_${animLabel}.png`;
  return `Pawn_${animLabel} ${PAWN_TOOL_LABEL[tool]}.png`;
}

/**
 * Pawn animation frames for a given tool and anim.
 * `interact` is only available for: axe, hammer, knife, pickaxe.
 * Pass `tool=null` for the bare/unarmed pawn.
 * Require loading the pawn paths explicitly (not in a named bundle — pawns
 * are many; load only what you need).
 */
export function getPawnFrames(
  anim: PawnAnim,
  color: UnitColor = "blue",
  tool: PawnTool = null,
): Texture[] {
  const file = pawnFilename(anim, tool);
  return cachedSheet(unitDir(color, "Pawn", file), UNIT_FRAME, UNIT_FRAME);
}

/** Paths for all pawn sprites for one color (use with loadAssets). */
export function pawnBundleForColor(color: UnitColor): string[] {
  const tools: PawnTool[] = [null, "axe", "gold", "hammer", "knife", "meat", "pickaxe", "wood"];
  const anims: PawnAnim[] = ["idle", "run", "interact"];
  const interactTools = new Set<PawnTool>(["axe", "hammer", "knife", "pickaxe"]);
  const paths: string[] = [];
  for (const tool of tools) {
    for (const anim of anims) {
      if (anim === "interact" && !interactTools.has(tool)) continue;
      paths.push(unitDir(color, "Pawn", pawnFilename(anim, tool)));
    }
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

/**
 * Single-frame building sprite. Require `await loadAssets(BUNDLE_BUILDINGS)`.
 */
export function getBuildingTexture(color: BuildingColor, type: BuildingType): Texture {
  return cachedTexture(buildingPath(color, type));
}

// ---------------------------------------------------------------------------
// Trees (4 variants, each an 8-frame animated sheet)
// ---------------------------------------------------------------------------

/**
 * All frames for a tree variant (1–4). Frame 0 = standing; later frames = fall.
 * Variant 1 is pre-loaded by loadGameAssets(). Others need BUNDLE_RESOURCES.
 */
export function getTreeVariantFrames(variant: 1 | 2 | 3 | 4 = 1): Texture[] {
  return cachedSheet(ASSET_PATHS.resources.trees[variant - 1]!, 192, 256);
}

/** First frame of a tree variant — standing, full-health. */
export function getTreeVariantTexture(variant: 1 | 2 | 3 | 4 = 1): Texture {
  return getTreeVariantFrames(variant)[0]!;
}

// Backward-compat aliases (used by engine.ts)
export function getTreeFrames(): Texture[] {
  return getTreeVariantFrames(1);
}
export function getTreeTexture(): Texture {
  return getTreeVariantTexture(1);
}

// ---------------------------------------------------------------------------
// Stumps (4 variants, static single-frame sprites)
// ---------------------------------------------------------------------------

/**
 * Stump sprite left behind after a tree is harvested. Variant 1–4.
 * Variant 1 pre-loaded by loadGameAssets(). Others need BUNDLE_RESOURCES.
 */
export function getStumpVariantTexture(variant: 1 | 2 | 3 | 4 = 1): Texture {
  return cachedTexture(ASSET_PATHS.resources.stumps[variant - 1]!);
}

// Backward-compat alias
export function getStumpTexture(): Texture {
  return getStumpVariantTexture(1);
}

// ---------------------------------------------------------------------------
// Rocks (4 variants, static single-frame)
// ---------------------------------------------------------------------------

/**
 * Rock / ore-vein sprite. Variant 1–4.
 * Variant 1 pre-loaded by loadGameAssets(). Others need BUNDLE_TERRAIN_DECO.
 */
export function getRockVariantTexture(variant: 1 | 2 | 3 | 4 = 1): Texture {
  return cachedTexture(ASSET_PATHS.decorations.rocks[variant - 1]!);
}

// Backward-compat alias
export function getRockTexture(): Texture {
  return getRockVariantTexture(1);
}

// ---------------------------------------------------------------------------
// Decorations
// ---------------------------------------------------------------------------

/** Bush decoration sprite. Variant 1–4. Require BUNDLE_TERRAIN_DECO. */
export function getBushTexture(variant: 1 | 2 | 3 | 4): Texture {
  return cachedTexture(ASSET_PATHS.decorations.bushes[variant - 1]!);
}

/** Cloud sprite. Variant 1–8. Require BUNDLE_TERRAIN_DECO. */
export function getCloudTexture(variant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8): Texture {
  return cachedTexture(ASSET_PATHS.decorations.clouds[variant - 1]!);
}

/** Water rock decoration. Variant 1–4. Require BUNDLE_TERRAIN_DECO. */
export function getWaterRockTexture(variant: 1 | 2 | 3 | 4): Texture {
  return cachedTexture(ASSET_PATHS.decorations.waterRocks[variant - 1]!);
}

/** The iconic rubber duck Easter egg. Require BUNDLE_TERRAIN_DECO. */
export function getRubberDuckTexture(): Texture {
  return cachedTexture(ASSET_PATHS.decorations.rubberDuck);
}

// ---------------------------------------------------------------------------
// Resource items
// ---------------------------------------------------------------------------

/** Animated gold pile (shimmers). Require BUNDLE_RESOURCES. */
export function getGoldResourceFrames(highlight = false): Texture[] {
  const path = highlight
    ? ASSET_PATHS.resources.goldResourceHighlight
    : ASSET_PATHS.resources.goldResource;
  return cachedSheet(path, UNIT_FRAME, UNIT_FRAME);
}

/** Gold stone prop. Variant 1–6; pass highlight=true for the lit variant. Require BUNDLE_RESOURCES. */
export function getGoldStoneTexture(variant: 1 | 2 | 3 | 4 | 5 | 6, highlight = false): Texture {
  const arr = highlight
    ? ASSET_PATHS.resources.goldStonesHighlight
    : ASSET_PATHS.resources.goldStones;
  return cachedTexture(arr[variant - 1]!);
}

/** Single-frame wood resource item. Require BUNDLE_RESOURCES. */
export function getWoodItemTexture(): Texture {
  return cachedTexture(ASSET_PATHS.resources.woodItem);
}

/** Single-frame meat resource item. Require BUNDLE_RESOURCES. */
export function getMeatItemTexture(): Texture {
  return cachedTexture(ASSET_PATHS.resources.meatItem);
}

/** Sheep animation frames. Require BUNDLE_RESOURCES. */
export function getSheepFrames(anim: "idle" | "move" | "grass"): Texture[] {
  const path = {
    idle: ASSET_PATHS.resources.sheepIdle,
    move: ASSET_PATHS.resources.sheepMove,
    grass: ASSET_PATHS.resources.sheepGrass,
  }[anim];
  return cachedSheet(path, SHEEP_FRAME, SHEEP_FRAME);
}

/** Tool icon sprite (icon, not a spritesheet). Tool 1–4. Require BUNDLE_RESOURCES. */
export function getToolTexture(tool: 1 | 2 | 3 | 4): Texture {
  return cachedTexture(ASSET_PATHS.resources.tools[tool - 1]!);
}

// ---------------------------------------------------------------------------
// Particle FX
// ---------------------------------------------------------------------------

/**
 * Animated particle effect frames. Frame width: PARTICLE_FRAME (48px).
 * Require `await loadAssets(BUNDLE_PARTICLES)`.
 */
export function getParticleFXFrames(key: ParticleFXKey): Texture[] {
  return cachedSheet(ASSET_PATHS.particles[key], PARTICLE_FRAME, PARTICLE_FRAME);
}

// ---------------------------------------------------------------------------
// UI sprites
// ---------------------------------------------------------------------------

/** Tiny Swords bar sprite (base plate). Require BUNDLE_UI. */
export function getBarBaseTexture(size: "big" | "small"): Texture {
  return cachedTexture(
    size === "big" ? ASSET_PATHS.ui.bars.bigBase : ASSET_PATHS.ui.bars.smallBase,
  );
}

/** Tiny Swords bar fill sprite. Require BUNDLE_UI. */
export function getBarFillTexture(size: "big" | "small"): Texture {
  return cachedTexture(
    size === "big" ? ASSET_PATHS.ui.bars.bigFill : ASSET_PATHS.ui.bars.smallFill,
  );
}

/** Ribbon banner (colored strip). Require BUNDLE_UI. */
export function getRibbonTexture(color: RibbonColor): Texture {
  return cachedTexture(ASSET_PATHS.ui.ribbons[color]);
}

/** Tiny Swords round button. Require BUNDLE_UI. */
export function getRoundButtonTexture(color: "blue" | "red"): Texture {
  return cachedTexture(
    color === "blue" ? ASSET_PATHS.ui.buttons.roundBlue : ASSET_PATHS.ui.buttons.roundRed,
  );
}

/** Tiny Swords square button. Require BUNDLE_UI. */
export function getSquareButtonTexture(color: "blue" | "red"): Texture {
  return cachedTexture(
    color === "blue" ? ASSET_PATHS.ui.buttons.squareBlue : ASSET_PATHS.ui.buttons.squareRed,
  );
}

/** Banner panel sprite. Require BUNDLE_UI. */
export function getBannerTexture(withSlots = false): Texture {
  return cachedTexture(
    withSlots ? ASSET_PATHS.ui.banners.bannerSlots : ASSET_PATHS.ui.banners.banner,
  );
}

/** Store-page banner. Require BUNDLE_UI. */
export function getStoreBannerTexture(withSlots = false): Texture {
  return cachedTexture(withSlots ? ASSET_PATHS.ui.storeSlots : ASSET_PATHS.ui.storeBanner);
}
