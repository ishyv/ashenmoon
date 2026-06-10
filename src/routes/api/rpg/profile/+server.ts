import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import type { RequestHandler } from "./$types";

/** GET /api/rpg/profile — returns player profile, active loadout, and inventory slots. */
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const playerState = await rpgService.getPlayerState(userId);
    return json(playerState);
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
