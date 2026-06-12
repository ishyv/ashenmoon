import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import {
  type Particle,
  type SpriteParticle,
  type FloatingText,
  type HitFlash,
  type Cloud,
  type CameraShake,
  type ShockwaveRing,
  type ActiveShake,
  type BaseScale,
  type SlashArc,
} from "$lib/core/types";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { EntityId } from "$lib/domain/game-events";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import type { FourfoldSlashState, FourfoldSlashConfig } from "$lib/domain/combat/fourfold-slash";

export class VFXResource {
  public particles: Particle[] = [];
  public spriteParticles: SpriteParticle[] = [];
  public floatingTexts: FloatingText[] = [];
  public hitFlashes = new Map<string, HitFlash>();
  public cameraShake: CameraShake = { intensity: 0, duration: 0, time: 0 };
  public clouds: Cloud[] = [];
  public shockwaveRings: ShockwaveRing[] = [];
  public activeShakes = new Map<string, ActiveShake>();
  public baseScales = new Map<string, BaseScale>();
  public slashArcs: SlashArc[] = [];
  public fellSweepChargeArc: Graphics | null = null;
  public gatherRing!: Graphics;
  public selectionRing!: Graphics;
  public comboRing!: Graphics;
  public fourfoldRing!: Graphics;
  public chargeParticleTimer = 0;
  public selectionRingTime = 0;
  public footstepTimer = 0;
}

export function particleUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (let i = vfx.particles.length - 1; i >= 0; i--) {
    const p = vfx.particles[i]!;
    p.life += dt;
    p.vx *= Math.exp(-2.0 * dt);
    p.vy += p.gravity * dt;
    p.graphic.x += p.vx * dt;
    p.graphic.y += p.vy * dt;
    p.graphic.alpha = Math.max(0, 1 - p.life / p.maxLife);

    if (p.life >= p.maxLife) {
      entityLayer.removeChild(p.graphic);
      p.graphic.destroy();
      vfx.particles.splice(i, 1);
    }
  }
}

export function spriteParticleUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (let i = vfx.spriteParticles.length - 1; i >= 0; i--) {
    const p = vfx.spriteParticles[i]!;
    p.life += dt;
    p.vx *= Math.exp(-2.0 * dt);
    p.vy += p.gravity * dt;
    p.sprite.x += p.vx * dt;
    p.sprite.y += p.vy * dt;
    p.sprite.alpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.life >= p.maxLife) {
      entityLayer.removeChild(p.sprite);
      p.sprite.destroy();
      vfx.spriteParticles.splice(i, 1);
    }
  }
}

export function hitFlashUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (const [id, flash] of vfx.hitFlashes) {
    flash.timer -= dt;
    flash.graphic.alpha = Math.max(0, flash.timer / 0.08);
    if (flash.timer <= 0) {
      entityLayer.removeChild(flash.graphic);
      flash.graphic.destroy();
      vfx.hitFlashes.delete(id);
    }
  }
}

// Floating-text stacking: entries sharing a stackKey never overlap. The newest
// sits at the base; older ones are pushed up a row each and keep drifting as
// they age. Rows are derived from age order every frame, so removals self-heal
// (no snapping) and easing makes the shifts smooth.
const FT_ROW_HEIGHT = 17;
const FT_AGE_DRIFT = 14; // px/sec slow continuous rise
const FT_EASE = 12; // position easing rate toward the stacked target
const FT_FADE_START = 0.65; // fraction of life before fade-out begins

export function floatingTextUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  // Age, then cull expired before re-stacking the survivors.
  for (let i = vfx.floatingTexts.length - 1; i >= 0; i--) {
    const ft = vfx.floatingTexts[i]!;
    ft.life += dt;
    if (ft.life >= ft.maxLife) {
      entityLayer.removeChild(ft.textObj);
      ft.textObj.destroy();
      vfx.floatingTexts.splice(i, 1);
    }
  }

  const stacks = new Map<string, FloatingText[]>();
  for (const ft of vfx.floatingTexts) {
    const list = stacks.get(ft.stackKey);
    if (list) list.push(ft);
    else stacks.set(ft.stackKey, [ft]);
  }

  const ease = Math.min(1, dt * FT_EASE);
  for (const list of stacks.values()) {
    list.sort((a, b) => a.life - b.life); // newest (smallest life) first -> row 0
    for (let row = 0; row < list.length; row++) {
      const ft = list[row]!;
      const targetY = ft.baseY - row * FT_ROW_HEIGHT - FT_AGE_DRIFT * ft.life;
      ft.textObj.y += (targetY - ft.textObj.y) * ease;
      ft.textObj.x += (ft.baseX - ft.textObj.x) * ease;
      const fade = (ft.life / ft.maxLife - FT_FADE_START) / (1 - FT_FADE_START);
      ft.textObj.alpha = fade <= 0 ? 1 : Math.max(0, 1 - fade);
    }
  }
}

