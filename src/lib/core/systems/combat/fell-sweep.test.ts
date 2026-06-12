import { beforeEach, describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { InputResource } from "$lib/core/input/input";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { setStamina, stamina } from "$lib/domain/stamina.svelte";
import { CombatConfig, CombatResource, fellSweepSystem, updateFellSweepChargeSystem } from "./combat";
import { playSound } from "$lib/audio/audio-engine";
import { spawnEnvFloatingText, spawnShockwaveRing, spawnSlashArc } from "$lib/core/vfx/vfx";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
  spawnShockwaveRing: vi.fn(),
  spawnSlashArc: vi.fn(),
  triggerCameraShake: vi.fn(),
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

class TestInputResource extends InputResource {
  public heldMs = 0;

  override getMouseHeldMs(): number {
    return this.heldMs;
  }
}

function setup() {
  const world = new World<Entity>();
  const inputs = new TestInputResource();
  const combat = new CombatResource();
  const config = new CombatConfig();
  const vfx = { particles: [], shockwaveRings: [], floatingTexts: [] } as never;
  const player: Entity = {
    id: "player",
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
    knockback: { vx: 0, vy: 0, timer: 0 },
  };
  const playerSprite = { scale: { x: 1 }, x: 0, y: 0, tint: 0xffffff } as never;
  const entityLayer = { addChild: vi.fn(), removeChild: vi.fn() } as never;
  const setPlayerAnim = vi.fn();
  const onEnemyKilled = vi.fn();
  setStamina(100);
  inputs.mouseWorld = { x: 128, y: 32 };

  return { world, inputs, combat, config, vfx, player, playerSprite, entityLayer, setPlayerAnim, onEnemyKilled };
}

describe("Fell Sweep runtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a staged charge while the mouse is held", () => {
    const { inputs, combat, vfx, player, entityLayer } = setup();
    inputs.isMouseHeld = true;
    inputs.heldMs = 1600;

    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);

    expect(combat.fellSweepChargeState.isCharging).toBe(true);
    expect(combat.fellSweepChargeState.chargeProgress).toBeCloseTo(0.5);
    expect(combat.fellSweepChargeState.chargeStage).toBe("building");
  });

  it("denies cooldown charge once per hold attempt", () => {
    const { inputs, combat, vfx, player, entityLayer } = setup();
    inputs.isMouseHeld = true;
    inputs.heldMs = 1600;
    combat.fellSweepCooldownTimer = 2;

    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);
    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);

    expect(spawnEnvFloatingText).toHaveBeenCalledTimes(1);
    expect(spawnEnvFloatingText).toHaveBeenCalledWith(vfx, "Fell Sweep not ready", expect.any(Number), player.position, entityLayer);
    expect(playSound).toHaveBeenCalledWith("player.fellsweep.denied");
  });

  it("releases charged damage through the existing Fell Sweep attack", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, entityLayer, setPlayerAnim, onEnemyKilled } = setup();
    const enemy: Entity = {
      id: "enemy",
      position: { x: 80, y: 0, targetX: 80, targetY: 0 },
      health: { current: 100, max: 100, faction: "hostile", invulnTimer: 0 },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    world.add(enemy);
    inputs.isMouseHeld = true;
    inputs.heldMs = 3000;
    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);
    inputs.isMouseHeld = false;
    inputs.pendingFellSweep = true;

    fellSweepSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, false, false, 1, onEnemyKilled);

    expect(enemy.health?.current).toBeLessThan(100);
    expect(stamina.current).toBe(80);
    expect(combat.fellSweepCooldownTimer).toBe(8);
    expect(spawnSlashArc).toHaveBeenCalled();
    expect(playSound).toHaveBeenCalledWith("player.fellsweep.release.high");
    expect(spawnShockwaveRing).toHaveBeenCalled();
  });

  it("refuses release without stamina and does not start cooldown", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, entityLayer, setPlayerAnim, onEnemyKilled } = setup();
    setStamina(5);
    inputs.pendingFellSweep = true;
    combat.fellSweepChargeState = {
      ...combat.fellSweepChargeState,
      isCharging: true,
      chargeProgress: 1,
      chargeStage: "full",
      aimDirection: { x: 1, y: 0 },
    };

    fellSweepSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, false, false, 1, onEnemyKilled);

    expect(combat.fellSweepCooldownTimer).toBe(0);
    expect(spawnEnvFloatingText).toHaveBeenCalledWith(vfx, "too winded to charge", expect.any(Number), player.position, entityLayer);
    expect(playSound).toHaveBeenCalledWith("player.fellsweep.denied");
  });

  it("cancels active charge when knockback starts", () => {
    const { inputs, combat, vfx, player, entityLayer } = setup();
    inputs.isMouseHeld = true;
    inputs.heldMs = 1600;
    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);
    player.knockback!.timer = 0.1;

    updateFellSweepChargeSystem(inputs, combat, vfx, 0.016, player, entityLayer, false, false);

    expect(combat.fellSweepChargeState.isCharging).toBe(false);
    expect(combat.fellSweepChargeState.interrupted).toBe(true);
    expect(playSound).toHaveBeenCalledWith("player.fellsweep.cancel");
  });
});
