import { getBuildableBehavior } from "$lib/domain/building-behaviors";
import {
  M3_CARCASS_DEFINITIONS,
  type CarcassProcessAction,
  type CarcassRuntimeState,
} from "$lib/domain/animals/carcass-processing";

export interface WorldActionRequirement {
  readonly kind: "item" | "tool" | "state";
  readonly id: string;
  readonly qty?: number;
}

export interface WorldActionFeedback {
  readonly start: string;
  readonly success: string;
  readonly failure: string;
}

export interface WorldActionIntent {
  readonly kind: string;
  readonly targetId: string;
  readonly payload?: Readonly<Record<string, string | number | boolean>>;
}

export interface WorldActionOption {
  readonly id: string;
  readonly label: string;
  readonly durationSec?: number;
  readonly requirements: readonly WorldActionRequirement[];
  readonly feedback: WorldActionFeedback;
  readonly executeIntent: WorldActionIntent;
}

const CARCASS_ACTION_ORDER: readonly Exclude<CarcassProcessAction, "inspect">[] = [
  "harvest_meat",
  "remove_hide",
  "extract_bone",
  "collect_sinew",
];

export function actionsForCarcass(input: {
  readonly targetId: string;
  readonly carcass: CarcassRuntimeState;
}): WorldActionOption[] {
  const definition = M3_CARCASS_DEFINITIONS[input.carcass.speciesId];
  if (!definition) return [];

  const inspect: WorldActionOption = {
    id: "inspect",
    label: "inspect carcass",
    requirements: [],
    feedback: {
      start: "you study the carcass.",
      success: definition.displayName,
      failure: "the carcass is unfamiliar.",
    },
    executeIntent: { kind: "carcass.inspect", targetId: input.targetId },
  };

  if (input.carcass.state === "rotten") return [inspect];

  return [
    inspect,
    ...CARCASS_ACTION_ORDER.flatMap((action) => {
      const actionDefinition = definition.actions[action];
      if (!actionDefinition || actionDefinition.yields.length === 0) return [];
      if (input.carcass.processedActions.includes(action)) return [];
      return [{
        id: action,
        label: actionDefinition.label,
        durationSec: actionDefinition.baseDurationSec,
        requirements: [],
        feedback: {
          start: `you begin to ${actionDefinition.label}.`,
          success: actionDefinition.label,
          failure: "that cut is no longer useful.",
        },
        executeIntent: {
          kind: "carcass.process",
          targetId: input.targetId,
          payload: { action },
        },
      }];
    }),
  ];
}

export function actionsForPlacedStructure(input: {
  readonly buildingId: string;
  readonly buildableId: string;
}): WorldActionOption[] {
  const behavior = getBuildableBehavior(input.buildableId);
  if (!behavior) return [];

  switch (behavior.kind) {
    case "storage":
      return [{
        id: "open_storage",
        label: "open storage",
        requirements: [],
        feedback: {
          start: "you sort through the storage pile.",
          success: "the pile is ready.",
          failure: "the pile will not help with that.",
        },
        executeIntent: { kind: "open_storage", targetId: input.buildingId },
      }];
    case "water_collector":
      return [{
        id: "collect_water",
        label: "collect water",
        durationSec: 2,
        requirements: [{ kind: "state", id: "has_collected_water" }],
        feedback: {
          start: "you dip carefully into the rain catcher.",
          success: "water sloshes into your container.",
          failure: "there is no collected water.",
        },
        executeIntent: { kind: "collect_water", targetId: input.buildingId },
      }];
    case "rest":
      return [{
        id: "rest",
        label: "rest",
        durationSec: 4,
        requirements: [],
        feedback: {
          start: "you settle onto the bedroll.",
          success: "the rest takes some edge off.",
          failure: "you cannot rest here.",
        },
        executeIntent: { kind: "rest", targetId: input.buildingId, payload: { restQuality: behavior.restQuality } },
      }];
    case "sign":
      return [
        {
          id: "read_sign",
          label: "read sign",
          requirements: [],
          feedback: {
            start: "you lean close to the marker.",
            success: "the carving is readable.",
            failure: "the sign is blank.",
          },
          executeIntent: { kind: "read_sign", targetId: input.buildingId },
        },
        {
          id: "edit_sign",
          label: "edit sign",
          durationSec: 2,
          requirements: [],
          feedback: {
            start: "you scratch new marks into the sign.",
            success: "the marker remembers your words.",
            failure: "the message will not fit.",
          },
          executeIntent: {
            kind: "edit_sign",
            targetId: input.buildingId,
            payload: { maxTextLength: behavior.maxTextLength },
          },
        },
      ];
    case "station_process":
      return [{
        id: "use_station",
        label: "use smoking rack",
        requirements: [],
        feedback: {
          start: "you check the rack.",
          success: "the rack is ready for a process.",
          failure: "the rack cannot process that.",
        },
        executeIntent: { kind: "open_station", targetId: input.buildingId, payload: { stationId: behavior.stationId } },
      }];
    case "defense":
    case "shelter":
      return [];
  }
}