export function shakeAndSquashUpdateSystem(
  vfx: VFXResource,
  dt: number,
  entitySprites: Map<string, Container>,
  world: World<Entity>,
  shakeIntensityVal: number
): void {
  // 1. Position shake
  for (const [id, shake] of vfx.activeShakes.entries()) {
    shake.time += dt;
    const sprite = entitySprites.get(id);

    if (shake.time >= shake.duration) {
      vfx.activeShakes.delete(id);
      if (sprite) {
        const entity = world.entities.find((e) => e.id === id);
        if (entity?.position) {
          sprite.x = entity.position.x + TILE / 2;
        }
      }
    } else {
      if (sprite) {
        const entity = world.entities.find((e) => e.id === id);
        if (entity?.position) {
          const decay = 1 - shake.time / shake.duration;
          const offset = Math.sin(shake.time * 50) * 6 * decay * shakeIntensityVal;
          sprite.x = entity.position.x + TILE / 2 + offset;
        }
      }
    }
  }

  // 2. Squash and stretch recovery
  for (const [id, baseScale] of vfx.baseScales.entries()) {
    const sprite = entitySprites.get(id);
    if (!sprite) {
      vfx.baseScales.delete(id);
      continue;
    }

    const diffX = baseScale.x - Math.abs(sprite.scale.x);
    const diffY = baseScale.y - sprite.scale.y;

    if (Math.abs(diffX) < 0.005 && Math.abs(diffY) < 0.005) {
      const signX = Math.sign(sprite.scale.x);
      sprite.scale.set(signX * baseScale.x, baseScale.y);
    } else {
      const signX = Math.sign(sprite.scale.x);
      sprite.scale.x += signX * diffX * 0.15;
      sprite.scale.y += diffY * 0.15;
    }
  }
}

export function shockwaveUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (let i = vfx.shockwaveRings.length - 1; i >= 0; i--) {
    const ring = vfx.shockwaveRings[i]!;
    ring.life += dt;
    const t = ring.life / ring.maxLife;
    ring.graphic.clear();
    const r = t * TILE * 1.6;
    const alpha = (1 - t) * 0.65;
    ring.graphic.circle(0, 0, r).stroke({ color: ring.color, width: 2.5, alpha });
    if (ring.life >= ring.maxLife) {
      entityLayer.removeChild(ring.graphic);
      ring.graphic.destroy();
      vfx.shockwaveRings.splice(i, 1);
    }
  }
}

export function cameraShakeSystem(
  vfx: VFXResource,
  dt: number,
  screen: { width: number; height: number },
  playerPos: { x: number; y: number },
  zoom: number,
  worldContainer: Container
): void {
  const camX = playerPos.x + TILE / 2;
  const camY = playerPos.y + TILE / 2;

  worldContainer.scale.set(zoom);

  let shakeX = 0;
  let shakeY = 0;
  if (vfx.cameraShake.time < vfx.cameraShake.duration) {
    vfx.cameraShake.time += dt;
    const decay = 1 - vfx.cameraShake.time / vfx.cameraShake.duration;
    shakeX = (Math.random() * 2 - 1) * vfx.cameraShake.intensity * decay;
    shakeY = (Math.random() * 2 - 1) * vfx.cameraShake.intensity * decay;
  }

  worldContainer.x = Math.round(screen.width / 2 - camX * zoom + shakeX);
  worldContainer.y = Math.round(screen.height / 2 - camY * zoom + shakeY);
}

