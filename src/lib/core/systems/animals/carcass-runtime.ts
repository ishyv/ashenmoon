import { Container, Graphics } from "pixi.js";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import { M3_CARCASS_DEFINITIONS } from "$lib/domain/animals/carcass-processing";
import type { AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";

/**
 * Runtime bridge for M3 carcasses.
 *
 * WHY: animal death should leave a physical, inspectable resource in the world.
 * The pure carcass module owns yields and risks; this bridge owns ECS entities
 * and placeholder rendering until real carcass art exists.
 */

function carcassColor(speciesId: AnimalSpeciesId): number {
  switch (speciesId) {
    case "rabbit":
      return 0x8f7f68;
    case "deer":
      return 0x7a4d2c;
    case "boar":
      return 0x4f3a30;
    case "wolf":
      return 0x66717a;
  }
}

export function spawnCarcassEntity(input: {
  readonly sourceEntityId: string;
  readonly speciesId: AnimalSpeciesId;
  readonly x: number;
  readonly y: number;
  readonly entityLayer: Container;
  readonly entitySprites: Map<string, Container>;
}): string {
  const id = `carcass_${input.sourceEntityId}`;
  const definition = M3_CARCASS_DEFINITIONS[input.speciesId];

  world.add({
    id,
    position: { x: input.x, y: input.y, targetX: input.x, targetY: input.y },
    collider: { isSolid: false },
    interactable: { name: definition.displayName, action: "process" },
    carcass: {
      speciesId: input.speciesId,
      state: "fresh",
      ageSec: 0,
      processedActions: [],
    },
  });

  const sprite = new Graphics();
  sprite.ellipse(0, 0, TILE * 0.34, TILE * 0.17).fill({ color: carcassColor(input.speciesId), alpha: 0.88 });
  sprite.ellipse(TILE * 0.16, -TILE * 0.03, TILE * 0.12, TILE * 0.08).fill({ color: 0x2a1f1c, alpha: 0.65 });
  sprite.x = input.x + TILE / 2;
  sprite.y = input.y + TILE * 0.72;
  sprite.zIndex = computeRenderZ(sprite.y);
  input.entityLayer.addChild(sprite);
  input.entitySprites.set(id, sprite);

  return id;
}
