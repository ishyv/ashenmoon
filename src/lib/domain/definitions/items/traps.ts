import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { Placeable } from "$lib/domain/items/item-traits";

export const trapItems = {
  snap_trap_kit: Item({
    id: itemId("snap_trap_kit"),
    name: "Snap Trap Kit",
    description: "A spring-loaded iron jaw trap designed to snap shut on passing prey.",
    rarity: Rarity.Uncommon,
    category: Category.Structure,
    icon: "⚙️",
    physical: { carryClass: "pack", weight: 2.5, stackLimit: 3 },
  }).with(Placeable("snap_trap")),

  caltrops_kit: Item({
    id: itemId("caltrops_kit"),
    name: "Caltrops Kit",
    description: "A pouch of jagged flint and bone spikes to scatter on the ground.",
    rarity: Rarity.Common,
    category: Category.Structure,
    icon: "✴️",
    physical: { carryClass: "pocket", weight: 0.8, stackLimit: 5 },
  }).with(Placeable("caltrops")),

  bait_decoy_kit: Item({
    id: itemId("bait_decoy_kit"),
    name: "Bait Decoy Kit",
    description: "A stick wrapped in raw meat and scent herbs to attract hungry beasts.",
    rarity: Rarity.Common,
    category: Category.Structure,
    icon: "🥩",
    physical: { carryClass: "pack", weight: 1.5, stackLimit: 2 },
  }).with(Placeable("bait_decoy")),
};