export function gatherRingUpdateSystem(
  vfx: VFXResource,
  playerPos: { x: number; y: number },
  gatheringTarget: Entity | null,
  gatherInterval: number,
  gatherCooldownTimer: number
): void {
  if (gatheringTarget === null) {
    vfx.gatherRing.visible = false;
    return;
  }
  vfx.gatherRing.visible = true;
  vfx.gatherRing.x = playerPos.x + TILE / 2;
  vfx.gatherRing.y = playerPos.y + TILE / 2;

  const progress = 1 - Math.max(0, gatherCooldownTimer) / gatherInterval;
  vfx.gatherRing.clear();
  // Track
  vfx.gatherRing.circle(0, 0, 26).stroke({ color: Colors.ui.stroke, width: 3, alpha: 0.22 });
  // Progress
  if (progress > 0.01) {
    const endAngle = -Math.PI / 2 + progress * Math.PI * 2;
    vfx.gatherRing.arc(0, 0, 26, -Math.PI / 2, endAngle);
    vfx.gatherRing.stroke({ color: Colors.vfx.gatherRing, width: 3, alpha: 0.85 });
  }
}

/**
 * Ember-gathering charge feedback. Spawns small sparks in a ring around the
 * player that spiral inward, communicating "energy being drawn in" without
 * drawing UI chrome over the player. Spawn rate and density scale with charge
 * so the effect escalates naturally from a whisper to a roar.
 */
export function chargeParticleSystem(
  vfx: VFXResource,
  dt: number,
  playerPos: { x: number; y: number },
  chargeProgress: number,
  entityLayer: Container,
): void {
  if (chargeProgress <= 0) {
    vfx.chargeParticleTimer = 0;
    return;
  }

  // Interval shrinks from 110ms at 0% charge to 28ms at 100%.
  const interval = 0.11 - chargeProgress * 0.083;
  vfx.chargeParticleTimer -= dt;
  if (vfx.chargeParticleTimer > 0) return;
  vfx.chargeParticleTimer = interval;

  const cx = playerPos.x + TILE / 2;
  const cy = playerPos.y + TILE / 2;

  // Minimum 2 sparks so even a light hold is clearly visible.
  const count = chargeProgress >= 0.8 ? 5 : chargeProgress >= 0.4 ? 3 : 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spawnRadius = 28 + Math.random() * 18;
    const px = cx + Math.cos(angle) * spawnRadius;
    const py = cy + Math.sin(angle) * spawnRadius;

    // Pull toward center with a slight clockwise spiral.
    const dx = cx - px;
    const dy = cy - py;
    const speed = 55 + chargeProgress * 80;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * speed + (-dy / len) * speed * 0.35;
    const vy = (dy / len) * speed + ( dx / len) * speed * 0.35;

    const size = 3.5 + Math.random() * 2.5;
    const g = new Graphics();
    g.circle(0, 0, size).fill({ color: Colors.vfx.chargeRing, alpha: 0.9 });
    g.x = px;
    g.y = py;

    vfx.particles.push({
      graphic: g,
      vx,
      vy,
      gravity: -20,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.2,
    });
    entityLayer.addChild(g);
  }
}

export function selectionRingUpdateSystem(
  vfx: VFXResource,
  dt: number,
  currentTarget: Entity | null,
  entitySprites: Map<string, Container>
): void {
  if (!currentTarget?.position) {
    vfx.selectionRing.visible = false;
    return;
  }
  vfx.selectionRingTime += dt;
  vfx.selectionRing.visible = true;
  const pos = currentTarget.position;
  vfx.selectionRing.x = pos.x + TILE / 2;

  let targetY = pos.y + TILE;
  const sprite = entitySprites.get(currentTarget.id);
  if (sprite) {
    if (currentTarget.id === EntityId.Campfire) {
      targetY = sprite.y + 4;
    } else {
      const gatherableId = currentTarget.resource?.gatherableId ?? currentTarget.pickup?.gatherableId;
      const gatherable = gatherableId ? getGatherableDefinition(gatherableId) : undefined;
      if (gatherable?.solidKind === "tree") {
        targetY = sprite.y - 38;
      } else if (gatherable?.solidKind === "rock" || gatherable?.renderKind.includes("pickup")) {
        targetY = sprite.y - 32;
      } else {
        targetY = sprite.y - 38;
      }
    }
  }
  vfx.selectionRing.y = targetY;

  const pulse = 0.55 + Math.abs(Math.sin(vfx.selectionRingTime * 3.5)) * 0.45;
  vfx.selectionRing.clear();
  vfx.selectionRing.alpha = pulse;
  vfx.selectionRing.arc(0, 0, 30, 0, Math.PI * 0.9).stroke({ color: Colors.vfx.selectionRing, width: 2 });
  vfx.selectionRing.arc(0, 0, 30, Math.PI, Math.PI * 1.9).stroke({ color: Colors.vfx.selectionRing, width: 2 });
}

