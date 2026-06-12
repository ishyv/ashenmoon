import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { InputResource } from "$lib/core/input/input";
import { MovementResource } from "$lib/core/systems/movement/movement";
import { setStamina, stamina } from "$lib/domain/stamina.svelte";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
  tickEnemyBleedSystem,
} from "./combat";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
  spawnShockwaveRing: vi.fn(),
  spawnSlashArc: vi.fn(),
  spawnCrosscutSlash: vi.fn(),
  spawnFourfoldFinisherSlash: vi.fn(),
  triggerCameraShake: vi.fn(),
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
  setListener: vi.fn(),
}));

function setupTest() {
  const world = new World<Entity>();
  const inputs = new InputResource();
  const combat = new CombatResource();
  const config = new CombatConfig();
  const movement = new MovementResource();
  const vfx = { particles: [], slashArcs: [] } as any;
  const player: Entity = {
    id: "player_test",
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
  };
  const playerSprite = { scale: { x: 1 } } as any;
  const setPlayerAnim = vi.fn();
  const entityLayer = { addChild: vi.fn(), removeChild: vi.fn() } as any;
  const onEnemyKilled = vi.fn();
  setStamina(100);

  return {
    world,
    inputs,
    combat,
    config,
    movement,
    vfx,
    player,
    playerSprite,
    setPlayerAnim,
    entityLayer,
    onEnemyKilled,
  };
}

function swing(ctx: ReturnType<typeof setupTest>, mouseWorld: { x: number; y: number }): void {
  ctx.combat.attackCooldownTimer = 0;
  ctx.inputs.mouseWorld = mouseWorld;
  ctx.inputs.pendingAttack = true;
  playerAttackSystem(
    ctx.world,
    ctx.inputs,
    ctx.combat,
    ctx.config,
    ctx.vfx,
    0.016,
    ctx.player,
    ctx.playerSprite,
    ctx.setPlayerAnim,
    ctx.entityLayer,
    ctx.movement,
    false,
    ctx.onEnemyKilled,
  );
}

function tickCombat(ctx: ReturnType<typeof setupTest>): void {
  playerAttackSystem(
    ctx.world,
    ctx.inputs,
    ctx.combat,
    ctx.config,
    ctx.vfx,
    0.016,
    ctx.player,
    ctx.playerSprite,
    ctx.setPlayerAnim,
    ctx.entityLayer,
    ctx.movement,
    false,
    ctx.onEnemyKilled,
  );
}

