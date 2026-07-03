/**
 * The pool of small, spiteful nuisances a Possessed item can carry, plus the
 * pure cadence math for how often they fire. Execution (actually knocking the
 * player around, teleporting them, etc.) is engine-tier — see
 * src/lib/core/systems/curse/curse-effect-system.ts. This file only decides
 * *what* effects exist and *how often* they're eligible to trigger.
 *
 * Discovery is deliberately pure horror-discovery: nothing here ever confirms
 * to the player that an item is cursed. `ambientTellChance` is the one
 * cosmetic exception — a mechanically-inert glitch/name-flicker tell, kept
 * unreliable on purpose (see tier-roll.test.ts / curse-effects.test.ts).
 */

export interface CurseEffect {
  readonly id: string;
  readonly label: string;
  /** Base seconds between trigger checks at curse level 1; shrinks as curse level rises. */
  readonly cadenceSec: number;
  readonly category: "movement" | "perception" | "inventory" | "combat" | "resource";
}

export const CURSE_EFFECT_POOL: readonly CurseEffect[] = [
  { id: "self_knockback", label: "shoves the player sideways", cadenceSec: 90, category: "movement" },
  { id: "blindness_flash", label: "brief blindness", cadenceSec: 120, category: "perception" },
  { id: "unwanted_teleport", label: "brief nearby teleport", cadenceSec: 150, category: "movement" },
  { id: "category_shift", label: "temporary category shift (e.g. sword to spear)", cadenceSec: 200, category: "inventory" },
  { id: "item_falls_out", label: "falls out of inventory onto the ground", cadenceSec: 180, category: "inventory" },
  { id: "hotbar_swap", label: "swaps hotbar slot", cadenceSec: 100, category: "inventory" },
  { id: "lying_tooltip", label: "tooltip displays false stats", cadenceSec: 45, category: "inventory" },
  { id: "self_damage_tick", label: "small self-damage tick", cadenceSec: 160, category: "combat" },
  { id: "stat_zero_pulse", label: "temporarily zeroes its own stat bonus", cadenceSec: 140, category: "combat" },
  { id: "noise_pulse", label: "noise pulse that spikes nearby animal detection", cadenceSec: 110, category: "perception" },
  { id: "resource_drain", label: "drains a sliver of stamina/thirst/hunger", cadenceSec: 130, category: "resource" },
  { id: "brief_invisible", label: "briefly turns invisible in hand", cadenceSec: 170, category: "perception" },
  { id: "mocking_whiff", label: "attack whiffs with a mocking sound", cadenceSec: 90, category: "combat" },
];

export type CurseEffectId = (typeof CURSE_EFFECT_POOL)[number]["id"];

const CADENCE_SCALE_PER_LEVEL = 0.18;

/** Cadence shrinks (fires more often) as curse level rises. Never below ~35% of the base cadence. */
export function effectiveCadence(effect: CurseEffect, curseLevel: number): number {
  const level = Math.max(1, curseLevel);
  return effect.cadenceSec / (1 + (level - 1) * CADENCE_SCALE_PER_LEVEL);
}

const AMBIENT_TELL_BASE = 0.002;
const AMBIENT_TELL_PER_LEVEL = 0.004;
const AMBIENT_TELL_MAX = 0.05;

/**
 * Per-tick-check probability of the cosmetic-only glitch/name-flicker tell.
 * Deliberately small and unreliable even at high curse level — it must read
 * as unease, never as confirmation.
 */
export function ambientTellChance(curseLevel: number): number {
  const level = Math.max(1, curseLevel);
  return Math.min(AMBIENT_TELL_MAX, AMBIENT_TELL_BASE + AMBIENT_TELL_PER_LEVEL * level);
}
