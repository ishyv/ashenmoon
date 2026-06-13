import { beforeEach, describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { Container } from "pixi.js";
import { CombatConfig, CombatResource } from "./combat";
import { drivingThrustSystem } from "./driving-thrust";
import { InputResource } from "$lib/core/input/input";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { MapResource, TILE } from "$lib/core/systems/map/map";
import { MovementResource } from "$lib/core/systems/movement/movement";
import { setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { setStamina, stamina } from "$lib/state/rpg/stamina.svelte";

vi.mock("$lib/core/vfx/vfx", async () => {
  const actual = await vi.importActual<typeof import("$lib/core/vfx/vfx")>("$lib/core/vfx/vfx");
  return {
    ...actual,
    flashEntity: vi.fn(),
    spawnDamageNumber: vi.fn(),
    spawnDrivingThrustSlash: vi.fn(),
    spawnEnvFloatingText: vi.fn(),
    triggerCameraShake: vi.fn(),
  };
});

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
  setListener: vi.fn(),
}));

function setup() {
  const world = new World<Entity>();
  const inputs = new InputResource();
  const combat = new CombatResource();
  const config = new CombatConfig();
  const movement = new MovementResource();
  const map = new MapResource();
  map.mapW = 20;
  map.mapH = 20;

  const player: Entity = {
    id: "player",
    position: { x: 5 * TILE, y: 5 * TILE, targetX: 5 * TILE, targetY: 5 * TILE },
    playerControlled: { speed: 200 },
    health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
  };
  world.add(player);

  const playerSprite = { x: 0, y: 0, scale: { x: 1 } } as any;
  const entityLayer = new Container();
  const vfx = { particles: [], slashArcs: [], shockwaveRings: [], hitFlashes: new Map(), cameraShake: { intensity: 0, duration: 0, time: 0 } } as any;
  const setPlayerAnim = vi.fn();
  const onEnemyKilled = vi.fn();

  setRpgSkills({
    lumberjacking: { level: 1, xp: 0, nextXp: 100 },
    mining: { level: 1, xp: 0, nextXp: 100 },
    evade: { level: 1, xp: 0, nextXp: 100 },
    fellSweep: { level: 1, xp: 0, nextXp: 100 },
    kiteCombo: { level: 1, xp: 0, nextXp: 100 },
  });
  setStamina(100);

  return { world, inputs, combat, config, movement, map, player, playerSprite, entityLayer, vfx, setPlayerAnim, onEnemyKilled };
}

function runThrust(setupResult: ReturnType<typeof setup>, dt: number) {
  const { world, inputs, combat, config, movement, map, player, playerSprite, entityLayer, vfx, setPlayerAnim, onEnemyKilled } = setupResult;
  drivingThrustSystem(
    world,
    inputs,
    combat,
    config,
    vfx,
    dt,
    player,
    playerSprite,
    setPlayerAnim,
    entityLayer,
    movement,
    map,
    false,
    onEnemyKilled,
  );
}

describe("Driving Thrust combat system", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("spends stamina, starts cooldown, lunges, and damages enemies inside the path", () => {
    const ctx = setup();
    const enemy: Entity = {
      id: "enemy",
      position: { x: 7 * TILE, y: 5 * TILE, targetX: 7 * TILE, targetY: 5 * TILE },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    };
    ctx.world.add(enemy);
    ctx.inputs.pendingDrivingThrust = {
      direction: { x: 1, y: 0 },
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 48, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 48, y: 0 },
    };

    runThrust(ctx, 0);
    expect(stamina.current).toBe(82);
    expect(ctx.combat.drivingThrustCooldownTimer).toBeCloseTo(3.5);

    runThrust(ctx, 0.12);
    runThrust(ctx, 0.07);

    expect(ctx.player.position!.x).toBeGreaterThan(5 * TILE);
    expect(enemy.health!.current).toBe(82);
    expect(enemy.knockback?.vx).toBeGreaterThan(0);
    expect(enemy.knockback?.vy).toBeCloseTo(0);
  });

  it("applies secondary damage and ignores enemies outside the capsule width", () => {
    const ctx = setup();
    const first: Entity = {
      id: "first",
      position: { x: 6.5 * TILE, y: 5 * TILE, targetX: 6.5 * TILE, targetY: 5 * TILE },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    };
    const second: Entity = {
      id: "second",
      position: { x: 7 * TILE, y: 5 * TILE, targetX: 7 * TILE, targetY: 5 * TILE },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    };
    const outside: Entity = {
      id: "outside",
      position: { x: 7 * TILE, y: 6 * TILE, targetX: 7 * TILE, targetY: 6 * TILE },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    };
    ctx.world.add(first);
    ctx.world.add(second);
    ctx.world.add(outside);
    ctx.inputs.pendingDrivingThrust = {
      direction: { x: 1, y: 0 },
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 48, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 48, y: 0 },
    };

    runThrust(ctx, 0);
    runThrust(ctx, 0.12);

    expect(first.health!.current).toBe(79); // 10 * 1.8 * 1.15 (2 hits) = 21 damage
    expect(second.health!.current).toBe(86); // 10 * 1.2 * 1.15 (2 hits) = 14 damage
    expect(outside.health!.current).toBe(100);
  });

  it("can apply hostile bleed on a successful roll", () => {
    const ctx = setup();
    ctx.combat.drivingThrustConfig.bleedChancePct = 100;
    const enemy: Entity = {
      id: "enemy",
      position: { x: 6.5 * TILE, y: 5 * TILE, targetX: 6.5 * TILE, targetY: 5 * TILE },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
    };
    ctx.world.add(enemy);
    ctx.inputs.pendingDrivingThrust = {
      direction: { x: 1, y: 0 },
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 48, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 48, y: 0 },
    };

    runThrust(ctx, 0);
    runThrust(ctx, 0.12);

    expect(enemy.bleed).toMatchObject({
      remainingSec: 6,
      tickEverySec: 2,
      damagePerTick: 2,
      sourceId: "driving_thrust",
    });
  });

  it("does not spend stamina while cooling down", () => {
    const ctx = setup();
    ctx.combat.drivingThrustCooldownTimer = 1;
    ctx.inputs.pendingDrivingThrust = {
      direction: { x: 1, y: 0 },
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 48, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 48, y: 0 },
    };

    runThrust(ctx, 0);

    expect(stamina.current).toBe(100);
    expect(ctx.inputs.pendingDrivingThrust).toBeNull();
  });

  it("clips lunge distance against solid walls", () => {
    const ctx = setup();
    ctx.map.solidCoords.add("7,5");
    ctx.inputs.pendingDrivingThrust = {
      direction: { x: 1, y: 0 },
      screenStart: { x: 0, y: 0 },
      screenEnd: { x: 48, y: 0 },
      worldStart: { x: 0, y: 0 },
      worldEnd: { x: 48, y: 0 },
    };

    const startX = ctx.player.position!.x;
    runThrust(ctx, 0);
    runThrust(ctx, 0.12);
    runThrust(ctx, 0.14);

    expect(ctx.player.position!.x - startX).toBeLessThan(140);
    expect(ctx.player.position!.x).toBeLessThan(7 * TILE);
  });
});

