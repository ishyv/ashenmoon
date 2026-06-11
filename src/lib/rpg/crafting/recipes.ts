/**
 * Crafting recipe definitions, the single source of truth for what can be
 * crafted, what it costs, and what it yields. Both the crafting UI (preview) and
 * the /api/rpg/craft handler (execution) read from here via crafting-system.ts.
 *
 * Pure data + validation. No Svelte, no Pixi, no network.
 */
import { ITEM_DEFINITIONS } from "../items/item-definitions";

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
  /** When true, crafting requires the player to stand near a lit campfire. */
  readonly requiresCampfire?: boolean;
  readonly costs: readonly RecipeCost[];
  /** What the craft yields. Defaults to one unit of an item sharing the recipe id. */
  readonly output: { readonly itemId: string; readonly qty: number };
}

/** Recipe input shape before defaults are applied. */
type RecipeInput = Omit<CraftRecipe, "output"> & {
  readonly output?: { readonly itemId: string; readonly qty: number };
};

function withDefaults(recipe: RecipeInput): CraftRecipe {
  return {
    ...recipe,
    output: recipe.output ?? { itemId: recipe.id, qty: 1 },
  };
}

const RAW_RECIPES: readonly RecipeInput[] = [
  {
    id: "flint_axe",
    name: "Flint Axe",
    description: "A basic woodsman tool. Used to harvest Oak Trees.",
    costs: [
      { itemId: "oak_wood", name: "Loose Twigs", required: 5 },
      { itemId: "stone", name: "Loose Stones", required: 3 },
    ],
  },
  {
    id: "flint_pickaxe",
    name: "Flint Pickaxe",
    description: "A basic mining tool. Used to harvest ore veins.",
    costs: [
      { itemId: "oak_wood", name: "Loose Twigs", required: 5 },
      { itemId: "stone", name: "Loose Stones", required: 3 },
    ],
  },
  {
    id: "stone_block",
    name: "Stone Block",
    description: "Refined block of cut stone. Used in outpost construction.",
    costs: [{ itemId: "stone", name: "Raw Stone", required: 3 }],
  },
  {
    id: "oak_plank",
    name: "Oak Plank",
    description: "Smooth plank of sawed oak wood. Used in outpost construction.",
    costs: [{ itemId: "oak_wood", name: "Raw Oak Wood", required: 3 }],
  },
  {
    id: "charcoal",
    name: "Charcoal",
    description: "Slow-burned wood. Smelted to melt metals in the campfire.",
    costs: [{ itemId: "oak_wood", name: "Oak Wood", required: 2 }],
  },
  {
    id: "copper_ingot",
    name: "Copper Ingot",
    description:
      "Pure smelted copper bar. Requires standing near the Campfire's heat.",
    requiresCampfire: true,
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
    costs: [
      { itemId: "silver_ore", name: "Silver Ore", required: 3 },
      { itemId: "charcoal", name: "Charcoal", required: 3 },
    ],
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
