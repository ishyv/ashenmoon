import { GameEvent } from "$lib/domain/game-events";

export interface QuestObjective {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: QuestObjective[];
  completed: boolean;
  rewardClaimed: boolean;
}

export const activeQuests = $state<{
  currentQuestId: string | null;
  quests: Record<string, Quest>;
}>({
  currentQuestId: null, // null until Vane gives the first quest
  quests: {
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
  },
});

export const dialogueState = $state<{
  activeNpc: { id: string; name: string } | null;
}>({
  activeNpc: null,
});

/**
 * Triggers quest events on player actions. Updates objectives accordingly.
 */
export function triggerQuestEvent(action: string, itemId?: string, amount = 1): void {
  const questId = activeQuests.currentQuestId;
  if (!questId) return;

  const quest = activeQuests.quests[questId];
  if (!quest || quest.completed) return;

  for (const obj of quest.objectives) {
    if (obj.completed) continue;

    let match = false;
    if (action === GameEvent.Boil && obj.id === "boil_water" && itemId === "clean_water") {
      match = true;
    } else if (action === GameEvent.Consume && obj.id === "drink_water" && itemId === "clean_water") {
      match = true;
    } else if (action === GameEvent.Refuel && obj.id === "warm_fire") {
      match = true;
    } else if (action === GameEvent.Pickup && obj.id === "gather_stick" && itemId === "stick") {
      match = true;
    } else if (action === GameEvent.Pickup && obj.id === "gather_flint" && itemId === "flint_shard") {
      match = true;
    } else if (action === GameEvent.Pickup && obj.id === "gather_fiber" && itemId === "grass_fiber") {
      match = true;
    } else if (action === GameEvent.Craft && obj.id === "craft_axe" && itemId === "flint_axe") {
      match = true;
    } else if (action === GameEvent.Harvest && obj.id === "harvest_oak" && itemId === "oak_wood") {
      match = true;
    } else if (action === GameEvent.Refuel && obj.id === "refuel_fire") {
      match = true;
    } else if (action === GameEvent.Craft && obj.id === "craft_block" && itemId === "stone_block") {
      match = true;
    } else if (action === GameEvent.Build && obj.id === "build_wall" && itemId === "wall") {
      match = true;
    } else if (action === GameEvent.Build && obj.id === "build_house" && itemId === "house1") {
      match = true;
    } else if (action === GameEvent.Build && obj.id === "build_tower" && itemId === "tower") {
      match = true;
    }


    if (match) {
      obj.current = Math.min(obj.target, obj.current + amount);
      if (obj.current >= obj.target) {
        obj.completed = true;
      }
    }
  }
}
