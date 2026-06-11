import type { ItemEffect } from "./item-effects";
import type { ItemDefinition } from "./item-types";

/**
 * Union of all capabilities an item can possess.
 * Traits define the 'capability' half of the trait/effect architecture.
 */
export type ItemTrait =
  | TemperatureSensitiveTrait
  | FlammableTrait
  | DecayableTrait
  | ConsumableTrait
  | BoilableTrait;

/**
 * Defines item behavior based on ambient temperature.
 */
export interface TemperatureSensitiveTrait {
  kind: "temperature_sensitive";
  minSafeTemp: number;
  maxSafeTemp: number;
  effect: ItemEffect;
}

/**
 * Defines flammability properties and ignition thresholds.
 */
export interface FlammableTrait {
  kind: "flammable";
  ignitionTemp: number;
  burnDurationSec: number;
  effect: ItemEffect;
}

/**
 * Defines a natural expiration or decay window.
 */
export interface DecayableTrait {
  kind: "decayable";
  lifespanSec: number;
  effect: ItemEffect;
}

/**
 * Marks an item as drinkable/edible. `onConsume` effects run when the player
 * consumes one unit; the consume system resolves them (rolling any chance
 * effects) into commands applied to the holder and inventory.
 */
export interface ConsumableTrait {
  kind: "consumable";
  verb: "drink" | "eat";
  onConsume: ItemEffect[];
}

/**
 * Marks an item as boilable at a heat source. The interaction system owns the
 * timing/feedback; the trait owns the numbers and the resulting effect.
 */
export interface BoilableTrait {
  kind: "boilable";
  /** ambient temperature required at the heat source (°C). */
  minTemp: number;
  durationSec: number;
  effect: ItemEffect;
}

/**
 * DSL Helper: Define temperature sensitivity capabilities.
 */
export function TemperatureSensitive(input: {
  minSafeTemp: number;
  maxSafeTemp: number;
  effect: ItemEffect;
}): TemperatureSensitiveTrait {
  return {
    kind: "temperature_sensitive",
    ...input,
  };
}

/**
 * DSL Helper: Define flammability capabilities.
 */
export function Flammable(input: {
  ignitionTemp: number;
  burnDurationSec: number;
  effect: ItemEffect;
}): FlammableTrait {
  return {
    kind: "flammable",
    ...input,
  };
}

/**
 * DSL Helper: Define decay capabilities.
 */
export function Decayable(input: {
  lifespanSec: number;
  effect: ItemEffect;
}): DecayableTrait {
  return {
    kind: "decayable",
    ...input,
  };
}

/**
 * DSL Helper: Define consumability.
 */
export function Consumable(input: {
  verb: "drink" | "eat";
  onConsume: ItemEffect[];
}): ConsumableTrait {
  return {
    kind: "consumable",
    ...input,
  };
}

/**
 * DSL Helper: Define boilability.
 */
export function Boilable(input: {
  minTemp: number;
  durationSec: number;
  effect: ItemEffect;
}): BoilableTrait {
  return {
    kind: "boilable",
    ...input,
  };
}

/**
 * Returns the trait of the given kind carried by a definition, or `undefined`.
 * The result is narrowed to the concrete trait interface so callers read its
 * fields without a manual `kind` check.
 */
export function traitOf<K extends ItemTrait["kind"]>(
  def: ItemDefinition | undefined,
  kind: K,
): Extract<ItemTrait, { kind: K }> | undefined {
  return def?.traits.find(
    (trait): trait is Extract<ItemTrait, { kind: K }> => trait.kind === kind,
  );
}
