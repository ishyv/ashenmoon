import { StatusId } from "$lib/domain/systems/status-types";

export type WoundSeverity = "scratch" | "cut" | "deep_cut" | "bite_wound";
export type TreatmentId = "clean_binding" | "herbal_poultice" | "boiled_water_wash" | "sealing_paste";

export interface WoundState {
  readonly id: string;
  readonly severity: WoundSeverity;
  readonly ageSec: number;
  readonly infectionRisk: number;
  readonly bleeding: boolean;
  readonly infected: boolean;
  readonly treatedWith: readonly TreatmentId[];
}

export interface WoundTreatmentResult {
  readonly wound: WoundState;
  readonly feedback: string;
}

const BASE_INFECTION_RISK: Record<WoundSeverity, number> = {
  scratch: 0.04,
  cut: 0.12,
  deep_cut: 0.26,
  bite_wound: 0.38,
};

const STATUS_FOR_WOUND: Record<WoundSeverity, StatusId> = {
  scratch: StatusId.Scratch,
  cut: StatusId.Cut,
  deep_cut: StatusId.DeepCut,
  bite_wound: StatusId.BiteWound,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function createWound(input: {
  readonly id: string;
  readonly severity: WoundSeverity;
  readonly contamination?: number;
  readonly toolQuality?: number;
}): WoundState {
  const contamination = clamp01(input.contamination ?? 0);
  const toolProtection = clamp01(input.toolQuality ?? 0) * 0.1;
  const infectionRisk = clamp01(BASE_INFECTION_RISK[input.severity] + contamination * 0.18 - toolProtection);
  return {
    id: input.id,
    severity: input.severity,
    ageSec: 0,
    infectionRisk,
    bleeding: input.severity === "deep_cut" || input.severity === "bite_wound",
    infected: false,
    treatedWith: [],
  };
}

export function statusIdsForWound(wound: WoundState): StatusId[] {
  return [
    STATUS_FOR_WOUND[wound.severity],
    ...(wound.bleeding ? [StatusId.Bleeding] : []),
    ...(wound.infected ? [StatusId.Infected] : []),
  ];
}

export function treatWound(wound: WoundState, treatment: TreatmentId): WoundTreatmentResult {
  if (wound.treatedWith.includes(treatment)) {
    return { wound, feedback: "that treatment is already on this wound." };
  }

  let infectionDelta = 0;
  let bleeding = wound.bleeding;
  let feedback = "";

  switch (treatment) {
    case "clean_binding":
      infectionDelta = -0.08;
      bleeding = wound.severity === "bite_wound";
      feedback = "clean binding steadies the wound.";
      break;
    case "herbal_poultice":
      infectionDelta = -0.12;
      feedback = "the poultice cools the angry skin.";
      break;
    case "boiled_water_wash":
      infectionDelta = -0.16;
      feedback = "boiled water washes the grit out.";
      break;
    case "sealing_paste":
      infectionDelta = wound.infected ? 0.08 : -0.04;
      bleeding = false;
      feedback = wound.infected
        ? "sealing paste traps something nasty under the skin."
        : "sealing paste closes the wound, ugly but useful.";
      break;
  }

  return {
    wound: {
      ...wound,
      infectionRisk: clamp01(wound.infectionRisk + infectionDelta),
      bleeding,
      treatedWith: [...wound.treatedWith, treatment],
    },
    feedback,
  };
}

export function tickWound(
  wound: WoundState,
  dtSec: number,
  rng: () => number = Math.random,
): WoundState {
  const ageSec = wound.ageSec + Math.max(0, dtSec);
  if (wound.infected) return { ...wound, ageSec };

  const untreatedMultiplier = wound.treatedWith.length === 0 ? 1.35 : 0.65;
  const progressionWindow = Math.max(0, dtSec / 3600);
  const chance = clamp01(wound.infectionRisk * untreatedMultiplier * progressionWindow);
  return {
    ...wound,
    ageSec,
    infected: rng() < chance,
  };
}
