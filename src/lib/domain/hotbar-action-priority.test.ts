import { describe, expect, it } from 'vitest';
import { prioritizeHotbarActions } from './hotbar-action-priority';
import type { InventoryItemActionView } from './inventory-item-action';

function action(
  id: InventoryItemActionView['id'],
  enabled = true,
): InventoryItemActionView {
  return { id, label: id, enabled };
}

describe('prioritizeHotbarActions', () => {
  it('returns an empty array for empty input', () => {
    expect(prioritizeHotbarActions([])).toEqual([]);
  });

  it('places consume before equip', () => {
    const result = prioritizeHotbarActions([action('equip'), action('consume')]);
    expect(result.map((a) => a.id)).toEqual(['consume', 'equip']);
  });

  it('places equip before unequip', () => {
    const result = prioritizeHotbarActions([action('unequip'), action('equip')]);
    expect(result.map((a) => a.id)).toEqual(['equip', 'unequip']);
  });

  it('places study before place', () => {
    const result = prioritizeHotbarActions([action('place'), action('study')]);
    expect(result.map((a) => a.id)).toEqual(['study', 'place']);
  });

  it('enforces the full priority order regardless of input order', () => {
    const shuffled = [
      action('place'),
      action('study'),
      action('unequip'),
      action('equip'),
      action('consume'),
    ];
    const result = prioritizeHotbarActions(shuffled);
    expect(result.map((a) => a.id)).toEqual(['consume', 'equip', 'unequip', 'study', 'place']);
  });

  it('keeps disabled actions in their priority position without skipping them', () => {
    const result = prioritizeHotbarActions([action('equip', false), action('consume', true)]);
    expect(result[0]).toMatchObject({ id: 'consume', enabled: true });
    expect(result[1]).toMatchObject({ id: 'equip', enabled: false });
  });

  it('a single action is returned unchanged', () => {
    expect(prioritizeHotbarActions([action('study')])).toEqual([action('study')]);
  });

  it('consume-only action list resolves to a single consume entry', () => {
    const result = prioritizeHotbarActions([action('consume')]);
    expect(result).toHaveLength(1);
    expect(result.at(0)).toMatchObject({ id: 'consume' });
  });

  it('place is last when all action types are present', () => {
    const all = [
      action('place'),
      action('consume'),
      action('unequip'),
      action('study'),
      action('equip'),
    ];
    const result = prioritizeHotbarActions(all);
    expect(result.at(-1)).toMatchObject({ id: 'place' });
  });

  it('consume is first when all action types are present', () => {
    const all = [
      action('place'),
      action('consume'),
      action('unequip'),
      action('study'),
      action('equip'),
    ];
    const result = prioritizeHotbarActions(all);
    expect(result.at(0)).toMatchObject({ id: 'consume' });
  });
});
