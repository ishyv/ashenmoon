import { checkGatherTool } from "../gather-system";
import type { GatherableDefinition } from "../gatherables";
import type { FocusedGatherProfile } from "./focused-gather-types";
import { focusedGatherProfileFor, isFocusedGatherEligible } from "./focused-gather-profiles";

export type FocusedGatherActivationFailureReason =
  | "no_source"
  | "dead"
  | "unknown_source"
  | "ineligible_source"
  | "missing_tool"
  | "wrong_tool"
  | "cooldown"
  | "stamina";

export type FocusedGatherFeedbackTone = "muted" | "error";

export type FocusedGatherActivationResult =
  | { readonly ok: true; readonly profile: FocusedGatherProfile }
  | {
      readonly ok: false;
      readonly reason: FocusedGatherActivationFailureReason;
      readonly message: string;
      readonly tone: FocusedGatherFeedbackTone;
    };

export interface FocusedGatherActivationInput {
  readonly hasUsableSource: boolean;
  readonly def: GatherableDefinition | undefined;
  readonly equippedToolId: string | null;
  readonly cooldownSec: number;
  readonly stamina: number;
  readonly playerDead: boolean;
  readonly zeroCooldowns: boolean;
}

function fail(
  reason: FocusedGatherActivationFailureReason,
  message: string,
  tone: FocusedGatherFeedbackTone,
): FocusedGatherActivationResult {
  return { ok: false, reason, message, tone };
}

function toolFailureReason(reason: "no_tool" | "wrong_tool"): FocusedGatherActivationFailureReason {
  return reason === "no_tool" ? "missing_tool" : "wrong_tool";
}

export function resolveFocusedGatherActivation(
  input: FocusedGatherActivationInput,
): FocusedGatherActivationResult {
  if (input.playerDead) return fail("dead", "you cannot focus", "muted");
  if (!input.hasUsableSource) return fail("no_source", "no large source", "muted");
  if (!input.def) return fail("unknown_source", "unknown source", "muted");
  if (!isFocusedGatherEligible(input.def)) {
    return fail("ineligible_source", "too small to focus", "muted");
  }

  if (input.def.requiredToolKind) {
    const gate = checkGatherTool(input.equippedToolId, input.def.requiredToolKind);
    if (!gate.ok) {
      return fail(toolFailureReason(gate.reason), `need ${gate.requiredKind}`, "error");
    }
  }

  if (!input.zeroCooldowns && input.cooldownSec > 0) {
    return fail("cooldown", "not ready", "muted");
  }

  const profile = focusedGatherProfileFor(input.def);
  if (input.stamina < profile.staminaCost) {
    return fail("stamina", "not enough stamina", "error");
  }

  return { ok: true, profile };
}
