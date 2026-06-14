import { AnimatedSprite } from "pixi.js";
import type { Texture } from "pixi.js";

export type FacingX = 1 | -1;

/**
 * Declarative animation profile for one entity type.
 * Define one spec per species / enemy archetype; the engine does the rest.
 */
export interface EntityAnimSpec<S extends string = string> {
  getFrames(state: S): Texture[];
  speed(state: S): number;
  loop(state: S): boolean;
  /**
   * The horizontal direction the sprite source frames naturally face.
   * 1 = right-facing (default, e.g. warrior sheets).
   * -1 = left-facing (e.g. farm-rpg and basic-animal packs).
   * The system uses this to know when to flip vs when to show as-is.
   */
  naturalFacing?: FacingX;
}

/**
 * Apply animation state and horizontal direction to a Pixi AnimatedSprite.
 *
 * - Textures swap only when `nextState` differs from `prevState` (avoids
 *   redundant Pixi re-uploads every frame).
 * - Previous facing is inferred from `sprite.scale.x` sign relative to
 *   `spec.naturalFacing` — no extra cache field on the entity needed.
 * - Returns `nextState` so the caller can write it back as the new prevState.
 *
 * Usage:
 *   entity.animState = applyEntityAnim(sprite, nextState, facingX, entity.animState, spec);
 */
export function applyEntityAnim<S extends string>(
  sprite: AnimatedSprite,
  nextState: S,
  nextFacingX: FacingX,
  prevState: string | null,
  spec: EntityAnimSpec<S>,
): S {
  const natural: FacingX = spec.naturalFacing ?? 1;
  // Positive scale means sprite is in its natural orientation.
  // Map that back to which direction it was actually facing.
  const prevFacingX: FacingX = sprite.scale.x >= 0 ? natural : (-natural as FacingX);

  if (nextState !== prevState) {
    sprite.textures = spec.getFrames(nextState);
    sprite.animationSpeed = spec.speed(nextState);
    sprite.loop = spec.loop(nextState);
    sprite.play();
  }
  if (nextFacingX !== prevFacingX) {
    // Show as-is when facing the natural direction, flip when facing opposite.
    sprite.scale.x = (nextFacingX === natural ? 1 : -1) * Math.abs(sprite.scale.x);
  }

  return nextState;
}