export function cloudDriftSystem(vfx: VFXResource, dt: number, mapW: number): void {
  for (const cloud of vfx.clouds) {
    cloud.sprite.x += cloud.vx * dt;
    if (cloud.sprite.x > (mapW + 4) * TILE) {
      cloud.sprite.x = -4 * TILE;
    }
  }
}

export function footstepParticleSystem(
  vfx: VFXResource,
  dt: number,
  playerPos: { x: number; y: number },
  isMoving: boolean,
  isDashing: boolean,
  isSprinting: boolean,
  entityLayer: Container
): void {
  if (isMoving || isDashing) {
    const interval = isDashing ? 0.05 : isSprinting ? 0.09 : 0.14;
    vfx.footstepTimer -= dt;
    if (vfx.footstepTimer <= 0) {
      vfx.footstepTimer = interval;

      const g = new Graphics();
      g.circle(0, 0, 1.5).fill({ color: Colors.vfx.footstep, alpha: 0.55 });
      g.x = playerPos.x + TILE / 2 + (Math.random() - 0.5) * 12;
      g.y = playerPos.y + TILE + (Math.random() - 0.5) * 4;

      vfx.particles.push({
        graphic: g,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 10 + 3),
        gravity: 30,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.15,
      });
      entityLayer.addChild(g);
    }
  } else {
    vfx.footstepTimer = 0;
  }
}

export function triggerCameraShake(vfx: VFXResource, intensity: number, duration: number): void {
  if (intensity > vfx.cameraShake.intensity || vfx.cameraShake.time >= vfx.cameraShake.duration) {
    vfx.cameraShake = { intensity, duration, time: 0 };
  }
}

export function spawnEnvFloatingText(
  vfx: VFXResource,
  text: string,
  color: number,
  playerPos: { x: number; y: number },
  entityLayer: Container,
  stackKey = "player"
): void {
  const px = playerPos.x + TILE / 2;
  const py = playerPos.y - 12;

  const textStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "bold",
    fill: color,
    stroke: { color: Colors.ui.stroke, width: 3 },
  });
  const textObj = new Text({ text, style: textStyle });
  textObj.anchor.set(0.5, 0.5);
  textObj.x = px;
  textObj.y = py;

  vfx.floatingTexts.push({ textObj, stackKey, baseX: px, baseY: py, life: 0, maxLife: 1.1 });
  entityLayer.addChild(textObj);
}

// ---------------------------------------------------------------------------
// Combat feedback — reusable hit/damage/swing juice for ANY entity.
// These keep the damage/attack/AI systems free of presentation code: a system
// applies state, then calls one of these so the player can read what happened.
// ---------------------------------------------------------------------------

