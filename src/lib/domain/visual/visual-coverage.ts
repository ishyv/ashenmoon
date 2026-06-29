import type { VisualEntityKind } from "./visual-manifest.js";

export type VisualCoverageStatus = "active" | "deferred";

export interface VisualCoverageEntry {
  readonly status: VisualCoverageStatus;
  readonly tier: 1 | 2 | 3 | 4;
  readonly reason: string;
  readonly notes?: string;
}

export const VISUAL_COVERAGE: Record<VisualEntityKind, VisualCoverageEntry> = {
  campfire: {
    status: "active",
    tier: 1,
    reason: "campfire reactive visuals fully wired — states, VFX, SFX, glow, and bridge complete",
  },
  material: {
    status: "active",
    tier: 1,
    reason: "firewood_bundle / damp_firewood moisture cycle visual — dry, damp, drying, cooking states",
    notes: "bridge wiring into visual-presentation-system pending (domain defs complete)",
  },
};
