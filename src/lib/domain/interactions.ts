/**
 * Canonical runtime interaction identifiers. Definitions/prefabs advertise one
 * of these IDs; runtime features register matching handlers; core systems route
 * player intent to the handler with full gameplay context.
 */
export const INTERACTION_IDS = [
  "gather",
  "pickup",
  "harvest",
  "liquid",
  "process",
  "build",
  "combat",
  "talk",
  "refuel",
  "examine",
] as const;

/** Every kind of interaction an entity can advertise. */
export type InteractionId = (typeof INTERACTION_IDS)[number];

export function isInteractionId(value: string): value is InteractionId {
  return (INTERACTION_IDS as readonly string[]).includes(value);
}
