import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { InputResource } from "$lib/core/input/input";
import { createGameEventQueue } from "$lib/domain/game-event-queue";
import { gameState } from "$lib/state/game-state.svelte";
import { setStamina, stamina } from "$lib/state/rpg/stamina.svelte";
import { CombatConfig, CombatResource } from "./combat";
import { updateWeaponGuardSystem, weaponAttackSystem } from "./weapon-attack-system";

vi.mock("$lib/core/vfx/vfx", async () => {
  const actual = await vi.importActual<typeof import("$lib/core/vfx/vfx")>("$lib/core/vfx/vfx");
  return {
    ...actual,
    flashEntity: vi.fn(),
    spawnDamageNumber: vi.fn(),
  };
});

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
  setListener: vi.fn(),
}));

function equip(itemId: string | null): void {
  gameState.rpg.profile = {
    hpCurrent: 100,
    worldSeed: 1,
    stashSize: 20,
    loadout: {
      weapon: itemId ? { instanceId: `test_${itemId}`, itemId, durability: 100 } : null,
      shield: null,
      helmet: null,
      chest: null,
      pants: null,
      boots: null,
      ring: null,
      necklace: null,
    },
    buildings: [],
    worldEntities: [],
    gatheredPickups: [],
  };
}

function runWeaponAttack(itemId: string | null) {
  equip(itemId);
  setStamina(100);
  const world = new World<Entity>();
  const player: Entity = {
    id: "player",
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
  };
  world.add(player);
  const inputs = new InputResource();
  inputs.mouseWorld = { x: 128, y: 32 };
  inputs.pendingAttack = true;
  inputs.pendingFellSweep = true;
  inputs.pendingDrivingThrust = {
    direction: { x: 1, y: 0 },
    screenStart: { x: 0, y: 0 },
    screenEnd: { x: 96, y: 0 },
    worldStart: { x: 0, y: 0 },
    worldEnd: { x: 96, y: 0 },
  };
  inputs.pendingWeaponAttack = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    downAtMs: 0,
    upAtMs: 80,
    clickDirection: { x: 1, y: 0 },
    stanceHeld: false,
  };
  const events = createGameEventQueue();
  const combat = new CombatResource();

  weaponAttackSystem({
    world,
    inputs,
    combat,
    config: new CombatConfig(),
    vfx: { particles: [], hitFlashes: new Map(), activeShakes: new Map(), baseScales: new Map() } as never,
    entityLayer: new Container(),
    dt: 0,
    player,
    setPlayerAnim: vi.fn(),
    isPlacementMode: false,
    isDashing: false,
    onEnemyKilled: vi.fn(),
    events,
  });

  return { inputs, combat, events: events.drain(), stamina: stamina.current };
}

function makeWeaponHarness(itemId: string | null) {
  equip(itemId);
  setStamina(100);
  const world = new World<Entity>();
  const player: Entity = {
    id: "player",
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
  };
  world.add(player);
  const inputs = new InputResource();
  inputs.mouseWorld = { x: 128, y: 32 };
  const combat = new CombatResource();
  const events = createGameEventQueue();
  const args = {
    world,
    inputs,
    combat,
    config: new CombatConfig(),
    vfx: { particles: [], hitFlashes: new Map(), activeShakes: new Map(), baseScales: new Map() } as never,
    entityLayer: new Container(),
    dt: 0,
    player,
    setPlayerAnim: vi.fn(),
    isPlacementMode: false,
    isDashing: false,
    onEnemyKilled: vi.fn(),
    events,
  };
  return { world, player, inputs, combat, events, args };
}

function queueTap(inputs: InputResource, upAtMs = 80): void {
  inputs.pendingWeaponAttack = {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    downAtMs: 0,
    upAtMs,
    clickDirection: { x: 1, y: 0 },
    stanceHeld: false,
  };
}

