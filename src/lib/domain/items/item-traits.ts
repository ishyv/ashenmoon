import type { InventoryEffect, VitalsEffect } from "./item-effects";
import type { ItemDefinition } from "./item-types";

/**
 * Union of all capabilities an item can possess.
 * Traits define the 'capability' half of the trait/effect architecture.
 */
export type ItemTrait =
  | TemperatureSensitiveTrait
  | FlammableTrait
  | DecayableTrait
  | ConsumableTrait
  | BoilableTrait
  | TanninSourceTrait
  | BindingMaterialTrait
  | AbsorbentTrait
  | SealantTrait
  | CleaningAgentTrait
  | PigmentTrait
  | ToolTrait
  | WeaponTrait
  | ReachWeaponTrait
  | ArmorMaterialTrait
  | InsulationMaterialTrait
  | WearableTrait
  | PlaceableTrait
  | HeatSafeTrait
  | AttractsPredatorsTrait
  | MedicineIngredientTrait
  | HandlingRiskTrait
  | CuttingEdgeTrait
  | RestQualityTrait
  | BlueprintTrait;

/**
 * Defines item behavior based on ambient temperature.
 */
export interface TemperatureSensitiveTrait {
  kind: "temperature_sensitive";
  minSafeTemp: number;
  maxSafeTemp: number;
  effect: InventoryEffect;
}

/**
 * Defines flammability properties and ignition thresholds.
 */
export interface FlammableTrait {
  kind: "flammable";
  ignitionTemp: number;
  burnDurationSec: number;
  effect: InventoryEffect;
}

/**
 * Defines a natural expiration or decay period.
 */
export interface DecayableTrait {
  kind: "decayable";
  lifespanSec: number;
  effect: InventoryEffect;
}

/**
 * Marks an item as drinkable/edible. `onConsume` effects run when the player
 * consumes one unit; the consume system resolves them (rolling any chance
 * effects) into commands applied to the holder and inventory.
 */
export interface ConsumableTrait {
  kind: "consumable";
  verb: "drink" | "eat" | "apply";
  onConsume: VitalsEffect[];
}


/**
 * Marks an item as boilable at a heat source. The interaction system owns the
 * timing/feedback; the trait owns the numbers and the resulting effect.
 */
export interface BoilableTrait {
  kind: "boilable";
  /** ambient temperature required at the heat source (°C). */
  minTemp: number;
  durationSec: number;
  effect: InventoryEffect;
}

export interface TanninSourceTrait {
  kind: "tannin_source";
  strength: number;
}

export interface BindingMaterialTrait {
  kind: "binding_material";
  strength: number;
}

export interface AbsorbentTrait {
  kind: "absorbent";
  capacity: number;
}

export interface SealantTrait {
  kind: "sealant";
  strength: number;
}

export interface CleaningAgentTrait {
  kind: "cleaning_agent";
  strength: number;
}

export interface PigmentTrait {
  kind: "pigment";
  color: string;
}

export interface ToolTrait {
  kind: "tool";
  toolKind: string;
  power: number;
}

export interface WeaponTrait {
  kind: "weapon";
  weaponKind: string;
  damage: number;
  damageType: "slash" | "pierce" | "blunt";
  bleedChancePct?: number;
}

export interface ReachWeaponTrait {
  kind: "reach_weapon";
  reach: number;
}

export interface ArmorMaterialTrait {
  kind: "armor_material";
  protection: number;
}

export interface InsulationMaterialTrait {
  kind: "insulation_material";
  warmth: number;
}

export interface WearableTrait {
  kind: "wearable";
  slot: "head" | "body" | "hands" | "feet" | "cloak";
}

export interface PlaceableTrait {
  kind: "placeable";
  prefabId: string;
}

export interface HeatSafeTrait {
  kind: "heat_safe";
  maxSafeTemp: number;
}

export interface AttractsPredatorsTrait {
  kind: "attracts_predators";
  strength: number;
}

/**
 * DSL Helper: Define temperature sensitivity capabilities.
 */
export function TemperatureSensitive(input: {
  minSafeTemp: number;
  maxSafeTemp: number;
  effect: InventoryEffect;
}): TemperatureSensitiveTrait {
  return {
    kind: "temperature_sensitive",
    ...input,
  };
}

/**
 * DSL Helper: Define flammability capabilities.
 */
