import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import type { CraftFailureReason } from "$lib/domain/crafting/crafting-system";
import type { RequestHandler } from "./$types";

const FAILURE_MESSAGE: Record<CraftFailureReason, string> = {
  unknown_recipe: "Invalid item to craft",
  requires_campfire: "Smelting ingots requires standing near the Campfire's heat",
  insufficient_materials: "Insufficient materials",
};

/** POST /api/rpg/craft — crafts a tool or refines a material from persisted RPG state. */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const { itemId, isNearCampfire } = await request.json();
    const playerState = await rpgService.craft(userId, itemId, {
      isNearCampfire: Boolean(isNearCampfire),
    });
    return json(playerState);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message in FAILURE_MESSAGE) {
      return json({ error: FAILURE_MESSAGE[message as CraftFailureReason] }, { status: 400 });
    }
    return json({ error: message }, { status: 500 });
  }
};
