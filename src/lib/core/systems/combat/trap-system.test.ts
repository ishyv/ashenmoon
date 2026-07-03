import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { tickTrapSystem } from "./trap-system";
import { CombatConfig } from "$lib/core/systems/combat/combat";
import { moveAnimalToward } from "$lib/core/systems/animals/animal-movement";
import type { MapResource } from "$lib/core/systems/map/map";
import { TILE } from "$lib/core/systems/map/map";

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

describe("trap-system", () => {
  function animal(overrides: Partial<NonNullable<Entity["animal"]>> = {}): NonNullable<Entity["animal"]> {
    return {
      speciesId: "wolf",
      behavior: "idle",
      hunger: 50,
      threatened: false,
      attackCooldownSec: 0,
      home: { x: 0, y: 0 },
      wanderTimerSec: 0,
      facingX: 1,
      animState: "idle",
      awarenessLevel: "unaware",
      awarenessDecaySec: 0,
      ...overrides,
    };
  }

  const setupTest = () => {
    const world = new World<Entity>();
    const config = new CombatConfig();
    const vfx = { floatingTexts: [], particles: [] } as any;
    const entityLayer = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    } as any;
    const entitySprites = new Map<string, any>();

    return {
      world,
      config,
      vfx,
      entityLayer,
      entitySprites,
    };
  };

  it("triggers snap trap and slows animal when close", () => {
    const { world, config, vfx, entityLayer, entitySprites } = setupTest();

    // 1. Create a set snap trap building at (0, 0)
    const trap = world.add({
      id: "snap_trap_1",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      building: { type: "snap_trap", stage: 5 },
      trap: { type: "snap", state: "set" },
      interactable: { name: "disarm snap trap", action: "process" },
    });

    // 2. Create a hostile wolf near (0, 0)
    const wolf = world.add({
      id: "wolf_1",
      position: { x: 5, y: 5, targetX: 5, targetY: 5 },
      animal: animal(),
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    });

    // Run system tick
    tickTrapSystem(world, 0.1, vfx, entityLayer, entitySprites, config);

    // Verify trap is sprung
    expect(trap.trap?.state).toBe("sprung");
    expect(trap.interactable?.name).toBe("reset snap trap");

    // Verify wolf took damage (25 hp less)
    expect(wolf.health?.current).toBe(75);

    // Verify wolf slow is applied
    expect(wolf.animal?.slowTimerSec).toBe(4.0);
    expect(wolf.animal?.slowMultiplier).toBe(0.15);
  });

  it("applies slow multiplier to animal movement speed", () => {
    const map = {
      mapW: 10,
      mapH: 10,
      cells: new Array(100).fill(0),
      solidCoords: new Set(),
      customSolids: new Map(),
      inBounds: (gx: number, gy: number) => gx >= 0 && gx < 10 && gy >= 0 && gy < 10,
    } as unknown as MapResource;

    const wolf: Entity = {
      id: "wolf_1",
      position: { x: 10, y: 10, targetX: 10, targetY: 10 },
      animal: animal({ slowTimerSec: 3.0, slowMultiplier: 0.1 }),
    };

    // Wolf base speed is 100px/s. With 0.1x multiplier, it should only move 1px in 0.1s instead of 10px.
    moveAnimalToward(wolf, map, 100, 10, 100, 0.1);

    expect(wolf.position?.x).toBeCloseTo(10.88, 2);
  });

  it("triggers caltrops and applies bleed and slow", () => {
    const { world, config, vfx, entityLayer, entitySprites } = setupTest();

    const caltrops = world.add({
      id: "caltrops_1",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      building: { type: "caltrops", stage: 5 },
      trap: { type: "caltrops", state: "set", usesRemaining: 3 },
    });

    const wolf = world.add({
      id: "wolf_1",
      position: { x: 5, y: 5, targetX: 5, targetY: 5 },
      animal: animal(),
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    });

    tickTrapSystem(world, 0.1, vfx, entityLayer, entitySprites, config);

    // Wolf took damage
    expect(wolf.health?.current).toBe(94); // 100 - 6

    // Bleed applied
    expect(wolf.bleed?.remainingSec).toBe(6);
    expect(wolf.bleed?.damagePerTick).toBe(2);

    // Uses remaining decremented
    expect(caltrops.trap?.usesRemaining).toBe(2);
  });

  it("triggers bait decoy and lowers wolf hunger", () => {
    const { world, config, vfx, entityLayer, entitySprites } = setupTest();

    const decoy = world.add({
      id: "decoy_1",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      building: { type: "bait_decoy", stage: 5 },
      trap: { type: "decoy", state: "set" },
    });

    const wolf = world.add({
      id: "wolf_1",
      position: { x: 5, y: 5, targetX: 5, targetY: 5 },
      animal: animal({ hunger: 80 }),
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    });

    tickTrapSystem(world, 0.1, vfx, entityLayer, entitySprites, config);

    // Decoy is despawned
    expect(world.entities).not.toContain(decoy);

    // Wolf hunger is reduced
    expect(wolf.animal?.hunger).toBe(40); // 80 - 40
  });
});
