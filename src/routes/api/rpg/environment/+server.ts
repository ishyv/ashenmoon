import { json } from "@sveltejs/kit";
import { rpgService } from "$lib/server/rpg-service";
import type { RequestHandler } from "./$types";

/**
 * POST /api/rpg/environment
 *
 * Receives the player's client-side computed ambient parameters (temperature, humidity, toxins)
 * and runs environmental tick calculations.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  try {
    const body = await request.json();
    const { temperature, humidity, toxins } = body;

    if (
      typeof temperature !== "number" ||
      typeof humidity !== "number" ||
      typeof toxins !== "number"
    ) {
      return json(
        { error: "Missing or invalid temperature, humidity, or toxins parameters" },
        { status: 400 },
      );
    }

    const result = await rpgService.environmentTick(userId, { temperature, humidity, toxins });
    return json(result);
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
