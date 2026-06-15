import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
  trackMovementCombo,
  applyDamage,
} from "./combat";
import { InputResource } from "$lib/core/input/input";
import { InputAction, SkillKey } from "$lib/domain/game-events";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgSkills } from "$lib/state/rpg-actions.svelte";
import { stamina, setStamina } from "$lib/state/rpg/stamina.svelte";
import { MovementResource, playerMovementSystem } from "$lib/core/systems/movement/movement";
import { createGameEventQueue } from "$lib/domain/game-event-queue";

// Mocking dependencies that aren't available in node/test environment
vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
  spawnShockwaveRing: vi.fn(),
  spawnSlashArc: vi.fn(),
  triggerCameraShake: vi.fn(),
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
  spawnCrosscutIndicator: vi.fn(),
  clearCrosscutIndicators: vi.fn(),
}));

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
  setListener: vi.fn(),
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

describe("Combat System - Kite Combo & Focus Stacks", () => {
  const setupTest = () => {
    const world = new World<Entity>();
    const inputs = new MockInputResource();
    const combat = new CombatResource();
    const config = new CombatConfig();
    const vfx = { particles: [] } as any;
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
    const movement = new MovementResource();

    // Ensure stamina is full
    setStamina(100);

    // Initialize/Reset Kite Specialization skill state in global gameState
    setRpgSkills({
      lumberjacking: { level: 1, xp: 0, nextXp: 100 },
      mining: { level: 1, xp: 0, nextXp: 100 },
      evade: { level: 1, xp: 0, nextXp: 100 },
      fellSweep: { level: 1, xp: 0, nextXp: 100 },
      kiteCombo: { level: 1, xp: 0, nextXp: 100 },
    });

    return {
      world,
      inputs,
      combat,
      config,
      vfx,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      onEnemyKilled,
      movement,
    };
  };

  it("should record movement phases and trigger a Kite Combo on A -> -A -> A sequence", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    // 1. Move right (A)
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);
    expect(combat.movePhases.length).toBe(1);

    // 2. Move left (-A)
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);
    trackMovementCombo(combat, inputs);
    expect(combat.movePhases.length).toBe(2);

    // 3. Move right (A)
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);
    expect(combat.movePhases.length).toBe(3);

    // Verify combo window and trigger
    inputs.pendingAttack = true;
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      0.016,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );

    // After combo execution, the move phase history should be cleared
    expect(combat.movePhases.length).toBe(0);
    // Stacks should be incremented from 0 to 1
    expect(combat.kiteStacks).toBe(1);
    expect(combat.kiteStacksDecayTimer).toBe(3.0);
  });

  it("should scale reach, damage, and stamina cost dynamically based on stacks", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    // Let's force level 1 Kite Combo
    // Stacks = 0 (Base combo)
    // Reach = config.reach * 2.2 = 140.8 (since TILE = 64)
    // Stamina = config.staminaCost (8) + (4 + 0) * 0 = 8
    
    // Simulate footwork to prime combo
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);

    inputs.pendingAttack = true;
    
    // Check initial stamina
    const stamBefore = stamina.current;
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      0.016,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );

    expect(stamina.current).toBe(stamBefore - 8); // First combo increments to 1 stack first, costing 8
    expect(combat.kiteStacks).toBe(1); // Stacks is 1

    // Reset cooldown to allow second swing
    combat.attackCooldownTimer = 0;

    // Now let's trigger it again with 1 stack
    // Footwork to trigger Kite Combo again
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);

    inputs.pendingAttack = true;
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      0.016,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );

    // Second combo increments to 2 stacks first, costing 5. 92 - 5 = 87
    expect(stamina.current).toBe(87);
    expect(combat.kiteStacks).toBe(2); // Stacks is 2
  });

  it("should decay stacks individually after 3 seconds of inactivity", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    combat.kiteStacks = 3;
    combat.kiteStacksDecayTimer = 3.0;

    // Tick time by 1.5 seconds â€” should NOT decay
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      1.5,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );
    expect(combat.kiteStacks).toBe(3);
    expect(combat.kiteStacksDecayTimer).toBe(1.5);

    // Tick by another 1.6 seconds (total 3.1) â€” should decay by 1 stack
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      1.6,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );
    expect(combat.kiteStacks).toBe(2);
    expect(combat.kiteStacksDecayTimer).toBe(3.0); // Resets decay timer
  });

  it("should reset stacks to 0 on executing a standard attack", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    combat.kiteStacks = 2;
    combat.kiteStacksDecayTimer = 2.5;

    // Normal attack without combo footwork
    inputs.pendingAttack = true;
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      0.016,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );

    expect(combat.kiteStacks).toBe(0);
    expect(combat.kiteStacksDecayTimer).toBe(0);
  });

  it("should apply extra damage vulnerability and clear stacks when player is damaged", () => {
    const { combat, config, vfx, player, entityLayer } = setupTest();

    combat.kiteStacks = 2; // +30% vulnerability (15% per stack)
    combat.kiteStacksDecayTimer = 3.0;

    const baseEnemyDamage = 10;
    
    // Apply damage to player
    applyDamage(
      player,
      baseEnemyDamage,
      10, // sourceX
      10, // sourceY
      10, // knockback
      config,
      vfx,
      entityLayer,
      combat,
    );

    // Player health should be 100 - (10 * 1.3) = 87
    expect(player.health?.current).toBe(87);
    expect(combat.kiteStacks).toBe(0);
    expect(combat.kiteStacksDecayTimer).toBe(0);
  });

  it("should emit damage, health, and death events when damage is applied", () => {
    const { config, vfx, entityLayer } = setupTest();
    const enemy: Entity = {
      id: "enemy_event_test",
      position: { x: 64, y: 64, targetX: 64, targetY: 64 },
      health: { current: 10, max: 20, faction: "hostile", invulnTimer: 0 },
    };
    const events = createGameEventQueue();

    const lethal = applyDamage(enemy, 15, 0, 0, 0, config, vfx, entityLayer, undefined, events);

    expect(lethal).toBe(true);
    expect(events.drain()).toEqual([
      {
        type: "damage_applied",
        targetId: "enemy_event_test",
        amount: 15,
        damageType: "physical",
        lethal: true,
        targetFaction: "hostile",
        targetPosition: { x: 64, y: 64 },
      },
      {
        type: "health_changed",
        entityId: "enemy_event_test",
        previous: 10,
        current: 0,
        max: 20,
      },
      {
        type: "entity_died",
        entityId: "enemy_event_test",
        cause: "combat",
        faction: "hostile",
        position: { x: 64, y: 64 },
      },
    ]);
  });

  it("should reward stamina and sacrifice HP when Kite Combo hits an enemy at high stacks", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    // Spawn an enemy close to the player
    const enemy: Entity = {
      id: "enemy_test",
      position: { x: 100, y: 100, targetX: 100, targetY: 100 },
      health: { current: 50, max: 50, faction: "hostile", invulnTimer: 0 },
    };
    world.add(enemy);

    // Aim mouse at the enemy
    inputs.mouseWorld = { x: 100, y: 100 };

    // Set initial stacks to 1 (meaning the next combo finisher will increment to 2 stacks)
    combat.kiteStacks = 1;
    combat.kiteStacksDecayTimer = 3.0;

    // Set stamina low (e.g. 50) so we can see the recovery
    setStamina(50);

    // Prime combo footwork A -> -A -> A
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveLeft);
    trackMovementCombo(combat, inputs);
    inputs.pressed.clear();
    inputs.pressed.add(InputAction.MoveRight);
    trackMovementCombo(combat, inputs);

    inputs.pendingAttack = true;
    playerAttackSystem(
      world,
      inputs,
      combat,
      config,
      vfx,
      0.016,
      player,
      playerSprite,
      setPlayerAnim,
      entityLayer,
      movement,
      false,
      onEnemyKilled,
    );

    // 1. Stacks should increment to 2
    expect(combat.kiteStacks).toBe(2);

    // 2. Stamina calculation:
    // Started at 50.
    // Cost at stack 2: Math.max(1, 8 - 3 * 1) = 5
    // Hit lands -> recovers: 15 + 5 * 2 = 25
    // Net change: -5 + 25 = +20
    // Ending stamina should be 50 + 20 = 70
    expect(stamina.current).toBe(70);

    // 3. HP calculation:
    // Started at 100.
    // Strain cost at stack 2: 5 * (2 - 1) = 5 HP
    // Ending HP should be 100 - 5 = 95
    expect(player.health?.current).toBe(95);
  });

  it("should keep player facing direction pointing at the mouse during active swing frames", () => {
    const { world, inputs, combat, config, vfx, player, playerSprite, setPlayerAnim, entityLayer, onEnemyKilled, movement } = setupTest();

    // 1. Trigger an attack with mouse to the left (x = -100)
    inputs.mouseWorld = { x: -100, y: 32 };
    inputs.pendingAttack = true;
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    // Initial scale.x should point left (negative)
    expect(playerSprite.scale.x).toBeLessThan(0);
    expect(combat.swingActiveTimer).toBe(0.28);

    // 2. Tick frame with movement key 'D' (MoveRight) pressed during the swing
    inputs.pressed.add(InputAction.MoveRight);
    
    const map = { mapW: 10, mapH: 10 } as any;
    playerMovementSystem(world, movement, inputs, { speed: 200, sprintSpeedMultiplier: 1.5, sprintStaminaCost: 5, dashCooldown: 1.0, sprintLockDuration: 0.5 } as any, vfx, map, 0.016, playerSprite, setPlayerAnim, entityLayer, combat);

    // Scale should still point left (negative) because it's locked during swing, even with MoveRight input!
    expect(playerSprite.scale.x).toBeLessThan(0);

    // 3. Move mouse to the right (x = 100) and run attack tick while swing is still active
    inputs.mouseWorld = { x: 100, y: 32 };
    playerAttackSystem(world, inputs, combat, config, vfx, 0.016, player, playerSprite, setPlayerAnim, entityLayer, movement, false, onEnemyKilled);

    // Scale should now point right (positive) because mouse moved to the right!
    expect(playerSprite.scale.x).toBeGreaterThan(0);
    expect(combat.swingActiveTimer).toBeCloseTo(0.264, 4);
  });
});

