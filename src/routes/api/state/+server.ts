import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { rpgService } from "$lib/server/rpg-service";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

interface GameStatePayload {
  rpg?: Partial<RpgPlayerState> | null;
  survival?: {
    thirst?: number;
    wasParched?: boolean;
  };
}

/**
 * Loads the full game state for the current user.
 * GET /api/state
 */
export const GET: RequestHandler = async ({ locals }) => {
  // Use a mock user ID for local-first development
  const userId = "mock_user";
  const rpg = await rpgService.getPlayerState(userId);
  return json({
    rpg,
    survival: {
      thirst: 100,
      wasParched: false,
    },
  });
};

/**
 * Persists a full state snapshot from the automated frontend effect.
 * POST /api/state
 */
export const POST: RequestHandler = async ({ request }) => {
  const userId = "mock_user";
  const snapshot = (await request.json()) as GameStatePayload | null;
  
  if (snapshot?.rpg) {
    await rpgService.savePlayerState(userId, snapshot.rpg);
    return json({ ok: true });
  }
  
  return json({ ok: false, error: "Empty snapshot" }, { status: 400 });
};
