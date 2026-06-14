import { AnimatedSprite, Container, Graphics } from "pixi.js";
import { TILE } from "$lib/core/systems/map/map";
import type { AnimalBehaviorState, AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { computeRenderZ } from "$lib/domain/collision";
import { getAnimalFrames } from "$lib/core/assets/assets";
import type { EntityAnimSpec } from "$lib/core/systems/animation/entity-animator";

interface AnimalRenderSpec {
  readonly fallbackColor: number;
  readonly fallbackWidthPx: number;
  readonly fallbackHeightPx: number;
  readonly spriteScale: number;
}

export const ANIMAL_RENDER_SPECS = {
  rabbit: { fallbackColor: 0xd8d1bd, fallbackWidthPx: 20, fallbackHeightPx: 12, spriteScale: 1.5 },
  deer: { fallbackColor: 0x9b6b3e, fallbackWidthPx: 34, fallbackHeightPx: 22, spriteScale: 1.75 },
  boar: { fallbackColor: 0x5b463a, fallbackWidthPx: 32, fallbackHeightPx: 20, spriteScale: 2 },
  wolf: { fallbackColor: 0x87919a, fallbackWidthPx: 34, fallbackHeightPx: 18, spriteScale: 2 },
} as const satisfies Record<AnimalSpeciesId, AnimalRenderSpec>;

function positionAnimalSprite(sprite: Container, x: number, y: number): void {
  sprite.x = x + TILE / 2;
  sprite.y = y + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);
}

function createFallbackSilhouette(spec: AnimalRenderSpec): Graphics {
  const sprite = new Graphics();
  sprite.ellipse(0, 0, spec.fallbackWidthPx, spec.fallbackHeightPx).fill(spec.fallbackColor);
  sprite
    .circle(
      spec.fallbackWidthPx * 0.55,
      -spec.fallbackHeightPx * 0.15,
      Math.max(4, spec.fallbackHeightPx * 0.25),
    )
    .fill(spec.fallbackColor);
  return sprite;
}

export function createAnimalSprite(speciesId: AnimalSpeciesId, x: number, y: number): Container {
  const frames = getAnimalFrames(speciesId, "idle");
  const spec = ANIMAL_RENDER_SPECS[speciesId];

  if (frames.length > 0) {
    const sprite = new AnimatedSprite(frames);
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(spec.spriteScale);
    positionAnimalSprite(sprite, x, y);
    return sprite;
  }

  const sprite = createFallbackSilhouette(spec);
  positionAnimalSprite(sprite, x, y);
  return sprite;
}

// ---------------------------------------------------------------------------
// Animation specs — one per species, used by animal-ecology-system each tick
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

export const ANIMAL_ANIM_SPECS: Record<AnimalSpeciesId, EntityAnimSpec<AnimalAnimState>> = {
  rabbit: {
    // "attack" reuses walk frames at higher speed (no separate attack sheet)
    getFrames: (s) => getAnimalFrames("rabbit", s === "attack" ? "walk" : s),
    speed: (s) => s === "attack" ? 0.22 : 0.14,
    loop: () => true,
  },
  deer: {
    getFrames: (s) => getAnimalFrames("deer", s === "attack" ? "walk" : s),
    speed: (s) => s === "attack" ? 0.26 : s === "walk" ? 0.16 : 0.10,
    loop: () => true,
  },
  boar: {
    getFrames: (s) => getAnimalFrames("boar", s === "attack" ? "walk" : s),
    speed: (s) => s === "attack" ? 0.30 : s === "walk" ? 0.20 : 0.10,
    loop: () => true,
  },
  wolf: {
    getFrames: (s) => getAnimalFrames("wolf", s === "attack" ? "walk" : s),
    speed: (s) => s === "attack" ? 0.35 : s === "walk" ? 0.22 : 0.10,
    loop: () => true,
  },
};
