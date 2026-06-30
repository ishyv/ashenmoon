import type { InventoryItemActionView } from '$lib/domain/inventory-item-action';

/**
 * Hotbar activation priority ordering — determines which action fires first when
 * a hotbar number key is pressed.
 *
 * Intentionally different from the inventory double-click priority
 * (resolvePrimaryInventoryAction): the hotbar prefers consume first so that
 * pressing 1 on food eats it immediately rather than placing it.
 *
 * Priority (highest first):
 * 1. consume  — food/drink activates immediately
 * 2. equip    — unequipped tool or weapon gets equipped
 * 3. unequip  — equipped item gets unequipped
 * 4. study    — blueprints
 * 5. place    — last; placement requires the engine context
 */
export function prioritizeHotbarActions(
  actions: readonly InventoryItemActionView[],
): InventoryItemActionView[] {
  const order: InventoryItemActionView['id'][] = ['consume', 'equip', 'unequip', 'study', 'place'];
  const result: InventoryItemActionView[] = [];
  for (const id of order) {
    for (const action of actions) {
      if (action.id === id) result.push(action);
    }
  }
  return result;
}
