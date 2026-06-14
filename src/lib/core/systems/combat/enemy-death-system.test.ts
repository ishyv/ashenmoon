import { beforeEach, describe, expect, it, vi } from "vitest";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { handleEnemyDeathSystem } from "./enemy-death-system";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnDeathBurst: vi.fn(),
  spawnLevelUpBurst: vi.fn(),
  spawnEnvFloatingText: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/state/rpg/skill-xp", () => ({
  awardSkillXp: vi.fn(),
}));

vi.mock("$lib/state/rpg/stats.svelte", () => ({
  awardCharacterXp: vi.fn(() => 0),
}));

function clearWorld(): void {
  for (const entity of [...world.entities]) world.remove(entity);
}

describe("enemy death system", () => {
  beforeEach(clearWorld);

  it("turns dead animals into carcass entities instead of instant material drops", () => {
    const animal: Entity = {
      id: "animal_rabbit_1",
      position: { x: 128, y: 192, targetX: 128, targetY: 192 },
      animal: {
        speciesId: "rabbit",
        behavior: "idle",
        hunger: 0,
        threatened: false,
        attackCooldownSec: 0,
        home: { x: 160, y: 224 },
        wanderTimerSec: 0,
        facingX: 1,
        animState: "idle",
      },
      health: { current: 0, max: 8, faction: "hostile", invulnTimer: 0 },
      loot: { xpReward: 4, drops: [{ itemId: "raw_meat", qty: 1 }] },
    };
    const removedSprite = { destroy: vi.fn() };
    world.add(animal);

    const vfx = {
      particles: [],
      activeShakes: new Map(),
      baseScales: new Map(),
      hitFlashes: new Map(),
    };

    handleEnemyDeathSystem(
      animal,
      vfx as any,
      { addChild: vi.fn(), removeChild: vi.fn() } as any,
      new Map([["animal_rabbit_1", removedSprite as any]]),
      new Map(),
      { x: 0, y: 0 },
    );

    expect(world.entities.some((entity) => entity.id === "animal_rabbit_1")).toBe(false);
    const carcasses = world.with("carcass", "interactable").entities;
    expect(carcasses).toHaveLength(1);
    expect(carcasses[0]?.carcass).toMatchObject({
      speciesId: "rabbit",
      state: "fresh",
      processedActions: [],
    });
    expect(world.with("pickup").entities).toHaveLength(0);
  });
});