describe("Combat System - Crosscut Combo", () => {
  it("stores the first accepted normal attack as a Crosscut starter", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });

    expect(ctx.combat.crosscutState.firstClickWorldPosition).toEqual({ x: 132, y: 32 });
    expect(ctx.combat.crosscutState.firstPlayerPosition).toEqual({ x: 32, y: 32 });
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 1, y: 0 });
    expect(ctx.combat.crosscutState.firstAttackAtMs).toBeGreaterThan(0);
  });

  it("spends Crosscut stamina, advances chain, and applies grade-scaled damage", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_above",
      position: { x: 0, y: -56, targetX: 0, targetY: -56 },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    ctx.world.add(enemy);
    ctx.combat.crosscutConfig.effects.excellent.bleedChancePct = 0;

    swing(ctx, { x: 132, y: 32 });
    const afterFirstSwing = stamina.current;
    swing(ctx, { x: 32, y: -100 });

    expect(ctx.combat.crosscutState.cooldownUntilMs).toBe(0);
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 0, y: -1 });
    expect(ctx.combat.crosscutState.stacks).toBe(1);
    expect(stamina.current).toBe(afterFirstSwing - ctx.combat.crosscutConfig.staminaCosts.excellent);
    expect(enemy.health?.current).toBe(83);
  });

  it("applies cooldown on failed angle and clears the crosscut state", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });
    swing(ctx, { x: 232, y: 32 });

    expect(ctx.combat.crosscutState.firstClickWorldPosition).toBeNull();
    expect(ctx.combat.crosscutState.firstDirection).toBeNull();
    expect(ctx.combat.crosscutState.cooldownUntilMs).toBeGreaterThan(0);
  });

  it("clears Crosscut starter when dashing blocks an attack", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });
    ctx.movement.isDashing = true;
    swing(ctx, { x: 32, y: -100 });

    expect(ctx.combat.crosscutState.firstDirection).toBeNull();
  });

  it("clears Crosscut starter when the equipped weapon changes", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });
    ctx.combat.lastCrosscutWeaponId = "old_weapon";
    tickCombat(ctx);

    expect(ctx.combat.crosscutState.firstDirection).toBeNull();
  });

  it("adds hostile bleed and immediate bleed damage when the bleed roll succeeds", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_bleed",
      position: { x: 0, y: -56, targetX: 0, targetY: -56 },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    ctx.world.add(enemy);
    ctx.combat.crosscutConfig.effects.excellent.bleedChancePct = 100;

    swing(ctx, { x: 132, y: 32 });
    swing(ctx, { x: 32, y: -100 });

    expect(enemy.bleed).toMatchObject({
      remainingSec: 6,
      tickEverySec: 2,
      tickTimer: 2,
      damagePerTick: 3,
      sourceId: "crosscut:excellent",
    });
    expect(enemy.health?.current).toBe(80);
  });

  it("ticks hostile bleed damage and reports bleed deaths through the normal death callback", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_bleed_tick",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      health: { current: 3, max: 100, faction: "hostile", invulnTimer: 0 },
      bleed: {
        remainingSec: 6,
        tickEverySec: 2,
        tickTimer: 0,
        damagePerTick: 3,
        sourceId: "crosscut:excellent",
      },
    };
    ctx.world.add(enemy);

    tickEnemyBleedSystem(ctx.world, ctx.combat, ctx.config, ctx.vfx, ctx.entityLayer, 0.016, ctx.onEnemyKilled);

    expect(enemy.health?.current).toBe(0);
    expect(ctx.onEnemyKilled).toHaveBeenCalledWith(enemy);
  });

  it("supports infinite chaining of crosscuts with dynamic window decay", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_stacked",
      position: { x: 0, y: -56, targetX: 0, targetY: -56 },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    ctx.world.add(enemy);

    // Initial click 1: right (primes)
    swing(ctx, { x: 132, y: 32 });
    expect(ctx.combat.crosscutState.stacks).toBe(0);

    // Click 2: up (excellent crosscut 1)
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.crosscutState.stacks).toBe(1);
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 0, y: -1 });

    // Click 3: right (excellent crosscut 2)
    // Relative to player (32, 32): x=32+100=132, y=32. Direction (1, 0) is perpendicular to (0, -1)
    swing(ctx, { x: 132, y: 32 });
    expect(ctx.combat.crosscutState.stacks).toBe(2);
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 1, y: 0 });

    // Click 4: up (excellent crosscut 3)
    // Relative to player (32, 32): x=32, y=32-132=-100. Direction (0, -1) is perpendicular to (1, 0)
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.crosscutState.stacks).toBe(3);
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 0, y: -1 });
  });

  it("applies cooldown if an active chain times out", () => {
    const ctx = setupTest();

    // Click 1: right (primes)
    swing(ctx, { x: 132, y: 32 });
    // Click 2: up (excellent crosscut 1)
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.crosscutState.stacks).toBe(1);

    // Advance time by 1 second (longer than decayed window 650 * 0.85 = 552.5ms)
    ctx.combat.currentTimeMs += 1000;

    // Click 3: left (should fail because of timeout)
    swing(ctx, { x: -68, y: 32 });

    expect(ctx.combat.crosscutState.stacks).toBe(0);
    expect(ctx.combat.crosscutState.firstDirection).toBeNull();
    expect(ctx.combat.crosscutState.cooldownUntilMs).toBeGreaterThan(0);
  });

  it("does not prevent normal attacks from happening and resolves finisher on 4th unique direction click", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_360",
      position: { x: 0, y: -56, targetX: 0, targetY: -56 },
      health: { current: 150, max: 150, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    ctx.world.add(enemy);

    // Initial click 1: top. Starts combo, does normal attack.
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.fourfoldState.inputs).toEqual(["top"]);
    const hp1 = enemy.health?.current ?? 150;
    expect(hp1).toBeLessThan(150); // damaged by basic attack

    // Click 2: right. Progresses combo, does normal attack.
    enemy.health!.invulnTimer = 0;
    swing(ctx, { x: 132, y: 32 });
    expect(ctx.combat.fourfoldState.inputs).toEqual(["top", "right"]);
    const hp2 = enemy.health?.current ?? hp1;
    expect(hp2).toBe(hp1); // points away from enemy (above), so no damage

    // Click 3: bottom. Progresses combo, does normal attack.
    enemy.health!.invulnTimer = 0;
    swing(ctx, { x: 32, y: 132 });
    expect(ctx.combat.fourfoldState.inputs).toEqual(["top", "right", "bottom"]);
    const hp3 = enemy.health?.current ?? hp2;
    expect(hp3).toBe(hp2); // points away from enemy (above), so no damage

    // Click 4: left. Completes combo, triggers Wheel Slash finisher!
    // Wheel Slash damage multiplier: 2.2
    enemy.health!.invulnTimer = 0;
    swing(ctx, { x: -68, y: 32 });
    expect(ctx.combat.fourfoldState.inputs).toEqual([]);
    expect(enemy.health?.current).toBeLessThan(hp3 - 10); // massive damage from 360 finisher!
  });

  it("clears fourfold buffer after failed repeated input", () => {
    const ctx = setupTest();

    // Click 1: top
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.fourfoldState.inputs).toEqual(["top"]);

    // Click 2: top (repeated, failed)
    swing(ctx, { x: 32, y: -100 });
    expect(ctx.combat.fourfoldState.inputs).toEqual([]);
  });
});
