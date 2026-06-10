import { json } from "@sveltejs/kit";
import { offlinePlayerState } from "$lib/server/offline-store";
import type { RequestHandler } from "./$types";

const RECIPES: Record<string, { wood?: number; stone?: number; copper_ore?: number; iron_ore?: number; silver_ore?: number; charcoal?: number; requiresCampfire?: boolean }> = {
  flint_axe: { wood: 5, stone: 3 },
  flint_pickaxe: { wood: 5, stone: 3 },
  stone_block: { stone: 3 },
  oak_plank: { wood: 3 },
  charcoal: { wood: 2 },
  copper_ingot: { copper_ore: 3, charcoal: 1, requiresCampfire: true },
  iron_ingot: { iron_ore: 3, charcoal: 2, requiresCampfire: true },
  silver_ingot: { silver_ore: 3, charcoal: 3, requiresCampfire: true }
};

/** POST /api/rpg/craft — crafts a tool or refines a material in offline mode. */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { itemId, isNearCampfire } = await request.json();
    const recipe = RECIPES[itemId];
    if (!recipe) {
      return json({ error: "Invalid item to craft" }, { status: 400 });
    }

    if (recipe.requiresCampfire && !isNearCampfire) {
      return json({ error: "Smelting ingots requires standing near the Campfire's heat" }, { status: 400 });
    }

    const slots = { ...offlinePlayerState.inventory.slots };
    
    // Check materials
    const woodQty = slots.oak_wood && "qty" in slots.oak_wood ? slots.oak_wood.qty : 0;
    const stoneQty = slots.stone && "qty" in slots.stone ? slots.stone.qty : 0;
    const copperQty = slots.copper_ore && "qty" in slots.copper_ore ? slots.copper_ore.qty : 0;
    const ironQty = slots.iron_ore && "qty" in slots.iron_ore ? slots.iron_ore.qty : 0;
    const silverQty = slots.silver_ore && "qty" in slots.silver_ore ? slots.silver_ore.qty : 0;
    const charcoalQty = slots.charcoal && "qty" in slots.charcoal ? slots.charcoal.qty : 0;

    const reqWood = recipe.wood ?? 0;
    const reqStone = recipe.stone ?? 0;
    const reqCopper = recipe.copper_ore ?? 0;
    const reqIron = recipe.iron_ore ?? 0;
    const reqSilver = recipe.silver_ore ?? 0;
    const reqCharcoal = recipe.charcoal ?? 0;

    if (
      woodQty < reqWood ||
      stoneQty < reqStone ||
      copperQty < reqCopper ||
      ironQty < reqIron ||
      silverQty < reqSilver ||
      charcoalQty < reqCharcoal
    ) {
      return json({ error: "Insufficient materials" }, { status: 400 });
    }

    // Deduct materials
    if (reqWood > 0) {
      const remaining = woodQty - reqWood;
      if (remaining <= 0) delete slots.oak_wood;
      else slots.oak_wood = { qty: remaining };
    }
    if (reqStone > 0) {
      const remaining = stoneQty - reqStone;
      if (remaining <= 0) delete slots.stone;
      else slots.stone = { qty: remaining };
    }
    if (reqCopper > 0) {
      const remaining = copperQty - reqCopper;
      if (remaining <= 0) delete slots.copper_ore;
      else slots.copper_ore = { qty: remaining };
    }
    if (reqIron > 0) {
      const remaining = ironQty - reqIron;
      if (remaining <= 0) delete slots.iron_ore;
      else slots.iron_ore = { qty: remaining };
    }
    if (reqSilver > 0) {
      const remaining = silverQty - reqSilver;
      if (remaining <= 0) delete slots.silver_ore;
      else slots.silver_ore = { qty: remaining };
    }
    if (reqCharcoal > 0) {
      const remaining = charcoalQty - reqCharcoal;
      if (remaining <= 0) delete slots.charcoal;
      else slots.charcoal = { qty: remaining };
    }

    // Add crafted item
    const existingResult = slots[itemId];
    const currentResultQty = existingResult && "qty" in existingResult ? existingResult.qty : 0;
    slots[itemId] = { qty: currentResultQty + 1 };

    offlinePlayerState.inventory = { slots };

    return json(offlinePlayerState);
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};

