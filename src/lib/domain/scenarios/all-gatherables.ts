import { Cell } from "$lib/core/types";
import type { ScenarioDefinition } from "./scenario-types";

export const allGatherablesScenario: ScenarioDefinition = {
  id: "all-gatherables",
  name: "all gatherables",
  description: "40x40 meadow with one of every gatherable placed in rows near spawn. use for testing gather mechanics and tool requirements.",
  mapW: 40,
  mapH: 40,
  cellFill: Cell.Meadows,
  spawnPoint: { gx: 20, gy: 20 },
  // Clean room: no camp, no decorations, no enemies. Start with an axe equipped
  // so trees are choppable on load; swap to a pickaxe in the panel for ores.
  startTool: "stone_axe",
  spawns: [
    // --- Row y=10: instant pickups (no tool, removed on gather) ---
    { id: "sc_stick_pickup",        x: 14, y: 10, gatherableId: "stick_pickup" },
    { id: "sc_loose_stone_pickup",  x: 16, y: 10, gatherableId: "loose_stone_pickup" },
    { id: "sc_flint_shard_pickup",  x: 18, y: 10, gatherableId: "flint_shard_pickup" },
    { id: "sc_leaf_litter",         x: 20, y: 10, gatherableId: "leaf_litter" },
    { id: "sc_bark_strip",          x: 22, y: 10, gatherableId: "bark_strip" },

    // --- Row y=13: bare-hand harvests (depletable) ---
    { id: "sc_mushroom_patch",      x: 14, y: 13, gatherableId: "mushroom_patch" },
    { id: "sc_grass_patch",         x: 16, y: 13, gatherableId: "grass_patch" },
    { id: "sc_moss_patch",          x: 18, y: 13, gatherableId: "moss_patch" },
    { id: "sc_berry_bush",          x: 20, y: 13, gatherableId: "berry_bush" },
    { id: "sc_water_source",        x: 23, y: 13, gatherableId: "water_source" },

    // --- Row y=16: trees (require axe, 3-cell spacing) ---
    { id: "sc_oak_tree",            x: 14, y: 16, gatherableId: "oak_tree" },
    { id: "sc_crimson_ash_tree",    x: 17, y: 16, gatherableId: "crimson_ash_tree" },
    { id: "sc_spore_mangrove_tree", x: 20, y: 16, gatherableId: "spore_mangrove_tree" },
    { id: "sc_frost_pine_tree",     x: 23, y: 16, gatherableId: "frost_pine_tree" },

    // --- Row y=19: ores / rocks (require pickaxe, 3-cell spacing) ---
    { id: "sc_stone_node",          x: 12, y: 19, gatherableId: "stone_node" },
    { id: "sc_copper_ore_vein",     x: 15, y: 19, gatherableId: "copper_ore_vein" },
    { id: "sc_iron_ore_vein",       x: 18, y: 19, gatherableId: "iron_ore_vein" },
    { id: "sc_toxic_copper_node",   x: 21, y: 19, gatherableId: "toxic_copper_node" },
    { id: "sc_glacial_silver_vein", x: 24, y: 19, gatherableId: "glacial_silver_vein" },
    { id: "sc_clay_deposit",        x: 27, y: 19, gatherableId: "clay_deposit" },
  ],
};