export function Flammable(input: {
  ignitionTemp: number;
  burnDurationSec: number;
  effect: InventoryEffect;
}): FlammableTrait {
  return {
    kind: "flammable",
    ...input,
  };
}

/**
 * DSL Helper: Define decay capabilities.
 */
export function Decayable(input: {
  lifespanSec: number;
  effect: InventoryEffect;
}): DecayableTrait {
  return {
    kind: "decayable",
    ...input,
  };
}

/**
 * DSL Helper: Define consumable capabilities.
 */
export function Consumable(input: {
  verb: "eat" | "drink" | "apply";
  onConsume: VitalsEffect[];
}): ConsumableTrait {
  return {
    kind: "consumable",
    ...input,
  };
}


/**
 * DSL Helper: Define boilability.
 */
export function Boilable(input: {
  minTemp: number;
  durationSec: number;
  effect: InventoryEffect;
}): BoilableTrait {
  return {
    kind: "boilable",
    ...input,
  };
}

export function TanninSource(strength: number): TanninSourceTrait {
  return { kind: "tannin_source", strength };
}

export function BindingMaterial(strength: number): BindingMaterialTrait {
  return { kind: "binding_material", strength };
}

export function Absorbent(capacity: number): AbsorbentTrait {
  return { kind: "absorbent", capacity };
}

export function Sealant(strength: number): SealantTrait {
  return { kind: "sealant", strength };
}

export function CleaningAgent(strength: number): CleaningAgentTrait {
  return { kind: "cleaning_agent", strength };
}

export function Pigment(color: string): PigmentTrait {
  return { kind: "pigment", color };
}

export function Tool(input: { toolKind: string; power: number }): ToolTrait {
  return { kind: "tool", ...input };
}

export function Weapon(input: {
  weaponKind: string;
  damage: number;
  damageType: "slash" | "pierce" | "blunt";
  bleedChancePct?: number;
}): WeaponTrait {
  return { kind: "weapon", ...input };
}

export function ReachWeapon(reach: number): ReachWeaponTrait {
  return { kind: "reach_weapon", reach };
}

export function ArmorMaterial(protection: number): ArmorMaterialTrait {
  return { kind: "armor_material", protection };
}

export function InsulationMaterial(warmth: number): InsulationMaterialTrait {
  return { kind: "insulation_material", warmth };
}

export function Wearable(slot: WearableTrait["slot"]): WearableTrait {
  return { kind: "wearable", slot };
}

export function Placeable(prefabId: string): PlaceableTrait {
  return { kind: "placeable", prefabId };
}

export function HeatSafe(maxSafeTemp: number): HeatSafeTrait {
  return { kind: "heat_safe", maxSafeTemp };
}

export function AttractsPredators(strength: number): AttractsPredatorsTrait {
  return { kind: "attracts_predators", strength };
}

export interface MedicineIngredientTrait {
  kind: "medicine_ingredient";
  use: string;
}

export function MedicineIngredient(use: string): MedicineIngredientTrait {
  return { kind: "medicine_ingredient", use };
}

export interface HandlingRiskTrait {
  kind: "handling_risk";
  status: string;
  chancePct: number;
}

export function HandlingRisk(status: string, chancePct: number): HandlingRiskTrait {
  return { kind: "handling_risk", status, chancePct };
}

export interface CuttingEdgeTrait {
  kind: "cutting_edge";
  power: number;
}

export function CuttingEdge(power: number): CuttingEdgeTrait {
  return { kind: "cutting_edge", power };
}

export interface RestQualityTrait {
  kind: "rest_quality";
  value: number;
}

export function RestQuality(value: number): RestQualityTrait {
  return { kind: "rest_quality", value };
}

export interface BlueprintTrait {
  kind: "blueprint";
  recipeId: string;
}

export function Blueprint(recipeId: string): BlueprintTrait {
  return { kind: "blueprint", recipeId };
}

/**
 * Returns the trait of the given kind carried by a definition, or `undefined`.
 * The result is narrowed to the concrete trait interface so callers read its
 * fields without a manual `kind` check.
 */
export function traitOf<K extends ItemTrait["kind"]>(
  def: ItemDefinition | undefined,
  kind: K,
): Extract<ItemTrait, { kind: K }> | undefined {
  return def?.traits.find(
    (trait): trait is Extract<ItemTrait, { kind: K }> => trait.kind === kind,
  );
}
