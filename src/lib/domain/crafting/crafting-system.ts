/**
 * Pure crafting rules. Given an inventory and a recipe id, decide whether a
 * craft is possible and compute the resulting inventory. No mutation of inputs,
 * no I/O. The UI calls these for preview; the API calls them for execution, so
 * the two can never drift.
 */
import { type CraftRecipe, getRecipe, type CraftingContextId } from "./recipes";
import type { RecipeCost } from "./recipe-types";
import type { StationId } from "$lib/domain/stations";
import type { RpgInventorySlot, RpgItemInstance } from "$lib/domain/rpg-types";
import { rollCraftOutcome, type CraftAttendance } from "./tier-roll";
import type { CraftOutcomeRoll } from "./tier-types";

/** A stackable inventory slot. Equipment-style instance slots are ignored by crafting. */
type StackSlot = { readonly qty: number };
type InventorySlot = RpgInventorySlot;

/** The slot map crafting reads and writes. Matches `RpgPlayerState.inventory.slots`. */
export type CraftSlots = Readonly<Record<string, InventorySlot>>;

/** Crafting context not derivable from the inventory alone. */
export interface CraftContext {
  readonly isNearCampfire: boolean;
  readonly stationId?: StationId;
  readonly availableStations?: readonly StationId[];
  /** Current Craftsmanship skill level; drives the quality-tier roll for `tiered` recipes. Defaults to 1 (untrained). */
  readonly craftsmanshipLevel?: number;
  /** Injected RNG for the tier/curse roll, defaulting to Math.random. Tests supply a deterministic one. */
  readonly rng?: () => number;
  /** Injected clock for instance id generation, defaulting to Date.now. */
  readonly now?: () => number;
  /**
   * Whether the player was attending an optional station-crafting minigame
   * (see craft-process-runtime.ts) and how well they played it. Omitted
   * entirely for hand-crafts and unattended station crafts — that path
   * reproduces the original unattended tier-roll odds exactly, never worse.
   */
  readonly attended?: boolean;
  readonly played?: boolean;
  readonly minigamePerformance?: number;
}

export type CraftFailureReason =
  | "unknown_recipe"
  | "requires_station"
  | "requires_campfire"
  | "insufficient_materials";

export interface CraftFailure {
  readonly ok: false;
  readonly reason: CraftFailureReason;
  readonly requiredContext?: CraftingContextId;
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
 * Resolves which material (primary or a substitute) should be used for a cost slot.
 * Returns the first option the player has enough of, preferring the primary.
 */
export function resolveCostMaterial(
  slots: CraftSlots,
  cost: RecipeCost,
): { itemId: string; have: number; required: number } {
  const primaryHave = getMaterialQty(slots, cost.itemId);
  if (primaryHave >= cost.required) return { itemId: cost.itemId, have: primaryHave, required: cost.required };
  for (const sub of cost.substitutes ?? []) {
    const subHave = getMaterialQty(slots, sub.itemId);
    if (subHave >= sub.required) return { itemId: sub.itemId, have: subHave, required: sub.required };
  }
  return { itemId: cost.itemId, have: primaryHave, required: cost.required };
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

  if (recipe.requiredContext === "campfire" && !ctx.isNearCampfire) {
    return { ok: false, reason: "requires_campfire" };
  }

  if (
    recipe.requiredContext &&
    recipe.requiredContext !== "hand" &&
    recipe.requiredContext !== "campfire" &&
    recipe.requiredContext !== "placement"
  ) {
    const stationId = recipe.requiredContext;
    const hasContext = ctx.stationId === stationId || (ctx.availableStations ?? []).includes(stationId);
    if (!hasContext) {
      return { ok: false, reason: "requires_station", requiredContext: stationId };
    }
  }

  const missing = recipe.costs
    .map((c) => resolveCostMaterial(slots, c))
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

/** Builds one rolled instance of a tiered craft's output from a single {@link CraftOutcomeRoll}. */
function buildTierInstance(
  itemId: string,
  outcome: CraftOutcomeRoll,
  now: () => number,
  rng: () => number,
): RpgItemInstance {
  const instance: RpgItemInstance = {
    instanceId: `${itemId}_${outcome.tier}_${now()}_${Math.floor(rng() * 1_000_000)}`,
    durability: 100,
    tier: outcome.tier,
  };
  if (outcome.possession.cursed) {
    instance.cursed = true;
    instance.curseLevel = outcome.possession.curseLevel;
    instance.curseEffectIds = outcome.possession.curseEffectIds;
  }
  if (outcome.tier === "divine" && outcome.divineOutcome) {
    instance.divineId = outcome.divineOutcome.id;
    instance.rolledStats = outcome.divineOutcome.statOverrides;
  } else if (outcome.rolledStats) {
    instance.rolledStats = outcome.rolledStats;
  }
  return instance;
}

/**
 * Resolve a craft into a new slot map: deduct costs, add the output. Pure, the
 * input `slots` is never mutated. Returns the same structured failure as
 * {@link checkCraft} when the craft is not possible.
 *
 * `tiered` recipes roll a quality tier (and possibly a curse) per output unit
 * via {@link rollCraftOutcome} and land as `instances`, never a flat `qty`
 * stack. Non-tiered recipes are unaffected — same flat-stack behavior as
 * before this feature existed.
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
    const resolved = resolveCostMaterial(next, cost);
    const remaining = resolved.have - resolved.required;
    if (remaining <= 0) delete next[resolved.itemId];
    else next[resolved.itemId] = { qty: remaining };
  }

  if (recipe.tiered) {
    const rng = ctx.rng ?? Math.random;
    const now = ctx.now ?? Date.now;
    const attendance: CraftAttendance | undefined =
      ctx.attended !== undefined
        ? { attended: ctx.attended, played: ctx.played ?? false, minigamePerformance: ctx.minigamePerformance ?? 0 }
        : undefined;
    const existingSlot = next[recipe.output.itemId];
    const existingInstances = existingSlot && "instances" in existingSlot ? existingSlot.instances : [];
    const rolled: RpgItemInstance[] = [];
    for (let i = 0; i < recipe.output.qty; i++) {
      const outcome = rollCraftOutcome(recipe, next, ctx.craftsmanshipLevel ?? 1, rng, attendance);
      rolled.push(buildTierInstance(recipe.output.itemId, outcome, now, rng));
    }
    next[recipe.output.itemId] = { instances: [...existingInstances, ...rolled] };
    return { ok: true, slots: next, recipe };
  }

  const currentOutput = getMaterialQty(next, recipe.output.itemId);
  next[recipe.output.itemId] = { qty: currentOutput + recipe.output.qty };

  return { ok: true, slots: next, recipe };
}
