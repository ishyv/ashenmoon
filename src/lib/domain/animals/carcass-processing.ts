import { StatusId } from "$lib/domain/systems/status-types";
import type { AnimalSpeciesId } from "./animal-behavior";

/**
 * Pure M3 hunting rules.
 *
 * Carcasses are temporary world resources, not loot chests. This module owns
 * species yield data, tool-quality modifiers, and spoilage stage rules. Runtime
 * systems own timers, VFX/audio, inventory writes, and actual status rolls.
 */

export type CarcassState = "fresh" | "partially_processed" | "spoiling" | "rotten";

export type CarcassProcessAction =
  | "inspect"
  | "harvest_meat"
  | "remove_hide"
  | "extract_bone"
  | "collect_sinew";

export type CarcassToolQuality = "bare_hands" | "sharp_flint" | "crude_knife" | "improved_knife";

export interface CarcassRuntimeState {
  readonly speciesId: AnimalSpeciesId;
  readonly state: CarcassState;
  readonly ageSec: number;
  readonly processedActions: readonly CarcassProcessAction[];
}

export interface CarcassYield {
  readonly itemId: string;
  readonly qty: number;
}

export interface CarcassProcessingRisk {
  readonly status: StatusId;
  readonly chance: number;
  readonly durationSec: number;
}

export interface CarcassActionDefinition {
  readonly action: Exclude<CarcassProcessAction, "inspect">;
  readonly label: string;
  readonly baseDurationSec: number;
  readonly yields: readonly CarcassYield[];
  readonly risks: readonly CarcassProcessingRisk[];
}

export interface AnimalCarcassDefinition {
  readonly speciesId: AnimalSpeciesId;
  readonly displayName: string;
  readonly freshDurationSec: number;
  readonly spoilingDurationSec: number;
  readonly predatorAttractionScore: number;
  readonly actions: Readonly<Record<Exclude<CarcassProcessAction, "inspect">, CarcassActionDefinition>>;
}

export type CarcassProcessingResult =
  | {
      readonly ok: true;
      readonly action: Exclude<CarcassProcessAction, "inspect">;
      readonly durationSec: number;
      readonly yields: readonly CarcassYield[];
      readonly risks: readonly CarcassProcessingRisk[];
      readonly nextState: CarcassState;
      readonly feedback: string;
    }
  | {
      readonly ok: false;
      readonly reason: "unknown_species" | "unsupported_action" | "already_processed" | "rotten";
      readonly feedback: string;
    };

export interface SpoilageStage {
  readonly itemId: string;
  readonly state: "fresh" | "spoiled" | "rotten";
}

const TOOL_MODIFIERS: Record<CarcassToolQuality, { durationMult: number; riskMult: number; yieldMult: number }> = {
  bare_hands: { durationMult: 1.8, riskMult: 1.6, yieldMult: 0.75 },
  sharp_flint: { durationMult: 1.2, riskMult: 1.15, yieldMult: 1 },
  crude_knife: { durationMult: 1, riskMult: 0.75, yieldMult: 1 },
  improved_knife: { durationMult: 0.75, riskMult: 0.45, yieldMult: 1.15 },
};

const CUT_RISK: CarcassProcessingRisk = { status: StatusId.Cut, chance: 0.12, durationSec: 18 };
const CONTAMINATION_RISK: CarcassProcessingRisk = { status: StatusId.Sickness, chance: 0.08, durationSec: 45 };

function action(input: {
  action: Exclude<CarcassProcessAction, "inspect">;
  label: string;
  baseDurationSec: number;
  yields: readonly CarcassYield[];
  risks?: readonly CarcassProcessingRisk[];
}): CarcassActionDefinition {
  return {
    action: input.action,
    label: input.label,
    baseDurationSec: input.baseDurationSec,
    yields: input.yields,
    risks: input.risks ?? [CUT_RISK, CONTAMINATION_RISK],
  };
}

const EMPTY_ACTION = (kind: Exclude<CarcassProcessAction, "inspect">): CarcassActionDefinition =>
  action({ action: kind, label: kind, baseDurationSec: 1, yields: [], risks: [] });

function actionSet(
  actions: Partial<Record<Exclude<CarcassProcessAction, "inspect">, CarcassActionDefinition>>,
): AnimalCarcassDefinition["actions"] {
  return {
    harvest_meat: actions.harvest_meat ?? EMPTY_ACTION("harvest_meat"),
    remove_hide: actions.remove_hide ?? EMPTY_ACTION("remove_hide"),
    extract_bone: actions.extract_bone ?? EMPTY_ACTION("extract_bone"),
    collect_sinew: actions.collect_sinew ?? EMPTY_ACTION("collect_sinew"),
  };
}

