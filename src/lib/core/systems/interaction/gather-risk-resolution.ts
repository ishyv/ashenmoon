import {
  getGatherableDefinition,
  rollGatherRisk,
  type GatherRiskOutcome,
} from "$lib/domain/gathering/gatherables";
import { StatusId } from "$lib/domain/systems/status-types";

export type GatherRiskResolution =
  | {
      kind: "wound";
      status: StatusId.Cut | StatusId.Bleeding;
      woundSeverity: "cut" | "deep_cut";
      durationSec: number;
      toolQuality: number;
      feedbackText: "cut" | "bleeding";
      knowledgeItemId?: string;
    }
  | {
      kind: "status";
      status: Exclude<StatusId, StatusId.Cut | StatusId.Bleeding>;
      durationSec: number;
      feedbackText: "poison" | "status";
      knowledgeItemId?: string;
    };

export interface GatherRiskResolutionContext {
  gatherableId: string | null;
  equippedToolId: string | null;
  rng?: () => number;
}

export function resolveGatherRiskForInteraction(
  ctx: GatherRiskResolutionContext,
): GatherRiskResolution | null {
  if (!ctx.gatherableId) return null;

  const gatherable = getGatherableDefinition(ctx.gatherableId);
  if (!gatherable) return null;

  const outcome = rollGatherRisk(
    gatherable,
    {
      hasTool: !!ctx.equippedToolId,
    },
    ctx.rng ?? Math.random,
  );
  if (!outcome) return null;

  return toGatherRiskResolution(outcome, ctx.equippedToolId);
}

function toGatherRiskResolution(
  outcome: GatherRiskOutcome,
  equippedToolId: string | null,
): GatherRiskResolution {
  if (outcome.status === StatusId.Cut || outcome.status === StatusId.Bleeding) {
    return {
      kind: "wound",
      status: outcome.status,
      woundSeverity: outcome.status === StatusId.Bleeding ? "deep_cut" : "cut",
      durationSec: outcome.durationSec,
      toolQuality: equippedToolId ? 0.6 : 0,
      feedbackText: outcome.status === StatusId.Cut ? "cut" : "bleeding",
      ...(outcome.knowledgeItemId ? { knowledgeItemId: outcome.knowledgeItemId } : {}),
    };
  }

  return {
    kind: "status",
    status: outcome.status as Exclude<StatusId, StatusId.Cut | StatusId.Bleeding>,
    durationSec: outcome.durationSec,
    feedbackText: outcome.status === StatusId.Poison ? "poison" : "status",
    ...(outcome.knowledgeItemId ? { knowledgeItemId: outcome.knowledgeItemId } : {}),
  };
}
