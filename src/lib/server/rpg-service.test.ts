import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RpgPlayerState } from "$lib/domain/rpg-types";

const db = vi.hoisted(() => {
  let save: { playerStates: Record<string, unknown> } | null = null;
  return {
    loadLocalData: vi.fn(async () => save),
    saveLocalData: vi.fn(async (next: { playerStates: Record<string, unknown> }) => {
      save = structuredClone(next);
    }),
    setSave(next: { playerStates: Record<string, unknown> } | null) {
      save = next ? structuredClone(next) : null;
    },
    getSave() {
      return save;
    },
  };
});

vi.mock("./local-db", () => ({
  loadLocalData: db.loadLocalData,
  saveLocalData: db.saveLocalData,
}));

describe("normalizePlayerState", () => {
  beforeEach(async () => {
    db.setSave(null);
    const { resetRpgServiceCacheForTests } = await import("./rpg-service");
    resetRpgServiceCacheForTests();
  });

  it("repairs a GameState-shaped corrupted player record", async () => {
    const { normalizePlayerState } = await import("./rpg-service");

    const normalized = normalizePlayerState({
      rpg: {
        inventory: { slots: { stick: { qty: 2 } } },
        skills: { lumberjacking: { level: 2, xp: 5, nextXp: 200 } },
      },
      survival: { thirst: 100 },
    });

    expect(normalized.inventory.slots.stick).toEqual({ qty: 2 });
    expect(normalized.profile.hpCurrent).toBe(100);
    expect(normalized.skills.lumberjacking).toEqual({ level: 2, xp: 5, nextXp: 200 });
  });

  it("resets unrecoverable records to a valid player state", async () => {
    const { normalizePlayerState } = await import("./rpg-service");

    const normalized = normalizePlayerState({ nonsense: true });

    expect(normalized.profile.hpCurrent).toBe(100);
    expect(normalized.inventory.slots).toEqual({});
    expect(normalized.skills.superGather.level).toBe(1);
  });
});

describe("rpgService.build", () => {
  beforeEach(async () => {
    db.setSave(null);
    db.loadLocalData.mockClear();
    db.saveLocalData.mockClear();
    const { resetRpgServiceCacheForTests } = await import("./rpg-service");
    resetRpgServiceCacheForTests();
  });

  it("deducts domain build costs and records the building", async () => {
    const { rpgService } = await import("./rpg-service");
    const state = await rpgService.getPlayerState("user");
    state.inventory.slots = {
      stick: { qty: 4 },
      leaves: { qty: 7 },
    };
    await rpgService.savePlayerState("user", state);

    const next = await rpgService.build("user", "storage_pile", 12, 7);

    expect(next.inventory.slots.stick).toBeUndefined();
    expect(next.inventory.slots.leaves).toEqual({ qty: 1 });
    expect(next.profile.stashSize).toBe(40);
    expect(next.profile.buildings).toContainEqual(
      expect.objectContaining({ type: "storage_pile", x: 12, y: 7 }),
    );
  });

  it("rejects unknown buildings before charging materials", async () => {
    const { rpgService } = await import("./rpg-service");

    await expect(rpgService.build("user", "moon_palace", 0, 0)).rejects.toThrow(
      "Invalid building type",
    );
  });
});

describe("rpgService.craft", () => {
  beforeEach(async () => {
    db.setSave(null);
    db.loadLocalData.mockClear();
    db.saveLocalData.mockClear();
    const { resetRpgServiceCacheForTests } = await import("./rpg-service");
    resetRpgServiceCacheForTests();
  });

  it("crafts from the same persisted inventory populated by gathering", async () => {
    const { rpgService } = await import("./rpg-service");

    await rpgService.gather("user", "pickup", "stick", "pickup_stick");
    await rpgService.gather("user", "pickup", "flint_shard", "pickup_flint");
    await rpgService.gather("user", "pickup", "grass_fiber", "pickup_fiber");

    const next = await rpgService.craft("user", "flint_axe", { isNearCampfire: false });

    expect(next.inventory.slots.flint_axe).toEqual({ qty: 1 });
    expect(next.inventory.slots.stick).toBeUndefined();
    expect(next.inventory.slots.flint_shard).toBeUndefined();
    expect(next.inventory.slots.grass_fiber).toBeUndefined();
  });

  it("persists pickup quantities from definition-driven client pickups", async () => {
    const { rpgService } = await import("./rpg-service");

    const result = await rpgService.gather("user", "pickup", "grass_fiber", "pickup_fiber", 2);
    const next = await rpgService.getPlayerState("user");

    expect(result.materialsGained).toEqual([{ id: "grass_fiber", quantity: 2 }]);
    expect(next.inventory.slots.grass_fiber).toEqual({ qty: 2 });
  });

  it("normalizes corrupted save records before crafting", async () => {
    db.setSave({
      playerStates: {
        user: {
          rpg: {
            inventory: {
              slots: {
                stick: { qty: 1 },
                flint_shard: { qty: 1 },
                grass_fiber: { qty: 1 },
              },
            },
          },
        },
      },
    });
    const { resetRpgServiceCacheForTests, rpgService } = await import("./rpg-service");
    resetRpgServiceCacheForTests();

    const next = await rpgService.craft("user", "flint_axe", { isNearCampfire: false });

    expect(next.inventory.slots.flint_axe).toEqual({ qty: 1 });
    expect(db.getSave()?.playerStates.user).toMatchObject({
      inventory: { slots: { flint_axe: { qty: 1 } } },
    });
  });
});
