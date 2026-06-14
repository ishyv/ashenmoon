import { Container, Graphics, Sprite } from "pixi.js";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import { M3_CARCASS_DEFINITIONS } from "$lib/domain/animals/carcass-processing";
import type { AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { getAnimalFrames } from "$lib/core/assets/assets";
import { ANIMAL_RENDER_SPECS } from "$lib/core/systems/animals/animal-rendering";

/**
 * Runtime bridge for carcasses.
 *
 * WHY: animal death leaves a physical, inspectable resource in the world.
 * The pure carcass module owns yields and risks; this bridge owns ECS entities
 * and rendering. The visual is a rotated copy of the species' idle sprite frame
 * (lying on its side), darkened with a tint. A faint blood-stain ellipse is
 * drawn underneath as a ground decal.
 */

function carcassColor(speciesId: AnimalSpeciesId): number {
  switch (speciesId) {
    case "rabbit": return 0x8f7f68;
    case "deer":   return 0x7a4d2c;
    case "boar":   return 0x4f3a30;
    case "wolf":   return 0x66717a;
  }
}

function buildCarcassSprite(speciesId: AnimalSpeciesId, cx: number, cy: number): Container {
  const container = new Container();

  // Ground stain — drawn first so it sits behind the fallen body.
  const stain = new Graphics();
  stain.ellipse(0, TILE * 0.08, TILE * 0.28, TILE * 0.10).fill({ color: 0x3a0a0a, alpha: 0.45 });
  container.addChild(stain);

  const frames = getAnimalFrames(speciesId, "idle");
  if (frames.length > 0) {
    const body = new Sprite(frames[0]);
    const scale = (ANIMAL_RENDER_SPECS as Record<AnimalSpeciesId, { readonly spriteScale: number }>)[speciesId].spriteScale * 0.9;
    body.anchor.set(0.5, 0.5);
    body.scale.set(scale);
    body.rotation = Math.PI / 2;   // lying on side
    body.tint = carcassColor(speciesId);
    container.addChild(body);
  } else {
    // Fallback: flat ellipse for species without a sprite sheet.
    const ellipse = new Graphics();
    ellipse.ellipse(0, 0, TILE * 0.34, TILE * 0.17).fill({ color: carcassColor(speciesId), alpha: 0.88 });
    ellipse.ellipse(TILE * 0.16, -TILE * 0.03, TILE * 0.12, TILE * 0.08).fill({ color: 0x2a1f1c, alpha: 0.65 });
    container.addChild(ellipse);
  }

  container.x = cx;
  container.y = cy;
  return container;
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

  // Snap to tile grid so the interaction tile check (Math.floor(x/TILE)) agrees
  // with where the sprite center appears visually.
  const tileX = Math.floor(input.x / TILE) * TILE;
  const tileY = Math.floor(input.y / TILE) * TILE;

  world.add({
    id,
    position: { x: tileX, y: tileY, targetX: tileX, targetY: tileY },
    collider: { isSolid: false },
    interactable: { name: definition.displayName, action: "process" },
    carcass: {
      speciesId: input.speciesId,
      state: "fresh",
      ageSec: 0,
      processedActions: [],
    },
  });

  const cx = tileX + TILE / 2;
  const cy = tileY + TILE * 0.72;
  const sprite = buildCarcassSprite(input.speciesId, cx, cy);
  sprite.zIndex = computeRenderZ(cy);
  input.entityLayer.addChild(sprite);
  input.entitySprites.set(id, sprite);

  return id;
}