export const M3_CARCASS_DEFINITIONS: Readonly<Record<AnimalSpeciesId, AnimalCarcassDefinition>> = {
  rabbit: {
    speciesId: "rabbit",
    displayName: "rabbit carcass",
    freshDurationSec: 240,
    spoilingDurationSec: 240,
    predatorAttractionScore: 1,
    actions: actionSet({
      harvest_meat: action({
        action: "harvest_meat",
        label: "harvest small meat",
        baseDurationSec: 5,
        yields: [{ itemId: "raw_small_meat", qty: 1 }],
      }),
      remove_hide: action({
        action: "remove_hide",
        label: "remove small hide",
        baseDurationSec: 6,
        yields: [{ itemId: "small_hide", qty: 1 }],
      }),
      extract_bone: action({
        action: "extract_bone",
        label: "extract small bone",
        baseDurationSec: 4,
        yields: [{ itemId: "small_bone", qty: 1 }],
      }),
    }),
  },
  deer: {
    speciesId: "deer",
    displayName: "deer carcass",
    freshDurationSec: 300,
    spoilingDurationSec: 300,
    predatorAttractionScore: 4,
    actions: actionSet({
      harvest_meat: action({
        action: "harvest_meat",
        label: "harvest large meat",
        baseDurationSec: 12,
        yields: [{ itemId: "raw_large_meat", qty: 2 }],
      }),
      remove_hide: action({
        action: "remove_hide",
        label: "remove hide",
        baseDurationSec: 14,
        yields: [{ itemId: "hide", qty: 1 }],
      }),
      extract_bone: action({
        action: "extract_bone",
        label: "extract bone",
        baseDurationSec: 8,
        yields: [{ itemId: "bone", qty: 2 }],
      }),
      collect_sinew: action({
        action: "collect_sinew",
        label: "collect sinew",
        baseDurationSec: 10,
        yields: [{ itemId: "sinew", qty: 1 }],
      }),
    }),
  },
  boar: {
    speciesId: "boar",
    displayName: "boar carcass",
    freshDurationSec: 300,
    spoilingDurationSec: 300,
    predatorAttractionScore: 5,
    actions: actionSet({
      harvest_meat: action({
        action: "harvest_meat",
        label: "harvest meat",
        baseDurationSec: 12,
        yields: [{ itemId: "raw_large_meat", qty: 2 }],
      }),
      remove_hide: action({
        action: "remove_hide",
        label: "remove tough hide",
        baseDurationSec: 14,
        yields: [{ itemId: "tough_hide", qty: 1 }],
      }),
      extract_bone: action({
        action: "extract_bone",
        label: "extract bone and tusk",
        baseDurationSec: 9,
        yields: [
          { itemId: "bone", qty: 1 },
          { itemId: "tusk_shard", qty: 1 },
        ],
      }),
      collect_sinew: action({
        action: "collect_sinew",
        label: "collect sinew",
        baseDurationSec: 10,
        yields: [{ itemId: "sinew", qty: 1 }],
      }),
    }),
  },
  wolf: {
    speciesId: "wolf",
    displayName: "wolf carcass",
    freshDurationSec: 240,
    spoilingDurationSec: 240,
    predatorAttractionScore: 3,
    actions: actionSet({
      harvest_meat: action({
        action: "harvest_meat",
        label: "harvest risky meat",
        baseDurationSec: 10,
        yields: [{ itemId: "raw_meat", qty: 1 }],
      }),
      remove_hide: action({
        action: "remove_hide",
        label: "remove fur hide",
        baseDurationSec: 12,
        yields: [{ itemId: "hide", qty: 1 }],
      }),
      extract_bone: action({
        action: "extract_bone",
        label: "extract bone and fang",
        baseDurationSec: 8,
        yields: [
          { itemId: "bone", qty: 1 },
          { itemId: "fang", qty: 1 },
        ],
      }),
      collect_sinew: action({
        action: "collect_sinew",
        label: "collect sinew",
        baseDurationSec: 9,
        yields: [{ itemId: "sinew", qty: 1 }],
      }),
    }),
  },
};

