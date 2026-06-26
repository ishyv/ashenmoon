/**
 * Weapon techniques — the "Ashes of War" layer.
 *
 * A technique is a small, registered behaviour module that gives a weapon an
 * extra combat perspective without hardcoding weapon ids into the attack system.
 * An attack references a technique by id (`WeaponAttackDefinition.techniqueId`);
 * the runtime looks it up here and applies its `onHit` hook.
 *
 * Techniques are PURE: plain hit data in, an adjusted result out. They never
 * import the core `Entity`, never touch Pixi/UI. The system extracts the data a
 * technique needs (distance, target tags) and applies what it returns (damage,
 * bleed). Mechanics from the old combos migrate here in Phase 5.
 */

export interface TechniqueHitInput {
  /** Outgoing damage after weapon + player scaling, before the technique. */
  weaponDamage: number;
  /** Distance from attacker centre to target centre (world px). */
  distancePx: number;
  /** Coarse target descriptors the system derived (e.g. "structure", "wolf"). */
  targetTags: readonly string[];
}

export interface TechniqueBleed {
  damagePerTick: number;
  durationSec: number;
  tickEverySec: number;
}

export interface TechniqueHitOutput {
  damage: number;
  bleed?: TechniqueBleed;
  /** Optional one-line note the system may surface as feedback. */
  note?: string;
}

export interface WeaponTechnique {
  id: string;
  /** Adjust a single hit. Must be pure. */
  onHit(input: TechniqueHitInput): TechniqueHitOutput;
}

const registry = new Map<string, WeaponTechnique>();

export function registerWeaponTechnique(technique: WeaponTechnique): void {
  registry.set(technique.id, technique);
}

export function getWeaponTechnique(id: string | undefined): WeaponTechnique | undefined {
  return id ? registry.get(id) : undefined;
}

export function clearWeaponTechniques(): void {
  registry.clear();
}

// --- built-in techniques --------------------------------------------------

/**
 * Spear close-range penalty: a spear is a spacing tool. Inside this range the
 * thrust loses most of its power, punishing the player for letting an enemy
 * close the gap.
 */
export const SPEAR_CLOSE_RANGE_PX = 56;
const SPEAR_CLOSE_RANGE_DAMAGE_MULT = 0.4;

registerWeaponTechnique({
  id: "spear_close_range_penalty",
  onHit({ weaponDamage, distancePx }) {
    if (distancePx <= SPEAR_CLOSE_RANGE_PX) {
      return {
        damage: weaponDamage * SPEAR_CLOSE_RANGE_DAMAGE_MULT,
        note: "too close",
      };
    }
    return { damage: weaponDamage };
  },
});

/**
 * Axe structure bonus: extra bite against wood and built structures. Only fires
 * on targets the system tags as structural; harmless against flesh.
 */
const AXE_STRUCTURE_DAMAGE_MULT = 1.6;

registerWeaponTechnique({
  id: "axe_structure_bonus",
  onHit({ weaponDamage, targetTags }) {
    const structural = targetTags.includes("structure") || targetTags.includes("wood");
    return { damage: structural ? weaponDamage * AXE_STRUCTURE_DAMAGE_MULT : weaponDamage };
  },
});