/** Advances and renders pooled sword-swing arcs. Driven each tick by the engine. */
export function slashArcUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (let i = vfx.slashArcs.length - 1; i >= 0; i--) {
    const arc = vfx.slashArcs[i]!;
    arc.life += dt;
    const t = Math.min(1, arc.life / arc.maxLife);
    const r = arc.reach * (0.7 + 0.3 * t);
    const inner = r * 0.6;
    const a0 = arc.angle - arc.halfAngle;
    const a1 = arc.angle + arc.halfAngle;
    arc.graphic.clear();
    if (arc.variant === "wheel_slash" || arc.variant === "falling_wheel" || arc.variant === "rising_wheel" || arc.variant === "crosswind_cut") {
      const variant = arc.variant;
      if (variant === "wheel_slash") {
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.72;
        arc.graphic.circle(0, 0, r);
        arc.graphic.circle(0, 0, inner);
        arc.graphic.fill({ color: arc.color, alpha: (1 - t) * 0.65 });
        arc.graphic.circle(0, 0, r).stroke({ color: Colors.ui.white, width: 3, alpha: (1 - t) * 0.75 });
      } else if (variant === "falling_wheel") {
        const yOffset = t * 36;
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.65;
        arc.graphic.moveTo(r, yOffset);
        arc.graphic.arc(0, yOffset, r, 0, Math.PI);
        arc.graphic.arc(0, yOffset, inner, Math.PI, 0, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: arc.color, alpha: (1 - t) * 0.75 });
        arc.graphic.arc(0, yOffset, r, 0, Math.PI).stroke({ color: Colors.ui.white, width: 3, alpha: (1 - t) * 0.8 });
      } else if (variant === "rising_wheel") {
        const yOffset = -t * 36;
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.65;
        arc.graphic.moveTo(-r, yOffset);
        arc.graphic.arc(0, yOffset, r, Math.PI, 2 * Math.PI);
        arc.graphic.arc(0, yOffset, inner, 2 * Math.PI, Math.PI, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: arc.color, alpha: (1 - t) * 0.75 });
        arc.graphic.arc(0, yOffset, r, Math.PI, 2 * Math.PI).stroke({ color: Colors.ui.white, width: 3, alpha: (1 - t) * 0.8 });
      } else if (variant === "crosswind_cut") {
        const r = arc.reach * (0.5 + 0.5 * t);
        const inner = r * 0.8;
        arc.graphic.circle(0, 0, r);
        arc.graphic.circle(0, 0, inner);
        arc.graphic.fill({ color: arc.color, alpha: (1 - t) * 0.5 });

        const len = arc.reach * (0.4 + 0.7 * t);
        const half = len * 0.8;
        const angle1 = Math.PI / 4;
        const angle2 = 3 * Math.PI / 4;
        const width = 4;
        const alpha = (1 - t) * 0.85;

        arc.graphic.moveTo(-Math.cos(angle1) * half, -Math.sin(angle1) * half);
        arc.graphic.lineTo(Math.cos(angle1) * half, Math.sin(angle1) * half);
        arc.graphic.moveTo(-Math.cos(angle2) * half, -Math.sin(angle2) * half);
        arc.graphic.lineTo(Math.cos(angle2) * half, Math.sin(angle2) * half);
        arc.graphic.stroke({ color: arc.color, width, alpha });

        arc.graphic.moveTo(-Math.cos(angle1) * half * 0.8, -Math.sin(angle1) * half * 0.8);
        arc.graphic.lineTo(Math.cos(angle1) * half * 0.8, Math.sin(angle1) * half * 0.8);
        arc.graphic.moveTo(-Math.cos(angle2) * half * 0.8, -Math.sin(angle2) * half * 0.8);
        arc.graphic.lineTo(Math.cos(angle2) * half * 0.8, Math.sin(angle2) * half * 0.8);
        arc.graphic.stroke({ color: Colors.ui.white, width: 2, alpha: alpha * 0.9 });
      }

      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    if (arc.variant === "crosscut") {
      const length = arc.reach * (arc.grade === "excellent" ? 1.1 : arc.grade === "good" ? 1.0 : 0.88);
      const half = length * 0.5;
      const width = arc.grade === "excellent" ? 5 : arc.grade === "good" ? 4 : 3;
      const alpha = (1 - t) * (arc.grade === "excellent" ? 0.92 : arc.grade === "good" ? 0.76 : 0.58);
      for (const lineAngle of [arc.angle, arc.angle + Math.PI / 2]) {
        arc.graphic.moveTo(Math.cos(lineAngle) * -half, Math.sin(lineAngle) * -half);
        arc.graphic.lineTo(Math.cos(lineAngle) * half, Math.sin(lineAngle) * half);
      }
      arc.graphic.stroke({ color: arc.color, width, alpha });
      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    arc.graphic.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    arc.graphic.arc(0, 0, r, a0, a1);
    arc.graphic.arc(0, 0, inner, a1, a0, true);
    arc.graphic.closePath();
    arc.graphic.fill({ color: arc.color, alpha: (1 - t) * 0.5 });
    // bright leading edge sells the swing direction
    arc.graphic.arc(0, 0, r, a1 - arc.halfAngle * 0.25, a1).stroke({
      color: Colors.ui.white,
      width: 2,
      alpha: (1 - t) * 0.7,
    });
    if (arc.life >= arc.maxLife) {
      entityLayer.removeChild(arc.graphic);
      arc.graphic.destroy();
      vfx.slashArcs.splice(i, 1);
    }
  }
}

/**
 * Spawns a transient swing arc centred on (cx, cy), sweeping the cone the attack
 * actually covers. This is what communicates aim direction (the character sprite
 * only mirrors left/right), so its geometry should match the real hit region.
 */
