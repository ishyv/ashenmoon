/**
 * Weapon definition model — the heart of the weapon-driven combat rework.
 *
 * A weapon is not "an item with a damage number." A `WeaponDefinition` describes
 * how a weapon *feels*: its weight and reach, the set of attacks it can perform,
 * the timing/commitment of each attack, the reusable hit shape each attack
 * carves, and any slotted technique that gives the weapon an extra "combat
 * perspective" (Ashes of War).
 *
 * This file is pure data + types. No Svelte, no Pixi, no world mutation. Systems
 * read these definitions to resolve an attack; they never live here.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export type WeaponFamilyId = string;
export type WeaponFamily = WeaponFamilyId;

/** Physical damage flavour. Distinct from the engine's mitigation `DamageType`
 * ("physical" | "magic" | "true"); this drives feel, resistances, and feedback. */
export type WeaponDamageType = "slash" | "pierce" | "blunt" | "chop";

/**
 * The gesture the player performed, already classified from raw input. The
 * weapon decides what each intent *does*; the intent itself is weapon-agnostic.
 */
export type AttackInputKind =
  | "tap"
  | "hold"
  | "swipe"
  | "stance_tap"
  | "stance_hold"
  | "stance_swipe";

export type AttackHitShapeDefinition =
  | { kind: "arc"; radiusPx: number; arcDegrees: number; offsetDegrees?: number }
  | { kind: "capsule"; lengthPx: number; widthPx: number }
  | { kind: "circle"; radiusPx: number }
  | { kind: "point"; radiusPx: number };

export interface AttackMovementDefinition {
  /** Forward commitment applied on the active frame (world px). */
  lungePx?: number;
  /** Backward commitment applied after the active frame starts (world px). */
  retreatPx?: number;
  /** Movement speed allowed while the attack runs (× normal). */
  moveSpeedMultiplier: number;
  /** Facing is locked once the attack commits. */
  turnLock?: boolean;
}

export interface AttackStatusEffectDefinition {
  kind: "bleed" | "stagger";
  chancePct: number;
  /** bleed: damage per tick; stagger: stagger seconds. */
  magnitude: number;
  durationSec?: number;
  tickEverySec?: number;
}

export interface WeaponAttackDefinition {
  id: string;
  name: string;
  inputKind: AttackInputKind;
  damageType: WeaponDamageType;
  /** Multiplies the weapon's `baseDamage`. */
  damageMultiplier: number;
  /** Multiplies `handling.baseStaminaCost`. */
  staminaCostMultiplier: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitShape: AttackHitShapeDefinition;
  movement: AttackMovementDefinition;
  /** Optional offset from attacker centre along aim direction for hit testing. */
  hitOriginOffsetPx?: number;
  /** Time after recovery where this attack can feed an authored follow-up. */
  comboWindowMs?: number;
  presentation?: WeaponAttackPresentation;
  /** Slotted technique id (registered in weapon-techniques). Ashes of War. */
  techniqueId?: string;
  statusEffects?: AttackStatusEffectDefinition[];
  tags?: string[];
}

export interface WeaponAttackPresentation {
  trail: "arc" | "thrust" | "heavy";
  pose: "quick" | "guarded" | "extended" | "committed";
}

/**
 * The attacks a weapon offers, keyed by the role each fills. `quick` is the only
 * required attack; everything else is optional and gates which intents resolve.
 */
export interface WeaponAttackSet {
  quick: WeaponAttackDefinition;
  heavy?: WeaponAttackDefinition;
  thrust?: WeaponAttackDefinition;
  swipe?: WeaponAttackDefinition;
  charged?: WeaponAttackDefinition;
  stanceSpecial?: WeaponAttackDefinition;
}

export interface WeaponComboLink {
  fromAttackId: string;
  inputKind: AttackInputKind;
  toAttackId: string;
}

export interface WeaponGuardProfile {
  moveSpeedMultiplier: number;
  frontalArcDegrees: number;
  reductionPct: number;
  staminaCostMultiplier: number;
  breakFeedback: "guard_broken";
}

export interface WeaponHandlingProfile {
  weightClass: "light" | "medium" | "heavy";
  baseReachPx: number;
  baseRecoveryMs: number;
  baseStaminaCost: number;
  /** Movement speed while in stance (× normal). */
  stanceMoveSpeedMultiplier: number;
  /** Movement speed while an attack resolves (× normal). */
  attackMoveSpeedMultiplier: number;
  turnSpeedMultiplier?: number;
}

/**
 * A stat change a weapon imposes while equipped, expressed in the same shape the
 * stat pipeline already consumes (see stat-calculation.ts). The state layer maps
 * these into `StatModifier`s with `source: "equipment"`.
 */
export interface WeaponStatModifier {
  stat: string;
  op: "flat" | "percentAdd" | "mult";
  value: number;
}

export interface WeaponDefinition {
  /** Weapon-def id, distinct from the item id that references it. */
  id: string;
  name: string;
  family: WeaponFamily;
  /** Base damage consumed by combat; seeded from the item's `WeaponTrait.damage`. */
  baseDamage: number;
  handling: WeaponHandlingProfile;
  attacks: WeaponAttackSet;
  extraAttacks?: Record<string, WeaponAttackDefinition>;
  comboLinks?: readonly WeaponComboLink[];
  guard?: WeaponGuardProfile;
  animationProfile: string;
  soundProfile: string;
  statModifiers?: WeaponStatModifier[];
  tags?: string[];
}

/** Maps an `AttackInputKind` to the attack-set slot that input selects. */
export function attackSlotForInput(kind: AttackInputKind): keyof WeaponAttackSet {
  switch (kind) {
    case "tap":
      return "quick";
    case "hold":
      return "heavy";
    case "swipe":
      return "swipe";
    case "stance_tap":
      return "stanceSpecial";
    case "stance_hold":
      return "charged";
    case "stance_swipe":
      return "thrust";
  }
}
