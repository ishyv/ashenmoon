import { getBridge, hasBridge } from "$lib/server/bridge";
import { offlinePlayerState } from "$lib/server/offline-store";
import type { RpgPlayerState } from "$shared/bridge-types";
import type { PageServerLoad } from "./$types";

/**
 * Ensures the user is logged in via Discord OAuth.
 * If not authenticated, they will be redirected to the login flow by hook middleware,
 * but this serves as a safeguard.
 */
export const load: PageServerLoad = async ({ locals }) => {
  const userId = locals.session?.userId ?? "mock_user";
  const username = locals.session?.username ?? "local_developer";
  const avatarUrl = locals.session?.avatarUrl ?? null;

  let playerState: RpgPlayerState | null = null;
  if (!hasBridge()) {
    playerState = offlinePlayerState;
  } else {
    try {
      const stateResult = await getBridge().getRpgPlayerState(userId);
      if (stateResult.isOk()) playerState = stateResult.unwrap();
    } catch (err) {
      console.error("Failed to load RPG player state from bridge:", err);
    }
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
