import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import type { RequestHandler } from "./$types";

/** POST /api/rpg/equip — equips a tool from the player's inventory stack. */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const { itemId } = await request.json();
    const result = await rpgService.equipTool(userId, itemId);
    return json(result);
  } catch (err) {
    return json({ error: String(err) }, { status: 400 });
  }
};
