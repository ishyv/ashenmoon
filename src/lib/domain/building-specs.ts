/**
 * Per-building footprint, texture, and sprite-size table. WHY: the type→texture
 * `if/else` chain and the `type === "wall" ? 1 : 2` footprint math were each
 * duplicated across building.ts and engine.ts. One table keeps placement,
 * collision, and rendering agreeing on the same numbers.
 *
 * Units are tiles; multiply `sprite` dimensions by TILE at render time. `sprite`
 * height can exceed the footprint (e.g. a tower's art is taller than its base).
 */
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import { getStationDefinition, type StationId } from "$lib/domain/stations";

export type BuildingTextureType =
  | "archery"
  | "barracks"
  | "castle"
  | "house1"
  | "house2"
  | "house3"
  | "monastery"
  | "tower";

export interface BuildingSpec {
  /** lowercase player-facing label. */
  displayName: string;
  /** short lowercase player-facing description. */
  description: string;
  /** collision + placement footprint, in tiles. */
  footprint: { w: number; h: number };
  /** which building art to draw (some types reuse another's texture). */
  textureType: BuildingTextureType;
  /** rendered sprite size, in tiles. */
  sprite: { w: number; h: number };
  /** inventory cost paid before the building is recorded. */
  cost?: Record<string, number>;
  /** optional station unlocked by this building. */
  stationId?: StationId;
}

export const M3_BUILDABLE_IDS = [
  "spike_barrier",
  "rain_catcher",
  "meat_smoking_rack",
  "simple_bedroll",
  "storage_pile",
  "marker_sign",
  "crude_shelter",
] as const;

export type M3BuildableId = (typeof M3_BUILDABLE_IDS)[number];

export const BUILDING_SPECS: Record<string, BuildingSpec> = {
  wall: {
    displayName: "wall",
    description: "a one-tile barrier.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
  },
  house1: {
    displayName: "outpost house",
    description: "a compact shelter from the older outpost kit.",
    footprint: { w: 2, h: 2 },
    textureType: "house1",
    sprite: { w: 2, h: 2 },
  },
  tower: {
    displayName: "tower",
    description: "a tall watch structure from the older outpost kit.",
    footprint: { w: 2, h: 2 },
    textureType: "tower",
    sprite: { w: 2, h: 3 },
  },
  barracks: {
    displayName: "barracks",
    description: "a larger old outpost structure.",
    footprint: { w: 2, h: 2 },
    textureType: "barracks",
    sprite: { w: 2, h: 2 },
  },
  storage_pile: {
    displayName: "storage pile",
    description: "a rough place to keep gathered supplies off the wet ground.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { branch: 3, bark: 4, vine: 2 },
    stationId: "storage_pile",
  },
  campfire: {
    displayName: "campfire",
    description: "a stone-ringed fire for warmth, light, boiling, cooking, and burning.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { stone: 3, stick: 4, leaves: 2, branch: 1 },
    stationId: "campfire",
  },
  drying_rack: {
    displayName: "drying rack",
    description: "a simple rack for one slow camp process.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { stick: 6, grass_fiber: 4 },
    stationId: "drying_rack",
  },
  primitive_work_surface: {
    displayName: "primitive work surface",
    description: "a flat work spot for careful experiments.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { branch: 2, bark: 4 },
    stationId: "primitive_work_surface",
  },
  lean_to: {
    displayName: "lean-to",
    description: "a crude shelter to rest and hide from the cold.",
    footprint: { w: 1, h: 1 },
    textureType: "house1",
    sprite: { w: 1, h: 1 },
    cost: { branch: 4, leaves: 8 },
  },
  crude_shelter: {
    displayName: "crude shelter",
    description: "branch and leaf cover that cuts the worst of rain and night cold.",
    footprint: { w: 1, h: 1 },
    textureType: "house1",
    sprite: { w: 1, h: 1 },
    cost: { branch: 5, green_leaves: 8, bark_rope: 2, vine: 2 },
  },
  marker_sign: {
    displayName: "marker sign",
    description: "a rough camp marker for wayfinding.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { stick: 1, bark: 2, charcoal: 1 },
  },
  spike_barrier: {
    displayName: "spike barrier",
    description: "sharpened stakes lashed into a crude argument against teeth.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { stick: 8, branch: 3, bark_rope: 2, flint_shard: 1 },
  },
  rain_catcher: {
    displayName: "rain catcher",
    description: "a hide-stretched frame that catches rainwater.",
    footprint: { w: 1, h: 1 },
    textureType: "house2",
    sprite: { w: 1, h: 1 },
    cost: { branch: 4, cured_hide: 1, bark_rope: 2, sealing_paste: 1 },
  },
  meat_smoking_rack: {
    displayName: "meat smoking rack",
    description: "a rack that feeds smoke around meat instead of direct flame.",
    footprint: { w: 1, h: 1 },
    textureType: "house3",
    sprite: { w: 1, h: 1 },
    cost: { branch: 5, grass_cord: 4, clay: 2, stone: 4 },
    stationId: "meat_smoking_rack",
  },
  simple_bedroll: {
    displayName: "simple bedroll",
    description: "layered leaves, hide, and fiber for a barely civilized rest.",
    footprint: { w: 1, h: 1 },
    textureType: "house1",
    sprite: { w: 1, h: 1 },
    cost: { dried_hide: 1, green_leaves: 8, grass_cord: 6, feather: 4 },
  },
};

/** Fallback for any type without an explicit spec (matches the old house1 default). */
export const DEFAULT_BUILDING_SPEC: BuildingSpec = {
  displayName: "unknown structure",
  description: "a fallback structure.",
  footprint: { w: 2, h: 2 },
  textureType: "house1",
  sprite: { w: 2, h: 2 },
};

export function getBuildingSpec(type: string): BuildingSpec {
  return BUILDING_SPECS[type] ?? DEFAULT_BUILDING_SPEC;
}

export function validateBuildingSpecs(specs: Record<string, BuildingSpec>): string[] {
  const problems: string[] = [];

  for (const [id, spec] of Object.entries(specs)) {
    if (spec.footprint.w <= 0 || spec.footprint.h <= 0) {
      problems.push(`${id} has invalid footprint`);
    }
    if (spec.sprite.w <= 0 || spec.sprite.h <= 0) {
      problems.push(`${id} has invalid sprite size`);
    }
    if (spec.stationId && !getStationDefinition(spec.stationId)) {
      problems.push(`${id} references missing station ${spec.stationId}`);
    }
    for (const [itemId, qty] of Object.entries(spec.cost ?? {})) {
      if (!ITEM_DEFINITIONS[itemId]) {
        problems.push(`${id} cost references missing item ${itemId}`);
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        problems.push(`${id} cost for ${itemId} must be positive`);
      }
    }
  }

  return problems;
}
