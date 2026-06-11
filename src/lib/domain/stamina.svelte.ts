/**
 * Stamina: the central resource that sprint, dash, and super-gather will all
 * draw on. Reactive ($state) so the HUD bar tracks it without polling — the
 * engine ticks regen each frame and actions call `spendStamina()`. The
 * "configurable parameters" from the mechanics spec live in `staminaConfig` and
 * are tunable live through the dev console.
 */

export interface StaminaConfig {
  /** pool capacity. */
  max: number;
  /** recovery per second while out of combat. */
  regenPassive: number;
  /** recovery per second during combat. */
  regenCombat: number;
}

export const staminaConfig = $state<StaminaConfig>({
  max: 100,
  regenPassive: 18,
  regenCombat: 6,
});

/** How a spend reads on the bar: "drain" = smooth unfill, "burst" = punchy pop. */
export type SpendMode = "drain" | "burst";

export const stamina = $state<{
  current: number;
  /** bumped on each spend so the bar reacts with the matching animation. */
  event: { seq: number; mode: SpendMode };
}>({
  current: 100,
  event: { seq: 0, mode: "drain" },
});

/**
 * Regen toward max. Called by the engine each tick. `rateMult` lets status
 * effects (sickness, exhaustion) slow recovery without owning the pool.
 */
export function tickStamina(dt: number, inCombat = false, rateMult = 1): void {
  if (stamina.current >= staminaConfig.max) return;
  const rate = inCombat ? staminaConfig.regenCombat : staminaConfig.regenPassive;
  stamina.current = Math.min(staminaConfig.max, stamina.current + rate * rateMult * dt);
}

/**
 * Spend stamina, clamped at 0. Returns whether the pool had the full amount —
 * actions that require their whole cost (dash) check it; continuous drains that
 * just consume what's left can ignore it. `mode` only affects the bar animation.
 */
export function spendStamina(amount: number, mode: SpendMode = "drain"): boolean {
  if (amount <= 0) return true;
  const had = stamina.current >= amount;
  stamina.current = Math.max(0, stamina.current - amount);
  stamina.event = { seq: stamina.event.seq + 1, mode };
  return had;
}

/** Sets the current value directly (dev/testing), clamped to the pool. */
export function setStamina(value: number): void {
  stamina.current = Math.max(0, Math.min(staminaConfig.max, value));
}
