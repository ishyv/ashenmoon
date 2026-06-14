/**
 * Ashenmoon forest content seed: items and recipes for First Camp / First Hunt.
 *
 * This module intentionally keeps content as data. Game behavior should still be executed
 * by systems: crafting, processing, item exposure, survival, combat, and rendering.
 *
 * Recipes are discovery shortcuts, not permissions. If a player experimentally combines
 * the right inputs in the right context, the system may produce the output and then mark
 * the recipe as discovered.
 *
 * Keep this file readable:
 * - add content in themed sections,
 * - do not place gameplay algorithms here,
 * - prefer traits that systems can interpret generically,
 * - document weird traits or unusual recipes near the data that uses them.
 */

export type AshenmoonRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export type AshenmoonCarryClass = "pocket" | "pack" | "haul";

export type AshenmoonItemCategory =
  | "mineral"
  | "timber"
  | "tool"
  | "weapon"
  | "component"
  | "herb"
  | "reagent"
  | "food"
  | "medicine"
  | "fuel_fire"
  | "container"
  | "clothing"
  | "structure";

export type AshenmoonRecipeCategory =
  | "survival"
  | "tools"
  | "medicine"
  | "food"
  | "fuel_fire"
  | "material_processing"
  | "structures"
  | "containers"
  | "clothing";

export type AshenmoonRecipeContext =
  | "hand"
  | "primitive_work_surface"
  | "campfire"
  | "drying_rack"
  | "meat_smoking_rack";

export type AshenmoonProcessKind =
  | "assemble"
  | "heat"
  | "boil"
  | "burn"
  | "dry"
  | "smoke";

export interface AshenmoonPhysicalProperties {
  carryClass: AshenmoonCarryClass;
  weight: number;
  stackLimit: number;
}

/**
 * Traits describe capabilities and reactions. They do not execute themselves.
 * Systems decide what a trait means in a given context.
 */
export type AshenmoonItemTrait = Readonly<Record<string, unknown> & { kind: string }>;

export interface AshenmoonItemDefinition {
  id: string;
  name: string;
  description: string;
  rarity: AshenmoonRarity;
  category: AshenmoonItemCategory;
  icon: string;
  physical: AshenmoonPhysicalProperties;
  traits: readonly AshenmoonItemTrait[];
}

export interface AshenmoonRecipeCost {
  itemId: string;
  name: string;
  required: number;
}

export interface AshenmoonRecipeOutput {
  itemId: string;
  qty: number;
}

export interface AshenmoonRecipeDefinition {
  id: string;
  name: string;
  description: string;
  category: AshenmoonRecipeCategory;
  requiredContext: AshenmoonRecipeContext;
  process?: AshenmoonProcessKind;
  durationSec?: number;
  discoverable: boolean;
  discoveryText: string;
  costs: readonly AshenmoonRecipeCost[];
  output: AshenmoonRecipeOutput;
}

