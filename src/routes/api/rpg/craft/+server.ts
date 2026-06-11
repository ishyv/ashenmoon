import { json } from "@sveltejs/kit";
import { offlinePlayerState } from "$lib/server/offline-store";
import { resolveCraft, type CraftFailureReason } from "$lib/rpg/crafting/crafting-system";
import type { RequestHandler } from "./$types";

const FAILURE_MESSAGE: Record<CraftFailureReason, string> = {
  unknown_recipe: "Invalid item to craft",
  requires_campfire: "Smelting ingots requires standing near the Campfire's heat",
  insufficient_materials: "Insufficient materials",
};

/** POST /api/rpg/craft — crafts a tool or refines a material in offline mode. */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const { itemId, isNearCampfire } = await request.json();

    const result = resolveCraft(
      offlinePlayerState.inventory.slots,
      itemId,
      { isNearCampfire: Boolean(isNearCampfire) },
    );

    if (!result.ok) {
      return json({ error: FAILURE_MESSAGE[result.reason] }, { status: 400 });
    }

    offlinePlayerState.inventory = { slots: result.slots };
    return json(offlinePlayerState);
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
