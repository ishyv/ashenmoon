import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { AddStatus, ChanceOfVitals, RestoreHp, RestoreThirst, RestoreHunger, TransformInto } from "$lib/domain/items/item-effects";
import { Boilable, Consumable, Cookable, Decayable, Flammable } from "$lib/domain/items/item-traits";
import { StatusId } from "$lib/domain/systems/status-types";


export const foodWaterItems = {
  berries: Item({
    id: itemId("berries"),
    name: "Berries",
    description: "Small dark berries with a tart smell.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.05, stackLimit: 30 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(2), RestoreHunger(5)] }),
    Decayable({ lifespanSec: 240, effect: TransformInto(itemId("volatile_ash")) })
  ),
  mushroom: Item({
    id: itemId("mushroom"),
    name: "Mushroom",
    description: "A pale forest mushroom with damp gills.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.08, stackLimit: 20 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(1), RestoreHunger(8), ChanceOfVitals(0.35, AddStatus(StatusId.Poison, 45))] }),
    Decayable({ lifespanSec: 180, effect: TransformInto(itemId("volatile_ash")) })
  ),
  raw_meat: Item({
    id: itemId("raw_meat"),
    name: "Raw Meat",
    description: "Fresh meat. Edible if you are desperate, smarter if cooked or dried.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pack", weight: 0.4, stackLimit: 12 },
    visual: { ground: { heightTiles: 0.42 } },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(4), RestoreHunger(15), ChanceOfVitals(0.3, AddStatus(StatusId.Sickness, 45))] }),
    Decayable({ lifespanSec: 180, effect: TransformInto(itemId("spoiled_meat")) }),
    Cookable({ cookTemp: 120, cookSec: 8, into: itemId("cooked_meat") })
  ),
  raw_small_meat: Item({
    id: itemId("raw_small_meat"),
    name: "Raw Small Meat",
    description: "A small cut of fresh meat. It will not stay fresh for long.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pack", weight: 0.25, stackLimit: 16 },
    visual: { ground: { heightTiles: 0.3 } },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(3), RestoreHunger(10), ChanceOfVitals(0.3, AddStatus(StatusId.Sickness, 35))] }),
    Decayable({ lifespanSec: 180, effect: TransformInto(itemId("spoiled_meat")) }),
    Cookable({ cookTemp: 120, cookSec: 8, into: itemId("cooked_meat") })
  ),
  raw_large_meat: Item({
    id: itemId("raw_large_meat"),
    name: "Raw Large Meat",
    description: "A heavy cut of fresh meat. Good food if processed before rot takes it.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pack", weight: 0.65, stackLimit: 8 },
    visual: { ground: { heightTiles: 0.52 } },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(5), RestoreHunger(25), ChanceOfVitals(0.35, AddStatus(StatusId.Sickness, 50))] }),
    Decayable({ lifespanSec: 180, effect: TransformInto(itemId("spoiled_meat")) }),
    Cookable({ cookTemp: 120, cookSec: 8, into: itemId("cooked_meat") })
  ),
  fatty_meat: Item({
    id: itemId("fatty_meat"),
    name: "Fatty Meat",
    description: "Meat with enough fat to cook well and render into useful grease.",
    rarity: Rarity.Common,
    category: Category.Food,
    icon: "🥩",
    physical: { carryClass: "pack", weight: 0.6, stackLimit: 16 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(4), RestoreHunger(20)] }),
    Decayable({ lifespanSec: 600, effect: TransformInto(itemId("spoiled_meat")) }),
    Cookable({ cookTemp: 120, cookSec: 8, into: itemId("cooked_meat") })
  ),
  spoiled_meat: Item({
    id: itemId("spoiled_meat"),
    name: "Spoiled Meat",
    description: "Meat turning sour. The smell carries, and eating it is asking for misery.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    physical: { carryClass: "pack", weight: 0.35, stackLimit: 16 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(1), ChanceOfVitals(0.75, AddStatus(StatusId.Sickness, 80))] }),
    Decayable({ lifespanSec: 240, effect: TransformInto(itemId("rotten_meat")) })
  ),
  rotten_meat: Item({
    id: itemId("rotten_meat"),
    name: "Rotten Meat",
    description: "Blackened meat crawling toward uselessness. A predator lure, not food.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    physical: { carryClass: "pack", weight: 0.3, stackLimit: 16 },
  }).with(
    Consumable({ verb: "eat", onConsume: [ChanceOfVitals(0.95, AddStatus(StatusId.Sickness, 120))] })
  ),
  cooked_meat: Item({
    id: itemId("cooked_meat"),
    name: "Cooked Meat",
    description: "Meat cooked over flame. Rough, hot, and much safer.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pack", weight: 0.35, stackLimit: 12 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(12), RestoreHunger(30)] })
  ),
  dried_meat: Item({
    id: itemId("dried_meat"),
    name: "Dried Meat",
    description: "Tough preserved meat for longer survival runs.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pack", weight: 0.25, stackLimit: 20 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(8), RestoreHunger(20)] })
  ),
  smoked_meat: Item({
    id: itemId("smoked_meat"),
    name: "Smoked Meat",
    description: "Meat preserved with smoke. Better storage, better morale, worse smell for hiding.",
    rarity: Rarity.Uncommon,
    category: Category.Food,
    icon: "🍖",
    physical: { carryClass: "pocket", weight: 0.3, stackLimit: 30 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(16), RestoreHunger(40)] })
  ),
  animal_fat: Item({
    id: itemId("animal_fat"),
    name: "Animal Fat",
    description: "Soft fat trimmed from a carcass. Fuel, food, salve base, and smell problem.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    icon: "🧈",
    physical: { carryClass: "pocket", weight: 0.15, stackLimit: 30 },
  }).with(
    Flammable({ ignitionTemp: 160, burnDurationSec: 35, effect: TransformInto(itemId("soot")) })
  ),
  bitter_mushroom: Item({
    id: itemId("bitter_mushroom"),
    name: "Bitter Mushroom",
    description: "A pale forest mushroom with a sharp smell. Food, medicine, or mistake.",
    rarity: Rarity.Common,
    category: Category.Food,
    icon: "🍄",
    physical: { carryClass: "pocket", weight: 0.05, stackLimit: 40 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(2), RestoreHunger(10), ChanceOfVitals(0.15, AddStatus(StatusId.Poison, 30))] })
  ),
  dried_berries: Item({
    id: itemId("dried_berries"),
    name: "Dried Berries",
    description: "Dried, preserved berries. Chewy and lasts much longer.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 40 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(4), RestoreHunger(8)] })
  ),
  clean_water: Item({
    id: itemId("clean_water"),
    name: "Clean Water",
    description: "Water that has been boiled and condensed to remove essence taint.",
    rarity: Rarity.Common,
    category: Category.Component,
    physical: { carryClass: "pocket", weight: 0.25, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [RestoreThirst(60)] })
  ),
  boiled_water: Item({
    id: itemId("boiled_water"),
    name: "Boiled Water",
    description: "Water boiled long enough to be safer. Still precious, still ordinary.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    icon: "♨️",
    physical: { carryClass: "pack", weight: 1.0, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [RestoreThirst(24)] })
  ),
  dirty_water: Item({
    id: itemId("dirty_water"),
    name: "Dirty Water",
    description: "Murky water with debris drifting in it. It smells faintly of rot.",
    rarity: Rarity.Common,
    category: Category.Component,
    physical: { carryClass: "pocket", weight: 0.25, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [RestoreThirst(35), ChanceOfVitals(0.45, AddStatus(StatusId.Sickness, 60))] }),
    Boilable({ minTemp: 80, durationSec: 4, effect: TransformInto(itemId("clean_water")) })
  ),
  acorn: Item({
    id: itemId("acorn"),
    name: "Acorn",
    description: "A hard oak seed. Bitter and mildly unpleasant raw, but edible if roasted.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.06, stackLimit: 30 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(1), RestoreHunger(3), ChanceOfVitals(0.2, AddStatus(StatusId.Sickness, 30))] })
  ),
  wild_root: Item({
    id: itemId("wild_root"),
    name: "Wild Root",
    description: "A knotted forest root dug from soft earth. Starchy and filling if cooked.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.15, stackLimit: 20 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(2), RestoreHunger(6), ChanceOfVitals(0.25, AddStatus(StatusId.Sickness, 30))] })
  ),
  roasted_root: Item({
    id: itemId("roasted_root"),
    name: "Roasted Root",
    description: "A charred root pulled from the embers. Dense and filling.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.12, stackLimit: 20 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(10), RestoreHunger(15)] })
  ),
  roasted_acorn: Item({
    id: itemId("roasted_acorn"),
    name: "Roasted Acorn",
    description: "An acorn crisped by fire. Nutty, mildly bitter, actually palatable.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.05, stackLimit: 30 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(5), RestoreHunger(8)] })
  ),
  bone_broth: Item({
    id: itemId("bone_broth"),
    name: "Bone Broth",
    description: "A warm, fatty liquid made by boiling bones. Filling and steadying.",
    rarity: Rarity.Common,
    category: Category.Food,
    icon: "🥣",
    physical: { carryClass: "pack", weight: 0.5, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [RestoreHp(8), RestoreThirst(15), RestoreHunger(20)] })
  ),
};
