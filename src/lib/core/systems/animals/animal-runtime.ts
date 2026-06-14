import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { ANIMAL_DEFINITIONS, type AnimalRuntime } from "$lib/domain/animals/animal-behavior";

export function animalCenter(entity: Entity): { x: number; y: number } {
  const pos = entity.position!;
  return { x: pos.x + TILE / 2, y: pos.y + TILE / 2 };
}

export function animalCenterRuntime(entity: Entity): AnimalRuntime {
  return {
    id: entity.id,
    speciesId: entity.animal!.speciesId,
    x: animalCenter(entity).x,
    y: animalCenter(entity).y,
    behavior: entity.animal!.behavior,
    hunger: entity.animal!.hunger,
    threatened: entity.animal!.threatened,
    attackCooldownSec: entity.animal!.attackCooldownSec,
    health: entity.health?.current ?? ANIMAL_DEFINITIONS[entity.animal!.speciesId].maxHealth,
  };
}
