/**
 * Overlay stack — LIFO close ordering for game UI panels.
 *
 * WHY THIS EXISTS
 * ---------------
 * Game UIs need Escape to feel "smart": if you opened the stash and then a
 * quest dialogue appeared, pressing Escape should close the dialogue first,
 * then close the stash on the next press. A flat boolean-per-panel approach
 * can't do that — it either closes everything at once or requires hand-rolled
 * priority checks that fall out of sync whenever a new panel is added.
 *
 * This module is a reactive LIFO stack of string overlay IDs. Each panel
 * registers itself on open (push) and deregisters on close. The Escape handler
 * in +page.svelte calls popTop() once — no panel-specific logic needed there.
 *
 * OVERLAY IDs
 * -----------
 * Use the exported `OverlayId` constants — never raw strings — so typos are
 * caught at compile time and grepping for an ID finds every callsite.
 *
 * USAGE PATTERN
 * -------------
 * Opening a panel (e.g. from a button click):
 *   overlayStack.push(OverlayId.Inventory)
 *
 * Closing a panel via its own X / close button:
 *   overlayStack.close(OverlayId.Inventory)
 *   // also update whatever local state the panel owns
 *
 * Escape key (handled once, centrally, in +page.svelte):
 *   overlayStack.popTop()   // closes the most-recently-opened panel
 *
 * Deriving panel visibility from the stack (recommended for page-level panels):
 *   const showInventory = $derived(overlayStack.has(OverlayId.Inventory));
 *
 * Syncing an external state signal into the stack (for panels like DialogueBox
 * that own their own open flag in a domain module):
 *   $effect(() => {
 *     if (dialogueState.activeNpc) overlayStack.push(OverlayId.Dialogue);
 *     else                         overlayStack.close(OverlayId.Dialogue);
 *   });
 *   $effect(() => {
 *     if (!overlayStack.has(OverlayId.Dialogue) && dialogueState.activeNpc)
 *       dialogueState.activeNpc = null;   // Escape was pressed — honour it
 *   });
 *
 * RULES FOR NEW PANELS
 * --------------------
 * 1. Add a new entry to OverlayId below.
 * 2. Push on open, close on explicit close.
 * 3. If the panel owns external state (like dialogueState), add the two-effect
 *    sync pattern above in +page.svelte.
 * 4. Do NOT add panel-specific branches inside handleGlobalKeyDown — popTop()
 *    handles everything.
 */

/** All registered overlay IDs. Add new panels here — no magic strings anywhere. */
export const OverlayId = {
  Dialogue:  "dialogue",
  Inventory: "inventory",
  Skills:    "skills",
  Settings:  "settings",
  Scenario:  "scenario",
  Crafting:  "crafting",
} as const;

export type OverlayId = (typeof OverlayId)[keyof typeof OverlayId];

// ---------------------------------------------------------------------------
// Internal reactive state
// ---------------------------------------------------------------------------

const _stack = $state<OverlayId[]>([]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const overlayStack = {
  /**
   * Read-only view of the current stack (bottom → top order).
   * Prefer `has()` and `top` for most use-cases; expose this only for
   * debugging and derived state that needs the full list.
   */
  get entries(): readonly OverlayId[] {
    return _stack;
  },

  /**
   * Register an overlay as open. No-ops if it is already in the stack,
   * so double-pushing from rapid clicks is safe.
   */
  push(id: OverlayId): void {
    if (!_stack.includes(id)) _stack.push(id);
  },

  /**
   * Remove a specific overlay by ID regardless of its stack position.
   * Call this when the panel closes itself (X button, confirm button, etc.).
   * Does NOT call any close callback — the panel is responsible for updating
   * its own state before or after calling this.
   */
  close(id: OverlayId): void {
    const i = _stack.indexOf(id);
    if (i >= 0) _stack.splice(i, 1);
  },

  /**
   * Pop and return the topmost overlay ID. Called exclusively by the Escape
   * key handler. Panels that own external state (DialogueBox) watch for their
   * ID disappearing via a $effect and close themselves in response.
   */
  popTop(): OverlayId | undefined {
    return _stack.pop();
  },

  /** True if the given overlay is currently registered as open. */
  has(id: OverlayId): boolean {
    return _stack.includes(id);
  },

  /** The ID of the most-recently-opened (topmost) overlay, or undefined. */
  get top(): OverlayId | undefined {
    return _stack[_stack.length - 1];
  },

  /** True when no overlays are open — Escape is a no-op in this state. */
  get isEmpty(): boolean {
    return _stack.length === 0;
  },
};
