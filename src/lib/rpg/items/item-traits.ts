import type { ItemEffect } from "./item-effects";

/**
 * Union of all capabilities an item can possess.
 * Traits define the 'capability' half of the trait/effect architecture.
 */
export type ItemTrait =
  | TemperatureSensitiveTrait
  | FlammableTrait
  | DecayableTrait;

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
