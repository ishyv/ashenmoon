import type { ItemId } from "./item-types";
import type { StatusId } from "$lib/domain/systems/status-types";

/**
 * Effects that modify the item or inventory (transformations, destruction).
 * Processed by the item reaction and processing systems.
 */
export type InventoryEffect = TransformEffect | DestroyEffect | ChanceInventoryEffect;

/**
 * Effects that modify the player/holder (HP, thirst, statuses).
 * Processed by the consume and status systems.
 */
export type VitalsEffect =
  | DamageHolderEffect
  | AddStatusEffect
  | ReduceStatusEffect
  | RestoreThirstEffect
  | RestoreHungerEffect
  | RestoreHpEffect
  | ClearAllStatusesEffect
  | ChanceVitalsEffect;

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
  status: StatusId;
  durationSec: number;
}

/**
 * Restores the holder's thirst pool (consumables).
 */
export interface RestoreThirstEffect {
  kind: "restore_thirst";
  amount: number;
}

/**
 * Restores the holder's hunger pool (consumables).
 */
export interface RestoreHungerEffect {
  kind: "restore_hunger";
  amount: number;
}

/**
 * Restores the holder's hp (consumables, medicine).
 */
export interface RestoreHpEffect {
  kind: "restore_hp";
  amount: number;
}

/**
 * Removes every active status from the holder (debug panacea, strong cures).
 */
export interface ClearAllStatusesEffect {
  kind: "clear_all_statuses";
}

/**
 * Reduces the severity or duration of a specific status effect.
 */
export interface ReduceStatusEffect {
  kind: "reduce_status";
  status: StatusId;
  amount: number;
}

/**
 * Wraps an inventory effect behind a probability roll.
 */
export interface ChanceInventoryEffect {
  kind: "chance";
  probability: number;
  effect: InventoryEffect;
}

/**
 * Wraps a vitals effect behind a probability roll.
 */
export interface ChanceVitalsEffect {
  kind: "chance";
  probability: number;
  effect: VitalsEffect;
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
export function AddStatus(status: StatusId, durationSec: number): AddStatusEffect {
  return {
    kind: "add_status",
    status,
    durationSec,
  };
}

/**
 * DSL Helper: Define a thirst restoration effect.
 */
export function RestoreThirst(amount: number): RestoreThirstEffect {
  return {
    kind: "restore_thirst",
    amount,
  };
}

/**
 * DSL Helper: Define a hunger restoration effect.
 */
export function RestoreHunger(amount: number): RestoreHungerEffect {
  return {
    kind: "restore_hunger",
    amount,
  };
}

/**
 * DSL Helper: Define an hp restoration effect.
 */
export function RestoreHp(amount: number): RestoreHpEffect {
  return {
    kind: "restore_hp",
    amount,
  };
}

/**
 * DSL Helper: Define a clear-all-statuses effect.
 */
export function ClearAllStatuses(): ClearAllStatusesEffect {
  return {
    kind: "clear_all_statuses",
  };
}

/**
 * DSL Helper: Define a status reduction effect.
 */
export function ReduceStatus(status: StatusId, amount: number): ReduceStatusEffect {
  return {
    kind: "reduce_status",
    status,
    amount,
  };
}

/**
 * DSL Helper: Wrap an inventory effect behind a probability roll.
 */
export function ChanceOfInventory(
  probability: number,
  effect: InventoryEffect,
): ChanceInventoryEffect {
  return {
    kind: "chance",
    probability,
    effect,
  };
}

/**
 * DSL Helper: Wrap a vitals effect behind a probability roll.
 */
export function ChanceOfVitals(
  probability: number,
  effect: VitalsEffect,
): ChanceVitalsEffect {
  return {
    kind: "chance",
    probability,
    effect,
  };
}

