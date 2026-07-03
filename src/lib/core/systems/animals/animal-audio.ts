import { playSound } from "$lib/audio/audio-engine";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";

/**
 * Triggers a spatial animal sound at the entity's current location.
 */
export function playAnimalSound(
  entity: Entity,
  soundId: "animal.graze" | "animal.drink" | "animal.thump"
): void {
  if (!entity.position) return;
  playSound(soundId, {
    position: {
      x: entity.position.x + TILE / 2,
      y: entity.position.y + TILE / 2,
    },
  });
}
