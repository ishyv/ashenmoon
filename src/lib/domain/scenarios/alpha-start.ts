import { Cell } from "$lib/domain/worldgen/cell";
import type { ScenarioDefinition } from "./scenario-types";

export const alphaStartScenario: ScenarioDefinition = {
  id: "alpha_start",
  name: "alpha: forest start",
  description: "Places the player in the center of the first-camp layout. Gather materials, build a campfire, boil clean water, hunt animals, and craft hide footwraps to survive.",
  mapW: 100,
  mapH: 100,
  cellFill: Cell.Meadows,
  spawnPoint: { gx: 50, gy: 50 },
  camp: false,
  decorations: true,
  firstCampLayout: true,
  spawns: [],
};
