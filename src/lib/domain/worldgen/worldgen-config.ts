import { Cell } from "./cell";

export const WORLDGEN_CONFIG = {
  // Biome noise thresholds
  noise: {
    heightThreshold: 0.22,      // below this is Water
    tempThresholdCold: 0.25,    // below this is Frostbane
    tempThresholdHot: 0.7,      // above this is FungalMire / ScorchedWastes
    moistureThresholdDry: 0.4,   // below this in Hot is ScorchedWastes
    moistureThresholdWet: 0.65,  // above this is CrimsonGrove
  },

  // Biome to resource node ID mapping
  biomeResources: {
    [Cell.ScorchedWastes]: {
      tree: null,
      ore: "copper_ore_vein",
    },
    [Cell.CrimsonGrove]: {
      tree: "crimson_ash_tree",
      ore: "iron_ore_vein",
    },
    [Cell.FungalMire]: {
      tree: "spore_mangrove_tree",
      ore: "toxic_copper_node",
    },
    [Cell.Frostbane]: {
      tree: "frost_pine_tree",
      ore: "glacial_silver_vein",
    },
    [Cell.Meadows]: {
      tree: "oak_tree",
      ore: "stone_node",
    },
    [Cell.Water]: { tree: null, ore: null },
    [Cell.Camp]: { tree: null, ore: null },
  } as Record<Cell, { tree: string | null; ore: string | null }>,

  // Starting area pickup targets and counts
  startingAreaPickups: {
    stick_pickup: 10,
    loose_stone_pickup: 8,
    flint_shard_pickup: 5,
    leaf_litter: 8,
    bark_strip: 6,
    grass_patch: 8,
    moss_patch: 5,
    berry_bush: 7,
    mushroom_patch: 6,
    wild_root_node: 4,
    acorn_pickup: 4,
    wild_herb_patch: 3,
  } as Record<string, number>,

  // Global wilderness pickups list
  globalWildernessPickups: [
    "stick_pickup",
    "loose_stone_pickup",
    "flint_shard_pickup",
    "leaf_litter",
    "bark_strip",
    "grass_patch",
    "moss_patch",
    "berry_bush",
    "mushroom_patch",
    "wild_root_node",
    "acorn_pickup",
    "wild_herb_patch",
  ] as readonly string[],

  globalWildernessRollChance: 0.012,
  localDebrisRollChance: 0.35,

  // Preservation rules (radii in tiles)
  preservation: {
    playerStructureRadius: 4,      // block spawns within 4 tiles of any player structure
    proceduralStructureRadius: 3,  // block spawns within 3 tiles of any landmark
    campCenterRadius: 4,           // block spawns within 4 tiles of campfire / camp center
  },

  // Resource regeneration cooldowns in seconds
  regenCooldowns: {
    // Pickups (fast)
    stick_pickup: 90,
    loose_stone_pickup: 90,
    flint_shard_pickup: 120,
    leaf_litter: 120,
    bark_strip: 120,
    grass_patch: 120,
    moss_patch: 120,
    acorn_pickup: 180,
    wild_herb_patch: 180,
    mushroom_patch: 180,
    wild_root_node: 180,
    berry_bush: 180,

    // Trees (medium)
    oak_tree: 300,
    crimson_ash_tree: 300,
    spore_mangrove_tree: 300,
    frost_pine_tree: 300,

    // Ores & Nodes (slow)
    stone_node: 480,
    copper_ore_vein: 600,
    iron_ore_vein: 600,
    toxic_copper_node: 600,
    glacial_silver_vein: 600,
  } as Record<string, number>,
};
