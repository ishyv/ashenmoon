/**
 * HUD activity singleton — shared fade system for all HUD components.
 *
 * WHY THIS EXISTS
 * ---------------
 * Game HUD (GameHud, SkillHotbar, ItemHotbar) should breathe together as one
 * organism. When any player-relevant event occurs, all HUD surfaces fade in.
 * When quiet for LINGER_MS, they all fade back to REST_OPACITY.
 *
 * This module tracks the last signal timestamp. Each HUD component polls
 * `hudActivity.isActive` via a local setInterval in a $effect, then derives
 * its opacity accordingly. No shared rAF loop — simpler, easier to debug.
 *
 * USAGE PATTERN
 * -----------
 * Signal activity (call this from any game event handler):
 *   hudActivity.signal()
 *
 * In a HUD component ($effect block):
 *   let hudOpacity = $state(hudActivity.restOpacity);
 *   $effect(() => {
 *     const interval = setInterval(() => {
 *       hudOpacity = hudActivity.isActive
 *         ? hudActivity.activeOpacity
 *         : hudActivity.restOpacity;
 *     }, 100);
 *     return () => clearInterval(interval);
 *   });
 */

const REVEAL_MS = 200; // fade-in duration (CSS transition)
const LINGER_MS = 2500; // stay visible after last signal
const FADE_MS = 1800; // fade-out duration (CSS transition)
const REST_OPACITY = 0.2; // barely-there at rest
const ACTIVE_OPACITY = 0.9; // fully visible when active

let lastSignalAt = $state(0);

function signalHudActivity(): void {
  lastSignalAt = performance.now();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const hudActivity = {
  /**
   * Signal that a player-relevant event occurred (input, damage, stat change).
   * Resets the fade timer and makes the HUD fully visible.
   */
  signal: signalHudActivity,

  /**
   * True if the HUD should be fully visible (recently signalled).
   * Components poll this in a setInterval within a $effect.
   */
  get isActive(): boolean {
    return performance.now() - lastSignalAt < LINGER_MS;
  },

  /**
   * Timestamp of the last signal (milliseconds since performance epoch).
   * Useful for debugging; components use isActive instead.
   */
  get lastSignalAt(): number {
    return lastSignalAt;
  },

  // CSS transition and opacity values for components to use
  revealMs: REVEAL_MS,
  fadeMs: FADE_MS,
  restOpacity: REST_OPACITY,
  activeOpacity: ACTIVE_OPACITY,
  lingerMs: LINGER_MS,
};