describe("weaponAttackSystem", () => {
  it("claims generic equipped weapons and clears legacy pending combo flags", () => {
    const { inputs, combat, events } = runWeaponAttack("hardened_spear");

    expect(combat.weaponAttack.active).toBe(true);
    expect(combat.weaponAttack.weaponDefId).toBe("weapon.wooden_spear");
    expect(inputs.pendingAttack).toBe(false);
    expect(inputs.pendingFellSweep).toBe(false);
    expect(inputs.pendingDrivingThrust).toBeNull();
    expect(events[0]).toMatchObject({ type: "attack_started", weaponDefId: "weapon.wooden_spear" });
  });

  it("uses unarmed weapon combat instead of leaving attacks to legacy fallback", () => {
    const { inputs, combat, events } = runWeaponAttack(null);

    expect(combat.weaponAttack.active).toBe(true);
    expect(combat.weaponAttack.weaponDefId).toBe("weapon.unarmed");
    expect(inputs.pendingAttack).toBe(false);
    expect(events[0]).toMatchObject({ type: "attack_started", weaponDefId: "weapon.unarmed" });
  });

  it("starts and releases guard from the stance modifier", () => {
    equip("stone_axe");
    const world = new World<Entity>();
    const player: Entity = {
      id: "player",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
      health: { current: 100, max: 100, faction: "player", invulnTimer: 0 },
    };
    const inputs = new InputResource();
    inputs.mouseWorld = { x: 128, y: 32 };
    inputs.keys.control = true;
    const combat = new CombatResource();
    const events = createGameEventQueue();

    updateWeaponGuardSystem({ inputs, combat, player, isPlacementMode: false, isDashing: false, events });

    expect(combat.guard.active).toBe(true);
    expect(combat.guard.weaponDefId).toBe("weapon.stone_axe");
    expect(combat.guard.moveSpeedMultiplier).toBeCloseTo(0.42);
    expect(events.drain()[0]).toMatchObject({ type: "guard_started", weaponDefId: "weapon.stone_axe" });

    inputs.keys.control = false;
    updateWeaponGuardSystem({ inputs, combat, player, isPlacementMode: false, isDashing: false, events });

    expect(combat.guard.active).toBe(false);
    expect(events.drain()[0]).toMatchObject({ type: "guard_released", weaponDefId: "weapon.stone_axe" });
  });

  it("opens a weapon-authored combo window after recovery", () => {
    const { inputs, combat, args } = makeWeaponHarness("crude_knife");
    queueTap(inputs);

    weaponAttackSystem(args);
    expect(combat.weaponAttack.attackId).toBe("knife.quick");

    weaponAttackSystem({ ...args, dt: 0.5 });
    expect(combat.weaponAttack.active).toBe(false);
    expect(combat.weaponCombo.lastAttackId).toBe("knife.quick");

    queueTap(inputs, 120);
    weaponAttackSystem(args);

    expect(combat.weaponAttack.attackId).toBe("knife.follow_cut");
  });

  it("resets weapon combo state after the follow-up window expires", () => {
    const { inputs, combat, args } = makeWeaponHarness("crude_knife");
    queueTap(inputs);
    weaponAttackSystem(args);
    weaponAttackSystem({ ...args, dt: 0.5 });

    combat.currentTimeMs = combat.weaponCombo.expiresAtMs + 1;
    queueTap(inputs, 120);
    weaponAttackSystem(args);

    expect(combat.weaponAttack.attackId).toBe("knife.quick");
  });

  it("spreads knife attack movement over time instead of teleporting at active start", () => {
    const { inputs, player, combat, args } = makeWeaponHarness("crude_knife");
    queueTap(inputs);
    weaponAttackSystem(args);

    weaponAttackSystem({ ...args, dt: 0.05 });
    const firstMove = player.position!.x;

    weaponAttackSystem({ ...args, dt: 0.05 });
    const secondMove = player.position!.x;

    expect(firstMove).toBeGreaterThan(0);
    expect(firstMove).toBeLessThan(18);
    expect(secondMove).toBeGreaterThan(firstMove);
    expect(secondMove).toBeLessThanOrEqual(combat.weaponAttack.plan?.attack.movement.lungePx ?? 0);
    expect(combat.weaponAttack.movementAppliedPx).toBeGreaterThan(secondMove);
  });
});
