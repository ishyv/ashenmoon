/**
 * Interaction identifiers. Each interactable entity advertises one via
 * `interactable.action`; the interaction system (interaction-system.ts) reads it
 * and runs the matching branch.
 *
 * HISTORY: a generic dispatch registry (`HANDLERS` + `dispatchInteraction`) once
 * lived here, but the real handlers outgrew its deliberately narrow context —
 * they need VFX, stamina, persistence, quest events, and skill XP. Rather than
 * widen the seam until it lied about its dependencies, the registry was removed
 * and interaction-system.ts owns the logic with full context. If interaction
 * kinds ever multiply enough to justify a registry again, reintroduce one *with*
 * the context it actually needs.
 */

/** Every kind of interaction an entity can advertise. */
export type InteractionId = "gather" | "pickup" | "talk" | "refuel";
