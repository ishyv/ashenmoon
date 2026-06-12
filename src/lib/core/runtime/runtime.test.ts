import { describe, expect, it } from "vitest";
import { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import {
  createRuntimeContext,
  createRuntimeRegistry,
  RuntimeScheduler,
  validateRuntimeRegistry,
  type ComponentFactory,
  type GameFeature,
  type SystemDefinition,
} from "$lib/core/runtime/runtime";
import { InteractionDispatcher } from "$lib/core/runtime/interactions";
import { composeEntityFromPrefab, spawnPrefabEntity } from "$lib/core/runtime/prefabs";
import { DEFINITION_REGISTRY, type PrefabDefinition } from "$lib/domain/definition-registry";
import { defaultRuntimeFeature } from "$lib/core/runtime/default-feature";
import { isInteractionId } from "$lib/domain/interactions";
import { validateGatherableRenderAdapters } from "$lib/core/systems/gatherable-render-adapter";

const positionFactory = ({ gx, gy }: { gx: number; gy: number }) => ({
  position: { x: gx * 64, y: gy * 64, targetX: gx * 64, targetY: gy * 64 },
});

const pickupPrefab: PrefabDefinition = {
  id: "test_pickup",
  displayName: "test pickup",
  components: [
    { type: "position" },
    { type: "pickup", gatherableId: "stick_pickup" },
  ],
  render: { kind: "wood_pickup" },
  interaction: { kind: "pickup" },
  feedback: { spawn: "test pickup spawned." },
};

describe("runtime registry", () => {
  it("reports unsupported prefab components and missing interaction handlers", () => {
    const registry = createRuntimeRegistry([
      {
        id: "test",
        components: { position: positionFactory },
        prefabs: [pickupPrefab],
      },
    ]);

    expect(validateRuntimeRegistry(registry)).toEqual([
      "prefab test_pickup uses unsupported component pickup",
      "prefab test_pickup references missing interaction pickup",
    ]);
  });

  it("rejects duplicate component factories, systems, prefabs, resources, interactions, and renderers", () => {
    const system: SystemDefinition = { id: "tick", phase: "simulation", run: () => undefined };
    const feature: GameFeature = {
      id: "one",
      components: { position: positionFactory },
      resources: [{ key: "clock", create: () => ({}) }],
      prefabs: [pickupPrefab],
      systems: [system],
      interactions: [{ id: "pickup", handle: () => undefined }],
      renderers: [{ id: "sprite", canRender: () => true, render: () => undefined }],
    };

    expect(() => createRuntimeRegistry([feature, feature])).toThrow(/duplicate component factory: position/);
  });
});

describe("runtime scheduler", () => {
  it("runs systems in fixed phase order while preserving registration order within a phase", () => {
    const calls: string[] = [];
    const scheduler = new RuntimeScheduler([
      { id: "render", phase: "render", run: () => calls.push("render") },
      { id: "intent.a", phase: "intent", run: () => calls.push("intent.a") },
      { id: "input", phase: "input", run: () => calls.push("input") },
      { id: "intent.b", phase: "intent", run: () => calls.push("intent.b") },
      { id: "cleanup", phase: "cleanup", run: () => calls.push("cleanup") },
    ]);

    scheduler.tick(createRuntimeContext(new World<Entity>(), {}), 0.16);

    expect(calls).toEqual(["input", "intent.a", "intent.b", "render", "cleanup"]);
  });
});

describe("interaction dispatcher", () => {
  it("dispatches the target action through a registered handler", () => {
    const handled: string[] = [];
    const dispatcher = new InteractionDispatcher([
      {
        id: "pickup",
        handle: (ctx) => handled.push(ctx.target.id),
      },
    ]);
    const target: Entity = { id: "stick", interactable: { name: "stick", action: "pickup" } };

    const dispatched = dispatcher.dispatch({
      ...createRuntimeContext(new World<Entity>(), {}),
      target,
    });

    expect(dispatched).toBe(true);
    expect(handled).toEqual(["stick"]);
  });

  it("throws when an entity advertises an unregistered interaction", () => {
    const dispatcher = new InteractionDispatcher();
    const target: Entity = { id: "campfire", interactable: { name: "campfire", action: "refuel" } };

    expect(() =>
      dispatcher.dispatch({
        ...createRuntimeContext(new World<Entity>(), {}),
        target,
      }),
    ).toThrow("missing interaction handler: refuel");
  });
});

describe("prefab spawning", () => {
  it("composes an ECS entity from registered prefab component factories", () => {
    const entity = composeEntityFromPrefab(
      pickupPrefab,
      new Map<string, ComponentFactory>([
        ["position", positionFactory],
        ["pickup", () => ({ pickup: { itemId: "stick", qty: 1 } })],
      ]),
      { id: "test_pickup", gx: 2, gy: 3, entityId: "stick_1" },
    );

    expect(entity).toMatchObject({
      id: "stick_1",
      position: { x: 128, y: 192, targetX: 128, targetY: 192 },
      pickup: { itemId: "stick", qty: 1 },
    });
  });

  it("adds a spawned prefab entity to the world without engine-specific branches", () => {
    const registry = createRuntimeRegistry([
      {
        id: "test",
        components: {
          position: positionFactory,
          pickup: () => ({ pickup: { itemId: "stick", qty: 1 } }),
        },
        prefabs: [pickupPrefab],
      },
    ]);
    const world = new World<Entity>();

    const entity = spawnPrefabEntity(world, registry, { id: "test_pickup", gx: 4, gy: 5 });

    expect(entity.pickup).toEqual({ itemId: "stick", qty: 1 });
    expect(world.entities).toContain(entity);
  });
});

describe("default runtime feature", () => {
  it("validates every authored prefab against registered component and interaction contracts", () => {
    const registry = createRuntimeRegistry([defaultRuntimeFeature]);

    expect(validateRuntimeRegistry(registry)).toEqual([]);
  });

  it("keeps authored prefab interactions on the canonical interaction contract", () => {
    for (const prefab of Object.values(DEFINITION_REGISTRY.prefabs)) {
      if (!prefab.interaction) continue;
      expect(isInteractionId(prefab.interaction.kind), prefab.id).toBe(true);
    }
  });

  it("has a render adapter for every authored gatherable render kind", () => {
    const renderKinds = Object.values(DEFINITION_REGISTRY.gatherables).map((def) => def.renderKind);

    expect(validateGatherableRenderAdapters(renderKinds)).toEqual([]);
  });

  it("composes authored gatherable prefabs without engine-specific spawn branches", () => {
    const registry = createRuntimeRegistry([defaultRuntimeFeature]);
    const entity = composeEntityFromPrefab(registry.prefabs.get("stick_pickup")!, registry.components, {
      id: "stick_pickup",
      gx: 1,
      gy: 2,
      entityId: "runtime_stick",
    });

    expect(entity).toMatchObject({
      id: "runtime_stick",
      interactable: { name: "Fallen Stick", action: "pickup" },
      pickup: { itemId: "stick", qty: 1, gatherableId: "stick_pickup" },
    });
  });
});
