import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { rpgService } from "$lib/server/rpg-service";

/**
 * Loads the full game state for the current user.
 * GET /api/state
 */
export const GET: RequestHandler = async ({ locals }) => {
  // Use a mock user ID for local-first development
  const userId = "mock_user";
  const state = await rpgService.getPlayerState(userId);
  return json(state);
};

/**
 * Persists a full state snapshot from the automated frontend effect.
 * POST /api/state
 */
export const POST: RequestHandler = async ({ request }) => {
  const userId = "mock_user";
  const snapshot = await request.json();
  
  if (snapshot) {
    await rpgService.savePlayerState(userId, snapshot);
    return json({ ok: true });
  }
  
  return json({ ok: false, error: "Empty snapshot" }, { status: 400 });
};
