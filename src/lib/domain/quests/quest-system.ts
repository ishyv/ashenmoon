import { GameEvent } from "$lib/domain/game-events";
import type { Quest } from "./quest-types";

/**
 * Pure quest objective matching logic.
 * Returns true if the objective matches the triggered event.
 */
export function isObjectiveMatch(
  objectiveId: string,
  action: string,
  itemId?: string,
): boolean {
  switch (action) {
    case GameEvent.Boil:
      return objectiveId === "boil_water" && itemId === "clean_water";
    case GameEvent.Consume:
      return objectiveId === "drink_water" && itemId === "clean_water";
    case GameEvent.Refuel:
      return objectiveId === "warm_fire" || objectiveId === "refuel_fire";
    case GameEvent.Pickup:
      if (objectiveId === "gather_stick" && itemId === "stick") return true;
      if (objectiveId === "gather_flint" && itemId === "flint_shard") return true;
      if (objectiveId === "gather_fiber" && itemId === "grass_fiber") return true;
      return false;
    case GameEvent.Craft:
      if (objectiveId === "craft_axe" && itemId === "flint_axe") return true;
      if (objectiveId === "craft_block" && itemId === "stone_block") return true;
      return false;
    case GameEvent.Harvest:
      return objectiveId === "harvest_oak" && itemId === "oak_wood";
    case GameEvent.Build:
      if (objectiveId === "build_wall" && itemId === "wall") return true;
      if (objectiveId === "build_house" && itemId === "house1") return true;
      if (objectiveId === "build_tower" && itemId === "tower") return true;
      return false;
    case GameEvent.Talk:
      // Talk objectives are usually triggered directly by the dialogue system,
      // but we include them here for completeness if needed.
      return objectiveId.startsWith("talk_vane");
    default:
      return false;
  }
}

/**
 * Advance a quest's objectives based on an action.
 * Mutates the objectives in the provided quest object.
 * Returns true if any objective was updated.
 */
export function advanceQuest(
  quest: Quest,
  action: string,
  itemId?: string,
  amount = 1,
): boolean {
  if (quest.completed) return false;

  let changed = false;
  for (const obj of quest.objectives) {
    if (obj.completed) continue;

    if (isObjectiveMatch(obj.id, action, itemId)) {
      obj.current = Math.min(obj.target, obj.current + amount);
      if (obj.current >= obj.target) {
        obj.completed = true;
      }
      changed = true;
    }
  }

  return changed;
}
