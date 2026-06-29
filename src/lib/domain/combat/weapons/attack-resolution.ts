/**
 * Attack resolution: InputIntent + WeaponDefinition → AttackPlan.
 *
 * This is where the weapon decides what a gesture does. Given the classified
 * intent and the equipped weapon, it picks the matching attack from the weapon's
 * set and computes the concrete numbers the runtime needs: damage, stamina,
 * phase timings, the reach-bearing hit shape, and direction.
 *
 * Pure. No player stats, no world, no Pixi — the system layers player scaling and
 * runs the plan. Damage here is the *weapon* contribution; the system may scale
 * it by the player's attackDamage.
 */
import type { InputIntent } from "../input-intent";
import {
  attackSlotForInput,
  type AttackHitShapeDefinition,
  type Vec2,
  type AttackInputKind,
  type WeaponAttackDefinition,
  type WeaponDefinition,
} from "./weapon-types";

export interface AttackPlan {
  weaponDefId: string;
  attack: WeaponAttackDefinition;
  /** Aim/travel direction (unit vector). */
  direction: Vec2;
  /** Weapon damage contribution: baseDamage × attack.damageMultiplier. */
  weaponDamage: number;
  /** Stamina the swing costs: handling.baseStaminaCost × attack.staminaCostMultiplier. */
  staminaCost: number;
  windupMs: number;
  activeMs: number;
  recoveryMs: number;
  hitShape: AttackHitShapeDefinition;
  /** Furthest extent of the hit shape (px), for cheap broadphase culling. */
  reachPx: number;
  techniqueId?: string;
}

export interface ComboSelectionState {
  weaponDefId: string;
  lastAttackId: string;
  expiresAtMs: number;
  nowMs: number;
}

function shapeReachPx(shape: AttackHitShapeDefinition): number {
  switch (shape.kind) {
    case "arc":
      return shape.radiusPx;
    case "capsule":
      return shape.lengthPx;
    case "circle":
    case "point":
      return shape.radiusPx;
  }
}

function attacksForWeapon(weapon: WeaponDefinition): WeaponAttackDefinition[] {
  return [
    ...Object.values(weapon.attacks).filter((attack): attack is WeaponAttackDefinition => !!attack),
    ...Object.values(weapon.extraAttacks ?? {}),
  ];
}

function attackById(weapon: WeaponDefinition, attackId: string): WeaponAttackDefinition | null {
  return attacksForWeapon(weapon).find((attack) => attack.id === attackId) ?? null;
}

function comboAttackForInput(
  kind: AttackInputKind,
  weapon: WeaponDefinition,
  combo: ComboSelectionState | undefined,
): WeaponAttackDefinition | null {
  if (!combo || combo.weaponDefId !== weapon.id || combo.nowMs > combo.expiresAtMs) return null;
  const link = weapon.comboLinks?.find(
    (candidate) => candidate.fromAttackId === combo.lastAttackId && candidate.inputKind === kind,
  );
  return link ? attackById(weapon, link.toAttackId) : null;
}

/**
 * Pick the attack the intent selects. Missing slots are explicit unsupported
 * gestures so the runtime can provide feedback instead of silently doing `quick`.
 */
export function selectAttack(
  intent: InputIntent,
  weapon: WeaponDefinition,
  combo?: ComboSelectionState,
): WeaponAttackDefinition | null {
  const comboAttack = comboAttackForInput(intent.kind, weapon, combo);
  if (comboAttack) return comboAttack;
  const slot = attackSlotForInput(intent.kind);
  return weapon.attacks[slot] ?? null;
}

export function resolveAttack(
  intent: InputIntent,
  weapon: WeaponDefinition,
  combo?: ComboSelectionState,
): AttackPlan | null {
  const attack = selectAttack(intent, weapon, combo);
  if (!attack) return null;
  return {
    weaponDefId: weapon.id,
    attack,
    direction: intent.direction,
    weaponDamage: weapon.baseDamage * attack.damageMultiplier,
    staminaCost: weapon.handling.baseStaminaCost * attack.staminaCostMultiplier,
    windupMs: attack.windupMs,
    activeMs: attack.activeMs,
    recoveryMs: attack.recoveryMs,
    hitShape: attack.hitShape,
    reachPx: shapeReachPx(attack.hitShape),
    ...(attack.techniqueId ? { techniqueId: attack.techniqueId } : {}),
  };
}
