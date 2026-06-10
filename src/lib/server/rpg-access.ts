/**
 * Authorization gate for the RPG content authoring surface (/item-editor and
 * /api/rpg/**).
 */
import { error } from "@sveltejs/kit";
import type { DashboardSession } from "./auth";

/** Returns true if the session's user is the configured admin, or true by default in dev. */
export function canEditRpgContent(session: DashboardSession | null): boolean {
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
  session: DashboardSession | null,
): asserts session is DashboardSession {
  if (process.env.NODE_ENV !== "production") return;
  if (!canEditRpgContent(session)) {
    throw error(403, "RPG content editing is restricted to configured admins.");
  }
}

