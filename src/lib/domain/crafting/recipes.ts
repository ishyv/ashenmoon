/**
 * Crafting recipe definitions, the single source of truth for what can be
 * crafted, what it costs, and what it yields. Both the crafting UI (preview) and
 * the local RPG command layer (execution) reads from here via crafting-system.ts.
 *
 * Pure data + validation. No Svelte, no Pixi, no network.
 */
import { ITEM_DEFINITIONS } from "$lib/domain/items";
import type { ProcessType, StationId } from "$lib/domain/stations";

export type CraftingCategory =
  | "survival"
  | "tools"
  | "medicine"
  | "food"
  | "fuel_fire"
  | "material_processing"
  | "structures"
  | "knowledge";

export type CraftingContextId = "hand" | "campfire" | "placement" | StationId;

/** A single material requirement for a recipe. `itemId` is an inventory slot key. */
export interface RecipeCost {
  readonly itemId: string;
  /** Display label for the cost line (HUD copy). */
  readonly name: string;
  readonly required: number;
}

/** A craftable recipe: consume `costs`, produce `output`. */
export interface CraftRecipe {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category?: CraftingCategory;
  readonly requiredContext?: CraftingContextId;
  readonly process?: ProcessType;
  readonly durationSec?: number;
  readonly discoverable?: boolean;
  readonly discoveryText?: string;
  readonly feedbackTags?: readonly string[];
  /** When true, crafting requires the player to stand near a lit campfire. */
  readonly requiresCampfire?: boolean;
  readonly costs: readonly RecipeCost[];
  /** What the craft yields. Defaults to one unit of an item sharing the recipe id. */
  readonly output: { readonly itemId: string; readonly qty: number };
}

/** Recipe input shape before defaults are applied. */
type RecipeInput = Omit<CraftRecipe, "category" | "discoverable" | "feedbackTags" | "output"> & {
  readonly category?: CraftingCategory;
  readonly discoverable?: boolean;
  readonly feedbackTags?: readonly string[];
  readonly output?: { readonly itemId: string; readonly qty: number };
};

function withDefaults(recipe: RecipeInput): CraftRecipe {
  return {
    ...recipe,
    category: recipe.category ?? "material_processing",
    requiredContext: recipe.requiredContext ?? (recipe.requiresCampfire ? "campfire" : "hand"),
    discoverable: recipe.discoverable ?? true,
    feedbackTags: recipe.feedbackTags ?? [],
    output: recipe.output ?? { itemId: recipe.id, qty: 1 },
  };
}

