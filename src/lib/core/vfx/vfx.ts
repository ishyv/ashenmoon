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
  type CrosscutIndicator,
} from "$lib/core/types";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { EntityId } from "$lib/domain/game-events";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import type { FourfoldSlashState, FourfoldSlashConfig } from "$lib/domain/combat/fourfold-slash";
import { getCharacterLevel } from "$lib/state/rpg/stats.svelte";

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
  public crosscutIndicators: CrosscutIndicator[] = [];
  public fellSweepChargeArc: Graphics | null = null;
  public strikeRing!: Graphics;
  public tremorLine!: Graphics;
  public placementCompass!: Graphics;
  public selectionRing!: Graphics;
  public comboRing!: Graphics;
  public fourfoldRing!: Graphics;
  public drivingThrustPreview: Graphics | null = null;
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
  entityLayer: Container,
  onFootstep?: (speed: "sneak" | "run" | "dash") => void
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

      if (onFootstep) {
        onFootstep(isDashing ? "dash" : isSprinting ? "run" : "sneak");
      }
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
    fontFamily: ["monospace", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "sans-serif"],
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
    if (
      arc.variant === "wheel_slash" ||
      arc.variant === "falling_wheel" ||
      arc.variant === "rising_wheel" ||
      arc.variant === "crosswind_cut" ||
      arc.variant === "starburst_cross" ||
      arc.variant === "vortex_slice" ||
      arc.variant === "level_shockwave"
    ) {
      const variant = arc.variant;
      if (variant === "wheel_slash") {
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.72;
        
        // Radial wheel spokes
        const spokes = 8;
        const width = 2.5 * (1 - t);
        const alpha = (1 - t) * 0.5;
        for (let j = 0; j < spokes; j++) {
          const spokeAngle = (j * Math.PI * 2) / spokes + t * 0.8;
          const x0 = Math.cos(spokeAngle) * inner;
          const y0 = Math.sin(spokeAngle) * inner;
          const x1 = Math.cos(spokeAngle) * r;
          const y1 = Math.sin(spokeAngle) * r;
          arc.graphic.moveTo(x0, y0);
          arc.graphic.lineTo(x1, y1);
        }
        arc.graphic.stroke({ color: arc.color ?? 0xffffff, width, alpha });

        // Outer concentric expanding ring
        const r2 = arc.reach * (0.7 + 0.6 * t);
        arc.graphic.circle(0, 0, r2).stroke({ color: Colors.ui.white, width: 1.5, alpha: (1 - t) * 0.4 });

        // Main concentric wheel
        arc.graphic.circle(0, 0, r);
        arc.graphic.circle(0, 0, inner);
        arc.graphic.fill({ color: arc.color ?? 0xffffff, alpha: (1 - t) * 0.65 });
        arc.graphic.circle(0, 0, r).stroke({ color: Colors.ui.white, width: 3, alpha: (1 - t) * 0.75 });
      } else if (variant === "falling_wheel") {
        const yOffset = t * 36;
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.65;

        // Trailing smaller crescent above
        const rTrail = r * 0.8;
        const innerTrail = rTrail * 0.7;
        const yOffsetTrail = Math.max(0, yOffset - 15);
        arc.graphic.moveTo(rTrail, yOffsetTrail);
        arc.graphic.arc(0, yOffsetTrail, rTrail, 0, Math.PI);
        arc.graphic.arc(0, yOffsetTrail, innerTrail, Math.PI, 0, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: 0xff7733, alpha: (1 - t) * 0.4 });

        // Main crescent slam
        arc.graphic.moveTo(r, yOffset);
        arc.graphic.arc(0, yOffset, r, 0, Math.PI);
        arc.graphic.arc(0, yOffset, inner, Math.PI, 0, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: arc.color ?? 0xffffff, alpha: (1 - t) * 0.8 });
        arc.graphic.arc(0, yOffset, r, 0, Math.PI).stroke({ color: Colors.ui.white, width: 4.5, alpha: (1 - t) * 0.85 });
      } else if (variant === "rising_wheel") {
        const yOffset = -t * 36;
        const r = arc.reach * (0.6 + 0.45 * t);
        const inner = r * 0.65;

        // Trailing smaller crescent below
        const rTrail = r * 0.8;
        const innerTrail = rTrail * 0.7;
        const yOffsetTrail = Math.min(0, yOffset + 15);
        arc.graphic.moveTo(-rTrail, yOffsetTrail);
        arc.graphic.arc(0, yOffsetTrail, rTrail, Math.PI, 2 * Math.PI);
        arc.graphic.arc(0, yOffsetTrail, innerTrail, 2 * Math.PI, Math.PI, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: 0x33e0a6, alpha: (1 - t) * 0.4 });

        // Main crescent lift
        arc.graphic.moveTo(-r, yOffset);
        arc.graphic.arc(0, yOffset, r, Math.PI, 2 * Math.PI);
        arc.graphic.arc(0, yOffset, inner, 2 * Math.PI, Math.PI, true);
        arc.graphic.closePath();
        arc.graphic.fill({ color: arc.color ?? 0xffffff, alpha: (1 - t) * 0.8 });
        arc.graphic.arc(0, yOffset, r, Math.PI, 2 * Math.PI).stroke({ color: Colors.ui.white, width: 4.5, alpha: (1 - t) * 0.85 });
      } else if (variant === "starburst_cross") {
        const len = arc.reach * (0.4 + 0.75 * t);
        const half = len * 0.85;
        const width = 5 + (1 - t) * 4;
        const alpha = (1 - t) * 0.9;

        // Diagonals
        const diag1 = Math.PI / 4;
        const diag2 = (3 * Math.PI) / 4;
        arc.graphic.moveTo(-Math.cos(diag1) * half, -Math.sin(diag1) * half);
        arc.graphic.lineTo(Math.cos(diag1) * half, Math.sin(diag1) * half);
        arc.graphic.moveTo(-Math.cos(diag2) * half, -Math.sin(diag2) * half);
        arc.graphic.lineTo(Math.cos(diag2) * half, Math.sin(diag2) * half);

        // Cardinals
        arc.graphic.moveTo(-half, 0);
        arc.graphic.lineTo(half, 0);
        arc.graphic.moveTo(0, -half);
        arc.graphic.lineTo(0, half);

        arc.graphic.stroke({ color: arc.color ?? 0xffffff, width, alpha });

        // Inner bright core lines
        arc.graphic.moveTo(-Math.cos(diag1) * half * 0.85, -Math.sin(diag1) * half * 0.85);
        arc.graphic.lineTo(Math.cos(diag1) * half * 0.85, Math.sin(diag1) * half * 0.85);
        arc.graphic.moveTo(-Math.cos(diag2) * half * 0.85, -Math.sin(diag2) * half * 0.85);
        arc.graphic.lineTo(Math.cos(diag2) * half * 0.85, Math.sin(diag2) * half * 0.85);

        arc.graphic.moveTo(-half * 0.85, 0);
        arc.graphic.lineTo(half * 0.85, 0);
        arc.graphic.moveTo(0, -half * 0.85);
        arc.graphic.lineTo(0, half * 0.85);

        arc.graphic.stroke({ color: Colors.ui.white, width: Math.max(1.5, width * 0.3), alpha: alpha * 0.85 });

        // Jittery electric forks
        const forks = 4;
        const forkLength = half * 0.4;
        for (let j = 0; j < forks; j++) {
          const forkAngle = (j * Math.PI) / 2 + Math.PI / 4;
          const fx = Math.cos(forkAngle) * half;
          const fy = Math.sin(forkAngle) * half;
          const bx1 = fx + Math.cos(forkAngle + 0.4) * forkLength;
          const by1 = fy + Math.sin(forkAngle + 0.4) * forkLength;
          const bx2 = bx1 + Math.cos(forkAngle - 0.2) * forkLength * 0.7;
          const by2 = by1 + Math.sin(forkAngle - 0.2) * forkLength * 0.7;
          arc.graphic.moveTo(fx, fy);
          arc.graphic.lineTo(bx1, by1);
          arc.graphic.lineTo(bx2, by2);
        }
        arc.graphic.stroke({ color: Colors.ui.white, width: 1.5, alpha: alpha * 0.75 });
      } else if (variant === "vortex_slice") {
        const arms = 3;
        const baseAngle = t * Math.PI * 2.2;
        const alpha = (1 - t) * 0.8;
        const width = 4 + (1 - t) * 3;

        for (let j = 0; j < arms; j++) {
          const armAngle = baseAngle + (j * Math.PI * 2) / arms;
          const r0 = arc.reach * (0.2 + 0.4 * t);
          const r1 = arc.reach * (0.5 + 0.5 * t);
          const midAngle = armAngle + 0.6;

          const x0 = Math.cos(armAngle) * r0;
          const y0 = Math.sin(armAngle) * r0;
          const x1 = Math.cos(midAngle) * ((r0 + r1) * 0.5);
          const y1 = Math.sin(midAngle) * ((r0 + r1) * 0.5);
          const x2 = Math.cos(armAngle + 1.2) * r1;
          const y2 = Math.sin(armAngle + 1.2) * r1;

          arc.graphic.moveTo(x0, y0);
          arc.graphic.quadraticCurveTo(x1, y1, x2, y2);
        }
        arc.graphic.stroke({ color: arc.color ?? 0xffffff, width, alpha });

        // Inner swirl ring
        const rInner = arc.reach * (0.3 + 0.45 * t);
        arc.graphic.circle(0, 0, rInner).stroke({ color: Colors.ui.white, width: 1.5, alpha: alpha * 0.5 });
      } else if (variant === "crosswind_cut") {
        const r = arc.reach * (0.5 + 0.5 * t);
        const inner = r * 0.8;
        arc.graphic.circle(0, 0, r);
        arc.graphic.circle(0, 0, inner);
        arc.graphic.fill({ color: arc.color ?? 0xffffff, alpha: (1 - t) * 0.5 });

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
        arc.graphic.stroke({ color: arc.color ?? 0xffffff, width, alpha });

        arc.graphic.moveTo(-Math.cos(angle1) * half * 0.8, -Math.sin(angle1) * half * 0.8);
        arc.graphic.lineTo(Math.cos(angle1) * half * 0.8, Math.sin(angle1) * half * 0.8);
        arc.graphic.moveTo(-Math.cos(angle2) * half * 0.8, -Math.sin(angle2) * half * 0.8);
        arc.graphic.lineTo(Math.cos(angle2) * half * 0.8, Math.sin(angle2) * half * 0.8);
        arc.graphic.stroke({ color: Colors.ui.white, width: 2, alpha: alpha * 0.9 });
      } else if (variant === "level_shockwave") {
        const radius = arc.reach * t;
        const width = 2 * (1 - t);
        const alpha = (1 - t) * 0.45;
        const a0 = arc.angle - arc.halfAngle;
        const a1 = arc.angle + arc.halfAngle;

        arc.graphic.moveTo(Math.cos(a0) * radius, Math.sin(a0) * radius);
        arc.graphic.arc(0, 0, radius, a0, a1);
        arc.graphic.stroke({ color: arc.color ?? 0xffaa44, width, alpha });
      }

      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    if (arc.variant === "crosscut") {
      const stacks = arc.stacks ?? 1;
      const stackPower = Math.min(5, Math.max(1, stacks));
      const intro = Math.max(0, 1 - arc.life / 0.12);
      const length = arc.reach * (arc.grade === "excellent" ? 1.25 : arc.grade === "good" ? 1.12 : 0.98) * (1 + stackPower * 0.045);
      const half = length * 0.5;
      const width = (arc.grade === "excellent" ? 6 : arc.grade === "good" ? 5 : 4) + stackPower * 0.8 + intro * 4;
      const alpha = (1 - t) * (arc.grade === "excellent" ? 0.95 : arc.grade === "good" ? 0.82 : 0.66);

      arc.graphic.moveTo(Math.cos(arc.angle) * -half, Math.sin(arc.angle) * -half);
      arc.graphic.lineTo(Math.cos(arc.angle) * half, Math.sin(arc.angle) * half);
      arc.graphic.stroke({ color: arc.color ?? 0xffffff, width, alpha });

      arc.graphic.moveTo(Math.cos(arc.angle) * -half, Math.sin(arc.angle) * -half);
      arc.graphic.lineTo(Math.cos(arc.angle) * half, Math.sin(arc.angle) * half);
      arc.graphic.stroke({ color: Colors.ui.white, width: Math.max(2, width * 0.28), alpha: alpha * 0.78 });

      if (stackPower >= 2) {
        const forkCount = Math.min(4, stackPower);
        for (let fork = 0; fork < forkCount; fork++) {
          const forkT = (fork + 1) / (forkCount + 1);
          const base = -half + length * forkT;
          const jitter = (fork % 2 === 0 ? 1 : -1) * (8 + stackPower * 3);
          const bx = Math.cos(arc.angle) * base;
          const by = Math.sin(arc.angle) * base;
          const sideX = Math.cos(arc.angle + Math.PI / 2) * jitter;
          const sideY = Math.sin(arc.angle + Math.PI / 2) * jitter;
          arc.graphic.moveTo(bx, by);
          arc.graphic.lineTo(bx + sideX, by + sideY);
        }
        arc.graphic.stroke({ color: Colors.ui.white, width: 1.5 + stackPower * 0.35, alpha: alpha * 0.65 });
      }
      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    if (arc.variant === "driving_thrust") {
      const length = arc.reach;
      const width = arc.halfAngle;
      const alpha = (1 - t) * 0.78;

      const cosA = Math.cos(arc.angle);
      const sinA = Math.sin(arc.angle);

      // Draw energy lance body (tapering triangle)
      const baseSide = width * 0.45 * (1 - t);
      const leftX = -sinA * baseSide;
      const leftY = cosA * baseSide;
      const rightX = sinA * baseSide;
      const rightY = -cosA * baseSide;
      const tipX = cosA * length;
      const tipY = sinA * length;

      arc.graphic.moveTo(leftX, leftY);
      arc.graphic.lineTo(tipX, tipY);
      arc.graphic.lineTo(rightX, rightY);
      arc.graphic.closePath();
      arc.graphic.fill({ color: arc.color ?? Colors.combat.drivingThrust, alpha: alpha * 0.32 });

      // Highlight center line (piercing core)
      arc.graphic.moveTo(0, 0);
      arc.graphic.lineTo(tipX, tipY);
      arc.graphic.stroke({ color: Colors.ui.white, width: 3 * (1 - t) + 1.5, alpha });

      // Sonic boom rings expanding at starting origin
      const boomRadius = length * 0.35 * t;
      arc.graphic.circle(0, 0, boomRadius).stroke({ color: Colors.ui.white, width: 1.5, alpha: (1 - t) * 0.45 });

      // Shockwave crescent ahead of the spear tip
      const waveRadius = length * 0.9;
      const waveSpan = Math.PI / 6;
      arc.graphic.moveTo(
        Math.cos(arc.angle - waveSpan) * waveRadius,
        Math.sin(arc.angle - waveSpan) * waveRadius
      );
      arc.graphic.arc(0, 0, waveRadius, arc.angle - waveSpan, arc.angle + waveSpan);
      arc.graphic.stroke({ color: arc.color ?? Colors.combat.drivingThrust, width: 2, alpha: alpha * 0.5 });

      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    if (arc.variant === "fell_sweep_cleave") {
      const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
      const segments = 8;
      const cos = Math.cos(arc.angle);
      const sin = Math.sin(arc.angle);
      for (let j = 1; j <= segments; j++) {
        const dist = (j / segments) * arc.reach;
        const jitter = Math.sin(j * 23.7 + arc.angle * 53.1) * (arc.halfAngle * 0.15) * (1 - t * 0.3);
        const px = cos * dist - sin * jitter;
        const py = sin * dist + cos * jitter;
        points.push({ x: px, y: py });
      }

      arc.graphic.moveTo(0, 0);
      for (let j = 1; j <= segments; j++) {
        arc.graphic.lineTo(points[j]!.x, points[j]!.y);
      }
      arc.graphic.stroke({ color: 0xff4400, width: arc.halfAngle * (0.8 - t * 0.6), alpha: (1 - t) * 0.6 });

      arc.graphic.moveTo(0, 0);
      for (let j = 1; j <= segments; j++) {
        arc.graphic.lineTo(points[j]!.x, points[j]!.y);
      }
      arc.graphic.stroke({ color: 0x3d3530, width: 6 * (1 - t), alpha: 1 - t });

      arc.graphic.moveTo(0, 0);
      for (let j = 1; j <= segments; j++) {
        arc.graphic.lineTo(points[j]!.x, points[j]!.y);
      }
      arc.graphic.stroke({ color: 0xffaa00, width: 2 * (1 - t), alpha: 1 - t });

      if (arc.life >= arc.maxLife) {
        entityLayer.removeChild(arc.graphic);
        arc.graphic.destroy();
        vfx.slashArcs.splice(i, 1);
      }
      continue;
    }
    if (arc.variant === "fell_sweep_whirl") {
      if (t < 0.35) {
        const tSpiral = t / 0.35;
        const alpha = 0.8 * (1 - tSpiral);
        const arms = 3;
        for (let arm = 0; arm < arms; arm++) {
          const baseTheta = (arm * Math.PI * 2) / arms + tSpiral * Math.PI * 1.5;
          arc.graphic.moveTo(
            Math.cos(baseTheta) * arc.reach * 1.4,
            Math.sin(baseTheta) * arc.reach * 1.4
          );
          const steps = 12;
          for (let step = 1; step <= steps; step++) {
            const stepT = step / steps;
            const theta = baseTheta + stepT * Math.PI * 0.8;
            const rRadius = arc.reach * (1.4 - 0.9 * stepT * tSpiral);
            arc.graphic.lineTo(Math.cos(theta) * rRadius, Math.sin(theta) * rRadius);
          }
          arc.graphic.stroke({ color: 0xff7722, width: 3 * (1 - tSpiral) + 1, alpha });
        }
      } else {
        const tBlast = (t - 0.35) / 0.65;
        const blastAlpha = (1 - tBlast) * 0.8;
        const radius = arc.reach * (0.3 + 1.0 * tBlast);
        arc.graphic.circle(0, 0, radius).stroke({ color: 0xffaa22, width: 6 * (1 - tBlast) + 1.5, alpha: blastAlpha });
        arc.graphic.circle(0, 0, radius * 0.95).stroke({ color: Colors.ui.white, width: 2 * (1 - tBlast), alpha: blastAlpha });

        const rays = 8;
        for (let j = 0; j < rays; j++) {
          const rayAngle = (j * Math.PI * 2) / rays + tBlast * 0.2;
          const x0 = Math.cos(rayAngle) * radius * 0.7;
          const y0 = Math.sin(rayAngle) * radius * 0.7;
          const x1 = Math.cos(rayAngle) * radius * 1.1;
          const y1 = Math.sin(rayAngle) * radius * 1.1;
          arc.graphic.moveTo(x0, y0);
          arc.graphic.lineTo(x1, y1);
        }
        arc.graphic.stroke({ color: 0xff4400, width: 2.5 * (1 - tBlast), alpha: blastAlpha * 0.7 });
      }

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
    arc.graphic.fill({ color: arc.color ?? 0xffffff, alpha: (1 - t) * 0.5 });
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

  // Sparks always fire; more and brighter at higher levels.
  const level = getCharacterLevel();

  {
    const sparkCount = level >= 15 ? 10 : level >= 10 ? 6 : level >= 5 ? 3 : 2;
    const colors = level >= 15 ? [0xffdd55, 0xff8833, 0xffffff] : level >= 10 ? [0xffaa33, 0xee7722] : [0xddaa77];

    for (let i = 0; i < sparkCount; i++) {
      const pG = new Graphics();
      const size = 2 + Math.random() * 3;
      pG.rect(-size / 2, -size / 2, size, size).fill(colors[Math.floor(Math.random() * colors.length)]);

      const spreadAngle = angle + (Math.random() - 0.5) * halfAngle * 1.5;
      const dist = reach * (0.3 + Math.random() * 0.6);
      pG.x = cx + Math.cos(spreadAngle) * dist;
      pG.y = cy + Math.sin(spreadAngle) * dist;

      // Speed/direction
      const speed = 120 + Math.random() * 100;
      const vx = Math.cos(spreadAngle) * speed;
      const vy = Math.sin(spreadAngle) * speed - (30 + Math.random() * 40);

      vfx.particles.push({
        graphic: pG,
        vx,
        vy,
        gravity: 0,
        life: 0,
        maxLife: 0.15 + Math.random() * 0.18,
      });
      entityLayer.addChild(pG);
    }
  }

  if (level >= 15) {
    const wave = new Graphics();
    wave.x = cx;
    wave.y = cy;
    entityLayer.addChild(wave);
    vfx.slashArcs.push({
      graphic: wave,
      life: 0,
      maxLife: 0.35,
      angle,
      reach: reach * 1.35,
      halfAngle: halfAngle * 0.8,
      color: 0xffaa44,
      variant: "level_shockwave"
    });
  }
}

export function spawnFellSweepCleave(
  vfx: VFXResource,
  entityLayer: Container,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  length: number,
  width: number,
  color: number
): void {
  const g = new Graphics();
  g.x = origin.x;
  g.y = origin.y;
  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: 0.65,
    angle: Math.atan2(direction.y, direction.x),
    reach: length,
    halfAngle: width,
    color,
    variant: "fell_sweep_cleave"
  });

  const colors = [0x554c45, 0x3d3530, 0x2e2723, 0x6e6056];
  for (let i = 0; i < 12; i++) {
    const pG = new Graphics();
    const w = 4 + Math.random() * 6;
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    pG.rect(-w / 2, -w / 2, w, w).fill(randColor);

    const tDist = Math.random();
    const perpOffset = (Math.random() - 0.5) * (width * 0.7);
    const alongX = origin.x + direction.x * length * tDist;
    const alongY = origin.y + direction.y * length * tDist;
    const perpX = -direction.y * perpOffset;
    const perpY = direction.x * perpOffset;

    pG.x = alongX + perpX;
    pG.y = alongY + perpY;

    const vx = (Math.random() - 0.5) * 50;
    const vy = -90 - Math.random() * 80;

    vfx.particles.push({
      graphic: pG,
      vx,
      vy,
      gravity: 280,
      life: 0,
      maxLife: 0.6 + Math.random() * 0.4
    });
    entityLayer.addChild(pG);
  }

  for (let i = 0; i < 10; i++) {
    const pG = new Graphics();
    const size = 2 + Math.random() * 3;
    pG.circle(0, 0, size).fill(0xff7722);

    const tDist = Math.random();
    const perpOffset = (Math.random() - 0.5) * (width * 0.7);
    pG.x = origin.x + direction.x * length * tDist - direction.y * perpOffset;
    pG.y = origin.y + direction.y * length * tDist + direction.x * perpOffset;

    const vx = (Math.random() - 0.5) * 40;
    const vy = -120 - Math.random() * 70;

    vfx.particles.push({
      graphic: pG,
      vx,
      vy,
      gravity: -50,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.4
    });
    entityLayer.addChild(pG);
  }
}

