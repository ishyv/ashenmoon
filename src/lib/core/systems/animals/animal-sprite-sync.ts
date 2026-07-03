import { AnimatedSprite, Graphics, Text, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import { applyEntityAnim } from "$lib/core/systems/animation/entity-animator";
import { ANIMAL_ANIM_SPECS, behaviorToAnimState } from "$lib/core/systems/animals/animal-rendering";
import { getLifeStageScale } from "$lib/domain/animals/needs";
import { playAnimalSound } from "$lib/core/systems/animals/animal-audio";
import { devFlags } from "$lib/state/dev-flags.svelte";

const HP_BAR_W   = TILE * 0.375;  // 24 px
const HP_BAR_H   = 3;
const HP_BAR_Y   = -(TILE * 0.55);
const HP_FADE_SEC = 3.0;

// Module-level map: tracks how many seconds remain before each health bar fades out.
const _hpBarFade = new Map<string, number>();

// Module-level map: tracks the visual clock accumulator for each animal's procedural animation.
const _animalClock = new Map<string, number>();

// Module-level map: caches each animal sprite's base (un-multiplied) scale magnitude,
// captured once on first sync, so procedural/life-stage multipliers never compound frame-to-frame.
const _baseScale = new Map<string, { x: number; y: number }>();

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
  const debugText = entitySprites.get(`${entityId}:debugtext`);
  if (debugText) {
    entityLayer.removeChild(debugText);
    entitySprites.delete(`${entityId}:debugtext`);
  }
  _hpBarFade.delete(entityId);
  _animalClock.delete(entityId);
  _baseScale.delete(entityId);
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

  // Update visual clock accumulator for procedural animations
  const currentClock = _animalClock.get(entity.id) ?? 0;
  const nextClock = currentClock + dt;
  _animalClock.set(entity.id, nextClock);

  // --- Procedural Animal Motions ---
  const behavior = animal.behavior;

  // Play chew/slurp sounds periodically based on behavior
  if (behavior === "graze" || behavior === "drink") {
    const prevSec = Math.floor(currentClock / 1.2);
    const nextSec = Math.floor(nextClock / 1.2);
    if (nextSec > prevSec) {
      playAnimalSound(entity, behavior === "graze" ? "animal.graze" : "animal.drink");
    }
  }
  const isMoving = ["wander", "flee", "curious", "charge", "recover"].includes(behavior);
  const isAttacking = ["attack", "crash"].includes(behavior);
  const isWindup = ["charge_windup", "alert"].includes(behavior);

  let xOffset = 0;
  let yOffset = 0;
  let scaleXMultiplier = 1;
  let scaleYMultiplier = 1;
  let rotation = 0;

  if (isMoving) {
    if (animal.speciesId === "wolf") {
      // Wolf prowling: low-slung, fast wobble
      yOffset = -Math.abs(Math.sin(nextClock * 14)) * 3;
      rotation = Math.sin(nextClock * 7) * 0.06 * animal.facingX;
    } else if (animal.speciesId === "boar") {
      // Boar trampling: heavy shoulder shake
      yOffset = -Math.abs(Math.sin(nextClock * 10)) * 2;
      rotation = Math.sin(nextClock * 5) * 0.08 * animal.facingX;
      scaleYMultiplier = 1 - Math.abs(Math.sin(nextClock * 10)) * 0.04;
    } else if (animal.speciesId === "deer") {
      // Deer bounding (if fleeing) or walking
      const speed = behavior === "flee" ? 14 : 8;
      const height = behavior === "flee" ? 8 : 3;
      yOffset = -Math.abs(Math.sin(nextClock * speed)) * height;
      rotation = Math.sin(nextClock * (speed / 2)) * (behavior === "flee" ? 0.12 : 0.04) * animal.facingX;
    } else if (animal.speciesId === "rabbit") {
      // Rabbit jumping
      yOffset = -Math.abs(Math.sin(nextClock * 18)) * 6;
      scaleYMultiplier = 1 - Math.abs(Math.sin(nextClock * 18)) * 0.1;
    }
  } else if (isAttacking) {
    // Attack lunge forward
    const lunge = Math.sin(nextClock * 12) * 12 * animal.facingX;
    xOffset = lunge;
    if (animal.speciesId === "wolf") {
      yOffset = -Math.abs(Math.sin(nextClock * 12)) * 3;
      rotation = 0.1 * animal.facingX;
    } else if (animal.speciesId === "boar") {
      yOffset = Math.sin(nextClock * 12) * 3; // head toss
      rotation = -0.05 * animal.facingX;
    }
  } else if (isWindup) {
    // Tense breathing
    yOffset = Math.sin(nextClock * 3) * 0.5;
    scaleYMultiplier = 1 - Math.sin(nextClock * 3) * 0.02;
    if (behavior === "charge_windup") {
      // Pull back in opposite direction before a charge
      xOffset = -4 * animal.facingX;
      scaleXMultiplier = 1.05;
      scaleYMultiplier = 0.95;
    }
  } else {
    // Idle breathing bobbing
    yOffset = Math.sin(nextClock * 2.2) * 0.4;
    scaleYMultiplier = 1 - Math.sin(nextClock * 2.2) * 0.01;
  }

  sprite.x = entity.position.x + TILE / 2 + xOffset;
  sprite.y = entity.position.y + TILE + yOffset;
  sprite.zIndex = entity.position.y + TILE;
  sprite.rotation = rotation;

  // Hit flash: briefly tint red when taking damage (while invuln frames are active).
  if (entity.health && entity.health.invulnTimer > 0) {
    sprite.tint = 0xff4444;
  } else {
    sprite.tint = 0xffffff;
  }

  // Slight transparency while fleeing — visual cue that animal is panicking.
  sprite.alpha = animal.behavior === "flee" ? 0.88 : 1;

  if (sprite instanceof AnimatedSprite) {
    if (!_baseScale.has(entity.id)) {
      _baseScale.set(entity.id, { x: Math.abs(sprite.scale.x), y: Math.abs(sprite.scale.y) });
    }
    const base = _baseScale.get(entity.id)!;

    const spec = ANIMAL_ANIM_SPECS[animal.speciesId];
    const nextState = behaviorToAnimState(animal.behavior);
    animal.animState = applyEntityAnim(
      sprite,
      nextState,
      animal.facingX,
      animal.animState,
      spec,
    );

    // Derive scale fresh from the cached base every frame -- never from the sprite's
    // current (possibly already-mutated) scale -- so procedural and life-stage
    // multipliers cannot compound across frames.
    const stageScale = entity.needs ? getLifeStageScale(entity.needs.lifeStage) : 1.0;
    const signX = sprite.scale.x < 0 ? -1 : 1;
    sprite.scale.x = signX * base.x * scaleXMultiplier * stageScale;
    sprite.scale.y = base.y * scaleYMultiplier * stageScale;
  }

  // Update examine name based on life stage
  if (entity.interactable && entity.needs) {
    const stage = entity.needs.lifeStage;
    const match = entity.interactable.name.match(/Lvl (\d+)/);
    const level = match ? match[1] : "1";
    const nameNoStage = entity.interactable.name
      .replace(/\s*\(Juvenile\)\s*/, "")
      .replace(/^Elder\s+/, "")
      .replace(/\s*\(Lvl \d+\)/, "");
    if (stage === "juvenile") {
      entity.interactable.name = `${nameNoStage} (Juvenile) (Lvl ${level})`;
    } else if (stage === "elder") {
      entity.interactable.name = `Elder ${nameNoStage} (Lvl ${level})`;
    } else {
      entity.interactable.name = `${nameNoStage} (Lvl ${level})`;
    }
  }

  updateHpBar(entity, entitySprites, entityLayer, dt);
  tickHpBarFade(entity, entitySprites, dt);

  if (devFlags.spectatorEnabled) {
    const debugKey = `${entity.id}:debugtext`;
    let debugText = entitySprites.get(debugKey) as Text;
    if (!debugText) {
      debugText = new Text({
        text: "",
        style: {
          fontFamily: "monospace",
          fontSize: 10,
          fill: 0xffdc78,
          stroke: { color: 0x000000, width: 2 },
          align: "center",
        },
      });
      entityLayer.addChild(debugText);
      entitySprites.set(debugKey, debugText);
    }

    const needs = entity.needs;
    const behavior = entity.animal.behavior;
    const hpVal = entity.health ? `${entity.health.current}/${entity.health.max}` : "N/A";
    const hungerVal = needs ? Math.round(needs.hunger) : 0;
    const thirstVal = needs ? Math.round(needs.thirst) : 0;
    const energyVal = needs ? Math.round(needs.energy) : 0;
    const age = needs ? Math.round(needs.ageSec) : 0;
    const stage = needs ? needs.lifeStage : "adult";
    const species = entity.animal.speciesId;
    
    const pack = entity.pack ? `P:${entity.pack.packId}` : "";
    const follower = entity.follower ? `F` : "";
    const tags = [pack, follower].filter(Boolean).join(",");
    const tagsStr = tags ? ` [${tags}]` : "";

    debugText.text = `${species.toUpperCase()}${tagsStr} (${stage})\nHP: ${hpVal}\nBEH: ${behavior.toUpperCase()}\nH: ${hungerVal}% | T: ${thirstVal}% | E: ${energyVal}%\nA: ${age}s`;
    
    debugText.x = sprite.x - debugText.width / 2;
    debugText.y = sprite.y - sprite.height - debugText.height - 8;
    debugText.zIndex = 999999;
    debugText.visible = true;
  } else {
    const debugKey = `${entity.id}:debugtext`;
    const debugText = entitySprites.get(debugKey);
    if (debugText) {
      debugText.visible = false;
    }
  }
}
