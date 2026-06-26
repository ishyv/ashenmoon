/**
 * Attack resolution: InputIntent + WeaponDefinition → AttackPlan.
 *
 * This is where the weapon decides what a gesture does. Given the classified
 * intent and the equipped weapon, it picks the matching attack from the weapon's
 * set (falling back to `quick` when the weapon has no attack for that intent) and
 * computes the concrete numbers the runtime needs: damage, stamina, phase
 * timings, the reach-bearing hit shape, and direction.
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

/**
 * Pick the attack the intent selects. Falls back to `quick` when the weapon has
 * no attack bound to that slot, so every gesture produces *some* attack with the
 * weapon in hand.
 */
export function selectAttack(intent: InputIntent, weapon: WeaponDefinition): WeaponAttackDefinition {
  const slot = attackSlotForInput(intent.kind);
  return weapon.attacks[slot] ?? weapon.attacks.quick;
}

export function resolveAttack(intent: InputIntent, weapon: WeaponDefinition): AttackPlan {
  const attack = selectAttack(intent, weapon);
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
