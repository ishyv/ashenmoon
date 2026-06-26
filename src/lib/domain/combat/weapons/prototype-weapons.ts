/**
 * The three prototype weapons that prove the weapon-driven model: Crude Knife,
 * Wooden Spear, Stone Axe. Each is a distinct point in the
 * reach / weight / commitment space. Importing this module registers them.
 *
 * Damage is authored at combat scale (the legacy swing did ~60), independent of
 * the tiny `WeaponTrait.damage` on the item; the runtime scales these by the
 * player's attackDamage for level progression.
 */
import { registerWeaponDefinition } from "./weapon-registry";
import type { WeaponDefinition } from "./weapon-types";

const TILE = 64;

export const CRUDE_KNIFE_DEF: WeaponDefinition = {
  id: "weapon.crude_knife",
  name: "crude knife",
  family: "knife",
  baseDamage: 22,
  handling: {
    weightClass: "light",
    baseReachPx: TILE * 0.9,
    baseRecoveryMs: 200,
    baseStaminaCost: 6,
    stanceMoveSpeedMultiplier: 0.75,
    attackMoveSpeedMultiplier: 0.6,
  },
  animationProfile: "small_slash",
  soundProfile: "knife",
  statModifiers: [{ stat: "moveSpeed", op: "mult", value: 1.05 }],
  attacks: {
    // tap: quick stab
    quick: {
      id: "knife.quick",
      name: "quick stab",
      inputKind: "tap",
      damageType: "pierce",
      damageMultiplier: 1,
      staminaCostMultiplier: 1,
      windupMs: 70,
      activeMs: 90,
      recoveryMs: 180,
      hitShape: { kind: "arc", radiusPx: TILE * 0.9, arcDegrees: 80 },
      movement: { moveSpeedMultiplier: 0.6 },
    },
    // stance tap: precise cut
    stanceSpecial: {
      id: "knife.precise_cut",
      name: "precise cut",
      inputKind: "stance_tap",
      damageType: "slash",
      damageMultiplier: 1.4,
      staminaCostMultiplier: 1.2,
      windupMs: 120,
      activeMs: 80,
      recoveryMs: 220,
      hitShape: { kind: "arc", radiusPx: TILE * 0.95, arcDegrees: 50 },
      movement: { moveSpeedMultiplier: 0.5 },
    },
    // swipe: carving slash that bleeds
    swipe: {
      id: "knife.carving_slash",
      name: "carving slash",
      inputKind: "swipe",
      damageType: "slash",
      damageMultiplier: 1.2,
      staminaCostMultiplier: 1.1,
      windupMs: 90,
      activeMs: 110,
      recoveryMs: 240,
      hitShape: { kind: "capsule", lengthPx: TILE * 1.1, widthPx: 34 },
      movement: { moveSpeedMultiplier: 0.55, lungePx: 18 },
      statusEffects: [{ kind: "bleed", chancePct: 60, magnitude: 3, durationSec: 6, tickEverySec: 2 }],
    },
  },
};

