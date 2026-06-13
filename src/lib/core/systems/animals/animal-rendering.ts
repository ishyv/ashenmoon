import { AnimatedSprite, Container, Graphics } from "pixi.js";
import { TILE } from "$lib/core/systems/map/map";
import type { AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { computeRenderZ } from "$lib/domain/collision";
import { getAnimalFrames } from "$lib/core/assets/assets";

const ANIMAL_RENDER_SPECS: Record<AnimalSpeciesId, { color: number; w: number; h: number }> = {
  rabbit: { color: 0xd8d1bd, w: 20, h: 12 },
  deer: { color: 0x9b6b3e, w: 34, h: 22 },
  boar: { color: 0x5b463a, w: 32, h: 20 },
  wolf: { color: 0x87919a, w: 34, h: 18 },
};

export function createAnimalSprite(speciesId: AnimalSpeciesId, x: number, y: number): Container {
  const frames = getAnimalFrames(speciesId, "idle");
  if (frames && frames.length > 0) {
    const sprite = new AnimatedSprite(frames);
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.anchor.set(0.5, 1);
    
    // Scale 16x16 anim sheets to look natural on 16px grid
    let scale = 1.5;
    if (speciesId === "deer") scale = 1.75;
    else if (speciesId === "boar" || speciesId === "wolf") scale = 2.0;
    sprite.scale.set(scale);

    sprite.x = x + TILE / 2;
    sprite.y = y + TILE;
    sprite.zIndex = computeRenderZ(sprite.y);
    return sprite;
  }

  const spec = ANIMAL_RENDER_SPECS[speciesId];
  const sprite = new Graphics();
  sprite.ellipse(0, 0, spec.w, spec.h).fill(spec.color);
  sprite.circle(spec.w * 0.55, -spec.h * 0.15, Math.max(4, spec.h * 0.25)).fill(spec.color);
  sprite.x = x + TILE / 2;
  sprite.y = y + TILE;
  sprite.zIndex = computeRenderZ(sprite.y);
  return sprite;
}
