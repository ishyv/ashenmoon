import type { ScenarioDefinition } from "./scenario-types";
import { allGatherablesScenario } from "./all-gatherables";
import { collisionLabScenario } from "./collision-lab";
import { allLandmarksScenario } from "./all-landmarks";
import { alphaStartScenario } from "./alpha-start";

export type { ScenarioDefinition };
export type { ScenarioSpawnNode } from "./scenario-types";

export const SCENARIO_REGISTRY: Record<string, ScenarioDefinition> = {
  "all-gatherables": allGatherablesScenario,
  collision_lab: collisionLabScenario,
  "all-landmarks": allLandmarksScenario,
  alpha_start: alphaStartScenario,
};

export function getScenario(id: string): ScenarioDefinition | undefined {
  return SCENARIO_REGISTRY[id];
}