export function spawnFellSweepWhirl(
  vfx: VFXResource,
  entityLayer: Container,
  origin: { x: number; y: number },
  radius: number,
  color: number
): void {
  const g = new Graphics();
  g.x = origin.x;
  g.y = origin.y;
  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: 0.75,
    angle: 0,
    reach: radius,
    halfAngle: Math.PI,
    color,
    variant: "fell_sweep_whirl"
  });

  for (let i = 0; i < 30; i++) {
    const pG = new Graphics();
    const size = 2 + Math.random() * 3;
    const pColors = [0xff5511, 0xffaa00, 0xff3300];
    const randColor = pColors[Math.floor(Math.random() * pColors.length)];
    pG.circle(0, 0, size).fill(randColor);

    const theta = Math.random() * Math.PI * 2;
    const rDist = radius * (0.3 + Math.random() * 0.8);
    pG.x = origin.x + Math.cos(theta) * rDist;
    pG.y = origin.y + Math.sin(theta) * rDist;

    const speed = 100 + Math.random() * 120;
    const tx = -Math.sin(theta);
    const ty = Math.cos(theta);
    const rx = Math.cos(theta);
    const ry = Math.sin(theta);

    const vx = tx * speed * 0.5 + rx * speed * 0.8;
    const vy = ty * speed * 0.5 + ry * speed * 0.8;

    vfx.particles.push({
      graphic: pG,
      vx,
      vy,
      gravity: 0,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3
    });
    entityLayer.addChild(pG);
  }
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
  stacks = 1,
): void {
  const g = new Graphics();
  g.x = cx;
  g.y = cy;
  const stackPower = Math.min(5, Math.max(1, stacks));
  const length = reach * (grade === "excellent" ? 1.25 : grade === "good" ? 1.12 : 0.98) * (1 + stackPower * 0.045);
  const width = (grade === "excellent" ? 7 : grade === "good" ? 6 : 5) + stackPower;
  const alpha = grade === "excellent" ? 0.92 : grade === "good" ? 0.76 : 0.58;
  const half = length * 0.5;

  g.moveTo(Math.cos(angle) * -half, Math.sin(angle) * -half);
  g.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
  g.stroke({ color, width, alpha });
  g.moveTo(Math.cos(angle) * -half, Math.sin(angle) * -half);
  g.lineTo(Math.cos(angle) * half, Math.sin(angle) * half);
  g.stroke({ color: Colors.ui.white, width: Math.max(1.5, width * 0.4), alpha: alpha * 0.75 });

  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: grade === "excellent" ? 1.6 : grade === "good" ? 1.35 : 1.15,
    angle,
    reach,
    halfAngle: Math.PI / 2,
    color,
    variant: "crosscut",
    grade,
    stacks,
  });

  const particleCount = (grade === "excellent" ? 16 : grade === "good" ? 10 : 6) + stackPower * 5;
  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    const isLightning = stackPower >= 2 && i % 3 === 0;
    if (isLightning) {
      p.rect(-1, -5, 2, 10).fill({ color: Colors.ui.white, alpha: 0.95 });
    } else {
      p.rect(-1.5, -1.5, 3, 3).fill({ color, alpha: 0.9 });
    }
    p.x = cx + (Math.random() - 0.5) * 18;
    p.y = cy + (Math.random() - 0.5) * 18;
    const burstAngle = angle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + (Math.random() - 0.5) * 0.8;
    const speed = 80 + stackPower * 22 + Math.random() * (grade === "excellent" ? 150 : 95);
    vfx.particles.push({
      graphic: p,
      vx: Math.cos(burstAngle) * speed,
      vy: Math.sin(burstAngle) * speed,
      gravity: isLightning ? 0 : 40,
      life: 0,
      maxLife: (isLightning ? 0.16 : 0.25) + Math.random() * 0.22,
    });
    entityLayer.addChild(p);
  }
}

