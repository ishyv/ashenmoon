export interface CampfireState {
  isLit: boolean;
  fuelRemainingMs: number;
  heatRadiusPx: number;
  lightRadiusPx: number;
  wetness: number;
}

export interface DryingSlot {
  inputItemId: string;
  outputItemId: string;
  progressMs: number;
  requiredMs: number;
}

export interface DryingRackState {
  slots: DryingSlot[];
  exposedToRain: boolean;
}

export type CampStructureType =
  | "campfire"
  | "primitive_work_surface"
  | "drying_rack"
  | "crude_shelter"
  | "marker_sign"
  | string;

export interface CampStructure {
  id: string;
  type: CampStructureType;
  x: number;
  y: number;
  protectionRadiusPx?: number;
  coldResistanceBonus?: number;
  rainProtection?: number;
}

export interface CampCluster {
  campfireId: string;
  structureIds: string[];
  center: { x: number; y: number };
}

export function createCampfireState(input: Partial<CampfireState> = {}): CampfireState {
  const isLit = input.isLit ?? false;
  return {
    isLit,
    fuelRemainingMs: input.fuelRemainingMs ?? (isLit ? 30_000 : 0),
    heatRadiusPx: isLit ? (input.heatRadiusPx ?? 224) : 0,
    lightRadiusPx: isLit ? (input.lightRadiusPx ?? 288) : 0,
    wetness: input.wetness ?? 0,
  };
}

export function tickCampfire(
  state: CampfireState,
  dtSec: number,
  context: { raining: boolean; sheltered: boolean },
): CampfireState {
  if (!state.isLit || dtSec <= 0) {
    return { ...state, heatRadiusPx: 0, lightRadiusPx: 0 };
  }

  const rainFuelMultiplier = context.raining && !context.sheltered ? 2.5 : 1;
  const nextFuel = Math.max(0, state.fuelRemainingMs - dtSec * 1_000 * rainFuelMultiplier);
  const nextWetness = Math.max(
    0,
    Math.min(1, state.wetness + (context.raining && !context.sheltered ? dtSec * 0.08 : -dtSec * 0.04)),
  );
  const isLit = nextFuel > 0 && nextWetness < 1;
  const strength = isLit ? Math.max(0.25, 1 - nextWetness * 0.65) : 0;

  return {
    isLit,
    fuelRemainingMs: nextFuel,
    wetness: nextWetness,
    heatRadiusPx: Math.round(224 * strength),
    lightRadiusPx: Math.round(288 * strength),
  };
}

export function tickDryingRack(
  state: DryingRackState,
  dtSec: number,
  context: { raining: boolean },
): DryingRackState {
  const delta = dtSec * 1_000;
  const rainReversal = context.raining && state.exposedToRain;

  return {
    ...state,
    slots: state.slots.map((slot) => ({
      ...slot,
      progressMs: Math.max(
        0,
        Math.min(slot.requiredMs, slot.progressMs + (rainReversal ? -delta * 0.5 : delta)),
      ),
    })),
  };
}

export function detectCampClusters(structures: readonly CampStructure[], radiusPx = 220): CampCluster[] {
  const clusters: CampCluster[] = [];
  for (const campfire of structures.filter((structure) => structure.type === "campfire")) {
    const nearby = structures.filter((structure) => {
      const dist = Math.hypot(structure.x - campfire.x, structure.y - campfire.y);
      return dist <= radiusPx && (structure.id === campfire.id || structure.type !== "campfire");
    });
    if (nearby.length < 2) continue;
    const center = nearby.reduce(
      (acc, structure) => ({ x: acc.x + structure.x, y: acc.y + structure.y }),
      { x: 0, y: 0 },
    );
    clusters.push({
      campfireId: campfire.id,
      structureIds: nearby.map((structure) => structure.id),
      center: { x: center.x / nearby.length, y: center.y / nearby.length },
    });
  }
  return clusters;
}

export function shelterExposureMitigation(
  shelter: CampStructure,
  point: { x: number; y: number },
): { coldMultiplier: number; rainMultiplier: number } {
  const radius = shelter.protectionRadiusPx ?? 0;
  const inside = radius > 0 && Math.hypot(point.x - shelter.x, point.y - shelter.y) <= radius;
  if (!inside) return { coldMultiplier: 1, rainMultiplier: 1 };

  return {
    coldMultiplier: Math.max(0, 1 - (shelter.coldResistanceBonus ?? 0)),
    rainMultiplier: Math.max(0, 1 - (shelter.rainProtection ?? 0)),
  };
}