export const ASHENMOON_FOREST_ITEM_DEFINITIONS = [
  {
    "id": "stick",
    "name": "Stick",
    "description": "A dry branch piece. Useful for fire, handles, and crude tools.",
    "rarity": "common",
    "category": "timber",
    "icon": "🪵",
    "physical": {
      "carryClass": "pack",
      "weight": 0.25,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 180,
        "burnDurationSec": 25,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "twig_bundle",
    "name": "Twig Bundle",
    "description": "A handful of small twigs gathered into a usable bundle of kindling.",
    "rarity": "common",
    "category": "timber",
    "icon": "🪵",
    "physical": {
      "carryClass": "pack",
      "weight": 0.35,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 150,
        "burnDurationSec": 20,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "branch",
    "name": "Branch",
    "description": "A thicker length of wood. Too awkward for pockets, useful for tools and fuel.",
    "rarity": "common",
    "category": "timber",
    "icon": "🌿",
    "physical": {
      "carryClass": "pack",
      "weight": 0.8,
      "stackLimit": 16
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 200,
        "burnDurationSec": 50,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "charcoal",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "firewood_bundle",
    "name": "Firewood Bundle",
    "description": "Several chopped or broken branches tied together for a steadier fire.",
    "rarity": "common",
    "category": "timber",
    "icon": "🪵",
    "physical": {
      "carryClass": "haul",
      "weight": 4.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 220,
        "burnDurationSec": 180,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "charcoal",
            "qty": 2
          }
        ]
      }
    ]
  },
  {
    "id": "dry_leaves",
    "name": "Dry Leaves",
    "description": "Crisp leaves that catch flame easily. Bad near sparks, useful near purpose.",
    "rarity": "common",
    "category": "component",
    "icon": "🍂",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 90,
        "burnDurationSec": 8,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "green_leaves",
    "name": "Green Leaves",
    "description": "Fresh leaves, damp and flexible. Useful for wrapping, padding, and crude medicine.",
    "rarity": "common",
    "category": "herb",
    "icon": "🍃",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "decayable",
        "lifespanSec": 900,
        "effect": [
          {
            "kind": "transform",
            "itemId": "dry_leaves"
          }
        ]
      }
    ]
  },
  {
    "id": "bark_strip",
    "name": "Bark Strip",
    "description": "A peeled strip of bark. Tough enough for binding, marking, and crude containers.",
    "rarity": "common",
    "category": "component",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.15,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 190,
        "burnDurationSec": 35,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "oak_bark",
    "name": "Oak Bark",
    "description": "Rough bark rich with bitter tannins. Useful for hide work and wound washing.",
    "rarity": "common",
    "category": "reagent",
    "icon": "🌳",
    "physical": {
      "carryClass": "pack",
      "weight": 0.2,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "tannin_source",
        "strength": 1
      }
    ]
  },
  {
    "id": "pine_bark",
    "name": "Pine Bark",
    "description": "Resinous bark that burns readily and smells sharp when heated.",
    "rarity": "common",
    "category": "reagent",
    "icon": "🌲",
    "physical": {
      "carryClass": "pack",
      "weight": 0.2,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 160,
        "burnDurationSec": 45,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "grass_fiber",
    "name": "Grass Fiber",
    "description": "Tough strands pulled from long grass. Weak alone, useful when twisted.",
    "rarity": "common",
    "category": "component",
    "icon": "🌾",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 80
    },
    "traits": []
  },
  {
    "id": "reed_stalk",
    "name": "Reed Stalk",
    "description": "A hollow river reed. Light, straight, and useful for small frames or simple tubes.",
    "rarity": "common",
    "category": "component",
    "icon": "🎋",
    "physical": {
      "carryClass": "pack",
      "weight": 0.1,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 130,
        "burnDurationSec": 20,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "vine",
    "name": "Vine",
    "description": "A flexible forest vine. Stronger than grass, worse than proper rope.",
    "rarity": "common",
    "category": "component",
    "icon": "🌿",
    "physical": {
      "carryClass": "pack",
      "weight": 0.25,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 1
      }
    ]
  },
  {
    "id": "moss",
    "name": "Moss",
    "description": "Soft wet moss. Can pad wounds, hold moisture, or help seal gaps.",
    "rarity": "common",
    "category": "component",
    "icon": "🟩",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "absorbent",
        "capacity": 1
      }
    ]
  },
  {
    "id": "tree_resin",
    "name": "Tree Resin",
    "description": "Sticky amber resin. Burns slowly and binds better when warmed.",
    "rarity": "common",
    "category": "reagent",
    "icon": "🟧",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.08,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 120,
        "burnDurationSec": 45,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "soot",
            "qty": 1
          }
        ]
      },
      {
        "kind": "adhesive",
        "strength": 1
      }
    ]
  },
  {
    "id": "pine_cone",
    "name": "Pine Cone",
    "description": "A dry cone of scales and seed. Burns well enough in a pinch.",
    "rarity": "common",
    "category": "component",
    "icon": "🌲",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.08,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 120,
        "burnDurationSec": 18,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "acorn",
    "name": "Acorn",
    "description": "A hard bitter nut. Not pleasant raw, but still food if treated right.",
    "rarity": "common",
    "category": "food",
    "icon": "🌰",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.04,
      "stackLimit": 60
    },
    "traits": [
      {
        "kind": "edible",
        "nutrition": 2,
        "risk": [
          {
            "kind": "stomach_discomfort",
            "chancePct": 8
          }
        ]
      }
    ]
  },
  {
    "id": "wild_berries",
    "name": "Wild Berries",
    "description": "Small dark berries. Sweet enough, but not every bush is your friend.",
    "rarity": "common",
    "category": "food",
    "icon": "🫐",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 3
          },
          {
            "kind": "risk_status",
            "status": "sickness",
            "chancePct": 5
          }
        ]
      }
    ]
  },
  {
    "id": "bitter_mushroom",
    "name": "Bitter Mushroom",
    "description": "A pale forest mushroom with a sharp smell. Food, medicine, or mistake.",
    "rarity": "common",
    "category": "food",
    "icon": "🍄",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 2
          },
          {
            "kind": "risk_status",
            "status": "poison",
            "chancePct": 15
          }
        ]
      }
    ]
  },
  {
    "id": "wild_herb",
    "name": "Wild Herb",
    "description": "A common green herb with a clean scent. Mild, but useful in hot water.",
    "rarity": "common",
    "category": "herb",
    "icon": "🌿",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "medicine_ingredient",
        "use": "basic_poultice"
      }
    ]
  },
  {
    "id": "yarrow",
    "name": "Yarrow",
    "description": "A flowering herb often used to slow bleeding and dress shallow cuts.",
    "rarity": "uncommon",
    "category": "herb",
    "icon": "🌼",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "medicine_ingredient",
        "use": "bleeding"
      }
    ]
  },
  {
    "id": "plantain_leaf",
    "name": "Plantain Leaf",
    "description": "A broad leaf that can soothe scraped skin and wrap small wounds.",
    "rarity": "common",
    "category": "herb",
    "icon": "🍃",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.04,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "medicine_ingredient",
        "use": "poultice"
      }
    ]
  },
  {
    "id": "bitter_root",
    "name": "Bitter Root",
    "description": "A tough root with a harsh taste. Useful in crude tonics.",
    "rarity": "uncommon",
    "category": "herb",
    "icon": "🥔",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.08,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "medicine_ingredient",
        "use": "infection"
      }
    ]
  },
  {
    "id": "wild_root",
    "name": "Wild Root",
    "description": "A fibrous edible root. Better cooked than chewed raw in the dirt like an animal.",
    "rarity": "common",
    "category": "food",
    "icon": "🥔",
    "physical": {
      "carryClass": "pack",
      "weight": 0.15,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "edible",
        "nutrition": 4
      }
    ]
  },
  {
    "id": "nettle",
    "name": "Nettle",
    "description": "Stinging leaves. Irritating by hand, useful when dried or boiled.",
    "rarity": "common",
    "category": "herb",
    "icon": "🌿",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 45
    },
    "traits": [
      {
        "kind": "handling_risk",
        "status": "skin_irritation",
        "chancePct": 10
      },
      {
        "kind": "medicine_ingredient",
        "use": "tonic"
      }
    ]
  },
  {
    "id": "loose_stone",
    "name": "Loose Stone",
    "description": "A plain stone. Heavy enough to strike, wedge, or crush.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🪨",
    "physical": {
      "carryClass": "pack",
      "weight": 0.7,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "blunt_material",
        "hardness": 1
      }
    ]
  },
  {
    "id": "sharp_stone",
    "name": "Sharp Stone",
    "description": "A stone edge sharp enough to cut skin or scrape bark.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🪨",
    "physical": {
      "carryClass": "pack",
      "weight": 0.4,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "cutting_edge",
        "power": 1
      },
      {
        "kind": "handling_risk",
        "status": "cut",
        "chancePct": 8
      }
    ]
  },
  {
    "id": "flint_shard",
    "name": "Flint Shard",
    "description": "A hard shard that can hold a crude edge and throw sparks.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🔪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.15,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "cutting_edge",
        "power": 2
      },
      {
        "kind": "spark_source",
        "strength": 1
      },
      {
        "kind": "handling_risk",
        "status": "cut",
        "chancePct": 10
      }
    ]
  },
  {
    "id": "river_pebble",
    "name": "River Pebble",
    "description": "A smooth stone from running water. Better for grinding than cutting.",
    "rarity": "common",
    "category": "mineral",
    "icon": "⚪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.2,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "grinding_material",
        "smoothness": 1
      }
    ]
  },
  {
    "id": "clay",
    "name": "Clay",
    "description": "Dense wet clay from the riverbank. Shapeable before heat, sturdy after it.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🟤",
    "physical": {
      "carryClass": "pack",
      "weight": 0.6,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "moldable",
        "material": "clay"
      },
      {
        "kind": "temperature_sensitive",
        "minSafeTemp": 0,
        "maxSafeTemp": 1000,
        "effect": {
          "kind": "transform",
          "itemId": "hardened_clay"
        }
      }
    ]
  },
  {
    "id": "mud",
    "name": "Mud",
    "description": "Wet earth. Messy, weak, but useful for sealing and crude construction.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.5,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "wet",
        "amount": 1
      }
    ]
  },
  {
    "id": "sand",
    "name": "Sand",
    "description": "Coarse river sand. Useful for tempering clay and scrubbing surfaces.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🏖️",
    "physical": {
      "carryClass": "pack",
      "weight": 0.4,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "abrasive",
        "strength": 1
      }
    ]
  },
  {
    "id": "dirty_water",
    "name": "Dirty Water",
    "description": "Water taken straight from the wild. It helps thirst, and may punish trust.",
    "rarity": "common",
    "category": "reagent",
    "icon": "💧",
    "physical": {
      "carryClass": "pack",
      "weight": 1.0,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "drink",
        "onConsume": [
          {
            "kind": "restore_thirst",
            "amount": 18
          },
          {
            "kind": "risk_status",
            "status": "sickness",
            "chancePct": 18
          }
        ]
      },
      {
        "kind": "boilable",
        "effect": {
          "kind": "transform",
          "itemId": "boiled_water"
        }
      }
    ]
  },
  {
    "id": "boiled_water",
    "name": "Boiled Water",
    "description": "Water boiled long enough to be safer. Still precious, still ordinary.",
    "rarity": "common",
    "category": "reagent",
    "icon": "♨️",
    "physical": {
      "carryClass": "pack",
      "weight": 1.0,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "drink",
        "onConsume": [
          {
            "kind": "restore_thirst",
            "amount": 24
          }
        ]
      },
      {
        "kind": "sterile_liquid",
        "strength": 1
      }
    ]
  },
  {
    "id": "clean_water",
    "name": "Clean Water",
    "description": "Clear water fit to drink. A small luxury in a filthy place.",
    "rarity": "common",
    "category": "reagent",
    "icon": "💧",
    "physical": {
      "carryClass": "pack",
      "weight": 1.0,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "drink",
        "onConsume": [
          {
            "kind": "restore_thirst",
            "amount": 24
          }
        ]
      },
      {
        "kind": "sterile_liquid",
        "strength": 1
      }
    ]
  },
  {
    "id": "ash",
    "name": "Ash",
    "description": "Powder left by burned things. Useful for paste, cleaning, and crude preservation.",
    "rarity": "common",
    "category": "reagent",
    "icon": "◻️",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.02,
      "stackLimit": 100
    },
    "traits": [
      {
        "kind": "alkaline",
        "strength": 1
      },
      {
        "kind": "drying_agent",
        "strength": 1
      }
    ]
  },
  {
    "id": "soot",
    "name": "Soot",
    "description": "Fine black residue from smoky flame. Good for marks, bad for lungs.",
    "rarity": "common",
    "category": "reagent",
    "icon": "⚫",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.01,
      "stackLimit": 100
    },
    "traits": [
      {
        "kind": "pigment",
        "color": "black"
      }
    ]
  },
  {
    "id": "charcoal",
    "name": "Charcoal",
    "description": "Burned wood that keeps a hotter, steadier heat than raw sticks.",
    "rarity": "common",
    "category": "fuel_fire",
    "icon": "⚫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.2,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "fuel",
        "heat": 2,
        "burnDurationSec": 90
      },
      {
        "kind": "pigment",
        "color": "black"
      }
    ]
  },
  {
    "id": "hardened_clay",
    "name": "Hardened Clay",
    "description": "Clay baked firm enough for crude containers and structures.",
    "rarity": "common",
    "category": "mineral",
    "icon": "🏺",
    "physical": {
      "carryClass": "pack",
      "weight": 1.2,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "temperature_sensitive",
        "minSafeTemp": 0,
        "maxSafeTemp": 1000,
        "effect": {
          "kind": "none"
        }
      }
    ]
  },
  {
    "id": "raw_meat",
    "name": "Raw Meat",
    "description": "Fresh meat cut from an animal. Food eventually, bait immediately.",
    "rarity": "common",
    "category": "food",
    "icon": "🥩",
    "physical": {
      "carryClass": "pack",
      "weight": 0.5,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "decayable",
        "lifespanSec": 600,
        "effect": [
          {
            "kind": "transform",
            "itemId": "spoiled_meat"
          }
        ]
      },
      {
        "kind": "attracts_predators",
        "strength": 2
      }
    ]
  },
  {
    "id": "small_raw_meat",
    "name": "Small Raw Meat",
    "description": "A small strip of meat from a rabbit or similar animal.",
    "rarity": "common",
    "category": "food",
    "icon": "🥩",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.2,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "decayable",
        "lifespanSec": 500,
        "effect": [
          {
            "kind": "transform",
            "itemId": "spoiled_meat"
          }
        ]
      },
      {
        "kind": "attracts_predators",
        "strength": 1
      }
    ]
  },
  {
    "id": "fatty_meat",
    "name": "Fatty Meat",
    "description": "Meat with enough fat to cook well and render into useful grease.",
    "rarity": "common",
    "category": "food",
    "icon": "🥩",
    "physical": {
      "carryClass": "pack",
      "weight": 0.6,
      "stackLimit": 16
    },
    "traits": [
      {
        "kind": "decayable",
        "lifespanSec": 600,
        "effect": [
          {
            "kind": "transform",
            "itemId": "spoiled_meat"
          }
        ]
      },
      {
        "kind": "attracts_predators",
        "strength": 2
      }
    ]
  },
  {
    "id": "spoiled_meat",
    "name": "Spoiled Meat",
    "description": "Meat gone wrong. Still bait. Barely anything else.",
    "rarity": "common",
    "category": "food",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.45,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 2
          },
          {
            "kind": "risk_status",
            "status": "sickness",
            "chancePct": 60
          }
        ]
      },
      {
        "kind": "attracts_predators",
        "strength": 3
      }
    ]
  },
  {
    "id": "cooked_meat",
    "name": "Cooked Meat",
    "description": "Meat cooked over flame. Safer, warmer, and actually food.",
    "rarity": "common",
    "category": "food",
    "icon": "🍖",
    "physical": {
      "carryClass": "pack",
      "weight": 0.45,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 18
          }
        ]
      }
    ]
  },
  {
    "id": "dried_meat",
    "name": "Dried Meat",
    "description": "Meat dried until tough and portable. Not delicious. Effective.",
    "rarity": "common",
    "category": "food",
    "icon": "🥓",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.25,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 12
          }
        ]
      },
      {
        "kind": "preserved_food",
        "durationBonus": 3
      }
    ]
  },
  {
    "id": "smoked_meat",
    "name": "Smoked Meat",
    "description": "Meat preserved with smoke. Better storage, better morale, worse smell for hiding.",
    "rarity": "uncommon",
    "category": "food",
    "icon": "🍖",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.3,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 16
          }
        ]
      },
      {
        "kind": "preserved_food",
        "durationBonus": 4
      }
    ]
  },
  {
    "id": "animal_fat",
    "name": "Animal Fat",
    "description": "Soft fat trimmed from a carcass. Fuel, food, salve base, and smell problem.",
    "rarity": "common",
    "category": "reagent",
    "icon": "🧈",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.15,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 160,
        "burnDurationSec": 35,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "soot",
            "qty": 1
          }
        ]
      },
      {
        "kind": "salve_base",
        "strength": 1
      }
    ]
  },
  {
    "id": "bone",
    "name": "Bone",
    "description": "A cleaned animal bone. Stronger than it looks, and easy to make sharp.",
    "rarity": "common",
    "category": "component",
    "icon": "🦴",
    "physical": {
      "carryClass": "pack",
      "weight": 0.25,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "hard_material",
        "hardness": 1
      }
    ]
  },
  {
    "id": "bone_shard",
    "name": "Bone Shard",
    "description": "A splinter of bone. Sharp enough for needles, hooks, and ugly little tools.",
    "rarity": "common",
    "category": "component",
    "icon": "🦴",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "cutting_edge",
        "power": 1
      },
      {
        "kind": "handling_risk",
        "status": "cut",
        "chancePct": 5
      }
    ]
  },
  {
    "id": "tendon",
    "name": "Tendon",
    "description": "Tough animal tendon. When dried, it becomes strong binding material.",
    "rarity": "common",
    "category": "component",
    "icon": "〰️",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 40
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 2
      },
      {
        "kind": "decayable",
        "lifespanSec": 900,
        "effect": [
          {
            "kind": "transform",
            "itemId": "dried_tendon"
          }
        ]
      }
    ]
  },
  {
    "id": "dried_tendon",
    "name": "Dried Tendon",
    "description": "Dried sinew that binds better than grass or bark.",
    "rarity": "common",
    "category": "component",
    "icon": "〰️",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.04,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 3
      }
    ]
  },
  {
    "id": "raw_hide",
    "name": "Raw Hide",
    "description": "Fresh animal hide. Heavy, wet, and useful if treated before it rots.",
    "rarity": "common",
    "category": "component",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 1.0,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "decayable",
        "lifespanSec": 900,
        "effect": [
          {
            "kind": "transform",
            "itemId": "spoiled_hide"
          }
        ]
      }
    ]
  },
  {
    "id": "spoiled_hide",
    "name": "Spoiled Hide",
    "description": "Rotting hide. It stinks, tears poorly, and invites regret.",
    "rarity": "common",
    "category": "component",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.9,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "attracts_predators",
        "strength": 1
      }
    ]
  },
  {
    "id": "dried_hide",
    "name": "Dried Hide",
    "description": "Hide dried stiff. Better than fresh rot, worse than treated leather.",
    "rarity": "common",
    "category": "component",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.7,
      "stackLimit": 15
    },
    "traits": [
      {
        "kind": "armor_material",
        "protection": 1
      }
    ]
  },
  {
    "id": "cured_hide",
    "name": "Cured Hide",
    "description": "Hide treated with tannins and smoke. Usable for clothing and gear.",
    "rarity": "uncommon",
    "category": "component",
    "icon": "🟫",
    "physical": {
      "carryClass": "pack",
      "weight": 0.65,
      "stackLimit": 15
    },
    "traits": [
      {
        "kind": "armor_material",
        "protection": 2
      },
      {
        "kind": "insulation_material",
        "warmth": 1
      }
    ]
  },
  {
    "id": "rabbit_pelt",
    "name": "Rabbit Pelt",
    "description": "Small soft pelt. Not enough alone, but useful in layers.",
    "rarity": "common",
    "category": "component",
    "icon": "🐇",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.18,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "insulation_material",
        "warmth": 1
      }
    ]
  },
  {
    "id": "deer_hide",
    "name": "Deer Hide",
    "description": "Large hide from a deer. Good base for wraps and shelter work.",
    "rarity": "common",
    "category": "component",
    "icon": "🦌",
    "physical": {
      "carryClass": "pack",
      "weight": 1.2,
      "stackLimit": 8
    },
    "traits": [
      {
        "kind": "insulation_material",
        "warmth": 2
      }
    ]
  },
  {
    "id": "boar_hide",
    "name": "Boar Hide",
    "description": "Tough hide from a boar. Harder to work, better for rough protection.",
    "rarity": "uncommon",
    "category": "component",
    "icon": "🐗",
    "physical": {
      "carryClass": "pack",
      "weight": 1.4,
      "stackLimit": 8
    },
    "traits": [
      {
        "kind": "armor_material",
        "protection": 2
      }
    ]
  },
  {
    "id": "wolf_pelt",
    "name": "Wolf Pelt",
    "description": "Thick predator pelt. Warm, heavy, and not easily taken.",
    "rarity": "uncommon",
    "category": "component",
    "icon": "🐺",
    "physical": {
      "carryClass": "pack",
      "weight": 1.3,
      "stackLimit": 8
    },
    "traits": [
      {
        "kind": "insulation_material",
        "warmth": 3
      }
    ]
  },
  {
    "id": "feather",
    "name": "Feather",
    "description": "A forest feather. Light, useful for arrows later, bedding now.",
    "rarity": "common",
    "category": "component",
    "icon": "🪶",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.01,
      "stackLimit": 80
    },
    "traits": []
  },
  {
    "id": "antler",
    "name": "Antler",
    "description": "Hard branching bone from a deer. Useful for handles and tools.",
    "rarity": "uncommon",
    "category": "component",
    "icon": "🦌",
    "physical": {
      "carryClass": "pack",
      "weight": 0.7,
      "stackLimit": 8
    },
    "traits": [
      {
        "kind": "hard_material",
        "hardness": 2
      }
    ]
  },
  {
    "id": "grass_cord",
    "name": "Grass Cord",
    "description": "Twisted grass fiber. Weak, but much better than loose strands.",
    "rarity": "common",
    "category": "component",
    "icon": "🧵",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 50
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 1
      }
    ]
  },
  {
    "id": "bark_rope",
    "name": "Bark Rope",
    "description": "Bark strips twisted into rough rope. Stiff, scratchy, and useful.",
    "rarity": "common",
    "category": "component",
    "icon": "🪢",
    "physical": {
      "carryClass": "pack",
      "weight": 0.25,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 2
      }
    ]
  },
  {
    "id": "vine_lashing",
    "name": "Vine Lashing",
    "description": "A prepared vine tie for quick construction.",
    "rarity": "common",
    "category": "component",
    "icon": "🪢",
    "physical": {
      "carryClass": "pack",
      "weight": 0.2,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "binding_material",
        "strength": 2
      }
    ]
  },
  {
    "id": "tinder_bundle",
    "name": "Tinder Bundle",
    "description": "Dry leaves, bark fibers, and twigs packed to catch a spark.",
    "rarity": "common",
    "category": "fuel_fire",
    "icon": "🔥",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.1,
      "stackLimit": 25
    },
    "traits": [
      {
        "kind": "flammable",
        "ignitionTemp": 75,
        "burnDurationSec": 12,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "kindling_bundle",
    "name": "Kindling Bundle",
    "description": "Small dry wood prepared to help a fire grow past its first breath.",
    "rarity": "common",
    "category": "fuel_fire",
    "icon": "🪵",
    "physical": {
      "carryClass": "pack",
      "weight": 0.5,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "fuel",
        "heat": 1,
        "burnDurationSec": 45
      }
    ]
  },
  {
    "id": "sealing_paste",
    "name": "Sealing Paste",
    "description": "Mud, ash, and fiber worked into a crude sealant.",
    "rarity": "common",
    "category": "component",
    "icon": "🟤",
    "physical": {
      "carryClass": "pack",
      "weight": 0.4,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "sealant",
        "strength": 1
      }
    ]
  },
  {
    "id": "ash_paste",
    "name": "Ash Paste",
    "description": "Ash mixed with clean water into a harsh cleaning paste.",
    "rarity": "common",
    "category": "medicine",
    "icon": "⚪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.15,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "cleaning_agent",
        "strength": 1
      }
    ]
  },
  {
    "id": "herb_poultice",
    "name": "Herb Poultice",
    "description": "Crushed leaves and herbs packed into a wet dressing.",
    "rarity": "common",
    "category": "medicine",
    "icon": "🌿",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.1,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "apply",
        "onConsume": [
          {
            "kind": "reduce_status",
            "status": "cut",
            "amount": 1
          }
        ]
      }
    ]
  },
  {
    "id": "yarrow_poultice",
    "name": "Yarrow Poultice",
    "description": "A stronger poultice used to slow bleeding from shallow wounds.",
    "rarity": "uncommon",
    "category": "medicine",
    "icon": "🌼",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.1,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "apply",
        "onConsume": [
          {
            "kind": "reduce_status",
            "status": "bleeding",
            "amount": 2
          }
        ]
      }
    ]
  },
  {
    "id": "bitter_tonic",
    "name": "Bitter Tonic",
    "description": "A harsh boiled drink for sickness and infected wounds. Not pleasant. Good.",
    "rarity": "uncommon",
    "category": "medicine",
    "icon": "🧪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.25,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "drink",
        "onConsume": [
          {
            "kind": "reduce_status",
            "status": "sickness",
            "amount": 1
          },
          {
            "kind": "reduce_status",
            "status": "infection",
            "amount": 1
          }
        ]
      }
    ]
  },
  {
    "id": "clean_bandage",
    "name": "Clean Bandage",
    "description": "A cleaner strip for covering cuts. Crude, but not filthy.",
    "rarity": "common",
    "category": "medicine",
    "icon": "🤕",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.05,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "apply",
        "onConsume": [
          {
            "kind": "reduce_status",
            "status": "bleeding",
            "amount": 1
          }
        ]
      }
    ]
  },
  {
    "id": "crude_splint",
    "name": "Crude Splint",
    "description": "A rigid support made from sticks and binding. Better than limping bravely into death.",
    "rarity": "common",
    "category": "medicine",
    "icon": "🪵",
    "physical": {
      "carryClass": "pack",
      "weight": 0.35,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "apply",
        "onConsume": [
          {
            "kind": "reduce_status",
            "status": "sprain",
            "amount": 1
          }
        ]
      }
    ]
  },
  {
    "id": "stone_blade",
    "name": "Stone Blade",
    "description": "A shaped stone edge. Not a knife yet, but it wants to become one.",
    "rarity": "common",
    "category": "component",
    "icon": "🔪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.2,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "cutting_edge",
        "power": 2
      }
    ]
  },
  {
    "id": "bone_needle",
    "name": "Bone Needle",
    "description": "A small sharpened bone tool for stitching hide and wraps.",
    "rarity": "common",
    "category": "tool",
    "icon": "🪡",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.03,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "tool",
        "toolKind": "sewing",
        "power": 1
      }
    ]
  },
  {
    "id": "bone_hook",
    "name": "Bone Hook",
    "description": "A curved bit of bone shaped for catching or fastening.",
    "rarity": "common",
    "category": "tool",
    "icon": "🪝",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.04,
      "stackLimit": 20
    },
    "traits": [
      {
        "kind": "tool",
        "toolKind": "hook",
        "power": 1
      }
    ]
  },
  {
    "id": "crude_knife",
    "name": "Crude Knife",
    "description": "A sharp flint bound to a stick with rough fiber.",
    "rarity": "common",
    "category": "tool",
    "icon": "🔪",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.45,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "tool",
        "toolKind": "cutting",
        "power": 2
      },
      {
        "kind": "weapon",
        "weaponKind": "knife",
        "damage": 8,
        "damageType": "slash",
        "bleedChancePct": 12
      }
    ]
  },
  {
    "id": "stone_axe",
    "name": "Stone Axe",
    "description": "A stone head bound to a wooden handle. Heavy, crude, useful.",
    "rarity": "uncommon",
    "category": "tool",
    "icon": "🪓",
    "physical": {
      "carryClass": "pack",
      "weight": 1.6,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "tool",
        "toolKind": "chopping",
        "power": 2
      },
      {
        "kind": "weapon",
        "weaponKind": "axe",
        "damage": 12,
        "damageType": "slash",
        "bleedChancePct": 8
      }
    ]
  },
  {
    "id": "wooden_spear",
    "name": "Wooden Spear",
    "description": "A sharpened branch meant to keep teeth farther away from your skin.",
    "rarity": "common",
    "category": "weapon",
    "icon": "🪵",
    "physical": {
      "carryClass": "haul",
      "weight": 2.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "weapon",
        "weaponKind": "spear",
        "damage": 10,
        "damageType": "pierce",
        "bleedChancePct": 10
      },
      {
        "kind": "reach_weapon",
        "reach": 1
      }
    ]
  },
  {
    "id": "hardened_spear",
    "name": "Hardened Spear",
    "description": "A wooden spear hardened over flame. Still primitive, less pathetic.",
    "rarity": "uncommon",
    "category": "weapon",
    "icon": "🪵",
    "physical": {
      "carryClass": "haul",
      "weight": 2.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "weapon",
        "weaponKind": "spear",
        "damage": 12,
        "damageType": "pierce",
        "bleedChancePct": 12
      },
      {
        "kind": "reach_weapon",
        "reach": 1
      }
    ]
  },
  {
    "id": "crude_torch",
    "name": "Crude Torch",
    "description": "A resin-wrapped stick that gives light and makes some animals rethink things.",
    "rarity": "common",
    "category": "tool",
    "icon": "🔥",
    "physical": {
      "carryClass": "pack",
      "weight": 0.8,
      "stackLimit": 4
    },
    "traits": [
      {
        "kind": "light_source",
        "radius": 90,
        "durationSec": 120
      },
      {
        "kind": "flammable",
        "ignitionTemp": 80,
        "burnDurationSec": 120,
        "effect": [
          {
            "kind": "create_item",
            "itemId": "ash",
            "qty": 1
          }
        ]
      }
    ]
  },
  {
    "id": "water_skin",
    "name": "Water Skin",
    "description": "A crude hide container for carrying water away from the source.",
    "rarity": "uncommon",
    "category": "container",
    "icon": "💧",
    "physical": {
      "carryClass": "pack",
      "weight": 0.45,
      "stackLimit": 4
    },
    "traits": [
      {
        "kind": "container",
        "liquid": true,
        "capacity": 2
      }
    ]
  },
  {
    "id": "bark_cup",
    "name": "Bark Cup",
    "description": "A folded bark cup. It leaks eventually, because of course it does.",
    "rarity": "common",
    "category": "container",
    "icon": "🥣",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.08,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "container",
        "liquid": true,
        "capacity": 1
      },
      {
        "kind": "decayable",
        "lifespanSec": 600,
        "effect": [
          {
            "kind": "destroy"
          }
        ]
      }
    ]
  },
  {
    "id": "unfired_clay_bowl",
    "name": "Unfired Clay Bowl",
    "description": "A shaped clay bowl. Useful only if it survives heat.",
    "rarity": "common",
    "category": "container",
    "icon": "🥣",
    "physical": {
      "carryClass": "pack",
      "weight": 0.8,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "moldable",
        "material": "clay"
      },
      {
        "kind": "temperature_sensitive",
        "minSafeTemp": 0,
        "maxSafeTemp": 900,
        "effect": {
          "kind": "transform",
          "itemId": "fired_clay_bowl"
        }
      }
    ]
  },
  {
    "id": "fired_clay_bowl",
    "name": "Fired Clay Bowl",
    "description": "A crude fired bowl that can hold water and survive campfire heat.",
    "rarity": "common",
    "category": "container",
    "icon": "🥣",
    "physical": {
      "carryClass": "pack",
      "weight": 0.7,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "container",
        "liquid": true,
        "capacity": 1
      },
      {
        "kind": "heat_safe",
        "maxTemp": 700
      }
    ]
  },
  {
    "id": "unfired_clay_pot",
    "name": "Unfired Clay Pot",
    "description": "A larger shaped clay vessel. Fragile until fired.",
    "rarity": "common",
    "category": "container",
    "icon": "🏺",
    "physical": {
      "carryClass": "pack",
      "weight": 1.5,
      "stackLimit": 5
    },
    "traits": [
      {
        "kind": "moldable",
        "material": "clay"
      },
      {
        "kind": "temperature_sensitive",
        "minSafeTemp": 0,
        "maxSafeTemp": 900,
        "effect": {
          "kind": "transform",
          "itemId": "fired_clay_pot"
        }
      }
    ]
  },
  {
    "id": "fired_clay_pot",
    "name": "Fired Clay Pot",
    "description": "A heavy fired pot for boiling, storing, and making camp feel less doomed.",
    "rarity": "uncommon",
    "category": "container",
    "icon": "🏺",
    "physical": {
      "carryClass": "pack",
      "weight": 1.3,
      "stackLimit": 5
    },
    "traits": [
      {
        "kind": "container",
        "liquid": true,
        "capacity": 3
      },
      {
        "kind": "heat_safe",
        "maxTemp": 700
      }
    ]
  },
  {
    "id": "fiber_wraps",
    "name": "Fiber Wraps",
    "description": "Crude wraps made from plant fiber. Scratchy protection for hands and feet.",
    "rarity": "common",
    "category": "clothing",
    "icon": "🧤",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.15,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "wearable",
        "slot": "hands_or_feet",
        "armor": 1,
        "injuryProtection": 1
      }
    ]
  },
  {
    "id": "hide_footwraps",
    "name": "Hide Footwraps",
    "description": "Simple hide wraps for walking rough ground without feeding it your feet.",
    "rarity": "common",
    "category": "clothing",
    "icon": "🥾",
    "physical": {
      "carryClass": "pack",
      "weight": 0.4,
      "stackLimit": 4
    },
    "traits": [
      {
        "kind": "wearable",
        "slot": "feet",
        "armor": 1,
        "injuryProtection": 2
      }
    ]
  },
  {
    "id": "leather_gloves",
    "name": "Leather Gloves",
    "description": "Rough gloves that make sharp stone and thorny work less stupid.",
    "rarity": "uncommon",
    "category": "clothing",
    "icon": "🧤",
    "physical": {
      "carryClass": "pack",
      "weight": 0.35,
      "stackLimit": 4
    },
    "traits": [
      {
        "kind": "wearable",
        "slot": "hands",
        "armor": 1,
        "injuryProtection": 2
      }
    ]
  },
  {
    "id": "hide_cloak",
    "name": "Hide Cloak",
    "description": "A simple hide cloak for warmth and poor weather.",
    "rarity": "uncommon",
    "category": "clothing",
    "icon": "🧥",
    "physical": {
      "carryClass": "haul",
      "weight": 2.2,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "wearable",
        "slot": "body",
        "insulation": 2,
        "wetnessResistance": 1
      }
    ]
  },
  {
    "id": "fur_lined_wrap",
    "name": "Fur-Lined Wrap",
    "description": "A warm layered wrap made from pelt and hide. Heavy, but night is heavier.",
    "rarity": "uncommon",
    "category": "clothing",
    "icon": "🧣",
    "physical": {
      "carryClass": "pack",
      "weight": 1.2,
      "stackLimit": 3
    },
    "traits": [
      {
        "kind": "wearable",
        "slot": "body",
        "insulation": 3,
        "injuryProtection": 1
      }
    ]
  },
  {
    "id": "campfire_kit",
    "name": "Campfire Kit",
    "description": "Stones, tinder, and fuel arranged for a controlled campfire.",
    "rarity": "common",
    "category": "structure",
    "icon": "🔥",
    "physical": {
      "carryClass": "haul",
      "weight": 3.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "campfire"
      }
    ]
  },
  {
    "id": "primitive_work_surface_kit",
    "name": "Primitive Work Surface Kit",
    "description": "A flat stone and wooden supports for basic crafting work.",
    "rarity": "common",
    "category": "structure",
    "icon": "🪨",
    "physical": {
      "carryClass": "haul",
      "weight": 5.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "primitive_work_surface"
      }
    ]
  },
  {
    "id": "drying_rack_kit",
    "name": "Drying Rack Kit",
    "description": "A simple frame for drying meat, herbs, and hide.",
    "rarity": "common",
    "category": "structure",
    "icon": "🪵",
    "physical": {
      "carryClass": "haul",
      "weight": 4.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "drying_rack"
      }
    ]
  },
  {
    "id": "marker_sign_kit",
    "name": "Marker Sign Kit",
    "description": "A crude sign ready to be placed and carved with player-written text.",
    "rarity": "common",
    "category": "structure",
    "icon": "🪧",
    "physical": {
      "carryClass": "pack",
      "weight": 1.2,
      "stackLimit": 4
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "marker_sign"
      }
    ]
  },
  {
    "id": "crude_shelter_kit",
    "name": "Crude Shelter Kit",
    "description": "A bundled frame for a lean-to shelter. Not comfort. Shelter.",
    "rarity": "common",
    "category": "structure",
    "icon": "⛺",
    "physical": {
      "carryClass": "haul",
      "weight": 6.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "crude_shelter"
      }
    ]
  },
  {
    "id": "storage_pile_kit",
    "name": "Storage Pile Kit",
    "description": "A marked ground pile reinforced with sticks and bark to organize camp storage.",
    "rarity": "common",
    "category": "structure",
    "icon": "📦",
    "physical": {
      "carryClass": "haul",
      "weight": 3.5,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "storage_pile"
      }
    ]
  },
  {
    "id": "spike_barrier_kit",
    "name": "Spike Barrier Kit",
    "description": "Sharpened stakes lashed into a crude barrier against animals.",
    "rarity": "common",
    "category": "structure",
    "icon": "🪵",
    "physical": {
      "carryClass": "haul",
      "weight": 5.5,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "spike_barrier"
      }
    ]
  },
  {
    "id": "rain_catcher_kit",
    "name": "Rain Catcher Kit",
    "description": "A crude frame and hide surface for catching rainwater.",
    "rarity": "uncommon",
    "category": "structure",
    "icon": "💧",
    "physical": {
      "carryClass": "haul",
      "weight": 4.5,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "rain_catcher"
      }
    ]
  },
  {
    "id": "meat_smoking_rack_kit",
    "name": "Meat Smoking Rack Kit",
    "description": "A rack arranged to hold meat in smoke instead of direct flame.",
    "rarity": "uncommon",
    "category": "structure",
    "icon": "🍖",
    "physical": {
      "carryClass": "haul",
      "weight": 4.5,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "meat_smoking_rack"
      }
    ]
  },
  {
    "id": "simple_bedroll",
    "name": "Simple Bedroll",
    "description": "Layered leaves, hide, and fiber. A poor answer to sleeping on cold dirt.",
    "rarity": "common",
    "category": "structure",
    "icon": "🛏️",
    "physical": {
      "carryClass": "haul",
      "weight": 3.0,
      "stackLimit": 1
    },
    "traits": [
      {
        "kind": "placeable",
        "buildableId": "simple_bedroll"
      },
      {
        "kind": "rest_quality",
        "value": 1
      }
    ]
  },
  {
    "id": "bone_broth",
    "name": "Bone Broth",
    "description": "Hot broth from bones and water. Helps hunger and recovery a little.",
    "rarity": "common",
    "category": "food",
    "icon": "🍲",
    "physical": {
      "carryClass": "pack",
      "weight": 0.8,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "drink",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 10
          },
          {
            "kind": "restore_stamina",
            "amount": 5
          }
        ]
      }
    ]
  },
  {
    "id": "roasted_root",
    "name": "Roasted Root",
    "description": "A cooked wild root. Plain, filling, and unlikely to betray you.",
    "rarity": "common",
    "category": "food",
    "icon": "🥔",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.12,
      "stackLimit": 30
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 8
          }
        ]
      }
    ]
  },
  {
    "id": "roasted_acorns",
    "name": "Roasted Acorns",
    "description": "Bitter acorns made less awful by heat.",
    "rarity": "common",
    "category": "food",
    "icon": "🌰",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.04,
      "stackLimit": 60
    },
    "traits": [
      {
        "kind": "consumable",
        "verb": "eat",
        "onConsume": [
          {
            "kind": "restore_hunger",
            "amount": 3
          }
        ]
      }
    ]
  },
  {
    "id": "dried_herbs",
    "name": "Dried Herbs",
    "description": "Herbs dried for storage and stronger brewing.",
    "rarity": "common",
    "category": "herb",
    "icon": "🌿",
    "physical": {
      "carryClass": "pocket",
      "weight": 0.02,
      "stackLimit": 60
    },
    "traits": [
      {
        "kind": "medicine_ingredient",
        "use": "tonic",
        "strength": 2
      }
    ]
  },
  {
    "id": "tannin_brew",
    "name": "Tannin Brew",
    "description": "A bitter bark brew used for crude hide curing and wound washing.",
    "rarity": "common",
    "category": "reagent",
    "icon": "🧪",
    "physical": {
      "carryClass": "pack",
      "weight": 0.8,
      "stackLimit": 10
    },
    "traits": [
      {
        "kind": "tannin_solution",
        "strength": 1
      },
      {
        "kind": "cleaning_agent",
        "strength": 1
      }
    ]
  }
] as const satisfies readonly AshenmoonItemDefinition[];

