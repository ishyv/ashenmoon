/**
 * UIInputController — single authoritative ledger for all UI-layer keyboard
 * bindings. Replaces the ad-hoc handleGlobalKeyDown in +page.svelte.
 *
 * Kept separate from InputResource intentionally: InputResource owns canvas/
 * game-loop input (WASD, attacks, dash). This owns panel toggles, menu
 * navigation, and hotbar slots. The two layers never overlap at dispatch time
 * because InputResource gates itself on menuController.active, while this
 * controller guards on devConsole.open and form-element targets.
 *
 * Dispatch priority (highest first): menu → overlay → hotbar → game.
 * A handler returns true to signal "consumed" and stop further dispatch.
 */

import type { UIAction } from '$lib/domain/game-events';
import { devConsole } from '$lib/ui/debug/dev-console';

export type InputLayer = 'menu' | 'overlay' | 'hotbar' | 'game';

export interface ActionRegistration {
  action: UIAction;
  /** Lowercase e.key values this registration responds to. Used for conflict detection and the ledger. */
  keys: string[];
  layer: InputLayer;
  /** Return true to signal consumed; dispatch stops. Return false to let lower-priority layers run. */
  handler: (e: KeyboardEvent) => boolean;
}

const LAYER_ORDER: InputLayer[] = ['menu', 'overlay', 'hotbar', 'game'];

const registrations: ActionRegistration[] = [];
// Tracks warned runtime duplicate pairs so each pair is only reported once.
const warnedPairs = new Set<string>();

export const uiInputController = {
  /**
   * Register a UI key binding. Returns an unsubscribe function that removes it.
   * Warns at registration time if any key conflicts with an existing registration
   * in the same layer.
   */
  register(reg: ActionRegistration): () => void {
    for (const existing of registrations) {
      if (existing.layer !== reg.layer) continue;
      for (const k of reg.keys) {
        if (existing.keys.includes(k)) {
          console.warn(
            `[UIInputController] Key conflict: "${k}" already registered for action "${existing.action}" in layer "${reg.layer}"`
          );
        }
      }
    }
    registrations.push(reg);
    return () => {
      const idx = registrations.indexOf(reg);
      if (idx !== -1) registrations.splice(idx, 1);
    };
  },

  /**
   * Dispatch a KeyboardEvent through all registered handlers by layer priority.
   * Stops when a handler returns true. Skips if devConsole is open or the event
   * target is an editable form element.
   */
  dispatch(e: KeyboardEvent): void {
    if (devConsole.open) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    const key = e.key.toLowerCase();
    for (const layer of LAYER_ORDER) {
      const matches = registrations.filter((r) => r.layer === layer && r.keys.includes(key));
      if (matches.length > 1) {
        const pairKey = matches.map((r) => r.action).sort().join('|') + '@' + layer + ':' + key;
        if (!warnedPairs.has(pairKey)) {
          warnedPairs.add(pairKey);
          console.warn(
            `[UIInputController] Runtime duplicate: key "${key}" fires ${matches.length} handlers in layer "${layer}"`
          );
        }
      }
      for (const reg of matches) {
        if (reg.handler(e)) return;
      }
    }
  },

  /**
   * Cross-validate registered UI keys against the game InputResource bindings.
   * Logs (does not throw) on overlap so we can catch accidental conflicts at startup.
   */
  validateAgainst(gameBindings: Record<string, string[]>): void {
    const gameKeys = new Set(Object.values(gameBindings).flat().map((k) => k.toLowerCase()));
    for (const reg of registrations) {
      for (const k of reg.keys) {
        if (gameKeys.has(k)) {
          console.warn(
            `[UIInputController] Cross-layer key overlap: "${k}" (action: "${reg.action}") also appears in game InputResource bindings`
          );
        }
      }
    }
  },

  /** Full registration ledger — all actions with their keys and layers. */
  getLedger(): readonly ActionRegistration[] {
    return registrations;
  },
};
