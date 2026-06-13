import type { Quest } from "./quest-types";

export const INITIAL_QUESTS: Record<string, Quest> = {
  lost_in_woods: {
    id: "lost_in_woods",
    title: "Lost in the Woods",
    description:
      "No camp, no tools, a dry throat. Boil filthy water clean, drink it, and keep a fire alive.",
    completed: false,
    rewardClaimed: false,
    objectives: [
      { id: "boil_water", label: "Boil Dirty Water clean", current: 0, target: 1, completed: false },
      { id: "drink_water", label: "Drink Clean Water", current: 0, target: 1, completed: false },
      { id: "warm_fire", label: "Tend the campfire", current: 0, target: 1, completed: false },
    ],
  },
  scavenger_tools: {
    id: "scavenger_tools",
    title: "Scavenger's Tools",
    description: "Gather simple materials to craft a flint axe.",
    completed: false,
    rewardClaimed: false,
    objectives: [
      { id: "gather_stick", label: "Gather Stick", current: 0, target: 1, completed: false },
      { id: "gather_flint", label: "Gather Flint Shard", current: 0, target: 1, completed: false },
      { id: "gather_fiber", label: "Gather Grass Fiber", current: 0, target: 1, completed: false },
      { id: "craft_axe", label: "Craft Flint Axe", current: 0, target: 1, completed: false },
      { id: "talk_vane", label: "Report back to Commander Vane", current: 0, target: 1, completed: false },
    ],
  },
  securing_perimeter: {
    id: "securing_perimeter",
    title: "Securing the Perimeter",
    description: "Use your new tool to gather timber and secure the outpost.",
    completed: false,
    rewardClaimed: false,
    objectives: [
      { id: "harvest_oak", label: "Harvest an Oak Tree", current: 0, target: 1, completed: false },
      { id: "refuel_fire", label: "Refuel the Campfire", current: 0, target: 1, completed: false },
      { id: "talk_vane_2", label: "Report back to Vane", current: 0, target: 1, completed: false },
    ],
  },
  outpost_foundations: {
    id: "outpost_foundations",
    title: "Outpost Foundations",
    description: "Establish the first perimeter. Construct three Stone Walls around the camp.",
    completed: false,
    rewardClaimed: false,
    objectives: [
      { id: "craft_block", label: "Craft Stone Blocks", current: 0, target: 3, completed: false },
      { id: "build_wall", label: "Place Stone Walls", current: 0, target: 3, completed: false },
      { id: "talk_vane_3", label: "Report back to Vane", current: 0, target: 1, completed: false },
    ],
  },
  outpost_sanctuary: {
    id: "outpost_sanctuary",
    title: "Outpost Sanctuary",
    description: "Secure your survival. Build an Outpost House and a Defense Tower.",
    completed: false,
    rewardClaimed: false,
    objectives: [
      { id: "build_house", label: "Place Outpost House", current: 0, target: 1, completed: false },
      { id: "build_tower", label: "Place Defense Tower", current: 0, target: 1, completed: false },
      { id: "talk_vane_4", label: "Report back to Vane", current: 0, target: 1, completed: false },
    ],
  },
};
