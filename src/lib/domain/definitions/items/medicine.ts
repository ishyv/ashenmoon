import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import { Item } from "$lib/domain/items/item-builder";
import { AddStatus, ChanceOfVitals, ClearAllStatuses, RestoreHp, RestoreThirst, TransformInto, ReduceStatus } from "$lib/domain/items/item-effects";
import { Consumable, Decayable, Absorbent, MedicineIngredient, HandlingRisk, CleaningAgent } from "$lib/domain/items/item-traits";
import { StatusId } from "$lib/domain/systems/status-types";


export const medicineItems = {
  moss: Item({
    id: itemId("moss"),
    name: "Moss",
    description: "Soft damp moss with a clean, green scent.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.04, stackLimit: 30 },
  }).with(Absorbent(1)),
  wild_herb: Item({
    id: itemId("wild_herb"),
    name: "Wild Herb",
    description: "A common green herb with a clean scent. Mild, but useful in hot water.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 50 },
  }).with(MedicineIngredient("basic_poultice")),
  red_herb: Item({
    id: itemId("red_herb"),
    name: "Red Herb",
    description: "Grows in soil where essence pools. Saturated with organic vitality and magical stability.",
    rarity: Rarity.Rare,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 50 },
  }).with(MedicineIngredient("essence_poultice")),
  yarrow: Item({
    id: itemId("yarrow"),
    name: "Yarrow",
    description: "A flowering herb often used to slow bleeding and dress shallow cuts.",
    rarity: Rarity.Uncommon,
    category: Category.Herb,
    icon: "🌼",
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 40 },
  }).with(MedicineIngredient("bleeding")),
  plantain_leaf: Item({
    id: itemId("plantain_leaf"),
    name: "Plantain Leaf",
    description: "A broad leaf that can soothe scraped skin and wrap small wounds.",
    rarity: Rarity.Common,
    category: Category.Herb,
    icon: "🍃",
    physical: { carryClass: "pocket", weight: 0.04, stackLimit: 50 },
  }).with(MedicineIngredient("poultice")),
  bitter_root: Item({
    id: itemId("bitter_root"),
    name: "Bitter Root",
    description: "A tough root with a harsh taste. Useful in crude tonics.",
    rarity: Rarity.Uncommon,
    category: Category.Herb,
    icon: "🥔",
    physical: { carryClass: "pocket", weight: 0.08, stackLimit: 30 },
  }).with(MedicineIngredient("infection")),
  nettle: Item({
    id: itemId("nettle"),
    name: "Nettle",
    description: "Stinging leaves. Irritating by hand, useful when dried or boiled.",
    rarity: Rarity.Common,
    category: Category.Herb,
    icon: "🌿",
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 45 },
  }).with(HandlingRisk(StatusId.Sickness, 10), MedicineIngredient("tonic")),
  dried_herb: Item({
    id: itemId("dried_herb"),
    name: "Dried Herb",
    description: "Preserved herb with a stronger bitter scent.",
    rarity: Rarity.Common,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.02, stackLimit: 40 },
  }),
  weak_medicine: Item({
    id: itemId("weak_medicine"),
    name: "Weak Medicine",
    description: "A bitter moss tea that steadies the body a little.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    physical: { carryClass: "pocket", weight: 0.25, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [RestoreHp(10), RestoreThirst(10)] })
  ),
  bitter_tonic: Item({
    id: itemId("bitter_tonic"),
    name: "Bitter Tonic",
    description: "A harsh boiled drink for sickness and infected wounds. Not pleasant. Good.",
    rarity: Rarity.Uncommon,
    category: Category.Medicine,
    icon: "🧪",
    physical: { carryClass: "pocket", weight: 0.25, stackLimit: 10 },
  }).with(
    Consumable({ verb: "drink", onConsume: [ReduceStatus(StatusId.Sickness, 1)] })
  ),
  ghost_lily: Item({
    id: itemId("ghost_lily"),
    name: "Ghost Lily",
    description: "Translucent white flower found near Blight zones. Wilts within hours of picking.",
    rarity: Rarity.Rare,
    category: Category.Herb,
    physical: { carryClass: "pocket", weight: 0.03, stackLimit: 10 },
  }).with(
    Decayable({ lifespanSec: 60, effect: TransformInto(itemId("volatile_ash")) })
  ),
  crude_dressing: Item({
    id: itemId("crude_dressing"),
    name: "Crude Dressing",
    description: "Moss packed against fiber. Absorbs and slows a minor wound.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    physical: { carryClass: "pocket", weight: 0.06, stackLimit: 10 },
  }).with(
    Consumable({ verb: "apply", onConsume: [RestoreHp(6)] })
  ),
  herb_poultice: Item({
    id: itemId("herb_poultice"),
    name: "Herb Poultice",
    description: "Crushed leaves and herbs packed into a wet dressing.",
    rarity: Rarity.Common,
    category: Category.Medicine,
    icon: "🌿",
    physical: { carryClass: "pocket", weight: 0.1, stackLimit: 20 },
  }).with(
    Consumable({ verb: "apply", onConsume: [RestoreHp(6)] })
  ),
  yarrow_poultice: Item({
    id: itemId("yarrow_poultice"),
    name: "Yarrow Poultice",
    description: "A stronger poultice used to slow bleeding from shallow wounds.",
    rarity: Rarity.Uncommon,
    category: Category.Medicine,
    icon: "🌼",
    physical: { carryClass: "pocket", weight: 0.1, stackLimit: 20 },
  }).with(
    Consumable({ verb: "apply", onConsume: [RestoreHp(10)] })
  ),
  clean_bandage: Item({
    id: itemId("clean_bandage"),
    name: "Clean Bandage",
    description: "A cleaner strip for covering cuts. Crude, but not filthy.",
    rarity: Rarity.Common,
    category: Category.Medicine,
    icon: "🤕",
    physical: { carryClass: "pocket", weight: 0.05, stackLimit: 30 },
  }).with(
    Consumable({ verb: "apply", onConsume: [RestoreHp(4)] })
  ),
  crude_poultice: Item({
    id: itemId("crude_poultice"),
    name: "Crude Poultice",
    description: "Ash, herb, and water worked into a dark paste. Risky but sometimes effective.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    physical: { carryClass: "pocket", weight: 0.08, stackLimit: 10 },
  }).with(
    Consumable({ verb: "eat", onConsume: [RestoreHp(8), ChanceOfVitals(0.15, AddStatus(StatusId.Sickness, 20))] })
  ),
  crude_splint: Item({
    id: itemId("crude_splint"),
    name: "Crude Splint",
    description: "A rigid support made from sticks and binding. Better than limping bravely into death.",
    rarity: Rarity.Common,
    category: Category.Medicine,
    icon: "🪵",
    physical: { carryClass: "pack", weight: 0.35, stackLimit: 10 },
  }).with(
    Consumable({ verb: "apply", onConsume: [RestoreHp(5)] })
  ),
  ash_paste: Item({
    id: itemId("ash_paste"),
    name: "Ash Paste",
    description: "Ash mixed with clean water into a harsh cleaning paste.",
    rarity: Rarity.Common,
    category: Category.Medicine,
    icon: "⚪",
    physical: { carryClass: "pocket", weight: 0.15, stackLimit: 30 },
  }).with(CleaningAgent(1)),
  tannin_brew: Item({
    id: itemId("tannin_brew"),
    name: "Tannin Brew",
    description: "A bitter oak bark infusion. Used for tanning hides and washing wounds.",
    rarity: Rarity.Common,
    category: Category.Reagent,
    icon: "🧪",
    physical: { carryClass: "pack", weight: 0.8, stackLimit: 10 },
  }).with(
    Consumable({ verb: "apply", onConsume: [ReduceStatus(StatusId.Sickness, 1)] })
  ),
  debug_panacea: Item({
    id: itemId("debug_panacea"),
    name: "Debug Panacea",
    description: "A vial of impossible medicine. Cures everything. Not found in nature.",
    rarity: Rarity.Legendary,
    category: Category.Reagent,
    physical: { carryClass: "pocket", weight: 0.1, stackLimit: 5 },
  }).with(
    Consumable({ verb: "drink", onConsume: [ClearAllStatuses(), RestoreThirst(100), RestoreHp(100)] })
  ),
};
