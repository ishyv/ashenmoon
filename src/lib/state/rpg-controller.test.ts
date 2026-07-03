import { describe, expect, it } from "vitest";
import { createDefaultPlayerState } from "$lib/domain/rpg-defaults";
import { gameState } from "$lib/state/game-state.svelte";
import { saveLocalRpgState } from "$lib/state/persistence/rpg-commands";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { rpgEventQueue } from "$lib/state/rpg/rpg-feedback-router";

function clearRpgState(): void {
  const state = createDefaultPlayerState();
  gameState.rpg.profile = state.profile;
  gameState.rpg.inventory = state.inventory;
  gameState.rpg.skills = state.skills;
  saveLocalRpgState(state);
  rpgEventQueue.drain();
}

describe("rpg controller", () => {
  it("uses the live equipped tool when gather is dispatched immediately after equip", async () => {
    clearRpgState();
    gameState.rpg.inventory = { slots: { stone_pickaxe: { qty: 1 } } };

    const equip = await dispatchRpgCommand({ type: "equipTool", itemId: "stone_pickaxe" });
    const gather = await dispatchRpgCommand({ type: "gather", action: "mine", locationId: "stone_mine" });

    expect(equip.ok).toBe(true);
    expect(gather.ok).toBe(true);
    if (!gather.ok) return;

    const weapon = gather.data.playerState.profile.loadout.weapon;
    expect(weapon && typeof weapon === "object" ? weapon.itemId : null).toBe("stone_pickaxe");
    expect(weapon && typeof weapon === "object" ? weapon.durability : null).toBe(95);
    expect(gameState.rpg.inventory?.slots.stone).toEqual({ qty: 1 });
  });

  it("serializes fire-and-forget commands in dispatch order", async () => {
    clearRpgState();
    gameState.rpg.inventory = { slots: { stone_pickaxe: { qty: 1 } } };

    const equip = dispatchRpgCommand({ type: "equipTool", itemId: "stone_pickaxe" });
    const gather = dispatchRpgCommand({ type: "gather", action: "mine", locationId: "stone_mine" });

    const [equipResult, gatherResult] = await Promise.all([equip, gather]);

    expect(equipResult.ok).toBe(true);
    expect(gatherResult.ok).toBe(true);
    if (!gatherResult.ok) return;

    const weapon = gatherResult.data.playerState.profile.loadout.weapon;
    expect(weapon && typeof weapon === "object" ? weapon.itemId : null).toBe("stone_pickaxe");
    expect(weapon && typeof weapon === "object" ? weapon.durability : null).toBe(95);
  });

  it("emits a craft event when a craft command succeeds", async () => {
    clearRpgState();
    gameState.rpg.inventory = {
      slots: {
        stick: { qty: 1 },
        flint_shard: { qty: 1 },
        grass_fiber: { qty: 1 },
      },
    };
    saveLocalRpgState({
      profile: gameState.rpg.profile!,
      inventory: gameState.rpg.inventory,
      skills: gameState.rpg.skills!,
    });

    const result = await dispatchRpgCommand({
      type: "craft",
      recipeId: "flint_axe",
      context: { isNearCampfire: false, stationId: "primitive_work_surface" },
    });

    expect(result.ok).toBe(true);
    expect(rpgEventQueue.drain()).toContainEqual({
      type: "item_crafted",
      actorId: "player",
      recipeId: "flint_axe",
      itemId: "flint_axe",
      qty: 1,
    });
  });

  it("emits a craft failure event when crafting fails", async () => {
    clearRpgState();
    gameState.rpg.inventory = { slots: {} };
    saveLocalRpgState({
      profile: gameState.rpg.profile!,
      inventory: gameState.rpg.inventory,
      skills: gameState.rpg.skills!,
    });

    const result = await dispatchRpgCommand({
      type: "craft",
      recipeId: "flint_axe",
      context: { isNearCampfire: false, stationId: "primitive_work_surface" },
    });

    expect(result.ok).toBe(false);
    expect(rpgEventQueue.drain()).toEqual([
      {
        type: "craft_failed",
        actorId: "player",
        recipeId: "flint_axe",
        reason: "insufficient_materials",
      },
    ]);
  });
});
