import type { LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";

export type ForestWaterKind = "river" | "pond" | "muddy_pool";
export type ForestResourceClusterKind =
  | "starter_materials"
  | "rocky_patch"
  | "clearing"
  | "water_edge"
  | "dense_forest";
export type ForestAnimalZoneKind =
  | "rabbit_burrow"
  | "deer_grazing"
  | "boar_rooting"
  | "wolf_territory";
export type ForestEventPointKind = "corpse_site" | "berry_patch" | "water_sign" | "wolf_howl";

export interface ForestPoint {
  x: number;
  y: number;
}

export interface ForestWaterSource extends ForestPoint {
  kind: ForestWaterKind;
  radiusTiles: number;
}

export interface ForestResourceCluster extends ForestPoint {
  kind: ForestResourceClusterKind;
  radiusTiles: number;
}

export interface ForestAnimalZone extends ForestPoint {
  kind: ForestAnimalZoneKind;
  radiusTiles: number;
}

export interface ForestEventPoint extends ForestPoint {
  kind: ForestEventPointKind;
}

export interface ForestLandmark extends ForestPoint {
  kind: LandmarkKind;
  label: string;
}

export interface ForestCampCandidate extends ForestPoint {
  radiusTiles: number;
}

export interface ForestMetadata {
  waterSources: ForestWaterSource[];
  resourceClusters: ForestResourceCluster[];
  animalZones: ForestAnimalZone[];
  landmarks: ForestLandmark[];
  campCandidates: ForestCampCandidate[];
  eventPoints: ForestEventPoint[];
}

export interface FirstCampGuaranteedSpawn {
  gatherableId: string;
  dx: number;
  dy: number;
  prefix: string;
}

type Relative<T> = Omit<T, "x" | "y"> & { dx: number; dy: number };

export interface FirstCampRelativeLayout {
  water: Omit<Relative<ForestWaterSource>, "x" | "y">;
  resourceClusters: readonly Relative<ForestResourceCluster>[];
  animalZones: readonly Relative<ForestAnimalZone>[];
  landmarks: readonly Relative<ForestLandmark>[];
  campCandidates: readonly Relative<ForestCampCandidate>[];
  eventPoints: readonly Relative<ForestEventPoint>[];
  guaranteedSpawns: readonly FirstCampGuaranteedSpawn[];
}

export const FIRST_CAMP_RELATIVE_LAYOUT = {
  water: { kind: "pond", dx: 10, dy: 2, radiusTiles: 3 },
  resourceClusters: [
    { kind: "starter_materials", dx: 0, dy: 6, radiusTiles: 7 },
    { kind: "water_edge", dx: 8, dy: 2, radiusTiles: 4 },
    { kind: "rocky_patch", dx: -9, dy: 4, radiusTiles: 4 },
    { kind: "clearing", dx: 3, dy: 7, radiusTiles: 5 },
    { kind: "dense_forest", dx: -8, dy: -8, radiusTiles: 6 },
  ],
  animalZones: [
    { kind: "rabbit_burrow", dx: 5, dy: 8, radiusTiles: 5 },
    { kind: "deer_grazing", dx: 8, dy: 6, radiusTiles: 6 },
    { kind: "boar_rooting", dx: -10, dy: -4, radiusTiles: 6 },
    { kind: "wolf_territory", dx: 18, dy: -12, radiusTiles: 9 },
  ],
  landmarks: [
    { kind: "fallen_tree",       label: "fallen tree",    dx: -6,  dy:  8 },
    { kind: "old_stump",         label: "old stump",      dx:  7,  dy: -5 },
    { kind: "pond",              label: "dark pond",      dx: 10,  dy:  2 },
    { kind: "huge_dead_tree",    label: "dead tree",      dx: -14, dy: -10 },
    { kind: "ruined_watch_post", label: "watch post",     dx:  16, dy:  8 },
    { kind: "old_road",          label: "old road",       dx: -12, dy:  12 },
    { kind: "burned_cart",       label: "burned cart",    dx:  12, dy: -14 },
    { kind: "wolf_den",          label: "wolf den",       dx:  18, dy: -14 },
    { kind: "river_crossing",    label: "river crossing", dx:  9,  dy:  0 },
    { kind: "deer_grazing_area", label: "grazing ground", dx:  8,  dy:  8 },
    { kind: "rabbit_burrow",     label: "rabbit burrow",  dx:  5,  dy:  9 },
    { kind: "deer_bedding",      label: "deer bedding",   dx:  10, dy:  6 },
  ],
  campCandidates: [
    { dx: 4, dy: 5, radiusTiles: 3 },
    { dx: -4, dy: 6, radiusTiles: 3 },
  ],
  eventPoints: [
    { kind: "water_sign", dx: 7, dy: 2 },
    { kind: "berry_patch", dx: 4, dy: 8 },
    { kind: "corpse_site", dx: 15, dy: -9 },
    { kind: "wolf_howl", dx: 18, dy: -12 },
  ],
  guaranteedSpawns: [
    { gatherableId: "water_source", dx: 8, dy: 2, prefix: "water" },
    { gatherableId: "clay_deposit", dx: 7, dy: 3, prefix: "clay" },
    { gatherableId: "clay_deposit", dx: 13, dy: 2, prefix: "clay" },
    { gatherableId: "loose_stone_pickup", dx: -9, dy: 4, prefix: "rocky" },
    { gatherableId: "flint_shard_pickup", dx: -8, dy: 5, prefix: "rocky" },
    { gatherableId: "flint_shard_pickup", dx: -10, dy: 3, prefix: "rocky" },
    { gatherableId: "berry_bush", dx: 4, dy: 8, prefix: "clearing" },
    { gatherableId: "grass_patch", dx: 3, dy: 6, prefix: "clearing" },
    { gatherableId: "moss_patch", dx: -7, dy: -6, prefix: "forest" },
    { gatherableId: "leaf_litter", dx: -7, dy: -5, prefix: "forest" },
    { gatherableId: "bark_strip", dx: -8, dy: -7, prefix: "forest" },
    { gatherableId: "branch_pickup", dx: -6, dy: -5, prefix: "forest" },
    { gatherableId: "mushroom_patch", dx: -9, dy: -6, prefix: "forest" },
    { gatherableId: "vine_node", dx: -4, dy: -8, prefix: "forest" },
    { gatherableId: "wild_root_node", dx: -2, dy: 6, prefix: "clearing" },
    { gatherableId: "acorn_pickup", dx: -6, dy: 8, prefix: "clearing" },
    { gatherableId: "wild_herb_patch", dx: 3, dy: -5, prefix: "forest" },
  ],
} as const satisfies FirstCampRelativeLayout;

export function createEmptyForestMetadata(): ForestMetadata {
  return {
    waterSources: [],
    resourceClusters: [],
    animalZones: [],
    landmarks: [],
    campCandidates: [],
    eventPoints: [],
  };
}

function rel(spawnX: number, spawnY: number, p: { dx: number; dy: number }): ForestPoint {
  return { x: spawnX + p.dx, y: spawnY + p.dy };
}

export function materializeFirstCampLayout(
  layout: FirstCampRelativeLayout,
  context: { mapW: number; mapH: number; spawnX: number; spawnY: number },
): ForestMetadata {
  const pondX = Math.min(context.mapW - 6, context.spawnX + layout.water.dx);
  const pondY = Math.min(context.mapH - 6, context.spawnY + layout.water.dy);
  return {
    waterSources: [{
      kind: layout.water.kind,
      x: pondX,
      y: pondY,
      radiusTiles: layout.water.radiusTiles,
    }],
    resourceClusters: layout.resourceClusters.map((cluster) => ({
      kind: cluster.kind,
      ...rel(context.spawnX, context.spawnY, cluster),
      radiusTiles: cluster.radiusTiles,
    })),
    animalZones: layout.animalZones.map((zone) => ({
      kind: zone.kind,
      ...rel(context.spawnX, context.spawnY, zone),
      radiusTiles: zone.radiusTiles,
    })),
    landmarks: layout.landmarks.map((landmark) => ({
      kind: landmark.kind,
      label: landmark.label,
      ...rel(context.spawnX, context.spawnY, landmark),
    })),
    campCandidates: layout.campCandidates.map((candidate) => ({
      ...rel(context.spawnX, context.spawnY, candidate),
      radiusTiles: candidate.radiusTiles,
    })),
    eventPoints: layout.eventPoints.map((point) => ({
      kind: point.kind,
      ...rel(context.spawnX, context.spawnY, point),
    })),
  };
}

export function validateFirstCampLayout(
  metadata: ForestMetadata,
  context: {
    mapW: number;
    mapH: number;
    spawnX: number;
    spawnY: number;
    blockedTiles: ReadonlySet<string>;
    waterTiles: ReadonlySet<string>;
    startSafeRadiusTiles: number;
  },
): string[] {
  const problems: string[] = [];
  const hasLandmark = (kind: LandmarkKind) => metadata.landmarks.some((landmark) => landmark.kind === kind);
  for (const kind of ["wolf_den", "pond", "river_crossing"] as const) {
    if (!hasLandmark(kind)) problems.push(`missing required landmark ${kind}`);
  }
  for (const kind of ["rabbit_burrow", "deer_grazing", "boar_rooting", "wolf_territory"] as const) {
    if (!metadata.animalZones.some((zone) => zone.kind === kind)) problems.push(`missing animal zone ${kind}`);
  }

  const inBounds = (point: ForestPoint) => point.x >= 0 && point.y >= 0 && point.x < context.mapW && point.y < context.mapH;
  for (const zone of metadata.animalZones) {
    if (!inBounds(zone)) problems.push(`animal zone ${zone.kind} is out of bounds`);
    if (zone.radiusTiles <= 0) problems.push(`animal zone ${zone.kind} has invalid radius`);
  }

  for (const source of metadata.waterSources) {
    if (!inBounds(source)) problems.push(`water source ${source.kind} is out of bounds`);
    if (!context.waterTiles.has(`${source.x},${source.y}`)) problems.push(`water source ${source.kind} is not marked water`);
  }

  const wolfDen = metadata.landmarks.find((landmark) => landmark.kind === "wolf_den");
  if (wolfDen && Math.hypot(wolfDen.x - context.spawnX, wolfDen.y - context.spawnY) <= context.startSafeRadiusTiles) {
    problems.push("wolf_den is inside the start-safe radius");
  }

  for (const candidate of metadata.campCandidates) {
    if (!inBounds(candidate)) problems.push("camp candidate is out of bounds");
    if (context.blockedTiles.has(`${candidate.x},${candidate.y}`) || context.waterTiles.has(`${candidate.x},${candidate.y}`)) {
      problems.push(`camp candidate ${candidate.x},${candidate.y} overlaps blocked terrain`);
    }
  }

  return problems;
}
