import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { Tool, Weapon, ReachWeapon, CuttingEdge, EquippableVisuals } from "$lib/domain/items/item-traits";


export const toolWeaponItems = {
  starter_pickaxe: Item({
    id: itemId("starter_pickaxe"),
    name: "Starter Pickaxe",
    description: "A tired pickaxe with a worn iron head.",
    rarity: Rarity.Common,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 2, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "mining", power: 1 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "starterPickaxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  starter_axe: Item({
    id: itemId("starter_axe"),
    name: "Starter Axe",
    description: "A simple hand axe with a notched blade.",
    rarity: Rarity.Common,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.6, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "chopping", power: 1 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "starterAxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  stone_pickaxe: Item({
    id: itemId("stone_pickaxe"),
    name: "Stone Pickaxe",
    description: "A stone pick lashed to a wooden haft.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.8, stackLimit: 1 },
    visual: { ground: { heightTiles: 0.82 }, equipped: { heightTiles: 1.05 } },
  }).with(
    Tool({ toolKind: "mining", power: 2 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "stonePickaxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  stone_axe: Item({
    id: itemId("stone_axe"),
    name: "Stone Axe",
    description: "A stone head bound to a wooden handle. Heavy, crude, useful.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.8, stackLimit: 1 },
    visual: { ground: { heightTiles: 0.85 }, equipped: { heightTiles: 1.02 } },
  }).with(
    Tool({ toolKind: "chopping", power: 2 }),
    Weapon({ weaponKind: "axe", damage: 12, damageType: "slash", bleedChancePct: 8, weaponDefId: "weapon.stone_axe" }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "stoneAxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  flint_pickaxe: Item({
    id: itemId("flint_pickaxe"),
    name: "Flint Pickaxe",
    description: "A knapped flint pick bound with twine.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.4, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "mining", power: 2 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "flintPickaxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  flint_axe: Item({
    id: itemId("flint_axe"),
    name: "Flint Axe",
    description: "A simple axe made of sharp flint stone and wood.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.2, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "chopping", power: 2 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "flintAxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  copper_pickaxe: Item({
    id: itemId("copper_pickaxe"),
    name: "Copper Pickaxe",
    description: "Malleable copper pickaxe. Gleams brightly.",
    rarity: Rarity.Rare,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.7, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "mining", power: 3 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "copperPickaxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  copper_axe: Item({
    id: itemId("copper_axe"),
    name: "Copper Axe",
    description: "A copper woodsman axe with a sharp edge.",
    rarity: Rarity.Rare,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.5, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "chopping", power: 3 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "copperAxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  iron_pickaxe: Item({
    id: itemId("iron_pickaxe"),
    name: "Iron Pickaxe",
    description: "A heavy, professional iron mining tool.",
    rarity: Rarity.Legendary,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 2.2, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "mining", power: 4 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "ironPickaxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  iron_axe: Item({
    id: itemId("iron_axe"),
    name: "Iron Axe",
    description: "Tempered iron head on a sturdy oak shaft.",
    rarity: Rarity.Legendary,
    category: Category.Tool,
    physical: { carryClass: "pack", weight: 1.9, stackLimit: 1 },
  }).with(
    Tool({ toolKind: "chopping", power: 4 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "ironAxe", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  crude_knife: Item({
    id: itemId("crude_knife"),
    name: "Crude Knife",
    description: "A sharp flint bound to a stick with rough fiber.",
    rarity: Rarity.Common,
    category: Category.Tool,
    physical: { carryClass: "pocket", weight: 0.45, stackLimit: 1 },
    visual: { ground: { heightTiles: 0.48 }, equipped: { heightTiles: 0.78 } },
  }).with(
    Tool({ toolKind: "cutting", power: 2 }),
    Weapon({ weaponKind: "knife", damage: 8, damageType: "slash", bleedChancePct: 12, weaponDefId: "weapon.crude_knife" }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "one-handed",
      visualAsset: { textureKey: "crudeKnife", layer: "over", anchorX: 0.3, anchorY: 0.7 }
    })
  ),
  stone_blade: Item({
    id: itemId("stone_blade"),
    name: "Stone Blade",
    description: "A shaped stone edge. Not a knife yet, but it wants to become one.",
    rarity: Rarity.Common,
    category: Category.Component,
    icon: "🔪",
    physical: { carryClass: "pocket", weight: 0.2, stackLimit: 20 },
  }).with(CuttingEdge(2)),
  bone_needle: Item({
    id: itemId("bone_needle"),
    name: "Bone Needle",
    description: "A small sharpened bone tool for stitching hide and wraps.",
    rarity: Rarity.Common,
    category: Category.Tool,
    icon: "🪡",
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 20 },
  }).with(Tool({ toolKind: "sewing", power: 1 })),
  bone_hook: Item({
    id: itemId("bone_hook"),
    name: "Bone Hook",
    description: "A curved bit of bone shaped for catching or fastening.",
    rarity: Rarity.Common,
    category: Category.Tool,
    icon: "🪝",
    physical: { carryClass: "pocket", weight: 0.04, stackLimit: 20 },
  }).with(Tool({ toolKind: "hook", power: 1 })),
  wooden_spear: Item({
    id: itemId("wooden_spear"),
    name: "Wooden Spear",
    description: "A sharpened branch meant to keep teeth farther away from your skin.",
    rarity: Rarity.Common,
    category: Category.Weapon,
    icon: "🪵",
    physical: { carryClass: "haul", weight: 2.0, stackLimit: 1 },
    visual: { ground: { heightTiles: 1.05 }, equipped: { heightTiles: 1.45 } },
  }).with(
    Weapon({ weaponKind: "spear", damage: 10, damageType: "pierce", bleedChancePct: 10, weaponDefId: "weapon.wooden_spear" }),
    ReachWeapon(1),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "woodenSpear", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  hardened_spear: Item({
    id: itemId("hardened_spear"),
    name: "Hardened Spear",
    description: "A wooden spear hardened over flame. Still primitive, less pathetic.",
    rarity: Rarity.Uncommon,
    category: Category.Weapon,
    icon: "🪵",
    physical: { carryClass: "haul", weight: 2.0, stackLimit: 1 },
    visual: { ground: { heightTiles: 1.05 }, equipped: { heightTiles: 1.45 } },
  }).with(
    Weapon({ weaponKind: "spear", damage: 12, damageType: "pierce", bleedChancePct: 12, weaponDefId: "weapon.wooden_spear" }),
    ReachWeapon(1),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "hardenedSpear", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  crude_torch: Item({
    id: itemId("crude_torch"),
    name: "Crude Torch",
    description: "A resin-wrapped stick that gives light and makes some animals rethink things.",
    rarity: Rarity.Common,
    category: Category.Tool,
    icon: "🔥",
    physical: { carryClass: "pack", weight: 0.8, stackLimit: 4 },
  }).with(
    Tool({ toolKind: "light", power: 1 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "one-handed",
      visualAsset: { textureKey: "crudeTorch", layer: "over", anchorX: 0.3, anchorY: 0.7 }
    })
  ),
  copper_lantern: Item({
    id: itemId("copper_lantern"),
    name: "Copper Lantern",
    description: "A polished copper lantern fueled by rendered fat. Burns much cleaner and longer than a torch.",
    rarity: Rarity.Rare,
    category: Category.Tool,
    icon: "🪔",
    physical: { carryClass: "pack", weight: 1.2, stackLimit: 2 },
  }).with(
    Tool({ toolKind: "light", power: 2 }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "one-handed",
      visualAsset: { textureKey: "crudeTorch", layer: "over", anchorX: 0.3, anchorY: 0.7 }
    })
  ),
  copper_spear: Item({
    id: itemId("copper_spear"),
    name: "Copper Spear",
    description: "A copper-headed spear bound to a straight ash shaft. Reaches far and cuts clean.",
    rarity: Rarity.Rare,
    category: Category.Weapon,
    icon: "🔱",
    physical: { carryClass: "haul", weight: 2.4, stackLimit: 1 },
    visual: { ground: { heightTiles: 1.05 }, equipped: { heightTiles: 1.45 } },
  }).with(
    Weapon({ weaponKind: "spear", damage: 18, damageType: "pierce", bleedChancePct: 15, weaponDefId: "weapon.wooden_spear" }),
    ReachWeapon(1),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "two-handed",
      visualAsset: { textureKey: "hardenedSpear", layer: "over", anchorX: 0.2, anchorY: 0.8 }
    })
  ),
  bone_dagger: Item({
    id: itemId("bone_dagger"),
    name: "Bone Dagger",
    description: "A predator fang bound to an antler handle. Fast, lightweight, and vicious.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
    icon: "🗡️",
    physical: { carryClass: "pocket", weight: 0.4, stackLimit: 1 },
    visual: { ground: { heightTiles: 0.48 }, equipped: { heightTiles: 0.78 } },
  }).with(
    Tool({ toolKind: "cutting", power: 3 }),
    Weapon({ weaponKind: "knife", damage: 14, damageType: "pierce", bleedChancePct: 20, weaponDefId: "weapon.crude_knife" }),
    EquippableVisuals({
      slots: ["weapon"],
      handUsage: "one-handed",
      visualAsset: { textureKey: "crudeKnife", layer: "over", anchorX: 0.3, anchorY: 0.7 }
    })
  ),
};
