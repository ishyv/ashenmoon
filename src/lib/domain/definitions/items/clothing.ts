import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { Wearable, ArmorMaterial, InsulationMaterial } from "$lib/domain/items/item-traits";

export const clothingItems = {
  fiber_wraps: Item({
    id: itemId("fiber_wraps"),
    name: "Fiber Wraps",
    description: "Crude wraps made from plant fiber. Scratchy protection for hands and feet.",
    rarity: Rarity.Common,
    category: Category.Clothing,
    icon: "🧤",
    physical: { carryClass: "pocket", weight: 0.15, stackLimit: 10 },
  }).with(Wearable("hands"), ArmorMaterial(1)),
  hide_footwraps: Item({
    id: itemId("hide_footwraps"),
    name: "Hide Footwraps",
    description: "Simple hide wraps for walking rough ground without feeding it your feet.",
    rarity: Rarity.Common,
    category: Category.Clothing,
    icon: "🥾",
    physical: { carryClass: "pack", weight: 0.4, stackLimit: 4 },
  }).with(Wearable("feet"), ArmorMaterial(1)),
  leather_gloves: Item({
    id: itemId("leather_gloves"),
    name: "Leather Gloves",
    description: "Rough gloves that make sharp stone and thorny work less stupid.",
    rarity: Rarity.Uncommon,
    category: Category.Clothing,
    icon: "🧤",
    physical: { carryClass: "pack", weight: 0.35, stackLimit: 4 },
  }).with(Wearable("hands"), ArmorMaterial(1)),
  hide_cloak: Item({
    id: itemId("hide_cloak"),
    name: "Hide Cloak",
    description: "A simple hide cloak for warmth and poor weather.",
    rarity: Rarity.Uncommon,
    category: Category.Clothing,
    icon: "🧥",
    physical: { carryClass: "haul", weight: 2.2, stackLimit: 1 },
  }).with(Wearable("body"), InsulationMaterial(2)),
  fur_lined_wrap: Item({
    id: itemId("fur_lined_wrap"),
    name: "Fur-Lined Wrap",
    description: "A warm layered wrap made from pelt and hide. Heavy, but night is heavier.",
    rarity: Rarity.Uncommon,
    category: Category.Clothing,
    icon: "🧣",
    physical: { carryClass: "pack", weight: 1.2, stackLimit: 3 },
  }).with(Wearable("body"), InsulationMaterial(3)),
  boar_leather_coat: Item({
    id: itemId("boar_leather_coat"),
    name: "Boar Leather Coat",
    description: "A heavy coat of layered boar hide and cured leather. Shields against wolf bites.",
    rarity: Rarity.Uncommon,
    category: Category.Clothing,
    icon: "🧥",
    physical: { carryClass: "pack", weight: 2.8, stackLimit: 1 },
  }).with(Wearable("body"), ArmorMaterial(3), InsulationMaterial(1)),
  stalker_mask: Item({
    id: itemId("stalker_mask"),
    name: "Stalker Mask",
    description: "A fearsome mask made of wolf pelt and fangs. Keeps the throat warm and dry.",
    rarity: Rarity.Rare,
    category: Category.Clothing,
    icon: "🐺",
    physical: { carryClass: "pack", weight: 0.9, stackLimit: 1 },
  }).with(Wearable("head"), ArmorMaterial(1), InsulationMaterial(3)),
};
