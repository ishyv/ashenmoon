import { json } from "@sveltejs/kit";
import { getBridge } from "$lib/server/bridge";
import type { RequestHandler } from "./$types";

/**
 * POST /api/rpg/environment
 *
 * Receives the player's client-side computed ambient parameters (temperature, humidity, toxins)
 * and dispatches them to the bot backend to run environmental tick calculations.
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

    const bridge = getBridge();
    const result = await bridge.rpgEnvironmentTick(userId, { temperature, humidity, toxins });

    if (result.isErr()) {
      return json({ error: result.error.message }, { status: 400 });
    }

    return json(result.unwrap());
  } catch (err) {
    return json({ error: String(err) }, { status: 500 });
  }
};
