import type { VisualDefinition } from "./visual-definitions.js";
import { CAMPFIRE_VISUAL_DEF } from "./visual-definitions.js";
import { MATERIAL_VISUAL_DEF } from "./material-visual-definitions.js";

/**
 * All entity kinds that have a reactive VisualDefinition.
 * Add a new literal here alongside a new VisualDefinition when onboarding a new entity type.
 */
export type VisualEntityKind = "campfire" | "material";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VISUAL_MANIFEST: Record<VisualEntityKind, VisualDefinition<any>> = {
  campfire: CAMPFIRE_VISUAL_DEF,
  material: MATERIAL_VISUAL_DEF,
};
