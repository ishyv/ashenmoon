/**
 * Exposure context: where an item is held changes what the world does to it.
 * A pile of dry leaves on the ground beside a fire ignites; the same leaves
 * sealed in a tin do not. These pure helpers turn a carry location plus ambient
 * conditions into the effective numbers the reaction systems consume.
 */

/** Where an item physically sits, from most to least exposed. */
export type ExposureLocation = "ground" | "pack" | "sealed";

export interface ExposureContext {
  readonly location: ExposureLocation;
  /** Ambient temperature of the surrounding tile (°C). */
  readonly ambientTemp: number;
  /** Whether an open flame (campfire, brazier) is within radiant range. */
  readonly nearFire: boolean;
}

export type ItemLocation =
  | "inventory"
  | "world_drop"
  | "placed"
  | "station_input"
  | "equipped";

export interface ItemExposureContext {
  readonly location: ItemLocation;
  readonly heatExposure: number;
  readonly coldExposure: number;
  readonly moistureExposure: number;
  readonly toxinExposure: number;
  readonly impactExposure: number;
  readonly insulation: number;
}

/** Radiant heat (°C) an open flame adds to a fully exposed item. */
export const OPEN_FLAME_BONUS = 600;

/**
 * Temperature an item actually experiences. Ground items take the full radiant
 * load; a pack shields most of it; a sealed container insulates from radiant
 * heat entirely (ambient still conducts through).
 */
export function effectiveTemperature(ctx: ExposureContext): number {
  const radiant = ctx.nearFire ? OPEN_FLAME_BONUS : 0;
  switch (ctx.location) {
    case "ground":
      return ctx.ambientTemp + radiant;
    case "pack":
      return ctx.ambientTemp + radiant * 0.4;
    case "sealed":
      return ctx.ambientTemp;
  }
}

/** Whether an item at this location can catch fire at all (sealed cannot). */
export function canIgnite(location: ExposureLocation): boolean {
  return location !== "sealed";
}

/**
 * Multiplier on decay speed by location. Open air rots at full rate; a pack
 * slows it; a sealed container slows it further (airtight, dry).
 */
export function decayRateMultiplier(location: ExposureLocation): number {
  switch (location) {
    case "ground":
      return 1;
    case "pack":
      return 0.75;
    case "sealed":
      return 0.4;
  }
}
