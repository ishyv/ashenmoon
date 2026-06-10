import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import { requireRpgEditor } from "$lib/server/rpg-access";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals }) => {
  requireRpgEditor(locals.session);
  try {
    const snapshot = await rpgService.getRpgContent();
    const craftingRecipes = (snapshot.craftingRecipes ?? {}) as Record<string, any>;
    const processingRecipes = (snapshot.processingRecipes ?? {}) as Record<string, any>;

    const crafting = Object.entries(craftingRecipes).map(([id, recipe]) => ({
      id,
      method: "crafting",
      ingredients: Object.keys(recipe.requires || {}),
      output: { id, qty: 1 },
    }));
    const processing = Object.entries(processingRecipes).map(([id, recipe]) => ({
      id,
      method: "processing",
      ingredients: [id],
      output: { id: recipe.output, qty: recipe.outputPerBatch },
    }));
    return json([...crafting, ...processing]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
