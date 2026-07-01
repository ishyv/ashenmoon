import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { playSound } from "$lib/audio/audio-engine";
import {
  flashEntity,
  spawnDamageNumber,
  spawnSlashArc,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { routeGameEventsToFeedback } from "./feedback-router";

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/core/vfx/vfx", () => ({
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
  spawnSlashArc: vi.fn(),
  triggerCameraShake: vi.fn(),
}));

vi.mock("$lib/ui/player-feedback.svelte", () => ({
  emitPlayerFeedback: vi.fn(),
}));

describe("FeedbackRouter", () => {
  it("routes hostile damage events to current combat hit feedback", () => {
    const world = new World<Entity>();
    const entityLayer = {} as never;
    const vfx = {} as never;

    routeGameEventsToFeedback(
      [
        {
          type: "damage_applied",
          targetId: "wolf_1",
          amount: 7,
          damageType: "physical",
          lethal: false,
          targetFaction: "hostile",
          targetPosition: { x: 64, y: 96 },
        },
      ],
      { world, vfx, entityLayer },
    );

    expect(flashEntity).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      "wolf_1",
      64 + TILE / 2,
      96 + TILE,
      Colors.combat.enemyHit,
    );
    expect(spawnDamageNumber).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      64 + TILE / 2,
      96 + TILE * 0.4,
      7,
      Colors.combat.enemyDmgNum,
      16,
    );
    expect(triggerCameraShake).toHaveBeenCalledWith(vfx, 2.5, 0.12);
    expect(playSound).toHaveBeenCalledWith("impact.flesh", {
      position: { x: 64 + TILE / 2, y: 96 + TILE / 2 },
      conditions: { targetSpecies: "humanoid" },
    });
  });

  it("gives crits distinct feedback: bigger number, crit colors, stronger shake, altered sound — never floating text", () => {
    const world = new World<Entity>();
    const entityLayer = {} as never;
    const vfx = {} as never;

    routeGameEventsToFeedback(
      [
        {
          type: "damage_applied",
          targetId: "wolf_1",
          amount: 21,
          damageType: "physical",
          lethal: false,
          targetFaction: "hostile",
          targetPosition: { x: 64, y: 96 },
          isCrit: true,
        },
      ],
      { world, vfx, entityLayer },
    );

    expect(flashEntity).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      "wolf_1",
      64 + TILE / 2,
      96 + TILE,
      Colors.combat.critFlash,
    );
    expect(spawnDamageNumber).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      64 + TILE / 2,
      96 + TILE * 0.4,
      21,
      Colors.combat.critDmgNum,
      24,
    );
    expect(triggerCameraShake).toHaveBeenCalledWith(vfx, 4.5, 0.12);
    expect(playSound).toHaveBeenCalledWith("impact.flesh", {
      position: { x: 64 + TILE / 2, y: 96 + TILE / 2 },
      conditions: { targetSpecies: "humanoid" },
      pitch: -250,
      gain: 1.3,
    });
  });

  it("can route from live entity state when no position snapshot is present", () => {
    const world = new World<Entity>();
    const player: Entity = {
      id: "player",
      position: { x: 10, y: 20, targetX: 10, targetY: 20 },
      health: { current: 80, max: 100, faction: "player", invulnTimer: 0 },
    };
    world.add(player);
    const entityLayer = {} as never;
    const vfx = {} as never;

    routeGameEventsToFeedback(
      [
        {
          type: "damage_applied",
          targetId: "player",
          amount: 5,
          damageType: "physical",
          lethal: false,
        },
      ],
      { world, vfx, entityLayer },
    );

    expect(flashEntity).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      "player",
      10 + TILE / 2,
      20 + TILE,
      Colors.combat.playerHit,
    );
    expect(playSound).toHaveBeenCalledWith("combat.hit.player", {
      position: { x: 10 + TILE / 2, y: 20 + TILE / 2 },
      conditions: { targetSpecies: "humanoid" },
    });
  });

  it("routes guard block and break events without block text spam", () => {
    const world = new World<Entity>();
    const entityLayer = {} as never;
    const vfx = {} as never;

    routeGameEventsToFeedback(
      [
        { type: "guard_blocked", actorId: "player", absorbedDamage: 18, staminaCost: 12 },
        { type: "guard_broken", actorId: "player", staminaCost: 12 },
      ],
      { world, vfx, entityLayer },
    );

    expect(triggerCameraShake).toHaveBeenCalledWith(vfx, 1.6, 0.08);
    expect(playSound).toHaveBeenCalledWith("combat.hit.player");
    expect(emitPlayerFeedback).toHaveBeenCalledTimes(1);
    expect(emitPlayerFeedback).toHaveBeenCalledWith("guard broken", "warning");
  });

  it("routes thrust attack starts as narrow weapon trails", () => {
    const world = new World<Entity>();
    const entityLayer = {} as never;
    const vfx = {} as never;

    routeGameEventsToFeedback(
      [{
        type: "attack_started",
        attackerId: "player",
        weaponDefId: "weapon.wooden_spear",
        attackId: "spear.poke",
        animationProfile: "straight_thrust",
        soundProfile: "spear",
        direction: { x: 1, y: 0 },
        origin: { x: 10, y: 20 },
        aimAngle: 0,
        reachPx: 180,
        arcDegrees: 26,
        hitShapeKind: "capsule",
        trail: "thrust",
        windupMs: 100,
        activeMs: 100,
        recoveryMs: 100,
      }],
      { world, vfx, entityLayer },
    );

    expect(spawnSlashArc).toHaveBeenCalledWith(
      vfx,
      entityLayer,
      10,
      20,
      0,
      180,
      expect.any(Number),
      Colors.combat.slashArc,
    );
  });
});