export const ASHENMOON_FOREST_RECIPES = [
  {
    "id": "twist_grass_cord",
    "name": "Twist Grass Cord",
    "description": "You twist loose grass fibers into a cord that can actually hold something.",
    "category": "material_processing",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You twist loose grass fibers into a cord that can actually hold something.",
    "costs": [
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 3
      }
    ],
    "output": {
      "itemId": "grass_cord",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 4
  },
  {
    "id": "twist_bark_rope",
    "name": "Twist Bark Rope",
    "description": "You work bark strips into a rough rope.",
    "category": "material_processing",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You work bark strips into a rough rope.",
    "costs": [
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 3
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bark_rope",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 8
  },
  {
    "id": "prepare_vine_lashing",
    "name": "Prepare Vine Lashing",
    "description": "You cut and bend the vine into a quick construction tie.",
    "category": "material_processing",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You cut and bend the vine into a quick construction tie.",
    "costs": [
      {
        "itemId": "vine",
        "name": "vine",
        "required": 1
      }
    ],
    "output": {
      "itemId": "vine_lashing",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 3
  },
  {
    "id": "bundle_tinder",
    "name": "Bundle Tinder",
    "description": "You pack dry leaves and shredded bark into tinder that wants to catch sparks.",
    "category": "fuel_fire",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You pack dry leaves and shredded bark into tinder that wants to catch sparks.",
    "costs": [
      {
        "itemId": "dry_leaves",
        "name": "dry leaves",
        "required": 4
      },
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 1
      },
      {
        "itemId": "twig_bundle",
        "name": "twig bundle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "tinder_bundle",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 5
  },
  {
    "id": "bundle_kindling",
    "name": "Bundle Kindling",
    "description": "You prepare smaller wood so a new fire does not die immediately.",
    "category": "fuel_fire",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You prepare smaller wood so a new fire does not die immediately.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 3
      },
      {
        "itemId": "twig_bundle",
        "name": "twig bundle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "kindling_bundle",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 5
  },
  {
    "id": "fold_bark_cup",
    "name": "Fold Bark Cup",
    "description": "You fold bark into a crude cup. It will not win awards. It may hold water.",
    "category": "containers",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You fold bark into a crude cup. It will not win awards. It may hold water.",
    "costs": [
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 2
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 1
      },
      {
        "itemId": "tree_resin",
        "name": "tree resin",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bark_cup",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 8
  },
  {
    "id": "fiber_wraps",
    "name": "Fiber Wraps",
    "description": "You bind plant fiber into rough protective wraps.",
    "category": "clothing",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You bind plant fiber into rough protective wraps.",
    "costs": [
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 6
      },
      {
        "itemId": "green_leaves",
        "name": "green leaves",
        "required": 2
      }
    ],
    "output": {
      "itemId": "fiber_wraps",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "shape_stone_blade",
    "name": "Shape Stone Blade",
    "description": "You strike and scrape stone until one edge becomes useful.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You strike and scrape stone until one edge becomes useful.",
    "costs": [
      {
        "itemId": "flint_shard",
        "name": "flint shard",
        "required": 1
      },
      {
        "itemId": "river_pebble",
        "name": "river pebble",
        "required": 1
      }
    ],
    "output": {
      "itemId": "stone_blade",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "crude_knife",
    "name": "Crude Knife",
    "description": "You bind a flint edge to a stick with rough cord.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You bind a flint edge to a stick with rough cord.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 1
      },
      {
        "itemId": "flint_shard",
        "name": "flint shard",
        "required": 1
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 2
      }
    ],
    "output": {
      "itemId": "crude_knife",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 15
  },
  {
    "id": "stone_axe",
    "name": "Stone Axe",
    "description": "You wedge a stone blade into a branch and lash it tight.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You wedge a stone blade into a branch and lash it tight.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 1
      },
      {
        "itemId": "stone_blade",
        "name": "stone blade",
        "required": 1
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 1
      },
      {
        "itemId": "tree_resin",
        "name": "tree resin",
        "required": 1
      }
    ],
    "output": {
      "itemId": "stone_axe",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 25
  },
  {
    "id": "wooden_spear",
    "name": "Wooden Spear",
    "description": "You sharpen a long branch into a weapon meant for distance.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You sharpen a long branch into a weapon meant for distance.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 2
      },
      {
        "itemId": "sharp_stone",
        "name": "sharp stone",
        "required": 1
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 1
      }
    ],
    "output": {
      "itemId": "wooden_spear",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 18
  },
  {
    "id": "hardened_spear",
    "name": "Hardened Spear",
    "description": "You finish a spear point with heat and scraping until it holds better.",
    "category": "tools",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You finish a spear point with heat and scraping until it holds better.",
    "costs": [
      {
        "itemId": "wooden_spear",
        "name": "wooden spear",
        "required": 1
      },
      {
        "itemId": "charcoal",
        "name": "charcoal",
        "required": 1
      }
    ],
    "output": {
      "itemId": "hardened_spear",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 30
  },
  {
    "id": "bone_needle",
    "name": "Bone Needle",
    "description": "You scrape a bone shard into a needle for hidework.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You scrape a bone shard into a needle for hidework.",
    "costs": [
      {
        "itemId": "bone_shard",
        "name": "bone shard",
        "required": 1
      },
      {
        "itemId": "river_pebble",
        "name": "river pebble",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bone_needle",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 12
  },
  {
    "id": "bone_hook",
    "name": "Bone Hook",
    "description": "You carve a bone shard into a small hook.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You carve a bone shard into a small hook.",
    "costs": [
      {
        "itemId": "bone_shard",
        "name": "bone shard",
        "required": 1
      },
      {
        "itemId": "sharp_stone",
        "name": "sharp stone",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bone_hook",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "crude_torch",
    "name": "Crude Torch",
    "description": "You wrap resin and bark around a stick to carry fire with you.",
    "category": "tools",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You wrap resin and bark around a stick to carry fire with you.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 1
      },
      {
        "itemId": "tree_resin",
        "name": "tree resin",
        "required": 2
      },
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 1
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 1
      }
    ],
    "output": {
      "itemId": "crude_torch",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 12
  },
  {
    "id": "clean_bandage",
    "name": "Clean Bandage",
    "description": "You clean and fold plant material into something safe enough for a wound.",
    "category": "medicine",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You clean and fold plant material into something safe enough for a wound.",
    "costs": [
      {
        "itemId": "green_leaves",
        "name": "green leaves",
        "required": 3
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      },
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 2
      }
    ],
    "output": {
      "itemId": "clean_bandage",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 15
  },
  {
    "id": "crude_splint",
    "name": "Crude Splint",
    "description": "You bind sticks into a rigid support for a bad limb.",
    "category": "medicine",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You bind sticks into a rigid support for a bad limb.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 2
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 2
      },
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 1
      }
    ],
    "output": {
      "itemId": "crude_splint",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 12
  },
  {
    "id": "hide_footwraps",
    "name": "Hide Footwraps",
    "description": "You stitch hide into rough protection for your feet.",
    "category": "clothing",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You stitch hide into rough protection for your feet.",
    "costs": [
      {
        "itemId": "dried_hide",
        "name": "dried hide",
        "required": 1
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 2
      },
      {
        "itemId": "bone_needle",
        "name": "bone needle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "hide_footwraps",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 25
  },
  {
    "id": "leather_gloves",
    "name": "Leather Gloves",
    "description": "You stitch cured hide into crude hand protection.",
    "category": "clothing",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You stitch cured hide into crude hand protection.",
    "costs": [
      {
        "itemId": "cured_hide",
        "name": "cured hide",
        "required": 1
      },
      {
        "itemId": "dried_tendon",
        "name": "dried tendon",
        "required": 1
      },
      {
        "itemId": "bone_needle",
        "name": "bone needle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "leather_gloves",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 30
  },
  {
    "id": "hide_cloak",
    "name": "Hide Cloak",
    "description": "You join larger hide pieces into a cloak against cold nights.",
    "category": "clothing",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You join larger hide pieces into a cloak against cold nights.",
    "costs": [
      {
        "itemId": "deer_hide",
        "name": "deer hide",
        "required": 1
      },
      {
        "itemId": "dried_hide",
        "name": "dried hide",
        "required": 1
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 1
      },
      {
        "itemId": "bone_needle",
        "name": "bone needle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "hide_cloak",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 45
  },
  {
    "id": "fur_lined_wrap",
    "name": "Fur-Lined Wrap",
    "description": "You layer warm pelt against hide to keep the cold from chewing so deeply.",
    "category": "clothing",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You layer warm pelt against hide to keep the cold from chewing so deeply.",
    "costs": [
      {
        "itemId": "wolf_pelt",
        "name": "wolf pelt",
        "required": 1
      },
      {
        "itemId": "cured_hide",
        "name": "cured hide",
        "required": 1
      },
      {
        "itemId": "dried_tendon",
        "name": "dried tendon",
        "required": 2
      },
      {
        "itemId": "bone_needle",
        "name": "bone needle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "fur_lined_wrap",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 50
  },
  {
    "id": "water_skin",
    "name": "Water Skin",
    "description": "You seal a hide pouch into a crude water carrier.",
    "category": "containers",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You seal a hide pouch into a crude water carrier.",
    "costs": [
      {
        "itemId": "cured_hide",
        "name": "cured hide",
        "required": 1
      },
      {
        "itemId": "sealing_paste",
        "name": "sealing paste",
        "required": 1
      },
      {
        "itemId": "dried_tendon",
        "name": "dried tendon",
        "required": 1
      }
    ],
    "output": {
      "itemId": "water_skin",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 35
  },
  {
    "id": "unfired_clay_bowl",
    "name": "Shape Clay Bowl",
    "description": "You shape clay into a small bowl fit for firing.",
    "category": "containers",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You shape clay into a small bowl fit for firing.",
    "costs": [
      {
        "itemId": "clay",
        "name": "clay",
        "required": 2
      },
      {
        "itemId": "sand",
        "name": "sand",
        "required": 1
      }
    ],
    "output": {
      "itemId": "unfired_clay_bowl",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 18
  },
  {
    "id": "unfired_clay_pot",
    "name": "Shape Clay Pot",
    "description": "You shape clay into a larger vessel that can become useful after heat.",
    "category": "containers",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You shape clay into a larger vessel that can become useful after heat.",
    "costs": [
      {
        "itemId": "clay",
        "name": "clay",
        "required": 4
      },
      {
        "itemId": "sand",
        "name": "sand",
        "required": 2
      },
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 1
      }
    ],
    "output": {
      "itemId": "unfired_clay_pot",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 30
  },
  {
    "id": "boiled_water_from_dirty",
    "name": "Boil Dirty Water",
    "description": "The heat drives the worst of the water's filth away.",
    "category": "survival",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "The heat drives the worst of the water's filth away.",
    "costs": [
      {
        "itemId": "dirty_water",
        "name": "dirty water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "boiled_water",
      "qty": 1
    },
    "process": "boil",
    "durationSec": 25
  },
  {
    "id": "cook_raw_meat",
    "name": "Cook Raw Meat",
    "description": "You cook meat until it becomes safer food instead of a gamble.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You cook meat until it becomes safer food instead of a gamble.",
    "costs": [
      {
        "itemId": "raw_meat",
        "name": "raw meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "cooked_meat",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 20
  },
  {
    "id": "cook_small_meat",
    "name": "Cook Small Raw Meat",
    "description": "You cook a small strip of meat quickly over flame.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You cook a small strip of meat quickly over flame.",
    "costs": [
      {
        "itemId": "small_raw_meat",
        "name": "small raw meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "cooked_meat",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 14
  },
  {
    "id": "cook_fatty_meat",
    "name": "Cook Fatty Meat",
    "description": "You render some fat while cooking the meat.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You render some fat while cooking the meat.",
    "costs": [
      {
        "itemId": "fatty_meat",
        "name": "fatty meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "cooked_meat",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 22
  },
  {
    "id": "roast_wild_root",
    "name": "Roast Wild Root",
    "description": "You roast the root until it softens enough to be decent food.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You roast the root until it softens enough to be decent food.",
    "costs": [
      {
        "itemId": "wild_root",
        "name": "wild root",
        "required": 1
      }
    ],
    "output": {
      "itemId": "roasted_root",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 18
  },
  {
    "id": "roast_acorns",
    "name": "Roast Acorns",
    "description": "You roast acorns until some of the bitterness gives up.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You roast acorns until some of the bitterness gives up.",
    "costs": [
      {
        "itemId": "acorn",
        "name": "acorn",
        "required": 4
      }
    ],
    "output": {
      "itemId": "roasted_acorns",
      "qty": 4
    },
    "process": "heat",
    "durationSec": 16
  },
  {
    "id": "make_charcoal_from_branch",
    "name": "Char Branch",
    "description": "You burn wood low and slow enough to leave useful charcoal.",
    "category": "fuel_fire",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You burn wood low and slow enough to leave useful charcoal.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 1
      }
    ],
    "output": {
      "itemId": "charcoal",
      "qty": 1
    },
    "process": "burn",
    "durationSec": 40
  },
  {
    "id": "make_charcoal_from_firewood",
    "name": "Char Firewood",
    "description": "You reduce a firewood bundle into usable charcoal.",
    "category": "fuel_fire",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You reduce a firewood bundle into usable charcoal.",
    "costs": [
      {
        "itemId": "firewood_bundle",
        "name": "firewood bundle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "charcoal",
      "qty": 3
    },
    "process": "burn",
    "durationSec": 75
  },
  {
    "id": "make_ash_from_leaves",
    "name": "Burn Leaves To Ash",
    "description": "Dry leaves flare quickly and collapse into ash.",
    "category": "material_processing",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "Dry leaves flare quickly and collapse into ash.",
    "costs": [
      {
        "itemId": "dry_leaves",
        "name": "dry leaves",
        "required": 5
      }
    ],
    "output": {
      "itemId": "ash",
      "qty": 2
    },
    "process": "burn",
    "durationSec": 8
  },
  {
    "id": "render_animal_fat",
    "name": "Render Animal Fat",
    "description": "You heat fat until it becomes a usable base for salves and fire.",
    "category": "material_processing",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You heat fat until it becomes a usable base for salves and fire.",
    "costs": [
      {
        "itemId": "fatty_meat",
        "name": "fatty meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "animal_fat",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 25
  },
  {
    "id": "bone_broth",
    "name": "Bone Broth",
    "description": "You boil bones in water until the pot gives you something warm back.",
    "category": "food",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You boil bones in water until the pot gives you something warm back.",
    "costs": [
      {
        "itemId": "bone",
        "name": "bone",
        "required": 2
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bone_broth",
      "qty": 1
    },
    "process": "boil",
    "durationSec": 45
  },
  {
    "id": "tannin_brew",
    "name": "Tannin Brew",
    "description": "You boil oak bark into a bitter liquid for treating hides and washing wounds.",
    "category": "material_processing",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You boil oak bark into a bitter liquid for treating hides and washing wounds.",
    "costs": [
      {
        "itemId": "oak_bark",
        "name": "oak bark",
        "required": 2
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "tannin_brew",
      "qty": 1
    },
    "process": "boil",
    "durationSec": 35
  },
  {
    "id": "fire_clay_bowl",
    "name": "Fire Clay Bowl",
    "description": "You bake the shaped bowl until it hardens into a real vessel.",
    "category": "containers",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You bake the shaped bowl until it hardens into a real vessel.",
    "costs": [
      {
        "itemId": "unfired_clay_bowl",
        "name": "unfired clay bowl",
        "required": 1
      }
    ],
    "output": {
      "itemId": "fired_clay_bowl",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 60
  },
  {
    "id": "fire_clay_pot",
    "name": "Fire Clay Pot",
    "description": "You bake the shaped pot until it can survive actual use.",
    "category": "containers",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You bake the shaped pot until it can survive actual use.",
    "costs": [
      {
        "itemId": "unfired_clay_pot",
        "name": "unfired clay pot",
        "required": 1
      }
    ],
    "output": {
      "itemId": "fired_clay_pot",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 90
  },
  {
    "id": "harden_clay",
    "name": "Harden Clay",
    "description": "Loose clay bakes into a harder, less forgiving material.",
    "category": "material_processing",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "Loose clay bakes into a harder, less forgiving material.",
    "costs": [
      {
        "itemId": "clay",
        "name": "clay",
        "required": 1
      }
    ],
    "output": {
      "itemId": "hardened_clay",
      "qty": 1
    },
    "process": "heat",
    "durationSec": 40
  },
  {
    "id": "ash_paste",
    "name": "Ash Paste",
    "description": "You mix ash with boiled water into a harsh cleaning paste.",
    "category": "medicine",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You mix ash with boiled water into a harsh cleaning paste.",
    "costs": [
      {
        "itemId": "ash",
        "name": "ash",
        "required": 2
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "ash_paste",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 8
  },
  {
    "id": "sealing_paste",
    "name": "Sealing Paste",
    "description": "You work mud, ash, and fiber into something that can seal gaps.",
    "category": "material_processing",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You work mud, ash, and fiber into something that can seal gaps.",
    "costs": [
      {
        "itemId": "mud",
        "name": "mud",
        "required": 1
      },
      {
        "itemId": "ash",
        "name": "ash",
        "required": 1
      },
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 2
      }
    ],
    "output": {
      "itemId": "sealing_paste",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "herb_poultice",
    "name": "Herb Poultice",
    "description": "You crush herbs and leaves into a wet dressing for cuts.",
    "category": "medicine",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You crush herbs and leaves into a wet dressing for cuts.",
    "costs": [
      {
        "itemId": "wild_herb",
        "name": "wild herb",
        "required": 2
      },
      {
        "itemId": "plantain_leaf",
        "name": "plantain leaf",
        "required": 1
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "herb_poultice",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 12
  },
  {
    "id": "yarrow_poultice",
    "name": "Yarrow Poultice",
    "description": "You pack yarrow into a stronger dressing for bleeding.",
    "category": "medicine",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You pack yarrow into a stronger dressing for bleeding.",
    "costs": [
      {
        "itemId": "yarrow",
        "name": "yarrow",
        "required": 2
      },
      {
        "itemId": "clean_bandage",
        "name": "clean bandage",
        "required": 1
      }
    ],
    "output": {
      "itemId": "yarrow_poultice",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "bitter_tonic",
    "name": "Bitter Tonic",
    "description": "You boil bitter roots and herbs into a medicine that tastes like punishment.",
    "category": "medicine",
    "requiredContext": "campfire",
    "discoverable": true,
    "discoveryText": "You boil bitter roots and herbs into a medicine that tastes like punishment.",
    "costs": [
      {
        "itemId": "bitter_root",
        "name": "bitter root",
        "required": 1
      },
      {
        "itemId": "nettle",
        "name": "nettle",
        "required": 1
      },
      {
        "itemId": "boiled_water",
        "name": "boiled water",
        "required": 1
      }
    ],
    "output": {
      "itemId": "bitter_tonic",
      "qty": 1
    },
    "process": "boil",
    "durationSec": 30
  },
  {
    "id": "dry_raw_meat",
    "name": "Dry Raw Meat",
    "description": "Air slowly pulls moisture from the meat, making it last longer.",
    "category": "food",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "Air slowly pulls moisture from the meat, making it last longer.",
    "costs": [
      {
        "itemId": "raw_meat",
        "name": "raw meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "dried_meat",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 120
  },
  {
    "id": "dry_small_meat",
    "name": "Dry Small Raw Meat",
    "description": "Small cuts dry faster and become portable food.",
    "category": "food",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "Small cuts dry faster and become portable food.",
    "costs": [
      {
        "itemId": "small_raw_meat",
        "name": "small raw meat",
        "required": 1
      }
    ],
    "output": {
      "itemId": "dried_meat",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 90
  },
  {
    "id": "dry_herbs",
    "name": "Dry Herbs",
    "description": "You dry herbs so they keep longer and brew stronger.",
    "category": "medicine",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "You dry herbs so they keep longer and brew stronger.",
    "costs": [
      {
        "itemId": "wild_herb",
        "name": "wild herb",
        "required": 3
      }
    ],
    "output": {
      "itemId": "dried_herbs",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 90
  },
  {
    "id": "dry_tendon",
    "name": "Dry Tendon",
    "description": "The tendon tightens into stronger binding material as it dries.",
    "category": "material_processing",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "The tendon tightens into stronger binding material as it dries.",
    "costs": [
      {
        "itemId": "tendon",
        "name": "tendon",
        "required": 1
      }
    ],
    "output": {
      "itemId": "dried_tendon",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 120
  },
  {
    "id": "dry_raw_hide",
    "name": "Dry Raw Hide",
    "description": "You stretch and dry hide before rot claims it.",
    "category": "material_processing",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "You stretch and dry hide before rot claims it.",
    "costs": [
      {
        "itemId": "raw_hide",
        "name": "raw hide",
        "required": 1
      }
    ],
    "output": {
      "itemId": "dried_hide",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 180
  },
  {
    "id": "cure_hide",
    "name": "Cure Hide",
    "description": "You treat dried hide with tannins and smoke until it becomes more useful.",
    "category": "material_processing",
    "requiredContext": "drying_rack",
    "discoverable": true,
    "discoveryText": "You treat dried hide with tannins and smoke until it becomes more useful.",
    "costs": [
      {
        "itemId": "dried_hide",
        "name": "dried hide",
        "required": 1
      },
      {
        "itemId": "tannin_brew",
        "name": "tannin brew",
        "required": 1
      }
    ],
    "output": {
      "itemId": "cured_hide",
      "qty": 1
    },
    "process": "dry",
    "durationSec": 220
  },
  {
    "id": "smoke_meat",
    "name": "Smoke Meat",
    "description": "You preserve meat in smoke instead of letting the forest take it back.",
    "category": "food",
    "requiredContext": "meat_smoking_rack",
    "discoverable": true,
    "discoveryText": "You preserve meat in smoke instead of letting the forest take it back.",
    "costs": [
      {
        "itemId": "raw_meat",
        "name": "raw meat",
        "required": 1
      },
      {
        "itemId": "charcoal",
        "name": "charcoal",
        "required": 1
      }
    ],
    "output": {
      "itemId": "smoked_meat",
      "qty": 1
    },
    "process": "smoke",
    "durationSec": 160
  },
  {
    "id": "smoke_small_meat",
    "name": "Smoke Small Meat",
    "description": "You smoke small cuts into better trail food.",
    "category": "food",
    "requiredContext": "meat_smoking_rack",
    "discoverable": true,
    "discoveryText": "You smoke small cuts into better trail food.",
    "costs": [
      {
        "itemId": "small_raw_meat",
        "name": "small raw meat",
        "required": 1
      },
      {
        "itemId": "charcoal",
        "name": "charcoal",
        "required": 1
      }
    ],
    "output": {
      "itemId": "smoked_meat",
      "qty": 1
    },
    "process": "smoke",
    "durationSec": 120
  },
  {
    "id": "campfire_kit",
    "name": "Campfire Kit",
    "description": "You arrange stones, tinder, and fuel into a place where fire can be controlled.",
    "category": "structures",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You arrange stones, tinder, and fuel into a place where fire can be controlled.",
    "costs": [
      {
        "itemId": "loose_stone",
        "name": "loose stone",
        "required": 6
      },
      {
        "itemId": "tinder_bundle",
        "name": "tinder bundle",
        "required": 1
      },
      {
        "itemId": "kindling_bundle",
        "name": "kindling bundle",
        "required": 1
      }
    ],
    "output": {
      "itemId": "campfire_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 12
  },
  {
    "id": "primitive_work_surface_kit",
    "name": "Primitive Work Surface Kit",
    "description": "You prepare a stable surface for cutting, binding, and shaping.",
    "category": "structures",
    "requiredContext": "hand",
    "discoverable": true,
    "discoveryText": "You prepare a stable surface for cutting, binding, and shaping.",
    "costs": [
      {
        "itemId": "loose_stone",
        "name": "loose stone",
        "required": 2
      },
      {
        "itemId": "branch",
        "name": "branch",
        "required": 2
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 1
      }
    ],
    "output": {
      "itemId": "primitive_work_surface_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 18
  },
  {
    "id": "drying_rack_kit",
    "name": "Drying Rack Kit",
    "description": "You lash branches into a frame for air and time to work.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You lash branches into a frame for air and time to work.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 4
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 3
      },
      {
        "itemId": "stick",
        "name": "stick",
        "required": 4
      }
    ],
    "output": {
      "itemId": "drying_rack_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 25
  },
  {
    "id": "marker_sign_kit",
    "name": "Marker Sign Kit",
    "description": "You make a sign that can hold a short player-written message.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You make a sign that can hold a short player-written message.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 1
      },
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 2
      },
      {
        "itemId": "charcoal",
        "name": "charcoal",
        "required": 1
      }
    ],
    "output": {
      "itemId": "marker_sign_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 10
  },
  {
    "id": "crude_shelter_kit",
    "name": "Crude Shelter Kit",
    "description": "You bundle the frame and covering needed for a crude lean-to.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You bundle the frame and covering needed for a crude lean-to.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 5
      },
      {
        "itemId": "green_leaves",
        "name": "green leaves",
        "required": 8
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 2
      },
      {
        "itemId": "vine_lashing",
        "name": "vine lashing",
        "required": 2
      }
    ],
    "output": {
      "itemId": "crude_shelter_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 45
  },
  {
    "id": "storage_pile_kit",
    "name": "Storage Pile Kit",
    "description": "You mark and reinforce a place for camp storage.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You mark and reinforce a place for camp storage.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 3
      },
      {
        "itemId": "bark_strip",
        "name": "bark strip",
        "required": 4
      },
      {
        "itemId": "vine_lashing",
        "name": "vine lashing",
        "required": 2
      }
    ],
    "output": {
      "itemId": "storage_pile_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 25
  },
  {
    "id": "spike_barrier_kit",
    "name": "Spike Barrier Kit",
    "description": "You sharpen stakes and lash them into an ugly argument against teeth.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You sharpen stakes and lash them into an ugly argument against teeth.",
    "costs": [
      {
        "itemId": "stick",
        "name": "stick",
        "required": 8
      },
      {
        "itemId": "branch",
        "name": "branch",
        "required": 3
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 2
      },
      {
        "itemId": "sharp_stone",
        "name": "sharp stone",
        "required": 1
      }
    ],
    "output": {
      "itemId": "spike_barrier_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 40
  },
  {
    "id": "rain_catcher_kit",
    "name": "Rain Catcher Kit",
    "description": "You stretch hide over a frame to catch what the sky gives.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You stretch hide over a frame to catch what the sky gives.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 4
      },
      {
        "itemId": "cured_hide",
        "name": "cured hide",
        "required": 1
      },
      {
        "itemId": "bark_rope",
        "name": "bark rope",
        "required": 2
      },
      {
        "itemId": "sealing_paste",
        "name": "sealing paste",
        "required": 1
      }
    ],
    "output": {
      "itemId": "rain_catcher_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 40
  },
  {
    "id": "meat_smoking_rack_kit",
    "name": "Meat Smoking Rack Kit",
    "description": "You prepare a rack that feeds smoke around meat instead of burning it.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You prepare a rack that feeds smoke around meat instead of burning it.",
    "costs": [
      {
        "itemId": "branch",
        "name": "branch",
        "required": 5
      },
      {
        "itemId": "grass_cord",
        "name": "grass cord",
        "required": 4
      },
      {
        "itemId": "clay",
        "name": "clay",
        "required": 2
      },
      {
        "itemId": "loose_stone",
        "name": "loose stone",
        "required": 4
      }
    ],
    "output": {
      "itemId": "meat_smoking_rack_kit",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 45
  },
  {
    "id": "simple_bedroll",
    "name": "Simple Bedroll",
    "description": "You layer leaves and hide into something better than cold dirt.",
    "category": "structures",
    "requiredContext": "primitive_work_surface",
    "discoverable": true,
    "discoveryText": "You layer leaves and hide into something better than cold dirt.",
    "costs": [
      {
        "itemId": "dried_hide",
        "name": "dried hide",
        "required": 1
      },
      {
        "itemId": "green_leaves",
        "name": "green leaves",
        "required": 8
      },
      {
        "itemId": "grass_fiber",
        "name": "grass fiber",
        "required": 6
      },
      {
        "itemId": "feather",
        "name": "feather",
        "required": 4
      }
    ],
    "output": {
      "itemId": "simple_bedroll",
      "qty": 1
    },
    "process": "assemble",
    "durationSec": 30
  }
] as const satisfies readonly AshenmoonRecipeDefinition[];

export const ASHENMOON_FOREST_ITEM_BY_ID = Object.fromEntries(
  ASHENMOON_FOREST_ITEM_DEFINITIONS.map((item) => [item.id, item]),
) as Record<string, (typeof ASHENMOON_FOREST_ITEM_DEFINITIONS)[number]>;

export const ASHENMOON_FOREST_RECIPE_BY_ID = Object.fromEntries(
  ASHENMOON_FOREST_RECIPES.map((recipe) => [recipe.id, recipe]),
) as Record<string, (typeof ASHENMOON_FOREST_RECIPES)[number]>;

export const ASHENMOON_FOREST_CONTENT_COUNTS = {
  items: ASHENMOON_FOREST_ITEM_DEFINITIONS.length,
  recipes: ASHENMOON_FOREST_RECIPES.length,
} as const;
