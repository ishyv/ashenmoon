import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { ANIMAL_DEFINITIONS, type AnimalRuntime } from "$lib/domain/animals/animal-behavior";

export function animalCenter(entity: Entity): { x: number; y: number } {
  const pos = entity.position!;
  return { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
}

export function animalCenterRuntime(entity: Entity): AnimalRuntime {
  const animal = entity.animal!;
  const center = animalCenter(entity);
  const runtime: AnimalRuntime = {
    id: entity.id,
    speciesId: animal.speciesId,
    x: center.x,
    y: center.y,
    behavior: animal.behavior,
    hunger: animal.hunger,
    threatened: animal.threatened,
    attackCooldownSec: animal.attackCooldownSec,
    health: entity.health?.current ?? ANIMAL_DEFINITIONS[animal.speciesId].maxHealth,
    awarenessLevel: animal.awarenessLevel,
  };
  if (animal.huntTargetId !== undefined) runtime.huntTargetId = animal.huntTargetId;
  return runtime;
}
