import { Item } from "$lib/domain/items/item-builder";
import { Blueprint } from "$lib/domain/items/item-traits";
import { Category, Rarity, itemId } from "$lib/domain/items/item-types";
import type { ItemDefinition } from "$lib/domain/items/item-types";

function bp(id: string, name: string, description: string): ItemDefinition {
  return Item({
    id: itemId(`blueprint_${id}`),
    name: `blueprint: ${name}`,
    description,
    rarity: Rarity.Uncommon,
    category: Category.Knowledge,
    physical: { carryClass: "pocket", weight: 0.1, stackLimit: 1 },
    icon: "📜",
  }).with(Blueprint(id));
}

export const blueprintItems: Record<string, ItemDefinition> = {
  // --- processing ---
  blueprint_twist_bark_rope: bp("twist_bark_rope", "twist bark rope", "a worn page showing how bark strips are worked into serviceable rope."),
  blueprint_copper_ingot: bp("copper_ingot", "copper ingot", "a fire-scorched schematic for smelting copper ore into ingots."),
  blueprint_iron_ingot: bp("iron_ingot", "iron ingot", "soot-stained notes on reducing iron ore to workable metal."),
  blueprint_silver_ingot: bp("silver_ingot", "silver ingot", "a precise record of silver smelting temperatures and ratios."),
  blueprint_harden_clay: bp("harden_clay", "harden clay", "a brief note about baking clay at the right heat until it holds its shape."),
  blueprint_make_ash_from_leaves: bp("make_ash_from_leaves", "burn leaves to ash", "a page explaining how dry leaves can be reduced to clean ash over a fire."),
  blueprint_render_animal_fat: bp("render_animal_fat", "render animal fat", "notes on heating fatty meat to separate and collect usable rendered fat."),
  blueprint_tannin_brew: bp("tannin_brew", "tannin brew", "a recipe for boiling oak bark into a bitter liquid that toughens hides and cleans wounds."),
  blueprint_sealing_paste: bp("sealing_paste", "sealing paste", "instructions for mixing mud, ash, and fiber into a workable gap-filler."),
  blueprint_dry_tendon: bp("dry_tendon", "dry tendon", "a note on hanging tendon to dry so it strengthens into reliable binding cord."),
  blueprint_dry_raw_hide: bp("dry_raw_hide", "dry raw hide", "simple instructions for stretching and drying fresh hide before rot sets in."),
  blueprint_cure_hide: bp("cure_hide", "cure hide", "a process for treating dried hide with tannins and smoke until it becomes workable leather."),

  // --- fuel ---
  blueprint_bundle_twigs: bp("bundle_twigs", "bundle twigs", "a note on gathering and binding small sticks into a tight kindling bundle."),
  blueprint_make_charcoal_from_branch: bp("make_charcoal_from_branch", "char branch", "instructions for burning a branch low and slow to produce usable charcoal."),
  blueprint_make_charcoal_from_firewood: bp("make_charcoal_from_firewood", "char firewood", "a method for reducing a full firewood bundle into a larger charcoal yield."),
  blueprint_bundle_tinder: bp("bundle_tinder", "bundle tinder", "notes on layering dry leaves, bark, and twigs into a tinder bundle that catches sparks reliably."),

  // --- food ---
  blueprint_roasted_root: bp("roasted_root", "roasted root", "a simple instruction to bury a wild root in embers and wait."),
  blueprint_roast_wild_root: bp("roast_wild_root", "roast wild root", "a careful record of roasting times and heat for wild roots."),
  blueprint_roasted_acorn: bp("roasted_acorn", "roasted acorn", "a page noting how long acorns need in the fire before their bitterness eases."),
  blueprint_roast_acorns: bp("roast_acorns", "roast acorns", "timing notes for roasting a larger batch of acorns evenly."),
  blueprint_cooked_meat: bp("cooked_meat", "cooked meat", "a basic record of searing meat over fire until it is safe to eat."),
  blueprint_cook_raw_meat: bp("cook_raw_meat", "cook raw meat", "careful heat and timing notes for cooking raw meat properly."),
  blueprint_cook_small_meat: bp("cook_small_meat", "cook small meat", "a quick guide for cooking small cuts of meat over open flame."),
  blueprint_cook_fatty_meat: bp("cook_fatty_meat", "cook fatty meat", "notes on cooking fatty cuts and collecting some of the rendered fat."),
  blueprint_bone_broth: bp("bone_broth", "bone broth", "a slow-cook recipe for boiling small bones in water until something warm and nourishing results."),
  blueprint_dried_meat: bp("dried_meat", "dried meat", "instructions for hanging raw meat to dry until moisture and rot risk are both reduced."),
  blueprint_dry_raw_meat: bp("dry_raw_meat", "dry raw meat", "careful notes on single-cut air-drying to make meat last significantly longer."),
  blueprint_dry_small_meat: bp("dry_small_meat", "dry small meat", "a guide for drying small cuts quickly into portable trail food."),
  blueprint_smoke_meat: bp("smoke_meat", "smoke meat", "a method for preserving meat in controlled smoke rather than fire."),
  blueprint_smoke_small_meat: bp("smoke_small_meat", "smoke small meat", "notes on smoking smaller cuts to produce compact smoked trail food."),

  // --- medicine ---
  blueprint_weak_medicine: bp("weak_medicine", "weak medicine", "a recipe for boiling moss in water into a bitter tea that eases sickness."),
  blueprint_bitter_tonic: bp("bitter_tonic", "bitter tonic", "notes on combining bitter root, nettle, and water into a medicinal brew."),
  blueprint_dried_herb: bp("dried_herb", "dried herb", "instructions for drying wild herbs until they are potent and storable."),
  blueprint_dry_herbs: bp("dry_herbs", "dry herbs (method)", "careful timing notes for drying a larger quantity of herbs without losing potency."),
  blueprint_moss_dressing: bp("moss_dressing", "moss dressing", "a note on pressing damp moss against fiber to create a wound dressing."),
  blueprint_clean_bandage: bp("clean_bandage", "clean bandage", "a method for boiling plant material into a clean, safe wound bandage."),
  blueprint_crude_splint: bp("crude_splint", "crude splint", "instructions for binding sticks and bark cord into a rigid limb support."),
  blueprint_ash_poultice: bp("ash_poultice", "ash poultice", "a recipe for working ash, herb, and water into a drawing poultice."),
  blueprint_ash_paste: bp("ash_paste", "ash paste", "notes on mixing ash and boiled water into a harsh cleaning paste."),
  blueprint_herb_poultice: bp("herb_poultice", "herb poultice", "a method for crushing herbs and plantain leaf into a wet dressing for cuts."),
  blueprint_yarrow_poultice: bp("yarrow_poultice", "yarrow poultice", "instructions for packing yarrow into a stronger dressing to slow bleeding."),

  // --- clothing ---
  blueprint_hide_footwraps: bp("hide_footwraps", "hide footwraps", "a pattern for stitching dried hide into basic foot protection."),
  blueprint_leather_gloves: bp("leather_gloves", "leather gloves", "a stitching guide for making crude but functional hand protection from cured hide."),
  blueprint_hide_cloak: bp("hide_cloak", "hide cloak", "notes on joining large hide pieces into a cloak to cut cold nights."),
  blueprint_fur_lined_wrap: bp("fur_lined_wrap", "fur-lined wrap", "a pattern for layering warm pelt against cured hide for serious cold resistance."),

  // --- tools ---
  blueprint_shape_stone_blade: bp("shape_stone_blade", "shape stone blade", "notes on knapping flint against flat stone until one edge becomes sharp enough to be useful."),
  blueprint_stone_axe: bp("stone_axe", "stone axe", "a guide for wedging a stone blade into a branch and lashing it tight with resin and rope."),
  blueprint_wooden_spear: bp("wooden_spear", "wooden spear", "instructions for sharpening a long branch and fitting a flint tip with cord binding."),
  blueprint_hardened_spear: bp("hardened_spear", "hardened spear", "a campfire method for finishing a spear tip with heat and controlled scraping."),
  blueprint_bone_needle: bp("bone_needle", "bone needle", "notes on scraping a small bone shard into a needle fine enough for hidework."),
  blueprint_bone_hook: bp("bone_hook", "bone hook", "a guide for carving a bone shard into a hook."),
  blueprint_crude_torch: bp("crude_torch", "crude torch", "instructions for wrapping resin-soaked bark around a stick to carry fire."),

  // --- structures ---
  blueprint_drying_rack_kit: bp("drying_rack_kit", "drying rack kit", "a plan for lashing branches into a frame that lets air do the work of preservation."),
  blueprint_marker_sign_kit: bp("marker_sign_kit", "marker sign kit", "instructions for preparing a bark-and-charcoal sign that can carry a written message."),
  blueprint_crude_shelter_kit: bp("crude_shelter_kit", "crude shelter kit", "a guide for bundling the frame and covering materials needed for a basic lean-to."),
  blueprint_storage_pile_kit: bp("storage_pile_kit", "storage pile kit", "notes on marking and reinforcing a camp area to hold more stored goods."),
  blueprint_spike_barrier_kit: bp("spike_barrier_kit", "spike barrier kit", "a plan for sharpening stakes and lashing them into a perimeter argument against predators."),
  blueprint_rain_catcher_kit: bp("rain_catcher_kit", "rain catcher kit", "instructions for stretching a sealed hide over a branch frame to collect rainwater."),
  blueprint_meat_smoking_rack_kit: bp("meat_smoking_rack_kit", "meat smoking rack kit", "a build plan for a rack that routes smoke around meat to preserve it without burning."),
  blueprint_simple_bedroll: bp("simple_bedroll", "simple bedroll", "a method for layering dried hide, leaves, and cord into a basic sleeping surface."),
};
