/**
 * Pure crafting rules. Given an inventory and a recipe id, decide whether a
 * craft is possible and compute the resulting inventory. No mutation of inputs,
 * no I/O. The UI calls these for preview; the API calls them for execution, so
 * the two can never drift.
 */
import { type CraftRecipe, getRecipe } from "./recipes";

/** A stackable inventory slot. Equipment-style instance slots are ignored by crafting. */
type StackSlot = { readonly qty: number };
type InventorySlot = StackSlot | { readonly instances: readonly unknown[] };

/** The slot map crafting reads and writes. Matches `RpgPlayerState.inventory.slots`. */
export type CraftSlots = Readonly<Record<string, InventorySlot>>;

/** Crafting context not derivable from the inventory alone. */
export interface CraftContext {
  readonly isNearCampfire: boolean;
}

export type CraftFailureReason =
  | "unknown_recipe"
  | "requires_campfire"
  | "insufficient_materials";

export interface CraftFailure {
  readonly ok: false;
  readonly reason: CraftFailureReason;
  /** Populated when reason is "insufficient_materials". */
  readonly missing?: readonly { itemId: string; required: number; have: number }[];
}

export type CraftCheck = { readonly ok: true; readonly recipe: CraftRecipe } | CraftFailure;

export type CraftResult =
  | { readonly ok: true; readonly slots: CraftSlots; readonly recipe: CraftRecipe }
  | CraftFailure;

function isStack(slot: InventorySlot | undefined): slot is StackSlot {
  return !!slot && "qty" in slot;
}

/** Quantity of a stackable material in the inventory (0 if absent or non-stackable). */
export function getMaterialQty(slots: CraftSlots, itemId: string): number {
  const slot = slots[itemId];
  return isStack(slot) ? (slot.qty ?? 0) : 0;
}

/**
 * Determine whether a recipe can be crafted right now, with a structured reason
 * on failure so the UI can gate buttons and the API can return precise errors.
 */
export function checkCraft(
  slots: CraftSlots,
  recipeId: string,
  ctx: CraftContext,
): CraftCheck {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { ok: false, reason: "unknown_recipe" };

  if (recipe.requiresCampfire && !ctx.isNearCampfire) {
    return { ok: false, reason: "requires_campfire" };
  }

  const missing = recipe.costs
    .map((c) => ({ itemId: c.itemId, required: c.required, have: getMaterialQty(slots, c.itemId) }))
    .filter((c) => c.have < c.required);

  if (missing.length > 0) {
    return { ok: false, reason: "insufficient_materials", missing };
  }

  return { ok: true, recipe };
}

/** Convenience boolean wrapper around {@link checkCraft} for UI button state. */
export function canCraft(slots: CraftSlots, recipeId: string, ctx: CraftContext): boolean {
  return checkCraft(slots, recipeId, ctx).ok;
}

/**
 * Resolve a craft into a new slot map: deduct costs, add the output. Pure, the
 * input `slots` is never mutated. Returns the same structured failure as
 * {@link checkCraft} when the craft is not possible.
 */
export function resolveCraft(
  slots: CraftSlots,
  recipeId: string,
  ctx: CraftContext,
): CraftResult {
  const check = checkCraft(slots, recipeId, ctx);
  if (!check.ok) return check;

  const recipe = check.recipe;
  const next: Record<string, InventorySlot> = { ...slots };

  for (const cost of recipe.costs) {
    const remaining = getMaterialQty(next, cost.itemId) - cost.required;
    if (remaining <= 0) delete next[cost.itemId];
    else next[cost.itemId] = { qty: remaining };
  }

  const currentOutput = getMaterialQty(next, recipe.output.itemId);
  next[recipe.output.itemId] = { qty: currentOutput + recipe.output.qty };

  return { ok: true, slots: next, recipe };
}
