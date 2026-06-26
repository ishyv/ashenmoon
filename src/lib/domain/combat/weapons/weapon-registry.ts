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
import type { WeaponDamageType, WeaponDefinition, WeaponFamily } from "./weapon-types";

/** Mirrors core `TILE` (map.ts) without importing the core layer into domain. */
const TILE_PX = 64;

const registry = new Map<string, WeaponDefinition>();

export function registerWeaponDefinition(def: WeaponDefinition): void {
  registry.set(def.id, def);
}

export function getWeaponDefinition(id: string): WeaponDefinition | undefined {
  return registry.get(id);
}

export function clearWeaponDefinitions(): void {
  registry.clear();
}

/** Item-trait damage flavour → weapon damage flavour. */
function weaponDamageType(kind: "slash" | "pierce" | "blunt", family: WeaponFamily): WeaponDamageType {
  if (kind === "slash") return family === "axe" || family === "hammer" ? "chop" : "slash";
  return kind; // "pierce" | "blunt"
}

/** Best-effort map from the item's free-text `weaponKind` to a family. */
function familyForWeaponKind(weaponKind: string): WeaponFamily {
  const families: WeaponFamily[] = [
    "knife",
    "sword",
    "curved_sword",
    "axe",
    "spear",
    "club",
    "hammer",
  ];
  return families.find((f) => weaponKind.includes(f)) ?? "sword";
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

  const family = familyForWeaponKind(weapon.weaponKind);
  const reachTrait = traitOf(def, "reach_weapon");
  const baseReachPx = TILE_PX * 1.4 + (reachTrait ? reachTrait.reach * TILE_PX : 0);
  const damageType = weaponDamageType(weapon.damageType, family);
  const bleed = weapon.bleedChancePct;

  return {
    id: `derived:${itemId}`,
    name: def?.name ?? itemId,
    family,
    baseDamage: weapon.damage,
    handling: {
      weightClass: "medium",
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
    animationProfile: "small_slash",
    soundProfile: def?.category ?? "unarmed",
  };
}

/**
 * The explicit `WeaponDefinition` an item opts into via `WeaponTrait.weaponDefId`,
 * or undefined. The weapon-driven combat path only handles weapons with an
 * explicit definition; everything else stays on the legacy attack system.
 */
export function explicitWeaponDefForItem(itemId: string | null | undefined): WeaponDefinition | undefined {
  if (!itemId) return undefined;
  const weapon = traitOf(getItemDef(itemId), "weapon");
  return weapon?.weaponDefId ? registry.get(weapon.weaponDefId) : undefined;
}

/**
 * Resolve the `WeaponDefinition` for an equipped item id. Returns the explicit
 * definition the item links to (via its `WeaponTrait.weaponDefId`), else a
 * derived default, else undefined for non-weapons (unarmed handled by caller).
 */
export function weaponDefForItem(itemId: string | null | undefined): WeaponDefinition | undefined {
  if (!itemId) return undefined;
  return explicitWeaponDefForItem(itemId) ?? deriveDefaultDefinition(itemId);
}
