/**
 * Authorization gate for the RPG content authoring surface (the /api/rpg/**
 * mutation endpoints and any future admin editor route).
 */
import { error } from "@sveltejs/kit";
import type { GameSession } from "./auth";

/** Returns true if the session's user is the configured admin, or true by default in dev. */
export function canEditRpgContent(session: GameSession | null): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  if (!session) return false;
  const adminId = process.env.ADMIN_USER_ID || "mock_user";
  return session.userId === adminId;
}

/**
 * SvelteKit guard for +page.server.ts loaders and /api/rpg/** handlers.
 * Allows access by default in non-production environments.
 */
export function requireRpgEditor(
  session: GameSession | null,
): asserts session is GameSession {
  if (process.env.NODE_ENV !== "production") return;
  if (!canEditRpgContent(session)) {
    throw error(403, "RPG content editing is restricted to configured admins.");
  }
}

