import { Category, Rarity, itemId, type LegacyItemMetadata, type ItemDefinition } from "./item-types";
import { Item } from "./item-builder";
import { defineItems } from "./item-registry";
import { buildItemTraitIndex } from "./item-validation";
import { AddStatus, ChanceOf, ClearAllStatuses, RestoreHp, RestoreThirst, TransformInto } from "./item-effects";
import { Boilable, Consumable, Decayable, Flammable, TemperatureSensitive } from "./item-traits";
import { StatusId } from "../systems/status-types";

export const ITEM_DEFINITIONS: Record<string, ItemDefinition> = defineItems({
  stone: Item({
    id: itemId("stone"),
    name: "Stone",
    description: "A raw chunk of stone. Rough and heavy.",
    rarity: Rarity.Common,
    category: Category.Mineral,
  }),
  copper_ore: Item({
    id: itemId("copper_ore"),
    name: "Copper Ore",
    description: "Veins of copper running through rock.",
    rarity: Rarity.Common,
    category: Category.Mineral,
  }),
  iron_ore: Item({
    id: itemId("iron_ore"),
    name: "Iron Ore",
    description: "Deep-vein iron with crystalline structure.",
    rarity: Rarity.Uncommon,
    category: Category.Mineral,
  }),
  silver_ore: Item({
    id: itemId("silver_ore"),
    name: "Silver Ore",
    description: "Shining silver ore, cool to the touch.",
    rarity: Rarity.Rare,
    category: Category.Mineral,
  }),
  oak_wood: Item({
    id: itemId("oak_wood"),
    name: "Oak Wood",
    description: "A sturdy log of raw oak timber.",
    rarity: Rarity.Common,
    category: Category.Timber,
  }).with(
    Flammable({
      ignitionTemp: 120,
      burnDurationSec: 15,
      effect: TransformInto(itemId("charcoal")),
    }),
  ),
  spruce_wood: Item({
    id: itemId("spruce_wood"),
    name: "Spruce Wood",
    description: "Softwood log, smells of mountain pine.",
    rarity: Rarity.Uncommon,
    category: Category.Timber,
  }),
  palm_wood: Item({
    id: itemId("palm_wood"),
    name: "Palm Wood",
    description: "Fibrous timber from tropical shores.",
    rarity: Rarity.Rare,
    category: Category.Timber,
  }),
  pine_wood: Item({
    id: itemId("pine_wood"),
    name: "Pine Wood",
    description: "Dense hardwood from ancient pinelands.",
    rarity: Rarity.Legendary,
    category: Category.Timber,
  }),
  stone_block: Item({
    id: itemId("stone_block"),
    name: "Stone Block",
    description: "Refined block of cut stone.",
    rarity: Rarity.Common,
    category: Category.Component,
  }),
  copper_ingot: Item({
    id: itemId("copper_ingot"),
    name: "Copper Ingot",
    description: "A pure bar of smelted copper.",
    rarity: Rarity.Common,
    category: Category.Component,
  }),
  iron_ingot: Item({
    id: itemId("iron_ingot"),
    name: "Iron Ingot",
    description: "A solid bar of refined iron.",
    rarity: Rarity.Uncommon,
    category: Category.Component,
  }),
  silver_ingot: Item({
    id: itemId("silver_ingot"),
    name: "Silver Ingot",
    description: "A glistening bar of sterling silver.",
    rarity: Rarity.Rare,
    category: Category.Component,
  }),
  oak_plank: Item({
    id: itemId("oak_plank"),
    name: "Oak Plank",
    description: "Smooth plank of sawed oak wood.",
    rarity: Rarity.Common,
    category: Category.Component,
  }),
  spruce_plank: Item({
    id: itemId("spruce_plank"),
    name: "Spruce Plank",
    description: "Clean plank of sawed spruce wood.",
    rarity: Rarity.Uncommon,
    category: Category.Component,
  }),
  palm_plank: Item({
    id: itemId("palm_plank"),
    name: "Palm Plank",
    description: "Flexible plank of sawed palm wood.",
    rarity: Rarity.Rare,
    category: Category.Component,
  }),
  pine_plank: Item({
    id: itemId("pine_plank"),
    name: "Pine Plank",
    description: "Resilient plank of sawed pine wood.",
    rarity: Rarity.Legendary,
    category: Category.Component,
  }),
  starter_pickaxe: Item({
    id: itemId("starter_pickaxe"),
    name: "Starter Pickaxe",
    description: "A tired pickaxe with a worn iron head.",
    rarity: Rarity.Common,
    category: Category.Tool,
  }),
  starter_axe: Item({
    id: itemId("starter_axe"),
    name: "Starter Axe",
    description: "A simple hand axe with a notched blade.",
    rarity: Rarity.Common,
    category: Category.Tool,
  }),
  stone_pickaxe: Item({
    id: itemId("stone_pickaxe"),
    name: "Stone Pickaxe",
    description: "A pickaxe bound with flint and twine.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
  }),
  stone_axe: Item({
    id: itemId("stone_axe"),
    name: "Stone Axe",
    description: "A heavy axe with a polished stone head.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
  }),
  flint_pickaxe: Item({
    id: itemId("flint_pickaxe"),
    name: "Flint Pickaxe",
    description: "A pickaxe bound with flint and twine.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
  }),
  flint_axe: Item({
    id: itemId("flint_axe"),
    name: "Flint Axe",
    description: "A simple axe made of sharp flint stone and wood.",
    rarity: Rarity.Uncommon,
    category: Category.Tool,
  }),
  copper_pickaxe: Item({
    id: itemId("copper_pickaxe"),
    name: "Copper Pickaxe",
    description: "Malleable copper pickaxe. Gleams brightly.",
    rarity: Rarity.Rare,
    category: Category.Tool,
  }),
  copper_axe: Item({
    id: itemId("copper_axe"),
    name: "Copper Axe",
    description: "A copper woodsman axe with a sharp edge.",
    rarity: Rarity.Rare,
    category: Category.Tool,
  }),
  iron_pickaxe: Item({
    id: itemId("iron_pickaxe"),
    name: "Iron Pickaxe",
    description: "A heavy, professional iron mining tool.",
    rarity: Rarity.Legendary,
    category: Category.Tool,
  }),
  iron_axe: Item({
    id: itemId("iron_axe"),
    name: "Iron Axe",
    description: "Tempered iron head on a sturdy oak shaft.",
    rarity: Rarity.Legendary,
    category: Category.Tool,
  }),
  ice_block: Item({
    id: itemId("ice_block"),
    name: "Ice Block",
    description: "A solid, freezing block of glacial ice. Melts rapidly in warm areas.",
    rarity: Rarity.Uncommon,
    category: Category.Mineral,
  }).with(
    TemperatureSensitive({
      minSafeTemp: -100,
      maxSafeTemp: 0,
      effect: TransformInto(itemId("clean_water")),
    }),
  ),
  ghost_lily: Item({
    id: itemId("ghost_lily"),
    name: "Ghost Lily",
    description: "Translucent white flower found near Blight zones. Wilts within hours of picking.",
    rarity: Rarity.Rare,
    category: Category.Herb,
  }).with(
    Decayable({
      lifespanSec: 60,
      effect: TransformInto(itemId("volatile_ash")),
    }),
  ),
  charcoal: Item({
    id: itemId("charcoal"),
    name: "Charcoal",
    description: "Slow-burned wood. Hotter and cleaner than coal.",
    rarity: Rarity.Common,
    category: Category.Component,
  }),
  volatile_ash: Item({
    id: itemId("volatile_ash"),
    name: "Volatile Ash",
    description: "Grey, inert ash residue from failed Crucible synthesis or decay.",
    rarity: Rarity.Common,
    category: Category.Reagent,
  }),
  clean_water: Item({
    id: itemId("clean_water"),
    name: "Clean Water",
    description: "Water that has been boiled and condensed to remove essence taint.",
    rarity: Rarity.Common,
    category: Category.Component,
  }).with(
    Consumable({
      verb: "drink",
      onConsume: [RestoreThirst(60)],
    }),
  ),
  dirty_water: Item({
    id: itemId("dirty_water"),
    name: "Dirty Water",
    description: "Murky water with debris drifting in it. It smells faintly of rot.",
    rarity: Rarity.Common,
    category: Category.Component,
  }).with(
    Consumable({
      verb: "drink",
      onConsume: [RestoreThirst(35), ChanceOf(0.45, AddStatus(StatusId.Sickness, 60))],
    }),
    Boilable({
      minTemp: 80,
      durationSec: 4,
      effect: TransformInto(itemId("clean_water")),
    }),
  ),
  debug_panacea: Item({
    id: itemId("debug_panacea"),
    name: "Debug Panacea",
    description: "A vial of impossible medicine. Cures everything. Not found in nature.",
    rarity: Rarity.Legendary,
    category: Category.Reagent,
  }).with(
    Consumable({
      verb: "drink",
      onConsume: [ClearAllStatuses(), RestoreThirst(100), RestoreHp(100)],
    }),
  ),
});

