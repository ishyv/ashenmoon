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

  it("begins death-fade on animals instead of instantly spawning a carcass", () => {
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
        awarenessLevel: "unaware",
        awarenessDecaySec: 0,
      },
      health: { current: 0, max: 8, faction: "hostile", invulnTimer: 0 },
      loot: { xpReward: 4, drops: [{ itemId: "raw_meat", qty: 1 }] },
    };
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
      new Map([["animal_rabbit_1", { destroy: vi.fn() } as any]]),
      new Map(),
      { x: 0, y: 0 },
    );

    // Entity must stay alive — ecology system fades and despawns it.
    expect(world.entities.some((entity) => entity.id === "animal_rabbit_1")).toBe(true);
    // dyingSec is set — sprite sync lerps alpha to 0 over this window.
    expect(animal.animal?.dyingSec).toBeCloseTo(0.8);
    // No carcass yet — ecology system spawns it when dyingSec reaches 0.
    expect(world.with("carcass", "interactable").entities).toHaveLength(0);
    // No item drops — animals never drop loot directly.
    expect(world.with("pickup").entities).toHaveLength(0);
  });
});
