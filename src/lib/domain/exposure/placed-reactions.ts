/**
 * Generic environmental reaction engine for items sitting in the world.
 *
 * An item carries one or more reactions, each derived from its traits. Every
 * reaction owns an independent time accumulator and a threshold; the engine
 * advances the accumulators against the environment at the item's tile and emits
 * plain facts (warned / transformed / destroyed) when thresholds are crossed.
 * No Pixi, no VFX, no knowledge mutation: the caller turns facts into events.
 *
 * Priority lives in the `active` predicates, not a hard chain, so cooking can
 * out-prioritize decay (meat near a fire cooks; away from it, rots) while the
 * legacy ignite / temperature / decay behaviors are reproduced exactly for the
 * existing single-reaction content.
 */

import {
  ITEM_DEFINITIONS,
  traitOf,
  type ItemDefinition,
  type ItemRegistry,
} from "$lib/domain/items";
import type { KnowledgeProperty } from "$lib/domain/knowledge/item-knowledge";
import { effectiveTemperature, type PlacedExposureContext } from "./exposure-context";

export type { PlacedExposureContext };

export type PlacedReactionId =
  | "ignite"
  | "temperature"
  | "decay"
  | "cook"
  | "dampen"
  | "dry";

export interface PlacedReactionState {
  readonly itemId: string;
  readonly qty: number;
  /** reactionId -> accumulated seconds of qualifying exposure. */
  readonly progress: Readonly<Record<string, number>>;
}

export type PlacedReactionFact =
  | { readonly kind: "warned"; readonly reactionId: PlacedReactionId; readonly warning: string }
  | {
      readonly kind: "transformed";
      readonly reactionId: PlacedReactionId;
      readonly intoItemId: string;
      readonly learned: KnowledgeProperty | null;
    }
  | {
      readonly kind: "destroyed";
      readonly reactionId: PlacedReactionId;
      readonly learned: KnowledgeProperty | null;
    };

export interface PlacedReactionTickResult {
  readonly next: PlacedReactionState;
  readonly facts: readonly PlacedReactionFact[];
}

export interface ReactionDescriptor {
  readonly id: PlacedReactionId;
  /** Whether the reaction accumulates under the current effective temp + context. */
  readonly active: (temp: number, ctx: PlacedExposureContext) => boolean;
  readonly thresholdSec: number;
  readonly rate: (ctx: PlacedExposureContext) => number;
  /** Item id the reaction produces; `null` destroys the item. */
  readonly into: string | null;
  /** Emit a `warned` fact the moment the accumulator crosses this; `null` = silent. */
  readonly warnAtSec: number | null;
  readonly warning: (temp: number) => string;
  readonly learned: KnowledgeProperty | null;
}

// Legacy parity constants: ignite/temperature warned at 1s and transformed at 2.5s.
const REACTIVE_WARN_SEC = 1.0;
const HEAT_DAMAGE_THRESHOLD_SEC = 2.5;
// A fire dries or ignites wood rather than letting it soak; below this effective
// temperature an exposed item is treated as away from heat for moisture purposes.
const DAMPEN_HEAT_CUTOFF = 60;

/**
 * Derive the reaction descriptors an item definition carries. Exported so the
 * debug inspector can show progress against each reaction's threshold.
 */