export const WOODEN_SPEAR_DEF: WeaponDefinition = {
  id: "weapon.wooden_spear",
  name: "wooden spear",
  family: "spear",
  baseDamage: 30,
  handling: {
    weightClass: "medium",
    baseReachPx: TILE * 2.4,
    baseRecoveryMs: 360,
    baseStaminaCost: 10,
    stanceMoveSpeedMultiplier: 0.55,
    attackMoveSpeedMultiplier: 0.35,
  },
  animationProfile: "straight_thrust",
  soundProfile: "spear",
  statModifiers: [{ stat: "moveSpeed", op: "mult", value: 0.95 }],
  attacks: {
    // tap: poke
    quick: {
      id: "spear.poke",
      name: "poke",
      inputKind: "tap",
      damageType: "pierce",
      damageMultiplier: 1,
      staminaCostMultiplier: 1,
      windupMs: 110,
      activeMs: 100,
      recoveryMs: 320,
      hitShape: { kind: "capsule", lengthPx: TILE * 2.4, widthPx: 34 },
      movement: { moveSpeedMultiplier: 0.35 },
      techniqueId: "spear_close_range_penalty",
    },
    // stance hold: aimed thrust
    charged: {
      id: "spear.aimed_thrust",
      name: "aimed thrust",
      inputKind: "stance_hold",
      damageType: "pierce",
      damageMultiplier: 1.7,
      staminaCostMultiplier: 1.5,
      windupMs: 220,
      activeMs: 110,
      recoveryMs: 360,
      hitShape: { kind: "capsule", lengthPx: TILE * 2.8, widthPx: 34 },
      movement: { moveSpeedMultiplier: 0.25, lungePx: 44, turnLock: true },
      techniqueId: "spear_close_range_penalty",
    },
    // swipe: driving thrust (technique reworked from the old combo in Phase 5)
    swipe: {
      id: "spear.driving_thrust",
      name: "driving thrust",
      inputKind: "swipe",
      damageType: "pierce",
      damageMultiplier: 1.5,
      staminaCostMultiplier: 1.6,
      windupMs: 140,
      activeMs: 140,
      recoveryMs: 300,
      hitShape: { kind: "capsule", lengthPx: TILE * 2.6, widthPx: 42 },
      movement: { moveSpeedMultiplier: 0.3, lungePx: 64, turnLock: true },
      techniqueId: "spear_close_range_penalty",
    },
  },
};

export const STONE_AXE_DEF: WeaponDefinition = {
  id: "weapon.stone_axe",
  name: "stone axe",
  family: "axe",
  baseDamage: 48,
  handling: {
    weightClass: "heavy",
    baseReachPx: TILE * 1.5,
    baseRecoveryMs: 520,
    baseStaminaCost: 16,
    stanceMoveSpeedMultiplier: 0.45,
    attackMoveSpeedMultiplier: 0.2,
  },
  animationProfile: "heavy_chop",
  soundProfile: "axe",
  statModifiers: [{ stat: "moveSpeed", op: "mult", value: 0.85 }],
  attacks: {
    // tap: rough chop
    quick: {
      id: "axe.rough_chop",
      name: "rough chop",
      inputKind: "tap",
      damageType: "chop",
      damageMultiplier: 1,
      staminaCostMultiplier: 1,
      windupMs: 180,
      activeMs: 110,
      recoveryMs: 480,
      hitShape: { kind: "arc", radiusPx: TILE * 1.5, arcDegrees: 110 },
      movement: { moveSpeedMultiplier: 0.2 },
      techniqueId: "axe_structure_bonus",
    },
    // hold: heavier chop
    heavy: {
      id: "axe.heavy_chop",
      name: "heavy chop",
      inputKind: "hold",
      damageType: "chop",
      damageMultiplier: 1.5,
      staminaCostMultiplier: 1.4,
      windupMs: 260,
      activeMs: 120,
      recoveryMs: 560,
      hitShape: { kind: "arc", radiusPx: TILE * 1.6, arcDegrees: 120 },
      movement: { moveSpeedMultiplier: 0.15, lungePx: 28 },
      techniqueId: "axe_structure_bonus",
    },
    // stance hold: committed overhead (reworked from fell-sweep in Phase 5)
    charged: {
      id: "axe.committed_overhead",
      name: "committed overhead",
      inputKind: "stance_hold",
      damageType: "chop",
      damageMultiplier: 2.2,
      staminaCostMultiplier: 1.8,
      windupMs: 380,
      activeMs: 130,
      recoveryMs: 640,
      hitShape: { kind: "circle", radiusPx: TILE * 1.3 },
      movement: { moveSpeedMultiplier: 0.1, lungePx: 36, turnLock: true },
      techniqueId: "axe_structure_bonus",
    },
  },
};

registerWeaponDefinition(CRUDE_KNIFE_DEF);
registerWeaponDefinition(WOODEN_SPEAR_DEF);
registerWeaponDefinition(STONE_AXE_DEF);