export function spawnDrivingThrustSlash(
  vfx: VFXResource,
  entityLayer: Container,
  origin: { x: number; y: number },
  direction: { x: number; y: number },
  lengthPx: number,
  widthPx: number,
): void {
  const angle = Math.atan2(direction.y, direction.x);
  const g = new Graphics();
  g.x = origin.x;
  g.y = origin.y;
  entityLayer.addChild(g);
  vfx.slashArcs.push({
    graphic: g,
    life: 0,
    maxLife: 0.26,
    angle,
    reach: lengthPx,
    halfAngle: widthPx,
    color: Colors.combat.drivingThrust,
    variant: "driving_thrust",
  });

  const count = 18;
  for (let i = 0; i < count; i++) {
    const along = Math.random() * lengthPx;
    const side = (Math.random() - 0.5) * widthPx;
    const px = origin.x + direction.x * along + -direction.y * side;
    const py = origin.y + direction.y * along + direction.x * side;
    const p = new Graphics();
    p.rect(-2, -2, 4, 4).fill({ color: Colors.combat.drivingThrust, alpha: 0.86 });
    p.x = px;
    p.y = py;
    const speed = 60 + Math.random() * 110;
    vfx.particles.push({
      graphic: p,
      vx: direction.x * speed + (Math.random() - 0.5) * 35,
      vy: direction.y * speed + (Math.random() - 0.5) * 35,
      gravity: 60,
      life: 0,
      maxLife: 0.22 + Math.random() * 0.22,
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
  color: number,
  fontSize = 16
): void {
  const textStyle = new TextStyle({
    fontFamily: ["monospace", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "sans-serif"],
    fontSize,
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
  variant: "wheel_slash" | "falling_wheel" | "rising_wheel" | "crosswind_cut" | "starburst_cross" | "vortex_slice"
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

  let particleCount = 20;
  if (variant === "wheel_slash" || variant === "starburst_cross") {
    particleCount = 32;
  } else if (variant === "vortex_slice") {
    particleCount = 28;
  } else if (variant === "falling_wheel" || variant === "rising_wheel") {
    particleCount = 24;
  }

  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    const isDust = Math.random() < 0.6;
    let pColor = isDust ? 0x6e6259 : color;
    let size = isDust ? 2 + Math.random() * 3 : 1.5 + Math.random() * 2;

    if (variant === "starburst_cross" && !isDust) {
      pColor = Math.random() < 0.4 ? 0xa55eea : color;
      if (Math.random() < 0.3) pColor = 0xffffff;
      size = 1.0 + Math.random() * 2.5;
    } else if (variant === "vortex_slice" && !isDust) {
      pColor = Math.random() < 0.3 ? 0xffbb00 : color;
      size = 2.0 + Math.random() * 2.0;
    }

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
    } else if (variant === "starburst_cross") {
      const axis = Math.floor(Math.random() * 4);
      const targetAngle = (axis * Math.PI) / 2 + (Math.PI / 4) * (Math.random() < 0.5 ? 1 : 0);
      const multSpeed = 80 + Math.random() * 140;
      vx = Math.cos(targetAngle) * multSpeed + (Math.random() - 0.5) * 20;
      vy = Math.sin(targetAngle) * multSpeed + (Math.random() - 0.5) * 20;
      gravity = 15;
    } else if (variant === "vortex_slice") {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy) || 1;
      const swirlSpeed = 80 + Math.random() * 100;
      const radialSpeed = 30 + Math.random() * 50;
      vx = (-dy / dist) * swirlSpeed + (dx / dist) * radialSpeed;
      vy = (dx / dist) * swirlSpeed + (dy / dist) * radialSpeed;
      gravity = 35;
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

export function spawnCrosscutIndicator(
  vfx: VFXResource,
  entityLayer: Container,
  x: number,
  y: number,
  durationSec: number
): void {
  const g = new Graphics();
  g.x = x;
  g.y = y;

  const points = 4;
  const outerRadius = 6;
  const innerRadius = 2.5;
  g.moveTo(0, -outerRadius);
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * (Math.PI / points);
    g.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  g.closePath();
  g.fill({ color: 0xffffff, alpha: 0.35 });
  g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });

  entityLayer.addChild(g);
  vfx.crosscutIndicators.push({
    graphic: g,
    life: 0,
    maxLife: durationSec,
  });
}

export function crosscutIndicatorUpdateSystem(
  vfx: VFXResource,
  dt: number,
  entityLayer: Container
): void {
  for (let i = vfx.crosscutIndicators.length - 1; i >= 0; i--) {
    const p = vfx.crosscutIndicators[i]!;
    p.life += dt;
    p.graphic.alpha = Math.max(0, 1.0 - p.life / p.maxLife);

    if (p.life >= p.maxLife) {
      entityLayer.removeChild(p.graphic);
      p.graphic.destroy();
      vfx.crosscutIndicators.splice(i, 1);
    }
  }
}

export function clearCrosscutIndicators(
  vfx: VFXResource,
  entityLayer: Container
): void {
  for (const p of vfx.crosscutIndicators) {
    entityLayer.removeChild(p.graphic);
    p.graphic.destroy();
  }
  vfx.crosscutIndicators = [];
}

export function spawnChargeTrailDust(
  vfx: VFXResource,
  entityLayer: Container,
  pos: { x: number; y: number }
): void {
  const g = new Graphics();
  g.circle(0, 0, 1.5 + Math.random() * 2).fill({ color: 0xcccccc, alpha: 0.6 });
  g.x = pos.x + TILE / 2 + (Math.random() - 0.5) * 8;
  g.y = pos.y + TILE - 4;
  vfx.particles.push({
    graphic: g,
    vx: (Math.random() - 0.5) * 15,
    vy: -15 - Math.random() * 20,
    gravity: -5,
    life: 0,
    maxLife: 0.25 + Math.random() * 0.25,
  });
  entityLayer.addChild(g);
}

export function spawnDrivingThrustHitVFX(
  vfx: VFXResource,
  entityLayer: Container,
  hits: { ex: number; ey: number }[],
  numHits: number
): void {
  for (const hit of hits) {
    const particleCount = 12 + numHits * 6;
    for (let i = 0; i < particleCount; i++) {
      const p = new Graphics();
      let pColor: number = Colors.combat.drivingThrust;
      const rand = Math.random();
      if (numHits >= 3) {
        if (rand < 0.3) pColor = 0xffffff;
        else if (rand < 0.6) pColor = 0xffd700;
      } else if (numHits >= 2) {
        if (rand < 0.4) pColor = 0xffffff;
      }

      const size = 1.5 + Math.random() * 2.5;
      p.circle(0, 0, size).fill({ color: pColor, alpha: 0.9 });

      p.x = hit.ex;
      p.y = hit.ey;

      const angle = Math.random() * Math.PI * 2;
      const speed = 70 + Math.random() * 150;

      vfx.particles.push({
        graphic: p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 40,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.3,
      });
      entityLayer.addChild(p);
    }
  }
}

