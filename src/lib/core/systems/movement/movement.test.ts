import { beforeEach, describe, expect, it, vi } from "vitest";
import { world, type Entity } from "$lib/core/ecs/ecs-miniplex";
import { clearPlayerCache } from "$lib/core/ecs/entity-queries";
import { InputAction, EntityId } from "$lib/domain/game-events";
import { CombatResource } from "$lib/core/systems/combat/combat";
import { InputResource } from "$lib/core/input/input";
import { MovementConfig, MovementResource, playerMovementSystem } from "./movement";

vi.mock("$lib/core/vfx/vfx", () => ({
  spawnEnvFloatingText: vi.fn(),
  spawnEnvParticles: vi.fn(),
  triggerCameraShake: vi.fn(),
}));

class TestInputResource extends InputResource {
  public pressed = new Set<string>();

  override isActionPressed(action: string): boolean {
    return this.pressed.has(action);
  }
}

function clearWorld(): void {
  for (const entity of [...world.entities]) world.remove(entity);
  clearPlayerCache();
}

function runMove(combat?: CombatResource): number {
  const player: Entity = {
    id: EntityId.Player,
    position: { x: 0, y: 0, targetX: 0, targetY: 0 },
    playerControlled: { speed: 100 },
  };
  world.add(player);
  const inputs = new TestInputResource();
  inputs.pressed.add(InputAction.MoveRight);

  playerMovementSystem(
    world,
    new MovementResource(),
    inputs,
    new MovementConfig(),
    { particles: [] } as never,
    { mapW: 20, mapH: 20, solidCoords: new Set<string>(), customSolids: new Map(), inBounds: () => true } as never,
    1,
    { x: 0, y: 0, scale: { x: 1 }, alpha: 1, tint: 0xffffff } as never,
    vi.fn(),
    { addChild: vi.fn(), removeChild: vi.fn() } as never,
    combat,
  );

  return player.position!.x;
}

describe("playerMovementSystem Fell Sweep slow", () => {
  beforeEach(clearWorld);

  it("does not change movement speed when Fell Sweep is not charging", () => {
    const noCombatDistance = runMove(undefined);
    clearWorld();
    const combatDistance = runMove(new CombatResource());

    expect(combatDistance).toBeCloseTo(noCombatDistance);
  });

  it("slows movement while Fell Sweep is fully charged", () => {
    const normalDistance = runMove(new CombatResource());
    clearWorld();
    const combat = new CombatResource();
    combat.fellSweepChargeState = {
      ...combat.fellSweepChargeState,
      isCharging: true,
      chargeProgress: 1,
      chargeStage: "full",
    };

    const chargedDistance = runMove(combat);

    expect(chargedDistance).toBeCloseTo(normalDistance * 0.45);
  });
});
