import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import type { RequestHandler } from "./$types";

/** POST /api/rpg/gather — triggers a gathering tick (reducing node durability, adding items to stash). */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const body = await request.json();
    const { action, locationId, pickupId, quantity } = body;
    if (!action || !locationId) {
      return json({ error: "Missing action or locationId parameter" }, { status: 400 });
    }
    if (action !== "mine" && action !== "forest" && action !== "pickup" && action !== "refuel") {
      return json({ error: "Invalid action. Must be 'mine', 'forest', 'pickup', or 'refuel'" }, { status: 400 });
    }

    const result = await rpgService.gather(userId, action, locationId, pickupId, quantity);
    return json(result);
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