const RAW_RECIPES: readonly RecipeInput[] = [
  {
    id: "flint_axe",
    name: "Flint Axe",
    description: "a crude cutting tool for taking down small trees.",
    category: "tools",
    requiredContext: "hand",
    process: "assemble",
    feedbackTags: ["binding", "tool"],
    costs: [
      { itemId: "stick", name: "stick", required: 1 },
      { itemId: "flint_shard", name: "flint shard", required: 1 },
      { itemId: "grass_fiber", name: "grass fiber", required: 1 },
    ],
  },
  {
    id: "crude_knife",
    name: "Crude Knife",
    description: "a small flint edge lashed to a stick for cutting and scraping.",
    category: "tools",
    requiredContext: "primitive_work_surface",
    process: "assemble",
    durationSec: 5,
    discoveryText: "The flint bites cleanly once it is bound tight.",
    feedbackTags: ["binding", "tool", "sharp"],
    costs: [
      { itemId: "stick", name: "stick", required: 1 },
      { itemId: "flint_shard", name: "flint shard", required: 1 },
      { itemId: "grass_fiber", name: "grass fiber", required: 1 },
    ],
  },
  {
    id: "flint_pickaxe",
    name: "Flint Pickaxe",
    description: "a crude mining tool for later stone work.",
    category: "tools",
    requiredContext: "hand",
    process: "assemble",
    feedbackTags: ["binding", "tool"],
    costs: [
      { itemId: "stick", name: "stick", required: 1 },
      { itemId: "flint_shard", name: "flint shard", required: 1 },
      { itemId: "grass_fiber", name: "grass fiber", required: 1 },
    ],
  },
  {
    id: "stone_block",
    name: "Stone Block",
    description: "Refined block of cut stone. Used in outpost construction.",
    category: "material_processing",
    process: "assemble",
    costs: [{ itemId: "stone", name: "Raw Stone", required: 3 }],
  },
  {
    id: "oak_plank",
    name: "Oak Plank",
    description: "Smooth plank of sawed oak wood. Used in outpost construction.",
    category: "material_processing",
    process: "assemble",
    costs: [{ itemId: "oak_wood", name: "Raw Oak Wood", required: 3 }],
  },
  {
    id: "charcoal",
    name: "Charcoal",
    description: "slow-burned wood for steady heat.",
    requiresCampfire: true,
    category: "fuel_fire",
    requiredContext: "campfire",
    process: "burn",
    feedbackTags: ["smoke", "ash", "fire"],
    costs: [{ itemId: "oak_wood", name: "Oak Wood", required: 2 }],
  },
  {
    id: "tinder_bundle",
    name: "Tinder Bundle",
    description: "dry leaves and bark bundled into a starter nest.",
    category: "fuel_fire",
    requiredContext: "hand",
    process: "assemble",
    feedbackTags: ["dry", "fire"],
    costs: [
      { itemId: "leaves", name: "dry leaves", required: 2 },
      { itemId: "bark", name: "bark", required: 1 },
    ],
  },
  {
    id: "firewood_bundle",
    name: "Firewood Bundle",
    description: "branches tied into a longer-burning fuel bundle.",
    category: "fuel_fire",
    requiredContext: "hand",
    process: "assemble",
    feedbackTags: ["binding", "fuel"],
    costs: [
      { itemId: "branch", name: "branch", required: 2 },
      { itemId: "grass_fiber", name: "grass fiber", required: 1 },
    ],
  },
  {
    id: "weak_medicine",
    name: "Weak Medicine",
    description: "a bitter moss tea that steadies sickness and thirst.",
    requiresCampfire: true,
    category: "medicine",
    requiredContext: "campfire",
    process: "boil",
    feedbackTags: ["herbal", "steam"],
    costs: [
      { itemId: "clean_water", name: "clean water", required: 1 },
      { itemId: "moss", name: "moss", required: 1 },
    ],
  },
  {
    id: "binding_cord",
    name: "Binding Cord",
    description: "fiber and bark twisted into usable cord.",
    category: "material_processing",
    requiredContext: "hand",
    process: "assemble",
    feedbackTags: ["binding"],
    costs: [
      { itemId: "grass_fiber", name: "grass fiber", required: 2 },
      { itemId: "bark", name: "bark", required: 1 },
    ],
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
    description:
      "Pure smelted copper bar. Requires standing near the Campfire's heat.",
    requiresCampfire: true,
    category: "material_processing",
    requiredContext: "campfire",
    process: "heat",
    costs: [
      { itemId: "copper_ore", name: "Copper Ore", required: 3 },
      { itemId: "charcoal", name: "Charcoal", required: 1 },
    ],
  },
  {
    id: "iron_ingot",
    name: "Iron Ingot",
    description:
      "Refined ingot of strong iron metal. Requires standing near the Campfire's heat.",
    requiresCampfire: true,
    category: "material_processing",
    requiredContext: "campfire",
    process: "heat",
    costs: [
      { itemId: "iron_ore", name: "Iron Ore", required: 3 },
      { itemId: "charcoal", name: "Charcoal", required: 2 },
    ],
  },
  {
    id: "silver_ingot",
    name: "Silver Ingot",
    description:
      "Glistening sterling silver bar. Requires standing near the Campfire's heat.",
    requiresCampfire: true,
    category: "material_processing",
    requiredContext: "campfire",
    process: "heat",
    costs: [
      { itemId: "silver_ore", name: "Silver Ore", required: 3 },
      { itemId: "charcoal", name: "Charcoal", required: 3 },
    ],
  },
  // --- Food (campfire cooking) -----------------------------------------------
  {
    id: "roasted_root",
    name: "Roasted Root",
    description: "a wild root buried in the embers until soft and edible.",
    requiresCampfire: true,
    category: "food",
    requiredContext: "campfire",
    process: "heat",
    durationSec: 5,
    discoverable: true,
    discoveryText: "It comes out dense and sweet from the heat.",
    feedbackTags: ["fire", "smoke"],
    costs: [{ itemId: "wild_root", name: "wild root", required: 1 }],
    output: { itemId: "roasted_root", qty: 1 },
  },
  {
    id: "roasted_acorn",
    name: "Roasted Acorn",
    description: "acorns crisped in the fire until their bitterness eases.",
    requiresCampfire: true,
    category: "food",
    requiredContext: "campfire",
    process: "heat",
    durationSec: 4,
    discoverable: true,
    discoveryText: "The shells split and the inside smells nutty.",
    feedbackTags: ["fire"],
    costs: [{ itemId: "acorn", name: "acorn", required: 2 }],
    output: { itemId: "roasted_acorn", qty: 2 },
  },
  {
    id: "cooked_meat",
    name: "Cooked Meat",
    description: "meat seared over the fire until safe to eat.",
    requiresCampfire: true,
    category: "food",
    requiredContext: "campfire",
    process: "heat",
    durationSec: 6,
    discoverable: true,
    discoveryText: "The fat drips into the embers and the smell changes.",
    feedbackTags: ["fire", "smoke"],
    costs: [{ itemId: "raw_meat", name: "raw meat", required: 1 }],
    output: { itemId: "cooked_meat", qty: 1 },
  },
  // --- Drying Rack -----------------------------------------------------------
  {
    id: "dried_meat",
    name: "Dried Meat",
    description: "meat hung until the moisture leaves it. lasts far longer.",
    category: "food",
    requiredContext: "drying_rack",
    process: "dry",
    durationSec: 20,
    discoverable: true,
    discoveryText: "The texture changes, the rot smell fades.",
    feedbackTags: ["dry"],
    costs: [{ itemId: "raw_meat", name: "raw meat", required: 2 }],
    output: { itemId: "dried_meat", qty: 1 },
  },
  {
    id: "dried_herb",
    name: "Dried Herb",
    description: "wild herb dried until potent and storable.",
    category: "medicine",
    requiredContext: "drying_rack",
    process: "dry",
    durationSec: 15,
    discoverable: true,
    discoveryText: "The herb crumbles between your fingers but still smells sharp.",
    feedbackTags: ["herbal", "dry"],
    costs: [{ itemId: "wild_herb", name: "wild herb", required: 2 }],
    output: { itemId: "dried_herb", qty: 1 },
  },
  // --- Medicine (hand / work surface) ----------------------------------------
  {
    id: "moss_dressing",
    name: "Moss Dressing",
    description: "damp moss pressed against fiber. absorbs and slows a minor wound.",
    category: "medicine",
    requiredContext: "hand",
    process: "assemble",
    discoverable: true,
    discoveryText: "The moss holds the fiber in place against a wound.",
    feedbackTags: ["herbal"],
    costs: [
      { itemId: "moss", name: "moss", required: 1 },
      { itemId: "grass_fiber", name: "grass fiber", required: 1 },
    ],
    output: { itemId: "crude_dressing", qty: 1 },
  },
  {
    id: "ash_poultice",
    name: "Ash Poultice",
    description: "ash and herb worked into a dark paste with water. effective but uncertain.",
    category: "medicine",
    requiredContext: "primitive_work_surface",
    process: "assemble",
    durationSec: 6,
    discoverable: true,
    discoveryText: "The ash draws the herb's bitterness into the paste.",
    feedbackTags: ["herbal", "ash"],
    costs: [
      { itemId: "ash", name: "ash", required: 1 },
      { itemId: "wild_herb", name: "wild herb", required: 1 },
      { itemId: "dirty_water", name: "dirty water", required: 1 },
    ],
    output: { itemId: "crude_poultice", qty: 1 },
  },
  // --- Material processing (campfire) ----------------------------------------
  {
    id: "hardened_clay_cup",
    name: "Hardened Clay",
    description: "clay fired hard enough for a crude container or camp structure.",
    requiresCampfire: true,
    category: "material_processing",
    requiredContext: "campfire",
    process: "heat",
    durationSec: 8,
    discoverable: true,
    discoveryText: "The clay shrinks and hardens in the heat.",
    feedbackTags: ["fire", "smoke"],
    costs: [{ itemId: "clay", name: "clay", required: 2 }],
    output: { itemId: "hardened_clay", qty: 1 },
  },
];