export function spawnSlashArc(
  vfx: VFXResource,
  entityLayer: Container,
  cx: number,
  cy: number,
  angle: number,
  reach: number,
  halfAngle: number,
  color: number
): void {
  const g = new Graphics();
  g.x = cx;
  g.y = cy;
  entityLayer.addChild(g);
  vfx.slashArcs.push({ graphic: g, life: 0, maxLife: 0.22, angle, reach, halfAngle, color });
}

export function spawnCrosscutSlash(
  vfx: VFXResource,
  entityLayer: Container,
  cx: number,
  cy: number,
  angle: number,
  reach: number,
  color: number,
  grade: "excellent" | "good" | "weak",
): void {
  const g = new Graphics();
  g.x = cx;
  g.y = cy;
  const length = reach * (grade === "excellent" ? 1.1 : grade === "good" ? 1.0 : 0.88);
  const width = grade === "excellent" ? 5 : grade === "good" ? 4 : 3;
  const alpha = grade === "excellent" ? 0.92 : grade === "good" ? 0.76 : 0.58;
  const half = length * 0.5;
  const cross = Math.PI / 2;

  g.moveTo(Math.cos(angle) * -half, Math.sin(angle) * -half);
  g.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
  g.moveTo(Math.cos(angle + cross) * -half, Math.sin(angle + cross) * -half);
  g.lineTo(Math.cos(angle + cross) * half, Math.sin(angle + cross) * half);
  g.stroke({ color, width, alpha });
  g.moveTo(Math.cos(angle) * -half, Math.sin(angle) * -half);
  g.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
  g.stroke({ color: Colors.ui.white, width: Math.max(1.5, width * 0.4), alpha: alpha * 0.75 });

  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: grade === "excellent" ? 0.28 : 0.22,
    angle,
    reach,
    halfAngle: Math.PI / 2,
    color,
    variant: "crosscut",
    grade,
  });

  const particleCount = grade === "excellent" ? 16 : grade === "good" ? 10 : 6;
  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    p.rect(-1.5, -1.5, 3, 3).fill({ color, alpha: 0.9 });
    p.x = cx + (Math.random() - 0.5) * 18;
    p.y = cy + (Math.random() - 0.5) * 18;
    const burstAngle = angle + (Math.random() < 0.5 ? cross : -cross) + (Math.random() - 0.5) * 0.8;
    const speed = 80 + Math.random() * (grade === "excellent" ? 130 : 80);
    vfx.particles.push({
      graphic: p,
      vx: Math.cos(burstAngle) * speed,
      vy: Math.sin(burstAngle) * speed,
      gravity: 40,
      life: 0,
      maxLife: 0.25 + Math.random() * 0.22,
    });
    entityLayer.addChild(p);
  }
}

/**
 * Additive impact flash over an entity's sprite. Reuses the hitFlashes pool (and
 * its updater) so any damageable entity flashes on hit the way resource nodes do.
 */
export function flashEntity(
  vfx: VFXResource,
  entityLayer: Container,
  id: string,
  worldX: number,
  worldY: number,
  color: number
): void {
  const old = vfx.hitFlashes.get(id);
  if (old) {
    entityLayer.removeChild(old.graphic);
    old.graphic.destroy();
  }
  const g = new Graphics();
  g.rect(-TILE * 0.45, -TILE, TILE * 0.9, TILE).fill({ color, alpha: 0.55 });
  g.blendMode = "add";
  g.x = worldX;
  g.y = worldY;
  entityLayer.addChild(g);
  vfx.hitFlashes.set(id, { graphic: g, timer: 0.08 });
}

/** Death burst: debris spray + expanding shockwave ring at a world point. */
export function spawnDeathBurst(
  vfx: VFXResource,
  entityLayer: Container,
  worldX: number,
  worldY: number,
  color: number
): void {
  const count = 20 + Math.floor(Math.random() * 10);
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    g.circle(0, 0, 2.5).fill(color);
    g.x = worldX + (Math.random() - 0.5) * 24;
    g.y = worldY + (Math.random() - 0.5) * 24;
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    vfx.particles.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      gravity: 300,
      life: 0,
      maxLife: 0.5 + Math.random() * 0.4,
    });
    entityLayer.addChild(g);
  }
  const ringG = new Graphics();
  ringG.x = worldX;
  ringG.y = worldY;
  entityLayer.addChild(ringG);
  vfx.shockwaveRings.push({ graphic: ringG, life: 0, maxLife: 0.35, color });
  triggerCameraShake(vfx, 5, 0.18);
}

