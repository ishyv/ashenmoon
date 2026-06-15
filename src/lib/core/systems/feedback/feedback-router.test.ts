import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { playSound } from "$lib/audio/audio-engine";
import {
  flashEntity,
  spawnDamageNumber,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { routeGameEventsToFeedback } from "./feedback-router";

vi.mock("$lib/audio/audio-engine", () => ({
  playSound: vi.fn(),
}));

vi.mock("$lib/core/vfx/vfx", () => ({
  flashEntity: vi.fn(),
  spawnDamageNumber: vi.fn(),
  triggerCameraShake: vi.fn(),
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
    );
    expect(triggerCameraShake).toHaveBeenCalledWith(vfx, 2.5, 0.12);
    expect(playSound).toHaveBeenCalledWith("combat.hit.enemy", {
      position: { x: 64 + TILE / 2, y: 96 + TILE / 2 },
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
    });
  });
});