/** All craftable recipes, ordered for HUD display. */
export const CRAFT_RECIPES: readonly CraftRecipe[] = RAW_RECIPES.map(withDefaults);

/** Recipe lookup by id. */
export const CRAFT_RECIPES_BY_ID: Readonly<Record<string, CraftRecipe>> =
  Object.fromEntries(CRAFT_RECIPES.map((r) => [r.id, r]));

/** Returns a recipe by id, or null if unknown. */
export function getRecipe(recipeId: string): CraftRecipe | null {
  return CRAFT_RECIPES_BY_ID[recipeId] ?? null;
}

/**
 * Structural + referential validation for the recipe set. Returns a list of
 * human-readable problems; empty means valid. Cross-checks every cost and
 * output itemId against the item registry so authored content cannot reference
 * a non-existent item.
 */
export function validateCraftRecipes(
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
  knownItemIds: ReadonlySet<string> = new Set(Object.keys(ITEM_DEFINITIONS)),
): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const recipe of recipes) {
    if (seen.has(recipe.id)) {
      problems.push(`duplicate recipe id: ${recipe.id}`);
    }
    seen.add(recipe.id);

    if (recipe.costs.length === 0) {
      problems.push(`recipe ${recipe.id} has no costs`);
    }
    if (recipe.requiredContext === "campfire" && !recipe.requiresCampfire) {
      // Not invalid: newer recipe data uses requiredContext as the canonical field.
    }
    for (const cost of recipe.costs) {
      if (cost.required <= 0) {
        problems.push(`recipe ${recipe.id} cost ${cost.itemId} must be > 0`);
      }
      if (!knownItemIds.has(cost.itemId)) {
        problems.push(`recipe ${recipe.id} cost references unknown item: ${cost.itemId}`);
      }
    }

    if (recipe.output.qty <= 0) {
      problems.push(`recipe ${recipe.id} output qty must be > 0`);
    }
    if (!knownItemIds.has(recipe.output.itemId)) {
      problems.push(`recipe ${recipe.id} output references unknown item: ${recipe.output.itemId}`);
    }
  }

  return problems;
}

/** Throws if the recipe set is invalid. Intended for boot/test boundaries. */
export function assertValidCraftRecipes(
  recipes: readonly CraftRecipe[] = CRAFT_RECIPES,
): void {
  const problems = validateCraftRecipes(recipes);
  if (problems.length > 0) {
    throw new Error(`invalid craft recipes:\n- ${problems.join("\n- ")}`);
  }
}
