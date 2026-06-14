/**
 * Pure consume resolution: turns a consumable item's `onConsume` effect list
 * into explicit commands. The rng is injected so every risk roll (dirty water
 * sickness) is deterministic under test.
 *
 * The caller owns applying the outcome: removing one unit from the stack and
 * routing holder commands to survival/status/health state.
 */

import type { ItemDefinition, VitalsEffect, ConsumableTrait } from "$lib/domain/items";
import type { StatusId } from "./status-types";

export type HolderCommand =
  | { kind: "restore_thirst"; amount: number }
  | { kind: "restore_hp"; amount: number }
  | { kind: "damage"; amount: number }
  | { kind: "add_status"; status: StatusId; durationSec: number }
  | { kind: "reduce_status"; status: StatusId; amount: number }
  | { kind: "clear_all_statuses" };

export interface ConsumeOutcome {
  verb: "drink" | "eat" | "apply";
  holderCommands: HolderCommand[];
}

export function getConsumableTrait(def: ItemDefinition): ConsumableTrait | null {
  const trait = def.traits.find((t) => t.kind === "consumable");
  return trait && trait.kind === "consumable" ? trait : null;
}

/**
 * Resolves a consume attempt. Returns null when the item isn't consumable.
 * One unit of the item is always consumed by the caller on a non-null result.
 */
export function resolveConsume(
  def: ItemDefinition,
  rng: () => number,
): ConsumeOutcome | null {
  const trait = getConsumableTrait(def);
  if (!trait) return null;

  const holderCommands: HolderCommand[] = [];
  for (const effect of trait.onConsume) {
    collectHolderCommands(effect, rng, holderCommands);
  }

  return { verb: trait.verb, holderCommands };
}

function collectHolderCommands(
  effect: VitalsEffect,
  rng: () => number,
  out: HolderCommand[],
): void {
  switch (effect.kind) {
    case "restore_thirst":
      out.push({ kind: "restore_thirst", amount: effect.amount });
      return;
    case "restore_hp":
      out.push({ kind: "restore_hp", amount: effect.amount });
      return;
    case "damage_holder":
      out.push({ kind: "damage", amount: effect.amount });
      return;
    case "add_status":
      out.push({ kind: "add_status", status: effect.status, durationSec: effect.durationSec });
      return;
    case "reduce_status":
      out.push({ kind: "reduce_status", status: effect.status, amount: effect.amount });
      return;
    case "clear_all_statuses":
      out.push({ kind: "clear_all_statuses" });
      return;
    case "chance":
      if (rng() < effect.probability) {
        collectHolderCommands(effect.effect, rng, out);
      }
      return;
  }
}

