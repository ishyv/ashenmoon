/**
 * Player warmth from worn gear. Sums the `insulation_material` warmth of every
 * equipped item; the weather/cold system uses it to resist temperature loss.
 */
import { ITEM_DEFINITIONS, traitOf } from "$lib/domain/items";

export function calculatePlayerWarmth(
  playerState: any,
  defs = ITEM_DEFINITIONS
): number {
  let totalWarmth = 0;
  const loadout = playerState.profile?.loadout;
  if (!loadout) return 0;
  for (const slotVal of Object.values(loadout)) {
    if (!slotVal) continue;
    const itemId = typeof slotVal === "string" ? slotVal : (slotVal as any).itemId;
    const def = defs[itemId];
    if (!def) continue;
    const insulation = traitOf(def, "insulation_material");
    if (insulation) {
      totalWarmth += insulation.warmth;
    }
  }
  return totalWarmth;
}
