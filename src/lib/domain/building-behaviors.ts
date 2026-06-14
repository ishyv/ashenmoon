import { BUILDING_SPECS, type M3BuildableId } from "$lib/domain/building-specs";

export type BuildableBehavior =
  | {
      readonly kind: "storage";
      readonly buildableId: "storage_pile";
      readonly stashBonus: number;
      readonly actions: readonly ["open_storage"];
    }
  | {
      readonly kind: "defense";
      readonly buildableId: "spike_barrier";
      readonly defenseScore: number;
      readonly animalCollisionDamage: number;
    }
  | {
      readonly kind: "water_collector";
      readonly buildableId: "rain_catcher";
      readonly capacity: number;
      readonly fillPerRainHour: number;
      readonly actions: readonly ["collect_water"];
    }
  | {
      readonly kind: "station_process";
      readonly buildableId: "meat_smoking_rack";
      readonly stationId: "meat_smoking_rack";
      readonly processType: "smoke";
    }
  | {
      readonly kind: "rest";
      readonly buildableId: "simple_bedroll";
      readonly restQuality: number;
      readonly actions: readonly ["rest"];
    }
  | {
      readonly kind: "sign";
      readonly buildableId: "marker_sign";
      readonly maxTextLength: number;
      readonly actions: readonly ["read_sign", "edit_sign"];
    }
  | {
      readonly kind: "shelter";
      readonly buildableId: "crude_shelter";
      readonly coldResistanceBonus: number;
      readonly rainProtection: number;
    };

export const BUILDABLE_BEHAVIORS: Readonly<Record<M3BuildableId, BuildableBehavior>> = {
  storage_pile: {
    kind: "storage",
    buildableId: "storage_pile",
    stashBonus: 20,
    actions: ["open_storage"],
  },
  spike_barrier: {
    kind: "defense",
    buildableId: "spike_barrier",
    defenseScore: 2,
    animalCollisionDamage: 12,
  },
  rain_catcher: {
    kind: "water_collector",
    buildableId: "rain_catcher",
    capacity: 4,
    fillPerRainHour: 1,
    actions: ["collect_water"],
  },
  meat_smoking_rack: {
    kind: "station_process",
    buildableId: "meat_smoking_rack",
    stationId: "meat_smoking_rack",
    processType: "smoke",
  },
  simple_bedroll: {
    kind: "rest",
    buildableId: "simple_bedroll",
    restQuality: 1,
    actions: ["rest"],
  },
  marker_sign: {
    kind: "sign",
    buildableId: "marker_sign",
    maxTextLength: 80,
    actions: ["read_sign", "edit_sign"],
  },
  crude_shelter: {
    kind: "shelter",
    buildableId: "crude_shelter",
    coldResistanceBonus: 0.45,
    rainProtection: 0.5,
  },
};

export function getBuildableBehavior(buildableId: string): BuildableBehavior | null {
  return BUILDABLE_BEHAVIORS[buildableId as M3BuildableId] ?? null;
}

export function validateBuildableBehaviors(
  behaviors: Readonly<Record<string, BuildableBehavior>> = BUILDABLE_BEHAVIORS,
  specs: Readonly<Record<string, unknown>> = BUILDING_SPECS,
): string[] {
  const problems: string[] = [];
  for (const [id, behavior] of Object.entries(behaviors)) {
    if (id !== behavior.buildableId) {
      problems.push(`behavior key ${id} does not match buildable id ${behavior.buildableId}`);
    }
    if (!specs[behavior.buildableId]) {
      problems.push(`behavior ${id} references missing buildable ${behavior.buildableId}`);
    }
  }
  return problems;
}
