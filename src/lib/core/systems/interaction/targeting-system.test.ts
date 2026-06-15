import { describe, expect, it, vi } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { updateTargetSystem } from "./targeting-system";

function inputAt(x: number, y: number): InputResource {
  return { mouseWorld: { x, y } } as InputResource;
}

function mapStub() {
  return {} as never;
}

describe("interaction targeting system", () => {
  it("selects and highlights an interactable under the mouse within range", () => {
    const world = new World<Entity>();
    const player: Entity = {
      id: "player",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    const target: Entity = {
      id: "berry_bush",
      position: { x: TILE, y: 0, targetX: TILE, targetY: 0 },
      interactable: { name: "Berry Bush", action: "gather" },
    };
    world.add(player);
    world.add(target);
    const sprite = { tint: Colors.ui.white };
    const sprites = new Map<string, { tint: number }>([[target.id, sprite]]);
    const interaction = { currentTarget: null as Entity | null };

    updateTargetSystem(
      world,
      inputAt(TILE + 4, 4),
      mapStub(),
      interaction,
      player,
      sprites as never,
      false,
      vi.fn(),
    );

    expect(interaction.currentTarget).toBe(target);
    expect(sprite.tint).toBe(Colors.vfx.highlight);
  });

  it("clears the current target when placement mode starts", () => {
    const world = new World<Entity>();
    const target: Entity = {
      id: "twig",
      position: { x: TILE, y: 0, targetX: TILE, targetY: 0 },
      interactable: { name: "Twig", action: "pickup" },
    };
    const player: Entity = {
      id: "player",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    const sprite = { tint: Colors.vfx.highlight };
    const interaction = { currentTarget: target };

    updateTargetSystem(
      world,
      inputAt(TILE + 4, 4),
      mapStub(),
      interaction,
      player,
      new Map([[target.id, sprite]]) as never,
      true,
      vi.fn(),
    );

    expect(interaction.currentTarget).toBeNull();
    expect(sprite.tint).toBe(Colors.ui.white);
  });

  it("does not select an interactable outside interaction range", () => {
    const world = new World<Entity>();
    const player: Entity = {
      id: "player",
      position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    };
    const farTarget: Entity = {
      id: "far_stone",
      position: { x: TILE * 5, y: 0, targetX: TILE * 5, targetY: 0 },
      interactable: { name: "Far Stone", action: "gather" },
    };
    world.add(farTarget);
    const interaction = { currentTarget: null as Entity | null };

    updateTargetSystem(
      world,
      inputAt(TILE * 5 + 4, 4),
      mapStub(),
      interaction,
      player,
      new Map() as never,
      false,
      vi.fn(),
    );

    expect(interaction.currentTarget).toBeNull();
  });
});