const SPOILAGE_RULES: Readonly<Record<string, { spoiledAtSec: number; rottenAtSec: number }>> = {
  raw_meat: { spoiledAtSec: 180, rottenAtSec: 420 },
  raw_small_meat: { spoiledAtSec: 180, rottenAtSec: 420 },
  raw_large_meat: { spoiledAtSec: 180, rottenAtSec: 420 },
  spoiled_meat: { spoiledAtSec: 0, rottenAtSec: 240 },
};

function scaledYields(yields: readonly CarcassYield[], toolQuality: CarcassToolQuality): readonly CarcassYield[] {
  const mult = TOOL_MODIFIERS[toolQuality].yieldMult;
  return yields
    .map((yieldDef) => ({
      itemId: yieldDef.itemId,
      qty: Math.max(1, Math.floor(yieldDef.qty * mult)),
    }))
    .filter((yieldDef) => yieldDef.qty > 0);
}

function scaledRisks(
  risks: readonly CarcassProcessingRisk[],
  toolQuality: CarcassToolQuality,
): readonly CarcassProcessingRisk[] {
  const mult = TOOL_MODIFIERS[toolQuality].riskMult;
  return risks.map((risk) => ({
    ...risk,
    chance: Math.max(0, Math.min(1, Number((risk.chance * mult).toFixed(3)))),
  }));
}

function nextCarcassState(
  carcass: CarcassRuntimeState,
  actionToProcess: Exclude<CarcassProcessAction, "inspect">,
): CarcassState {
  const processed = new Set(carcass.processedActions);
  processed.add(actionToProcess);
  return processed.size >= 4 ? "partially_processed" : carcass.state;
}

export function resolveCarcassProcessing(input: {
  readonly carcass: CarcassRuntimeState;
  readonly action: Exclude<CarcassProcessAction, "inspect">;
  readonly toolQuality: CarcassToolQuality;
}): CarcassProcessingResult {
  const definition = M3_CARCASS_DEFINITIONS[input.carcass.speciesId];
  if (!definition) {
    return { ok: false, reason: "unknown_species", feedback: "the carcass is unfamiliar." };
  }
  if (input.carcass.state === "rotten") {
    return { ok: false, reason: "rotten", feedback: "the carcass is too rotten to use safely." };
  }
  if (input.carcass.processedActions.includes(input.action)) {
    return { ok: false, reason: "already_processed", feedback: "nothing useful remains for that cut." };
  }

  const actionDefinition = definition.actions[input.action];
  if (!actionDefinition || actionDefinition.yields.length === 0) {
    return { ok: false, reason: "unsupported_action", feedback: "there is nothing useful to take that way." };
  }

  const tool = TOOL_MODIFIERS[input.toolQuality];
  return {
    ok: true,
    action: input.action,
    durationSec: Math.max(1, Number((actionDefinition.baseDurationSec * tool.durationMult).toFixed(2))),
    yields: scaledYields(actionDefinition.yields, input.toolQuality),
    risks: scaledRisks(actionDefinition.risks, input.toolQuality),
    nextState: nextCarcassState(input.carcass, input.action),
    feedback: actionDefinition.label,
  };
}

export function resolveCarcassState(input: {
  readonly speciesId: AnimalSpeciesId;
  readonly ageSec: number;
  readonly processedActions: readonly CarcassProcessAction[];
}): CarcassState {
  const definition = M3_CARCASS_DEFINITIONS[input.speciesId];
  if (!definition) return "rotten";
  if (input.ageSec >= definition.freshDurationSec + definition.spoilingDurationSec) return "rotten";
  if (input.ageSec >= definition.freshDurationSec) return "spoiling";
  return input.processedActions.length > 0 ? "partially_processed" : "fresh";
}

export function resolveSpoilageStage(itemId: string, ageSec: number): SpoilageStage | null {
  const rule = SPOILAGE_RULES[itemId];
  if (!rule) return null;
  if (ageSec >= rule.rottenAtSec) return { itemId: "rotten_meat", state: "rotten" };
  if (ageSec >= rule.spoiledAtSec) return { itemId: "spoiled_meat", state: "spoiled" };
  return { itemId, state: "fresh" };
}

export function resolveCarcassToolQuality(input: {
  readonly equippedItemId: string | null | undefined;
  readonly hasSharpFlint: boolean;
}): CarcassToolQuality {
  switch (input.equippedItemId) {
    case "improved_crude_knife":
      return "improved_knife";
    case "crude_knife":
      return "crude_knife";
    case "flint_shard":
    case "bone_shard":
      return "sharp_flint";
    default:
      return input.hasSharpFlint ? "sharp_flint" : "bare_hands";
  }
}
