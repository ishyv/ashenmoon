/**
 * Pure reaction processors: given an inventory, the trait index, and the
 * conditions an item is exposed to, compute the resulting inventory plus a list
 * of which items reacted (for feedback). No mutation, no rpgState, no Pixi.
 *
 * The reactive handler in `item-reaction-system.ts` binds these to live game
 * state and environment events; everything decision-making lives here so it can
 * be unit tested in isolation.
 */
import { ITEM_DEFINITIONS, ITEM_TRAIT_INDEX, type ItemRegistry, type ItemTraitIndex } from "../items";
import { applyItemEffectToInventory } from "./item-effect-system";
import type { Inventory } from "./inventory-system";
import {
  canIgnite,
  decayRateMultiplier,
  effectiveTemperature,
  type ExposureContext,
  type ExposureLocation,
} from "../exposure/exposure-context";

export type ReactionKind = "temperature" | "flammable" | "decay";

export interface ItemReaction {
  readonly itemId: string;
  readonly kind: ReactionKind;
}

export interface ReactionResult {
  readonly inventory: Inventory;
  readonly reactions: readonly ItemReaction[];
}

function stackQty(inv: Inventory, itemId: string): number {
  const slot = inv.slots[itemId];
  return slot && "qty" in slot ? slot.qty : 0;
}

/** Items react when ambient temperature leaves their safe band (transform/destroy). */
export function processTemperatureReactions(
  inventory: Inventory,
  temperature: number,
  index: ItemTraitIndex = ITEM_TRAIT_INDEX,
  defs: ItemRegistry = ITEM_DEFINITIONS,
): ReactionResult {
  let next = inventory;
  const reactions: ItemReaction[] = [];

  for (const itemId of index.temperatureSensitive) {
    if (stackQty(next, itemId) <= 0) continue;
    const trait = defs[itemId]?.traits.find((t) => t.kind === "temperature_sensitive");
    if (trait?.kind !== "temperature_sensitive") continue;

    if (temperature > trait.maxSafeTemp || temperature < trait.minSafeTemp) {
      const updated = applyItemEffectToInventory(next, itemId, trait.effect);
      if (updated !== next) {
        next = updated;
        reactions.push({ itemId, kind: "temperature" });
      }
    }
  }

  return { inventory: next, reactions };
}

/**
 * Flammable items ignite when the temperature they actually experience (see
 * exposure-context) reaches their ignition point. Sealed items never ignite.
 */
export function processFlammableReactions(
  inventory: Inventory,
  ctx: ExposureContext,
  index: ItemTraitIndex = ITEM_TRAIT_INDEX,
  defs: ItemRegistry = ITEM_DEFINITIONS,
): ReactionResult {
  if (!canIgnite(ctx.location)) return { inventory, reactions: [] };

  const temp = effectiveTemperature(ctx);
  let next = inventory;
  const reactions: ItemReaction[] = [];

  for (const itemId of index.flammable) {
    if (stackQty(next, itemId) <= 0) continue;
    const trait = defs[itemId]?.traits.find((t) => t.kind === "flammable");
    if (trait?.kind !== "flammable") continue;

    if (temp >= trait.ignitionTemp) {
      const updated = applyItemEffectToInventory(next, itemId, trait.effect);
      if (updated !== next) {
        next = updated;
        reactions.push({ itemId, kind: "flammable" });
      }
    }
  }

  return { inventory: next, reactions };
}

/** Accumulated decay age (seconds) per held decayable item id. */
export type DecayAges = Readonly<Record<string, number>>;

export interface DecayResult extends ReactionResult {
  /** Updated ages to carry into the next tick. */
  readonly ages: DecayAges;
}

/**
 * Event-driven decay tick (NOT per-frame): the caller advances accumulated age
 * for each held decayable item by `elapsedSec` (scaled by where it is stored),
 * and any item reaching its lifespan transforms via its effect. Pure: ages and
 * inventory are returned, never mutated in place.
 */
export function tickDecay(
  inventory: Inventory,
  prevAges: DecayAges,
  elapsedSec: number,
  location: ExposureLocation,
  index: ItemTraitIndex = ITEM_TRAIT_INDEX,
  defs: ItemRegistry = ITEM_DEFINITIONS,
): DecayResult {
  const rate = decayRateMultiplier(location);
  let next = inventory;
  const reactions: ItemReaction[] = [];
  const ages: Record<string, number> = { ...prevAges };

  for (const itemId of index.decayable) {
    if (stackQty(next, itemId) <= 0) {
      delete ages[itemId];
      continue;
    }
    const trait = defs[itemId]?.traits.find((t) => t.kind === "decayable");
    if (trait?.kind !== "decayable") continue;

    const aged = (ages[itemId] ?? 0) + elapsedSec * rate;
    if (aged >= trait.lifespanSec) {
      const updated = applyItemEffectToInventory(next, itemId, trait.effect);
      if (updated !== next) {
        next = updated;
        reactions.push({ itemId, kind: "decay" });
        delete ages[itemId];
      } else {
        ages[itemId] = aged;
      }
    } else {
      ages[itemId] = aged;
    }
  }

  return { inventory: next, reactions, ages };
}
