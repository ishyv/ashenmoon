import type { ItemId } from "./item-types";

/**
 * Union of all possible effects that can be triggered by item traits.
 * Effects are explicit typed commands processed by the reaction systems.
 */
export type ItemEffect =
  | TransformEffect
  | DestroyEffect
  | DamageHolderEffect
  | AddStatusEffect;

/**
 * Transforms the item into another item (e.g., Ice Block -> Clean Water).
 */
export interface TransformEffect {
  kind: "transform";
  into: ItemId;
  preserveQuantity?: boolean;
}

/**
 * Removes the item from the inventory entirely.
 */
export interface DestroyEffect {
  kind: "destroy";
}

/**
 * Inflicts damage on the entity holding the item.
 */
export interface DamageHolderEffect {
  kind: "damage_holder";
  amount: number;
}

/**
 * Applies a status effect (buff/debuff) to the holder.
 */
export interface AddStatusEffect {
  kind: "add_status";
  status: string;
  durationSec: number;
}

/**
 * DSL Helper: Define a transformation effect.
 */
export function TransformInto(
  into: ItemId,
  opts?: { preserveQuantity?: boolean },
): TransformEffect {
  return {
    kind: "transform",
    into,
    preserveQuantity: opts?.preserveQuantity ?? true,
  };
}

/**
 * DSL Helper: Define a destruction effect.
 */
export function Destroy(): DestroyEffect {
  return {
    kind: "destroy",
  };
}

/**
 * DSL Helper: Define a damage-over-time or instant damage effect on the holder.
 */
export function DamageHolder(amount: number): DamageHolderEffect {
  return {
    kind: "damage_holder",
    amount,
  };
}

/**
 * DSL Helper: Define a status application effect.
 */
export function AddStatus(status: string, durationSec: number): AddStatusEffect {
  return {
    kind: "add_status",
    status,
    durationSec,
  };
}
