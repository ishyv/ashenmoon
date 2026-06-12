/**
 * Status effect definitions: the typed data half of the wound/affliction
 * system. Definitions describe what a status *is* (symptom copy, pulse
 * behavior); `status-system.ts` owns how active statuses tick and expire.
 *
 * WHY a separate file from item-traits/effects: items reference StatusId in
 * their effects, and game systems reference status definitions — keeping the
 * ids here avoids an items <-> systems import cycle.
 */

export enum StatusId {
  Sickness = "sickness",
  Bleeding = "bleeding",
  Poison = "poison",
  Exhaustion = "exhaustion",
  Injured = "injured",
  Cut = "cut",
  Hypothermia = "hypothermia",
}

/** A status currently affecting the player. */
export interface ActiveStatus {
  id: StatusId;
  remainingSec: number;
  /**
   * What caused it — an item id ("dirty_water") or hazard id ("hazard:tree_fall").
   * Feeds the knowledge auto-memory system; absent for dev-applied statuses.
   */
  source?: string;
}

/** Periodic effect applied every `pulseEverySec` while the status is active. */
export interface StatusPulse {
  /** hp change per pulse (negative = damage). */
  hpDelta?: number;
}

/**
 * Continuous modifiers applied while the status is active. These flow into
 * the general stat pipeline via `statusModifiersToStatModifiers` in
 * stats/stat-calculation.ts — new modifier fields should name a `StatKey`
 * from stats/stat-types.ts and get an adapter entry there.
 */
export interface StatusModifiers {
  /** multiplier on stamina regeneration (1 = unchanged). */
  staminaRegenMult?: number;
  /** multiplier on movement speed (1 = unchanged). */
  moveSpeedMult?: number;
}

export interface StatusDefinition {
  id: StatusId;
  label: string;
  /** HUD chip icon. */
  icon: string;
  /** Symptom copy, not spreadsheet copy — shown when the status lands. */
  applyMessage: string;
  /** Shown every pulse, if the status pulses. */
  pulseMessage?: string;
  /** Shown when the status wears off. */
  expireMessage: string;
  pulseEverySec?: number;
  pulse?: StatusPulse;
  modifiers?: StatusModifiers;
}

export const STATUS_DEFINITIONS: Record<StatusId, StatusDefinition> = {
  [StatusId.Sickness]: {
    id: StatusId.Sickness,
    label: "Sick",
    icon: "🤢",
    applyMessage: "Your stomach turns.",
    pulseMessage: "You feel feverish.",
    expireMessage: "The nausea passes.",
    pulseEverySec: 10,
    pulse: { hpDelta: -2 },
    modifiers: { staminaRegenMult: 0.5 },
  },
  [StatusId.Bleeding]: {
    id: StatusId.Bleeding,
    label: "Bleeding",
    icon: "🩸",
    applyMessage: "You are losing blood.",
    pulseMessage: "Blood drips from the wound.",
    expireMessage: "The bleeding stops.",
    pulseEverySec: 5,
    pulse: { hpDelta: -2 },
  },
  [StatusId.Poison]: {
    id: StatusId.Poison,
    label: "Poisoned",
    icon: "☠️",
    applyMessage: "A bitter numbness spreads through you.",
    pulseMessage: "The poison gnaws at you.",
    expireMessage: "The numbness fades.",
    pulseEverySec: 6,
    pulse: { hpDelta: -3 },
    modifiers: { staminaRegenMult: 0.6 },
  },
  [StatusId.Exhaustion]: {
    id: StatusId.Exhaustion,
    label: "Exhausted",
    icon: "😮‍💨",
    applyMessage: "Your limbs feel like lead.",
    expireMessage: "Your strength returns.",
    modifiers: { staminaRegenMult: 0.4, moveSpeedMult: 0.85 },
  },
  [StatusId.Injured]: {
    id: StatusId.Injured,
    label: "Injured",
    icon: "🦴",
    applyMessage: "Something is badly hurt.",
    expireMessage: "The pain dulls to an ache.",
    modifiers: { moveSpeedMult: 0.7 },
  },
  [StatusId.Cut]: {
    id: StatusId.Cut,
    label: "Cut",
    icon: "🩹",
    applyMessage: "Your hand stings.",
    pulseMessage: "The cut throbs.",
    expireMessage: "The sting fades.",
    pulseEverySec: 5,
    pulse: { hpDelta: -1 },
  },
  [StatusId.Hypothermia]: {
    id: StatusId.Hypothermia,
    label: "Hypothermia",
    icon: "🥶",
    applyMessage: "A biting chill sets in.",
    pulseMessage: "You shiver violently.",
    expireMessage: "Warmth returns to your limbs.",
    pulseEverySec: 4,
    pulse: { hpDelta: -1 },
    modifiers: { moveSpeedMult: 0.8 },
  },
};

/** Type guard for validating raw strings (dev console, persisted data). */
export function isStatusId(value: string): value is StatusId {
  return Object.values(StatusId).includes(value as StatusId);
}