/**
 * Character level-up moment: staggered gold rings + a rising ember column on
 * the player. Deliberately NOT a floating text — the HUD readout carries the
 * number; this carries the feeling.
 */
export function spawnLevelUpBurst(
  vfx: VFXResource,
  entityLayer: Container,
  worldX: number,
  worldY: number
): void {
  spawnShockwaveRing(vfx, entityLayer, worldX, worldY, Colors.resource.xp, 0.45);
  spawnShockwaveRing(vfx, entityLayer, worldX, worldY, Colors.resource.gold, 0.7);
  const count = 26;
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    g.rect(-1.5, -1.5, 3, 3).fill(i % 3 === 0 ? Colors.resource.gold : Colors.resource.xp);
    const angle = (i / count) * Math.PI * 2;
    const radius = 10 + Math.random() * 14;
    g.x = worldX + Math.cos(angle) * radius;
    g.y = worldY + Math.sin(angle) * radius;
    vfx.particles.push({
      graphic: g,
      vx: Math.cos(angle) * 30,
      vy: -90 - Math.random() * 80,
      gravity: -40,
      life: 0,
      maxLife: 0.7 + Math.random() * 0.5,
    });
    entityLayer.addChild(g);
  }
  triggerCameraShake(vfx, 3, 0.15);
}

/** One-shot expanding ring at a world point (e.g. a focused-gather hit pop). */
export function spawnShockwaveRing(
  vfx: VFXResource,
  entityLayer: Container,
  worldX: number,
  worldY: number,
  color: number,
  maxLife = 0.3
): void {
  const ringG = new Graphics();
  ringG.x = worldX;
  ringG.y = worldY;
  entityLayer.addChild(ringG);
  vfx.shockwaveRings.push({ graphic: ringG, life: 0, maxLife, color });
}

/** Rising damage number at a world point. Reuses the floatingTexts pool/updater. */
export function spawnDamageNumber(
  vfx: VFXResource,
  entityLayer: Container,
  worldX: number,
  worldY: number,
  amount: number,
  color: number
): void {
  const textStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 16,
    fontWeight: "bold",
    fill: color,
    stroke: { color: Colors.ui.stroke, width: 3 },
  });
  const textObj = new Text({ text: `${amount}`, style: textStyle });
  textObj.anchor.set(0.5, 0.5);
  const bx = worldX + (Math.random() - 0.5) * 10;
  textObj.x = bx;
  textObj.y = worldY;
  // Group by coarse world region so repeated hits on a spot stack, not overlap.
  const stackKey = `dmg:${Math.round(worldX / 48)}:${Math.round(worldY / 48)}`;
  vfx.floatingTexts.push({ textObj, stackKey, baseX: bx, baseY: worldY, life: 0, maxLife: 0.8 });
  entityLayer.addChild(textObj);
}

export function spawnEnvParticles(
  vfx: VFXResource,
  color: number,
  count = 10,
  type: "smoke" | "bubble" | "sizzle" = "smoke",
  playerPos: { x: number; y: number },
  entityLayer: Container
): void {
  const px = playerPos.x + TILE / 2;
  const py = playerPos.y + TILE / 2;

  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    if (type === "smoke") {
      g.rect(-2, -2, 4, 4).fill(color);
    } else if (type === "bubble") {
      g.circle(0, 0, 3).fill({ color, alpha: 0.7 });
    } else {
      g.rect(-1, -4, 2, 8).fill(color);
    }
    g.x = px + (Math.random() - 0.5) * 20;
    g.y = py + (Math.random() - 0.5) * 20;

    const vx = (Math.random() - 0.5) * 25;
    const vy = -35 - Math.random() * 40;

    vfx.particles.push({
      graphic: g,
      vx,
      vy,
      gravity: type === "smoke" ? -20 : 0,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.4,
    });
    entityLayer.addChild(g);
  }
}

