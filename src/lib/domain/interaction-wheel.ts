/**
 * Pure computation of "what can I do at this station right now" — the
 * anchored, in-world quick-menu that replaced StationPanel's full-screen
 * checklist. Unlike that checklist (which showed every possible process and
 * only dimmed unaffordable ones), this returns *only* what the player can
 * currently do: a fast "approach, glance, act" gesture instead of a browse.
 */
import { CRAFT_RECIPES } from "./crafting/recipes";
import { canCraft, type CraftContext } from "./crafting/crafting-system";
import { STATION_PROCESSES, stationProcessVerb } from "./systems/station-process";
import type { StationId } from "./stations";
import { getFuelSummary, fuelInventoryFromSlots, chooseFuelOption } from "./camp/fuel";
import type { RpgPlayerState } from "./rpg-types";
import { ITEM_DEFINITIONS } from "./items";

/**
 * "destroy" is never produced by `stationMenuOptions` itself (destroying a
 * station is a building-placement concern, not a crafting one) — callers that
 * also know the station is a player-placed building append it themselves.
 */
export type StationMenuOptionKind = "recipe" | "process" | "refuel" | "destroy";

/** Pseudo-category for options with no natural output item (currently: refuel). */
export const UPKEEP_CATEGORY = "upkeep";

/** Pseudo-category for the caller-appended "destroy" option, kept out of UPKEEP_CATEGORY so it doesn't blend with refuel. */
export const DESTROY_CATEGORY = "destroy";

/** Above this many affordable options, the menu groups by category instead of showing a flat ring. */
export const FLAT_RING_THRESHOLD = 6;

export interface StationMenuOption {
  readonly id: string;
  readonly kind: StationMenuOptionKind;
  readonly label: string;
  /** Item id to render an ItemIcon for; absent for actions with no natural item (e.g. refuel). */
  readonly iconItemId?: string;
  /** The output item's Category, or UPKEEP_CATEGORY when there's no output item. Used to group the menu when it exceeds FLAT_RING_THRESHOLD. */
  readonly category: string;
}

function categoryForItem(itemId: string): string {
  return ITEM_DEFINITIONS[itemId]?.category ?? UPKEEP_CATEGORY;
}

function hasIngredients(
  slots: RpgPlayerState["inventory"]["slots"],
  inputs: Readonly<Record<string, number>>,
): boolean {
  return Object.entries(inputs).every(([itemId, qty]) => {
    const slot = slots[itemId];
    return !!slot && "qty" in slot && slot.qty >= qty;
  });
}

/**
 * The affordable options for a station right now, in a stable order:
 * quick processes first, then recipes, then refuel last (a maintenance
 * action, not a "thing you make").
 */
export function stationMenuOptions(
  stationId: StationId | null,
  slots: RpgPlayerState["inventory"]["slots"],
  ctx: CraftContext,
): readonly StationMenuOption[] {
  if (!stationId) return [];
  const options: StationMenuOption[] = [];

  for (const proc of STATION_PROCESSES) {
    if (proc.stationId !== stationId) continue;
    if (!hasIngredients(slots, proc.inputs)) continue;
    options.push({
      id: proc.id,
      kind: "process",
      label: `${stationProcessVerb(proc.processType)} ${proc.outputItemId.replace(/_/g, " ")}`,
      iconItemId: proc.outputItemId,
      category: categoryForItem(proc.outputItemId),
    });
  }

  for (const recipe of CRAFT_RECIPES) {
    if (recipe.requiredContext !== stationId) continue;
    if (!canCraft(slots, recipe.id, ctx)) continue;
    options.push({
      id: recipe.id,
      kind: "recipe",
      label: recipe.name,
      iconItemId: recipe.output.itemId,
      category: categoryForItem(recipe.output.itemId),
    });
  }

  if (stationId === "campfire") {
    const fuelInventory = fuelInventoryFromSlots(slots);
    const fuel = getFuelSummary(fuelInventory);
    if (fuel.canRefuel) {
      options.push({
        id: "refuel",
        kind: "refuel",
        label: "refuel campfire",
        iconItemId: chooseFuelOption(fuelInventory)?.itemId ?? "wood",
        category: UPKEEP_CATEGORY,
      });
    }
  }

  return options;
}

export interface RingPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Position of item `index` (0-based) of `count` total on a ring, `radius`
 * pixels from the anchor. `startAngleDeg` is 0 = straight up, increasing
 * clockwise; `spanDeg` is how much of the ring the items are spread across
 * — 360 (the default) distributes them evenly around a full circle, a
 * smaller value spreads them across a centered arc instead (matches the
 * approved mockup's partial-arc layout for small option counts). A single
 * item always sits exactly at `startAngleDeg`.
 */
export function ringPosition(
  index: number,
  count: number,
  radius: number,
  startAngleDeg = 0,
  spanDeg = 360,
): RingPoint {
  if (count <= 0) return { x: 0, y: 0 };

  let angleDeg: number;
  if (count === 1) {
    angleDeg = startAngleDeg;
  } else if (spanDeg >= 360) {
    angleDeg = startAngleDeg + (360 * index) / count;
  } else {
    angleDeg = startAngleDeg - spanDeg / 2 + (spanDeg * index) / (count - 1);
  }

  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: radius * Math.sin(angleRad),
    y: -radius * Math.cos(angleRad),
  };
}

/** Groups options by `category`, preserving first-seen category order and each group's internal order. */
export function groupByCategory(
  options: readonly StationMenuOption[],
): readonly { readonly category: string; readonly options: readonly StationMenuOption[] }[] {
  const order: string[] = [];
  const byCategory = new Map<string, StationMenuOption[]>();
  for (const option of options) {
    let group = byCategory.get(option.category);
    if (!group) {
      group = [];
      byCategory.set(option.category, group);
      order.push(option.category);
    }
    group.push(option);
  }
  return order.map((category) => ({ category, options: byCategory.get(category)! }));
}