export function reactionsFor(def: ItemDefinition): ReactionDescriptor[] {
  const out: ReactionDescriptor[] = [];

  const flammable = traitOf(def, "flammable");
  const tempSensitive = traitOf(def, "temperature_sensitive");
  const decayable = traitOf(def, "decayable");
  const cookable = traitOf(def, "cookable");
  const dampens = traitOf(def, "dampens");
  const dries = traitOf(def, "dries");

  if (flammable) {
    out.push({
      id: "ignite",
      active: (temp) => temp >= flammable.ignitionTemp,
      thresholdSec: HEAT_DAMAGE_THRESHOLD_SEC,
      rate: () => 1,
      into: flammable.effect.kind === "transform" ? flammable.effect.into : null,
      warnAtSec: REACTIVE_WARN_SEC,
      warning: () => "smoldering...",
      learned: "flammable",
    });
  }

  if (tempSensitive) {
    out.push({
      id: "temperature",
      active: (temp) => temp > tempSensitive.maxSafeTemp || temp < tempSensitive.minSafeTemp,
      thresholdSec: HEAT_DAMAGE_THRESHOLD_SEC,
      rate: () => 1,
      into: tempSensitive.effect.kind === "transform" ? tempSensitive.effect.into : null,
      warnAtSec: REACTIVE_WARN_SEC,
      warning: (temp) => (temp > tempSensitive.maxSafeTemp ? "heating up..." : "freezing..."),
      learned: "heat_sensitive",
    });
  }

  if (decayable) {
    // Cookable items only rot when not hot enough to cook, so heat cooks instead
    // of spoiling. Non-cookable decayables rot whenever placed (legacy behavior).
    const cookTemp = cookable?.cookTemp;
    out.push({
      id: "decay",
      active: cookTemp !== undefined ? (temp) => temp < cookTemp : () => true,
      thresholdSec: decayable.lifespanSec,
      rate: (ctx) => (ctx.radiantHeat > 0 ? 2 : 1),
      into: decayable.effect.kind === "transform" ? decayable.effect.into : null,
      warnAtSec: null,
      warning: () => "decaying...",
      learned: "perishable",
    });
  }

  if (cookable) {
    out.push({
      id: "cook",
      active: (temp) => temp >= cookable.cookTemp,
      thresholdSec: cookable.cookSec,
      rate: () => 1,
      into: cookable.into,
      warnAtSec: REACTIVE_WARN_SEC,
      warning: () => "cooking...",
      learned: null,
    });
  }

  if (dampens) {
    out.push({
      id: "dampen",
      active: (temp, ctx) => ctx.wetness > dampens.wetnessThreshold && temp < DAMPEN_HEAT_CUTOFF,
      thresholdSec: dampens.soakSec,
      rate: () => 1,
      into: dampens.into,
      warnAtSec: REACTIVE_WARN_SEC,
      warning: () => "soaking...",
      learned: null,
    });
  }

  if (dries) {
    out.push({
      id: "dry",
      active: (temp) => temp >= dries.dryTemp,
      thresholdSec: dries.drySec,
      rate: () => 1,
      into: dries.into,
      warnAtSec: REACTIVE_WARN_SEC,
      warning: () => "drying...",
      learned: null,
    });
  }

  return out;
}

/**
 * Advance an item's reactions by `dt` seconds against the environment at its
 * tile. Each active reaction accumulates; the first to cross its threshold this
 * tick transforms or destroys the item (one transform per tick). Inactive
 * reactions cool back toward zero.
 */
export function tickPlacedReactions(
  state: PlacedReactionState,
  ctx: PlacedExposureContext,
  dt: number,
  defs: ItemRegistry = ITEM_DEFINITIONS,
): PlacedReactionTickResult {
  const def = defs[state.itemId];
  if (!def) return { next: state, facts: [] };

  const descriptors = reactionsFor(def);
  if (descriptors.length === 0) return { next: state, facts: [] };

  const temp = effectiveTemperature(ctx);
  const progress: Record<string, number> = { ...state.progress };
  const facts: PlacedReactionFact[] = [];

  for (const d of descriptors) {
    const prev = progress[d.id] ?? 0;

    if (!d.active(temp, ctx)) {
      progress[d.id] = Math.max(0, prev - dt);
      continue;
    }

    const nextP = prev + dt * d.rate(ctx);

    if (d.warnAtSec !== null && prev < d.warnAtSec && nextP >= d.warnAtSec) {
      facts.push({ kind: "warned", reactionId: d.id, warning: d.warning(temp) });
    }

    if (nextP >= d.thresholdSec) {
      // The item changes identity (or vanishes); reset all accumulators.
      if (d.into === null) {
        facts.push({ kind: "destroyed", reactionId: d.id, learned: d.learned });
        return { next: { itemId: "", qty: state.qty, progress: {} }, facts };
      }
      facts.push({ kind: "transformed", reactionId: d.id, intoItemId: d.into, learned: d.learned });
      return { next: { itemId: d.into, qty: state.qty, progress: {} }, facts };
    }

    progress[d.id] = nextP;
  }

  return { next: { ...state, progress }, facts };
}
