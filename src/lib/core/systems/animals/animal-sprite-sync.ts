import { AnimatedSprite, Graphics, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { applyEntityAnim } from "$lib/core/systems/animation/entity-animator";
import { ANIMAL_ANIM_SPECS, behaviorToAnimState } from "$lib/core/systems/animals/animal-rendering";

const HP_BAR_W   = TILE * 0.375;  // 24 px
const HP_BAR_H   = 3;
const HP_BAR_Y   = -(TILE * 0.55);
const HP_FADE_SEC = 3.0;

// Module-level map: tracks how many seconds remain before each health bar fades out.
const _hpBarFade = new Map<string, number>();

function getOrCreateHpBar(entity: Entity, entitySprites: Map<string, Container>, entityLayer: Container): Graphics | null {
  const key = `${entity.id}:hpbar`;
  const existing = entitySprites.get(key);
  if (existing instanceof Graphics) return existing;

  const bar = new Graphics();
  entityLayer.addChild(bar);
  entitySprites.set(key, bar);
  _hpBarFade.set(entity.id, 0); // starts hidden
  return bar;
}

function updateHpBar(entity: Entity, entitySprites: Map<string, Container>, entityLayer: Container, dt: number): void {
  const health = entity.health;
  const pos = entity.position;
  if (!health || !pos) return;

  const isDamaged = health.current < health.max;

  if (!isDamaged) {
    // Reset fade if fully healed.
    _hpBarFade.delete(entity.id);
    const bar = entitySprites.get(`${entity.id}:hpbar`);
    if (bar) bar.alpha = 0;
    return;
  }

  const bar = getOrCreateHpBar(entity, entitySprites, entityLayer);
  if (!bar) return;

  // Reset fade timer every tick while damaged.
  _hpBarFade.set(entity.id, HP_FADE_SEC);

  const cx = pos.x + TILE / 2;
  const cy = pos.y + TILE + HP_BAR_Y;

  bar.clear();
  // Background.
  bar.rect(cx - HP_BAR_W / 2, cy, HP_BAR_W, HP_BAR_H).fill({ color: 0x331111, alpha: 0.8 });
  // Fill.
  const fillW = HP_BAR_W * (health.current / health.max);
  if (fillW > 0) {
    bar.rect(cx - HP_BAR_W / 2, cy, fillW, HP_BAR_H).fill({ color: 0xcc2222, alpha: 0.9 });
  }
  bar.zIndex = pos.y + TILE + 1;
  bar.alpha = 1;
}

function tickHpBarFade(entity: Entity, entitySprites: Map<string, Container>, dt: number): void {
  const remaining = _hpBarFade.get(entity.id);
  if (remaining === undefined) return;

  const next = remaining - dt;
  if (next <= 0) {
    _hpBarFade.delete(entity.id);
    const bar = entitySprites.get(`${entity.id}:hpbar`);
    if (bar) bar.alpha = 0;
  } else {
    _hpBarFade.set(entity.id, next);
    const bar = entitySprites.get(`${entity.id}:hpbar`);
    if (bar && next < 0.5) bar.alpha = next / 0.5;
  }
}

export function cleanupAnimalSprite(entityId: string, entitySprites: Map<string, Container>, entityLayer: Container): void {
  const bar = entitySprites.get(`${entityId}:hpbar`);
  if (bar) {
    entityLayer.removeChild(bar);
    entitySprites.delete(`${entityId}:hpbar`);
  }
  _hpBarFade.delete(entityId);
}

export function syncAnimalSprite(
  entity: Entity,
  entitySprites: Map<string, Container>,
  entityLayer: Container,
  dt = 0,
): void {
  const sprite = entitySprites.get(entity.id);
  if (!sprite || !entity.position || !entity.animal) return;

  const animal = entity.animal;

  if (animal.dyingSec !== undefined && animal.dyingSec > 0) {
    // Fade the sprite to dark red as the animal dies.
    const totalFade = 0.8; // matches CARCASS_DEATH_FADE_SEC in ecology system
    sprite.tint = 0x662222;
    sprite.alpha = Math.max(0, animal.dyingSec / totalFade);
    const hpBar = entitySprites.get(`${entity.id}:hpbar`);
    if (hpBar) hpBar.alpha = 0;
    return;
  }

  sprite.x = entity.position.x + TILE / 2;
  sprite.y = entity.position.y + TILE;
  sprite.zIndex = entity.position.y + TILE;

  // Hit flash: briefly tint red when taking damage (while invuln frames are active).
  if (entity.health && entity.health.invulnTimer > 0) {
    sprite.tint = 0xff4444;
  } else {
    sprite.tint = 0xffffff;
  }

  // Slight transparency while fleeing — visual cue that animal is panicking.
  sprite.alpha = animal.behavior === "flee" ? 0.88 : 1;

  if (sprite instanceof AnimatedSprite) {
    const spec = ANIMAL_ANIM_SPECS[animal.speciesId];
    const nextState = behaviorToAnimState(animal.behavior);
    animal.animState = applyEntityAnim(
      sprite,
      nextState,
      animal.facingX,
      animal.animState,
      spec,
    );
  }

  updateHpBar(entity, entitySprites, entityLayer, dt);
  tickHpBarFade(entity, entitySprites, dt);
}
