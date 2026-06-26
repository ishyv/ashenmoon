import { Container, Graphics, Sprite } from "pixi.js";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { computeRenderZ } from "$lib/domain/collision";
import { M3_CARCASS_DEFINITIONS, type CarcassState } from "$lib/domain/animals/carcass-processing";
import type { AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { getAshenmoonCarcassTexture } from "$lib/core/assets/ashenmoon-assets";

/**
 * Runtime bridge for carcasses.
 *
 * WHY: animal death leaves a physical, inspectable resource in the world.
 * The pure carcass module owns yields and risks; this bridge owns ECS entities
 * and rendering. The visual is a rotated copy of the species' idle sprite frame
 * (lying on its side), darkened with a tint. A faint blood-stain ellipse is
 * drawn underneath as a ground decal.
 */

function carcassVisualWidth(speciesId: AnimalSpeciesId): number {
  switch (speciesId) {
    case "rabbit": return TILE * 0.95;
    case "deer":   return TILE * 1.35;
    case "boar":   return TILE * 1.18;
    case "wolf":   return TILE * 1.22;
  }
}

type RenderedCarcassState = "fresh" | "processed" | "spoiling" | "rotten";

function renderStateForCarcass(state: CarcassState): RenderedCarcassState {
  return state === "partially_processed" ? "processed" : state;
}

export function buildCarcassSprite(speciesId: AnimalSpeciesId, state: CarcassState, cx: number, cy: number): Container {
  const container = new Container();

  // Ground stain — drawn first so it sits behind the fallen body.
  const stain = new Graphics();
  stain.ellipse(0, TILE * 0.08, TILE * 0.34, TILE * 0.11).fill({ color: 0x3a0a0a, alpha: 0.38 });
  container.addChild(stain);

  const body = new Sprite(getAshenmoonCarcassTexture(speciesId, renderStateForCarcass(state)));
  body.anchor.set(0.5, 1);
  body.width = carcassVisualWidth(speciesId);
  body.scale.y = body.scale.x;
  body.y = TILE * 0.22;
  container.addChild(body);

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
  const sprite = buildCarcassSprite(input.speciesId, "fresh", cx, cy);
  sprite.zIndex = computeRenderZ(cy);
  input.entityLayer.addChild(sprite);
  input.entitySprites.set(id, sprite);

  return id;
}
