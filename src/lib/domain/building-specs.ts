/**
 * Per-building footprint, texture, and sprite-size table. WHY: the type→texture
 * `if/else` chain and the `type === "wall" ? 1 : 2` footprint math were each
 * duplicated across building.ts and engine.ts. One table keeps placement,
 * collision, and rendering agreeing on the same numbers.
 *
 * Units are tiles; multiply `sprite` dimensions by TILE at render time. `sprite`
 * height can exceed the footprint (e.g. a tower's art is taller than its base).
 */
import type { BuildingType } from "$lib/core/assets";

export interface BuildingSpec {
  /** collision + placement footprint, in tiles. */
  footprint: { w: number; h: number };
  /** which building art to draw (some types reuse another's texture). */
  textureType: BuildingType;
  /** rendered sprite size, in tiles. */
  sprite: { w: number; h: number };
}

export const BUILDING_SPECS: Record<string, BuildingSpec> = {
  wall: { footprint: { w: 1, h: 1 }, textureType: "house3", sprite: { w: 1, h: 1 } },
  house1: { footprint: { w: 2, h: 2 }, textureType: "house1", sprite: { w: 2, h: 2 } },
  tower: { footprint: { w: 2, h: 2 }, textureType: "tower", sprite: { w: 2, h: 3 } },
  barracks: { footprint: { w: 2, h: 2 }, textureType: "barracks", sprite: { w: 2, h: 2 } },
};

/** Fallback for any type without an explicit spec (matches the old house1 default). */
export const DEFAULT_BUILDING_SPEC: BuildingSpec = {
  footprint: { w: 2, h: 2 },
  textureType: "house1",
  sprite: { w: 2, h: 2 },
};

export function getBuildingSpec(type: string): BuildingSpec {
  return BUILDING_SPECS[type] ?? DEFAULT_BUILDING_SPEC;
}