export function updateFourfoldSlashVFX(
  vfx: VFXResource,
  playerPos: { x: number; y: number } | undefined,
  state: FourfoldSlashState,
  config: FourfoldSlashConfig,
  currentTimeMs: number,
  reach: number
): void {
  if (!vfx.fourfoldRing) return;

  if (!playerPos || state.inputs.length === 0 || currentTimeMs >= state.cooldownUntilMs) {
    vfx.fourfoldRing.visible = false;
    return;
  }

  vfx.fourfoldRing.visible = true;
  vfx.fourfoldRing.x = playerPos.x + TILE / 2;
  vfx.fourfoldRing.y = playerPos.y + TILE / 2;
  vfx.fourfoldRing.clear();

  const radius = reach * 1.1;

  // 1. Draw background track circle
  vfx.fourfoldRing.circle(0, 0, radius).stroke({ color: 0x4a3f35, width: 2, alpha: 0.35 });

  // 2. Draw sequence connection lines
  if (state.inputs.length > 1) {
    const startNode = getDirectionCoords(state.inputs[0]!, radius);
    vfx.fourfoldRing.moveTo(startNode.x, startNode.y);
    for (let i = 1; i < state.inputs.length; i++) {
      const nextNode = getDirectionCoords(state.inputs[i]!, radius);
      vfx.fourfoldRing.lineTo(nextNode.x, nextNode.y);
    }
    vfx.fourfoldRing.stroke({ color: 0xd9c5b2, width: 2.5, alpha: 0.8 });
  }

  // 3. Draw timer progress arc
  const elapsedTotal = currentTimeMs - state.inputTimestampsMs[0]!;
  const elapsedGap = currentTimeMs - state.inputTimestampsMs[state.inputTimestampsMs.length - 1]!;
  const totalRemaining = config.comboTotalWindowMs - elapsedTotal;
  const gapRemaining = config.comboMaxGapMs - elapsedGap;
  const limitRemaining = Math.max(0, Math.min(totalRemaining, gapRemaining));
  const progress = limitRemaining / config.comboMaxGapMs;
  if (progress > 0.001) {
    const endAngle = -Math.PI / 2 + progress * Math.PI * 2;
    vfx.fourfoldRing.arc(0, 0, radius, -Math.PI / 2, endAngle);
    vfx.fourfoldRing.stroke({ color: 0xc8b29b, width: 3.5, alpha: 0.75 });
  }

  // 4. Draw quadrant nodes (top, right, bottom, left)
  const directions: ("top" | "right" | "bottom" | "left")[] = ["top", "right", "bottom", "left"];
  for (const dir of directions) {
    const node = getDirectionCoords(dir, radius);
    const isEntered = state.inputs.includes(dir);
    if (isEntered) {
      vfx.fourfoldRing.circle(node.x, node.y, 6.5).fill({ color: 0xe6dfd5, alpha: 0.95 });
      vfx.fourfoldRing.circle(node.x, node.y, 6.5).stroke({ color: 0xc8b29b, width: 1.5, alpha: 0.8 });
    } else {
      vfx.fourfoldRing.circle(node.x, node.y, 4.5).fill({ color: 0x4a3f35, alpha: 0.5 });
    }
  }
}

function getDirectionCoords(dir: "top" | "right" | "bottom" | "left", radius: number): { x: number; y: number } {
  switch (dir) {
    case "top": return { x: 0, y: -radius };
    case "right": return { x: radius, y: 0 };
    case "bottom": return { x: 0, y: radius };
    case "left": return { x: -radius, y: 0 };
  }
}

export function spawnFourfoldFinisherSlash(
  vfx: VFXResource,
  entityLayer: Container,
  cx: number,
  cy: number,
  reach: number,
  color: number,
  variant: "wheel_slash" | "falling_wheel" | "rising_wheel" | "crosswind_cut"
): void {
  const g = new Graphics();
  g.x = cx;
  g.y = cy;
  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: 0.38,
    angle: 0,
    reach,
    halfAngle: Math.PI,
    color,
    variant,
  });

  const particleCount = variant === "wheel_slash" ? 28 : 20;
  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    const isDust = Math.random() < 0.6;
    const pColor = isDust ? 0x6e6259 : color;
    const size = isDust ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2;
    p.circle(0, 0, size).fill({ color: pColor, alpha: 0.8 });

    p.x = cx + (Math.random() - 0.5) * 32;
    p.y = cy + (Math.random() - 0.5) * 32;

    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 120;

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed;
    let gravity = 60;

    if (variant === "falling_wheel") {
      vy = Math.abs(vy) + 50;
      gravity = 180;
    } else if (variant === "rising_wheel") {
      vy = -Math.abs(vy) - 50;
      gravity = -40;
    }

    vfx.particles.push({
      graphic: p,
      vx,
      vy,
      gravity,
      life: 0,
      maxLife: 0.3 + Math.random() * 0.35,
    });
    entityLayer.addChild(p);
  }
}
