import type { ScriptOperationDTO, ScriptTriggerDTO } from "$shared/bridge-types";

export interface OperationSummary {
  readonly label: string;
  readonly detail: string;
}

/** Keeps trigger copy compact enough for dense workspace rails. */
export function triggerSummary(trigger: ScriptTriggerDTO): string {
  if (trigger.kind === "manual") return "manual";
  if (trigger.kind === "schedule") return `every ${trigger.intervalHours}h`;
  return trigger.event.replace(/-/g, " ");
}

/** Converts recorded operations into readable action rows before exposing raw details. */
export function operationSummary(operation: ScriptOperationDTO): OperationSummary {
  switch (operation.kind) {
    case "add_role":
      return { label: "add role", detail: `${operation.userId} -> ${operation.role}` };
    case "remove_role":
      return { label: "remove role", detail: `${operation.userId} -> ${operation.role}` };
    case "dm":
      return { label: "send dm", detail: `${operation.userId} -> ${operation.content}` };
    case "create_channel":
      return {
        label: "create channel",
        detail: `${operation.name} · ${operation.channelType}`,
      };
    case "create_role":
      return { label: "create role", detail: operation.name };
  }
}
