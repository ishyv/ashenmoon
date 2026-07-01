/**
 * Hidden crit-setup stacks: an invisible combo meter built by landing hits,
 * dodging real attacks, and consuming items. Determines crit damage magnitude
 * (critMultiplierForStacks) independently of crit frequency (critChance).
 * Nothing reads this for display — it's felt only through bigger crits.
 */
import {
  CRIT_SETUP_CAP,
  CRIT_SETUP_DECAY_INTERVAL_SEC,
  critMultiplierForStacks,
} from "$lib/domain/combat/crit";

export const critSetup = $state<{ stacks: number; decayTimer: number }>({
  stacks: 0,
  decayTimer: 0,
});

/** Add stacks (capped at CRIT_SETUP_CAP), refreshing the decay clock. */
export function addCritSetupStack(amount: number): void {
  critSetup.stacks = Math.min(CRIT_SETUP_CAP, critSetup.stacks + amount);
  critSetup.decayTimer = CRIT_SETUP_DECAY_INTERVAL_SEC;
}

/** Hard reset — a real hit landing on the player breaks the setup chain. */
export function resetCritSetup(): void {
  critSetup.stacks = 0;
  critSetup.decayTimer = 0;
}

/** Per-frame decay tick. Mirrors kite-combo.ts's kiteStacks decay exactly. */
export function tickCritSetupDecay(dt: number): void {
  if (critSetup.stacks > 0) {
    critSetup.decayTimer -= dt;
    if (critSetup.decayTimer <= 0) {
      critSetup.stacks--;
      if (critSetup.stacks > 0) {
        critSetup.decayTimer = CRIT_SETUP_DECAY_INTERVAL_SEC;
      }
    }
  }
}

/** Reads current stacks as a crit multiplier, then consumes (resets) them. */
export function consumeCritSetupForMultiplier(): number {
  const multiplier = critMultiplierForStacks(critSetup.stacks);
  critSetup.stacks = 0;
  critSetup.decayTimer = 0;
  return multiplier;
}
