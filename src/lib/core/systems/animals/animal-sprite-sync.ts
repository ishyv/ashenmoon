import { AnimatedSprite, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { applyEntityAnim } from "$lib/core/systems/animation/entity-animator";
import { ANIMAL_ANIM_SPECS, behaviorToAnimState } from "$lib/core/systems/animals/animal-rendering";

export function syncAnimalSprite(entity: Entity, entitySprites: Map<string, Container>): void {
  const sprite = entitySprites.get(entity.id);
  if (!sprite || !entity.position || !entity.animal) return;

  sprite.x = entity.position.x + TILE / 2;
  sprite.y = entity.position.y + TILE;
  sprite.zIndex = entity.position.y + TILE;
  sprite.alpha = entity.animal.behavior === "flee" ? 0.9 : 1;

  if (sprite instanceof AnimatedSprite) {
    const spec = ANIMAL_ANIM_SPECS[entity.animal.speciesId];
    const nextState = behaviorToAnimState(entity.animal.behavior);
    entity.animal.animState = applyEntityAnim(
      sprite,
      nextState,
      entity.animal.facingX,
      entity.animal.animState,
      spec,
    );
  }
}
