/**
 * Menu context controller — keyboard navigation for any open menu.
 *
 * WHY THIS EXISTS
 * ---------------
 * When a menu is open, arrow keys / Enter / RShift / Backspace / Del should
 * route into the menu rather than the game world. This singleton tracks the
 * currently navigable item list and the focused index so that +page.svelte can
 * intercept the relevant keys and the input system can gate player movement.
 *
 * INVARIANT: `active` is true iff `items.length > 0`.
 * INVARIANT: `focusedIndex` is always in [0, items.length - 1].
 *
 * USAGE
 * -----
 * Mount items when a menu opens:
 *   menuController.mount([{ label: 'harvest', action: doHarvest },
 *                         { label: 'destroy', role: 'danger', action: doDestroy },
 *                         { label: 'close',   role: 'close',  action: onClose }]);
 *
 * Clear when the menu closes:
 *   menuController.clear();
 *
 * Route keys in handleGlobalKeyDown:
 *   if (menuController.active) { ... }
 *
 * Gate game input in input.ts:
 *   if (menuController.active) return;
 */

export type MenuItemRole = "default" | "danger" | "close";

export interface MenuControllerItem {
  label: string;
  action: () => void;
  role?: MenuItemRole;
}

// ---------------------------------------------------------------------------
// Internal reactive state
// ---------------------------------------------------------------------------

let _items = $state<MenuControllerItem[]>([]);
let _focusedIndex = $state(0);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const menuController = {
  /** True when a menu is registered and awaiting keyboard input. */
  get active(): boolean {
    return _items.length > 0;
  },

  /** Read-only item list in render order. */
  get items(): readonly MenuControllerItem[] {
    return _items;
  },

  /** Index of the currently keyboard-focused item. */
  get focusedIndex(): number {
    return _focusedIndex;
  },

  /** The currently focused item, or undefined if no menu is active. */
  get focusedItem(): MenuControllerItem | undefined {
    return _items[_focusedIndex];
  },

  /**
   * Register a menu's item list and take keyboard focus.
   * Resets focused index to 0. Safe to call on re-open (replaces previous items).
   */
  mount(items: MenuControllerItem[]): void {
    _items = items.slice();
    _focusedIndex = 0;
  },

  /** Deactivate — call when the menu closes. */
  clear(): void {
    _items = [];
    _focusedIndex = 0;
  },

  /** Move focus to the previous item, wrapping from first to last. */
  moveUp(): void {
    if (_items.length === 0) return;
    _focusedIndex = (_focusedIndex - 1 + _items.length) % _items.length;
  },

  /** Move focus to the next item, wrapping from last to first. */
  moveDown(): void {
    if (_items.length === 0) return;
    _focusedIndex = (_focusedIndex + 1) % _items.length;
  },

  /** Trigger the focused item's action. No-op when inactive. */
  activateFocused(): void {
    _items[_focusedIndex]?.action();
  },

  /**
   * Find the first item with the given role and trigger it.
   * No-op when no matching item exists.
   */
  activateByRole(role: MenuItemRole): void {
    _items.find((item) => (item.role ?? "default") === role)?.action();
  },
};
