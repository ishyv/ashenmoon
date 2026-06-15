import { Cell } from "$lib/domain/worldgen/cell";
import type { ScenarioDefinition } from "./scenario-types";

export const collisionLabScenario: ScenarioDefinition = {
  id: "collision_lab",
  name: "collision lab",
  description: "clean meadow with rocks and trees arranged around spawn for footprint and y-sort testing.",
  mapW: 28,
  mapH: 28,
  cellFill: Cell.Meadows,
  spawnPoint: { gx: 14, gy: 14 },
  startTool: "stone_pickaxe",
  spawns: [
    { id: "collision_rock_north", x: 14, y: 11, gatherableId: "stone_node" },
    { id: "collision_rock_south", x: 14, y: 17, gatherableId: "stone_node" },
    { id: "collision_rock_west", x: 10, y: 14, gatherableId: "stone_node" },
    { id: "collision_rock_east", x: 18, y: 14, gatherableId: "stone_node" },
    { id: "collision_tree_northwest", x: 11, y: 11, gatherableId: "oak_tree" },
    { id: "collision_tree_southeast", x: 17, y: 17, gatherableId: "oak_tree" },
  ],
};
