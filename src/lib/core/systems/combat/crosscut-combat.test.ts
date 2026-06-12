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

describe("Combat System - Crosscut Combo", () => {
  it("stores the first accepted normal attack as a Crosscut starter", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });

    expect(ctx.combat.crosscutState.firstClickWorldPosition).toEqual({ x: 132, y: 32 });
    expect(ctx.combat.crosscutState.firstPlayerPosition).toEqual({ x: 32, y: 32 });
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 1, y: 0 });
    expect(ctx.combat.crosscutState.firstAttackAtMs).toBeGreaterThan(0);
  });

  it("spends Crosscut stamina, starts cooldown, and applies grade-scaled damage", () => {
    const ctx = setupTest();
    const enemy: Entity = {
      id: "enemy_above",
      position: { x: 0, y: -56, targetX: 0, targetY: -56 },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    ctx.world.add(enemy);

    swing(ctx, { x: 132, y: 32 });
    const afterFirstSwing = stamina.current;
    swing(ctx, { x: 32, y: -100 });

    expect(ctx.combat.crosscutState.cooldownUntilMs).toBeGreaterThan(ctx.combat.currentTimeMs);
    expect(ctx.combat.crosscutState.firstDirection).toBeNull();
    expect(stamina.current).toBe(afterFirstSwing - ctx.combat.crosscutConfig.staminaCosts.excellent);
    expect(enemy.health?.current).toBe(84);
  });

  it("falls back to normal attack on failed angle and stores that click as the new starter", () => {
    const ctx = setupTest();

    swing(ctx, { x: 132, y: 32 });
    swing(ctx, { x: 232, y: 32 });

    expect(ctx.combat.crosscutState.firstClickWorldPosition).toEqual({ x: 232, y: 32 });
    expect(ctx.combat.crosscutState.firstDirection).toEqual({ x: 1, y: 0 });
    expect(ctx.combat.crosscutState.cooldownUntilMs).toBe(0);
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
    swing(ctx, { x: 32, y: -100 });

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
    expect(enemy.health?.current).toBe(81);
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
});
