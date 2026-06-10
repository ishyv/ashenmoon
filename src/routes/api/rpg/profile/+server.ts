import { json } from "@sveltejs/kit";
import { getBridge, hasBridge } from "$lib/server/bridge";
import { offlinePlayerState } from "$lib/server/offline-store";
import type { RequestHandler } from "./$types";

/** GET /api/rpg/profile — returns player profile, active loadout, and inventory slots. */
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    if (!hasBridge()) {
      return json(offlinePlayerState);
    }
    const bridge = getBridge();
    const result = await bridge.getRpgPlayerState(userId);
    if (result.isErr()) {
      return json({ error: result.error.message }, { status: 500 });
    }
    return json(result.unwrap());
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
