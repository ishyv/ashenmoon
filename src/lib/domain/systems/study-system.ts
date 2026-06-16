import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";
import { getMaterialQty } from "$lib/domain/crafting/crafting-system";
import type { CraftSlots } from "$lib/domain/crafting/crafting-system";

export type StudyResult =
  | { readonly ok: true; readonly slots: CraftSlots; readonly recipeId: string }
  | { readonly ok: false; readonly reason: "not_a_blueprint" | "not_in_inventory" };

export function resolveStudyBlueprint(slots: CraftSlots, itemId: string): StudyResult {
  const def = ITEM_DEFINITIONS[itemId];
  const blueprintTrait = traitOf(def, "blueprint");
  if (!blueprintTrait) return { ok: false, reason: "not_a_blueprint" };

  const qty = getMaterialQty(slots, itemId);
  if (qty < 1) return { ok: false, reason: "not_in_inventory" };

  const next: Record<string, (typeof slots)[string]> = { ...slots };
  const remaining = qty - 1;
  if (remaining <= 0) {
    delete next[itemId];
  } else {
    next[itemId] = { qty: remaining };
  }

  return { ok: true, slots: next, recipeId: blueprintTrait.recipeId };
}
