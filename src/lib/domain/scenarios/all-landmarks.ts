import { Cell } from "$lib/core/types";
import type { ScenarioDefinition } from "./scenario-types";

export const allLandmarksScenario: ScenarioDefinition = {
  id: "all-landmarks",
  name: "all landmarks",
  description: "50x50 forest with one of every landmark kind placed in two rows. walk up and examine each one to test examine text and item drops.",
  mapW: 50,
  mapH: 50,
  cellFill: Cell.Meadows,
  spawnPoint: { gx: 25, gy: 25 },
  camp: true,
  decorations: false,
  spawns: [],
  // Row 1 (y=14): five landmarks north of spawn
  // Row 2 (y=36): five landmarks south of spawn
  // Six-tile horizontal spacing gives enough room to approach each one cleanly.
  landmarks: [
    { kind: "huge_dead_tree",    gx: 7,  gy: 14 },
    { kind: "ruined_watch_post", gx: 14, gy: 14 },
    { kind: "old_road",          gx: 21, gy: 14 },
    { kind: "burned_cart",       gx: 28, gy: 14 },
    { kind: "wolf_den",          gx: 35, gy: 14 },

    { kind: "river_crossing",    gx: 7,  gy: 36 },
    { kind: "deer_grazing_area", gx: 14, gy: 36 },
    { kind: "fallen_tree",       gx: 21, gy: 36 },
    { kind: "old_stump",         gx: 28, gy: 36 },
    { kind: "pond",              gx: 35, gy: 36 },
  ],
};
