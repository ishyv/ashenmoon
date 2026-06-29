import { AnimatedSprite } from "pixi.js";
import { TILE } from "$lib/core/systems/map/map";
import type { AnimalBehaviorState, AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { computeRenderZ } from "$lib/domain/collision";
import {
  getAshenmoonActorFrames,
  type AshenmoonActorKey,
} from "$lib/core/assets/ashenmoon-assets";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";
import type { EntityAnimSpec } from "$lib/core/systems/animation/entity-animator";
import type { AnimState } from "$lib/core/types";

interface AnimalRenderSpec {
  readonly standeeKey: AshenmoonActorKey;
  /** Desired readable world height in tiles, not a raw sprite-pack pixel scale. */
  readonly heightTiles: number;
}

export const ANIMAL_RENDER_SPECS = {
  rabbit: { standeeKey: "rabbit", heightTiles: 0.74 },
  deer: { standeeKey: "deer", heightTiles: 1.22 },
  boar: { standeeKey: "boar", heightTiles: 1.14 },
  wolf: { standeeKey: "wolf", heightTiles: 1.32 },
} as const satisfies Record<AnimalSpeciesId, AnimalRenderSpec>;

function positionAnimalSprite(sprite: AnimatedSprite, x: number, y: number): void {
  sprite.x = x + TILE / 2;
  sprite.y = y + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);
}

export function createAnimalSprite(speciesId: AnimalSpeciesId, x: number, y: number): AnimatedSprite {
  const spec = ANIMAL_RENDER_SPECS[speciesId];
  const sprite = new AnimatedSprite(getAshenmoonActorFrames(spec.standeeKey));
  sprite.animationSpeed = 0.1;
  sprite.play();
  sprite.anchor.set(0.5, 1);
  const scale = resolveWorldVisualScale({
    spec: { heightTiles: spec.heightTiles },
    texture: sprite.texture,
    tilePx: TILE,
  });
  sprite.scale.set(scale.x, scale.y);
  positionAnimalSprite(sprite, x, y);
  return sprite;
}

// ---------------------------------------------------------------------------
// Animation specs — first-party standee feedback, not external sprite-pack art.
// ---------------------------------------------------------------------------

export type AnimalAnimState = "idle" | "walk" | "eat" | "attack";

/** Maps behavior state to the animation key the spec should play. */
export function behaviorToAnimState(b: AnimalBehaviorState): AnimalAnimState {
  if (b === "graze" || b === "eat") return "eat";
  if (b === "attack" || b === "hunt" || b === "charge") return "attack";
  if (b === "alert" || b === "rest") return "idle";
  if (b === "wander" || b === "flee" || b === "curious") return "walk";
  return "idle";
}

function actorStateForAnimalState(state: AnimalAnimState): AnimState {
  if (state === "walk") return "run";
  if (state === "attack") return "attack";
  return "idle";
}

function animalAnimSpec(speciesId: AnimalSpeciesId): EntityAnimSpec<AnimalAnimState> {
  const standeeKey = ANIMAL_RENDER_SPECS[speciesId].standeeKey;
  return {
    getFrames: (state) => getAshenmoonActorFrames(standeeKey, actorStateForAnimalState(state)),
    speed: (state) => state === "attack" ? 0.22 : state === "walk" ? 0.14 : 0.08,
    loop: () => true,
    naturalFacing: -1,
  };
}

export const ANIMAL_ANIM_SPECS: Record<AnimalSpeciesId, EntityAnimSpec<AnimalAnimState>> = {
  rabbit: animalAnimSpec("rabbit"),
  deer: animalAnimSpec("deer"),
  boar: animalAnimSpec("boar"),
  wolf: animalAnimSpec("wolf"),
};
