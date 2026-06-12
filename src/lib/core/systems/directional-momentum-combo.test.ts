import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
} from "$lib/core/systems/combat";
import {
  getComboDirection,
  getVectorFromDirection,
  breakCombo,
} from "$lib/core/systems/directional-momentum-combo";
import { InputResource } from "$lib/core/input";
import { MovementResource } from "$lib/core/systems/movement";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { gameState } from "$lib/state/game-state.svelte";
import { stamina, setStamina } from "$lib/domain/stamina.svelte";
import { InputAction } from "$lib/domain/game-events";

vi.mock("$lib/core/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnSlashArc: vi.fn(),
  triggerCameraShake: vi.fn(),
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
}));

class MockInputResource extends InputResource {
  public pressed: Set<string> = new Set();
  
  constructor() {
    super();
  }

  override isActionPressed(action: string): boolean {
    return this.pressed.has(action);
  }
}

describe("Combat System - Directional Momentum Combo", () => {
  const setupTest = () => {
    const world = new World<Entity>();
    const inputs = new MockInputResource();
    const combat = new CombatResource();
    const config = new CombatConfig();
    const movement = new MovementResource();
    const vfx = { particles: [], comboRing: { visible: false, clear: vi.fn(), x: 0, y: 0, circle: vi.fn().mockReturnThis(), fill: vi.fn().mockReturnThis(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() } } as any;
    const player: Entity = {
      id: "player_test",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
    };
    const playerSprite = { scale: { x: 1 } } as any;
    const setPlayerAnim = vi.fn();
    const entityLayer = {
      addChild: vi.fn(),
      removeChild: vi.fn(),
    } as any;
    const onEnemyKilled = vi.fn();

    // Ensure stamina is full
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
  };

  it("should convert vector to correct ComboDirection", () => {
    expect(getComboDirection(1, 0)).toBe("right");
    expect(getComboDirection(1, 1)).toBe("down_right");
    expect(getComboDirection(0, 1)).toBe("down");
    expect(getComboDirection(-1, 1)).toBe("down_left");
    expect(getComboDirection(-1, 0)).toBe("left");
    expect(getComboDirection(-1, -1)).toBe("up_left");
    expect(getComboDirection(0, -1)).toBe("up");
    expect(getComboDirection(1, -1)).toBe("up_right");
    expect(getComboDirection(0.01, 0.01)).toBeNull(); // below noise threshold
  });

  it("should activate combo after 2 same-direction move+attack steps", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();

    const state = combat.directionalMomentumState;

    // First Step: Move Right + Attack Right (aim at y=32 because player center is at x=32, y=32)
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(false);
    expect(state.validStepCount).toBe(1);
    expect(state.lockedDirection).toBe("right");

    // Second Step: Move Right + Attack Right again within step window
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(true);
    expect(state.currentStacks).toBe(1);
    expect(state.lockedDirection).toBe("right");
  });

  it("should increase stack count up to maxStacks (6) on same-direction continuation", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Activate combo
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    
    expect(state.isActive).toBe(true);
    expect(state.currentStacks).toBe(1);

    // Keep striking to build stacks (up to 7 strikes, max stacks 6)
    for (let i = 0; i < 8; i++) {
      combat.attackCooldownTimer = 0;
      inputs.pendingAttack = true;
      playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    }

    expect(state.currentStacks).toBe(6); // capped at 6
  });

  it("should break combo immediately when movement direction changes after activation", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Activate combo (right)
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(true);

    // Change movement to left — should break combo immediately on update frame
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(false);
    expect(state.currentStacks).toBe(0);
    expect(state.lockedDirection).toBeNull();
  });

  it("should reset step count if movement direction changes before activation", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Step 1: Right
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.validStepCount).toBe(1);
    expect(state.lockedDirection).toBe("right");

    // Change direction to left before second attack
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);
    inputs.mouseWorld = { x: -100, y: 32 };
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    // Should reset and set step count to 1 for left
    expect(state.isActive).toBe(false);
    expect(state.validStepCount).toBe(1);
    expect(state.lockedDirection).toBe("left");
  });

  it("should not build stacks when player attacks without moving", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.validStepCount).toBe(0);
    expect(state.isActive).toBe(false);
  });

  it("should time out combo if inactive for comboTimeoutMs", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Activate combo
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(true);

    // Tick time by 1.5 seconds (1500ms > 1400ms comboTimeoutMs) without any strike
    playerAttackSystem(world, inputs, combat, config, vfx, 1.5, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(false);
  });

  it("should apply overload penalties (stamina reduction & attack speed penalty)", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Force 100% overload chance for testing
    combat.directionalMomentumConfig.overloadChancePerStackPct = 100;

    // Step 1
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    
    // Step 2 (Activates stack 1 -> rolls overload and triggers 100% chance)
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    setStamina(100);

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    // Stack is 1
    // Stamina penalty: 1 * 2% = 2% of 100 = 2 stamina lost.
    // Base stamina is 100. spendStamina is called twice: once for standard attack (cost 8), once for overload penalty (cost 2).
    // Final stamina should be 100 - 8 - 2 = 90.
    expect(stamina.current).toBe(90);

    // Cooldown penalty: 1 * 3% = 3% increase
    // Cooldown timer should be config.cooldown (0.45) * 1.03 = 0.4635
    expect(combat.attackCooldownTimer).toBeCloseTo(0.4635, 4);
    expect(state.overloadDebuffTimer).toBe(3.0);
  });

  it("should break combo if player dashes in a different direction", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Activate combo (right)
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(true);

    // Player dashes up-left
    movement.isDashing = true;
    movement.dashVelocity = { x: -200, y: -200 }; // up-left direction

    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(false);
  });

  it("should break combo if player weapon changes", () => {
    const { world, inputs, combat, config, movement, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled } = setupTest();
    const state = combat.directionalMomentumState;

    // Activate combo (right)
    inputs.pressed.add(InputAction.MoveRight);
    inputs.mouseWorld = { x: 100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);
    combat.attackCooldownTimer = 0;
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(true);

    // Change weapon
    state.lastEquippedWeaponId = "old_weapon";
    
    // Simulate frame tick with a mock helper for getEquippedWeaponId returning a different value
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    expect(state.isActive).toBe(false);
  });
});
