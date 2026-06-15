import type { CraftContext } from "$lib/domain/crafting/crafting-system";
import { getRecipe } from "$lib/domain/crafting/recipes";
import { createDefaultProfile, createDefaultSkills } from "$lib/domain/rpg-defaults";
import {
  reduceRpgCommand,
  type GatherSync,
  type ExperimentSync,
  type RpgReducerResult,
} from "$lib/domain/rpg-reducer";
import type {
  RpgEnvironmentTickResult,
  RpgPlayerState,
} from "$lib/domain/rpg-types";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import {
  getLocalRpgState,
  saveLocalRpgState,
} from "$lib/state/persistence/rpg-commands";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { playerRpgEntityId, rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";

export type RpgCommand =
  | { type: "equipTool"; itemId: string | null }
  | {
      type: "equipGear";
      itemId: string | null;
      slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace";
    }
  | { type: "pickup"; itemId: string; pickupId: string; quantity?: number }
  | { type: "gather"; action: "mine" | "forest"; locationId: string }
  | { type: "refuel" }
  | { type: "craft"; recipeId: string; context: CraftContext }
  | { type: "experiment"; inputs: Record<string, number>; context: CraftContext }
  | { type: "build"; buildingType: string; x: number; y: number; sourceItemId?: string }
  | { type: "destroyBuilding"; buildingId: string }
  | { type: "placeItem"; itemId: string; quantity?: number }
  | { type: "environmentTick"; environment: { temperature: number; humidity: number; toxins: number } };

type CommandData = {
  equipTool: { playerState: RpgPlayerState };
  equipGear: { playerState: RpgPlayerState };
  pickup: { playerState: RpgPlayerState };
  gather: GatherSync;
  refuel: { playerState: RpgPlayerState };
  craft: { playerState: RpgPlayerState };
  experiment: ExperimentSync;
  build: { playerState: RpgPlayerState };
  destroyBuilding: { playerState: RpgPlayerState };
  placeItem: { playerState: RpgPlayerState };
  environmentTick: RpgEnvironmentTickResult;
};

export type RpgCommandResult<C extends RpgCommand = RpgCommand> =
  | { ok: true; data: CommandData[C["type"]] }
  | { ok: false; error: string };

let commandQueue: Promise<void> = Promise.resolve();

function currentPlayerState(): RpgPlayerState {
  const saved = getLocalRpgState();
  const snapshot = $state.snapshot(gameState.rpg);
  return {
    profile: snapshot.profile ?? createDefaultProfile(),
    inventory: snapshot.inventory ?? { slots: {} },
    skills: snapshot.skills ?? createDefaultSkills(),
    ...(saved.runSettings !== undefined ? { runSettings: saved.runSettings } : {}),
  };
}

function runCommand<C extends RpgCommand>(command: C): CommandData[C["type"]] {
  return reduceRpgCommand(currentPlayerState(), command, {
    freeBuilding: devFlags.freeBuildingEnabled,
  }) as CommandData[C["type"]];
}

function playerStateFromResult(data: CommandData[RpgCommand["type"]]): RpgPlayerState {
  return data.playerState;
}

function emitCommandEvents<C extends RpgCommand>(command: C, data: CommandData[C["type"]]): void {
  if (command.type === "craft") {
    const recipe = getRecipe(command.recipeId);
    rpgEventQueue.push({
      type: "item_crafted",
      actorId: playerRpgEntityId(),
      recipeId: command.recipeId,
      itemId: recipe?.output.itemId ?? command.recipeId,
      qty: recipe?.output.qty ?? 1,
    });
    return;
  }

  if (command.type === "experiment") {
    const experimentData = data as CommandData["experiment"];
    if (experimentData.success && experimentData.recipeId) {
      rpgEventQueue.push({
        type: "recipe_discovered",
        actorId: playerRpgEntityId(),
        recipeId: experimentData.recipeId,
      });
    } else if (!experimentData.success) {
      rpgEventQueue.push({
        type: "craft_failed",
        actorId: playerRpgEntityId(),
        reason: experimentData.reason ?? "experiment_failed",
      });
    }
  }
}

function emitCommandFailure(command: RpgCommand, reason: string): void {
  if (command.type === "craft") {
    rpgEventQueue.push({
      type: "craft_failed",
      actorId: playerRpgEntityId(),
      recipeId: command.recipeId,
      reason,
    });
  } else if (command.type === "experiment") {
    rpgEventQueue.push({
      type: "craft_failed",
      actorId: playerRpgEntityId(),
      reason,
    });
  }
}

/**
 * The only write gate for active RPG state.
 *
 * JS does not need a real mutex, but gameplay systems do need deterministic
 * ordering. This queue makes rapid fire-and-forget commands behave like one
 * serialized transaction stream over the current reactive RPG state.
 */
export function dispatchRpgCommand<C extends RpgCommand>(command: C): Promise<RpgCommandResult<C>> {
  const execution = commandQueue.then(() => {
    try {
      const data = runCommand(command) as CommandData[C["type"]];
      applyRpgState(playerStateFromResult(data));
      saveLocalRpgState(playerStateFromResult(data));
      emitCommandEvents(command, data);
      return { ok: true, data } satisfies RpgCommandResult<C>;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      emitCommandFailure(command, message);
      return { ok: false, error: message } satisfies RpgCommandResult<C>;
    }
  });

  commandQueue = execution.then(
    () => undefined,
    () => undefined,
  );
  return execution;
}

export function equipTool(itemId: string | null): Promise<RpgCommandResult<{ type: "equipTool"; itemId: string | null }>> {
  return dispatchRpgCommand({ type: "equipTool", itemId });
}

export function equipGear(
  itemId: string | null,
  slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace",
): Promise<
  RpgCommandResult<{
    type: "equipGear";
    itemId: string | null;
    slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace";
  }>
> {
  return dispatchRpgCommand({ type: "equipGear", itemId, slot });
}
