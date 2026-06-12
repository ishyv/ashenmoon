import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { PrefabDefinition } from "$lib/domain/definition-registry";
import type { ComponentFactory, RuntimeRegistry, RuntimeResourceMap } from "$lib/core/runtime/runtime";

export interface SpawnPrefabInput {
  id: string;
  gx: number;
  gy: number;
  entityId?: string;
}

export function composeEntityFromPrefab(
  prefab: PrefabDefinition,
  factories: ReadonlyMap<string, ComponentFactory>,
  input: SpawnPrefabInput,
): Entity {
  const entity: Entity = { id: input.entityId ?? `${prefab.id}:${input.gx},${input.gy}` };

  for (const component of prefab.components) {
    const factory = factories.get(component.type);
    if (!factory) throw new Error(`unsupported prefab component ${component.type} on ${prefab.id}`);
    Object.assign(entity, factory({ prefab, component, gx: input.gx, gy: input.gy }));
  }

  return entity;
}

export function spawnPrefabEntity<TResources extends RuntimeResourceMap>(
  world: World<Entity>,
  registry: RuntimeRegistry<TResources>,
  input: SpawnPrefabInput,
): Entity {
  const prefab = registry.prefabs.get(input.id);
  if (!prefab) throw new Error(`unknown prefab: ${input.id}`);
  const entity = composeEntityFromPrefab(prefab, registry.components, input);
  world.add(entity);
  return entity;
}
