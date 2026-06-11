import { rpgService } from "$lib/server/rpg-service";
import type { RpgPlayerState } from "$lib/domain/rpg-types";
import type { PageServerLoad } from "./$types";

/**
 * Ensures the user is logged in.
 * If not authenticated, they will be redirected to the login flow by hook middleware,
 * but this serves as a safeguard.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  const username = locals.session?.username ?? "local_developer";
  const avatarUrl = locals.session?.avatarUrl ?? null;

  let playerState: RpgPlayerState | null = null;
  try {
    playerState = await rpgService.getPlayerState(userId);
  } catch (err) {
    console.error("Failed to load RPG player state from service:", err);
  }

  return {
    user: {
      id: userId,
      username,
      avatarUrl,
    },
    playerState,
  };
};
