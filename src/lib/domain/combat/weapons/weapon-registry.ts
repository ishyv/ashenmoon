/**
 * Weapon definition registry + fallback resolver.
 *
 * Explicit `WeaponDefinition`s are registered here by id (the prototypes call
 * `registerWeaponDefinition` at module load). Any equipped item that lacks an
 * explicit definition still resolves to a usable weapon: `weaponDefForItem`
 * derives a sensible default from the item's existing `WeaponTrait` /
 * `ReachWeaponTrait`, so the whole armoury keeps working during the migration.
 *
 * Pure: reads item data, builds definitions. No world, no Pixi.
 */
import { getItemDef, traitOf } from "$lib/domain/items";
import type { WeaponDefinition } from "./weapon-types";
import { resolveWeaponDamageType, resolveWeaponFamilyForKind } from "./weapon-families";

/** Mirrors core `TILE` (map.ts) without importing the core layer into domain. */
const TILE_PX = 64;

const registry = new Map<string, WeaponDefinition>();

export const UNARMED_WEAPON_DEF: WeaponDefinition = {
  id: "weapon.unarmed",
  name: "bare hands",
  family: "unarmed",
  baseDamage: 10,
  handling: {
    weightClass: "light",
    baseReachPx: TILE_PX * 0.7,
    baseRecoveryMs: 220,
    baseStaminaCost: 4,
    stanceMoveSpeedMultiplier: 0.8,
    attackMoveSpeedMultiplier: 0.65,
  },
  attacks: {
    quick: {
      id: "unarmed.quick",
      name: "jab",
      inputKind: "tap",
      damageType: "blunt",
      damageMultiplier: 1,
      staminaCostMultiplier: 1,
      windupMs: 80,
      activeMs: 80,
      recoveryMs: 180,
      hitShape: { kind: "arc", radiusPx: TILE_PX * 0.7, arcDegrees: 70 },
      movement: { moveSpeedMultiplier: 0.65 },
    },
  },
  animationProfile: "quick_stab",
  soundProfile: "unarmed",
};

export function registerWeaponDefinition(def: WeaponDefinition): void {
  registry.set(def.id, def);
}

registerWeaponDefinition(UNARMED_WEAPON_DEF);

export function getWeaponDefinition(id: string): WeaponDefinition | undefined {
  return registry.get(id);
}

export function clearWeaponDefinitions(): void {
  registry.clear();
  registerWeaponDefinition(UNARMED_WEAPON_DEF);
}

/**
 * Derive a default `WeaponDefinition` for an item that has a `WeaponTrait` but no
 * explicit definition. Gives it a single `quick` attack so combat resolves; the
 * weapon simply has no stance/charged/swipe personality until authored.
 */
function deriveDefaultDefinition(itemId: string): WeaponDefinition | undefined {
  const def = getItemDef(itemId);
  const weapon = traitOf(def, "weapon");
  if (!weapon) return undefined;

  const family = resolveWeaponFamilyForKind(weapon.weaponKind);
  const reachTrait = traitOf(def, "reach_weapon");
  const baseReachPx = TILE_PX * 1.4 + (reachTrait ? reachTrait.reach * TILE_PX : 0);
  const damageType = resolveWeaponDamageType(weapon.damageType, family);
  const bleed = weapon.bleedChancePct;

  return {
    id: `derived:${itemId}`,
    name: def?.name ?? itemId,
    family: family.id,
    baseDamage: weapon.damage,
    handling: {
      weightClass: family.defaultWeightClass,
      baseReachPx,
      baseRecoveryMs: 320,
      baseStaminaCost: 8,
      stanceMoveSpeedMultiplier: 0.6,
      attackMoveSpeedMultiplier: 0.4,
    },
    attacks: {
      quick: {
        id: `derived:${itemId}:quick`,
        name: "swing",
        inputKind: "tap",
        damageType,
        damageMultiplier: 1,
        staminaCostMultiplier: 1,
        windupMs: 90,
        activeMs: 110,
        recoveryMs: 320,
        hitShape: { kind: "arc", radiusPx: baseReachPx, arcDegrees: 90 },
        movement: { moveSpeedMultiplier: 0.4 },
        ...(bleed
          ? {
              statusEffects: [
                { kind: "bleed" as const, chancePct: bleed, magnitude: 2, durationSec: 6, tickEverySec: 2 },
              ],
            }
          : {}),
      },
    },
    animationProfile: family.defaultAnimationProfile,
    soundProfile: family.defaultSoundProfile,
  };
}

/**
 * The explicit `WeaponDefinition` an item opts into via `WeaponTrait.weaponDefId`,
 * or undefined. This is kept for diagnostics and tests; normal combat uses
 * `weaponDefForItem` so every attack has a weapon-driven definition.
 */
export function explicitWeaponDefForItem(itemId: string | null | undefined): WeaponDefinition | undefined {
  if (!itemId) return undefined;
  const weapon = traitOf(getItemDef(itemId), "weapon");
  return weapon?.weaponDefId ? registry.get(weapon.weaponDefId) : undefined;
}

/**
 * Resolve the `WeaponDefinition` for an equipped item id. Returns the explicit
 * definition the item links to (via its `WeaponTrait.weaponDefId`), else a
 * derived default, else the explicit unarmed definition for non-weapons.
 */
export function weaponDefForItem(itemId: string | null | undefined): WeaponDefinition {
  if (!itemId) return UNARMED_WEAPON_DEF;
  return explicitWeaponDefForItem(itemId) ?? deriveDefaultDefinition(itemId) ?? UNARMED_WEAPON_DEF;
}