export const ITEM_TRAIT_INDEX = buildItemTraitIndex(ITEM_DEFINITIONS);
export const ITEM_METADATA = projectLegacyItemMetadata(ITEM_DEFINITIONS);

function projectLegacyItemMetadata(items: Record<string, ItemDefinition>): Record<string, LegacyItemMetadata> {
  return Object.fromEntries(
    Object.entries(items).map(([id, item]) => [
      id,
      {
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        category: item.category,
        ...(item.traits.some((trait) => trait.kind === "flammable")
          ? (() => {
              const trait = item.traits.find((candidate) => candidate.kind === "flammable");
              if (!trait || trait.kind !== "flammable") return {};
              return {
                flammable: {
                  ignitionTemp: trait.ignitionTemp,
                  burnDurationSec: trait.burnDurationSec,
                  transformsInto: trait.effect.kind === "transform" ? trait.effect.into : id,
                },
              };
            })()
          : {}),
        ...(item.traits.some((trait) => trait.kind === "temperature_sensitive")
          ? (() => {
              const trait = item.traits.find((candidate) => candidate.kind === "temperature_sensitive");
              if (!trait || trait.kind !== "temperature_sensitive") return {};
              return {
                temperatureSensitive: {
                  maxSafeTemp: trait.maxSafeTemp,
                  minSafeTemp: trait.minSafeTemp,
                  onExceeded: "melt",
                  transformsInto: trait.effect.kind === "transform" ? trait.effect.into : undefined,
                },
              };
            })()
          : {}),
        ...(item.traits.some((trait) => trait.kind === "decayable")
          ? (() => {
              const trait = item.traits.find((candidate) => candidate.kind === "decayable");
              if (!trait || trait.kind !== "decayable") return {};
              return {
                decayable: {
                  lifespanSec: trait.lifespanSec,
                  transformsInto: trait.effect.kind === "transform" ? trait.effect.into : id,
                },
              };
            })()
          : {}),
      },
    ]),
  ) as Record<string, LegacyItemMetadata>;
}