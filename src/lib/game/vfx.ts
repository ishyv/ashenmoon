import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "./ecs-miniplex";
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
  Cell,
} from "./types";
import { TILE } from "./map";
import {
  playBirdChirp,
  playWaterBubble,
  playWindGust,
} from "./audio-synthesis";
import { Colors } from "./colors";
import { EntityId } from "./game-events";

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
  public gatherRing!: Graphics;
  public selectionRing!: Graphics;
  public selectionRingTime = 0;
  public footstepTimer = 0;
  public ambientSoundTimer = 2 + Math.random() * 3;
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

export function floatingTextUpdateSystem(vfx: VFXResource, dt: number, entityLayer: Container): void {
  for (let i = vfx.floatingTexts.length - 1; i >= 0; i--) {
    const ft = vfx.floatingTexts[i]!;
    ft.life += dt;
    ft.textObj.y += ft.vy * dt;
    ft.textObj.alpha = Math.max(0, 1 - ft.life / ft.maxLife);

    if (ft.life >= ft.maxLife) {
      entityLayer.removeChild(ft.textObj);
      ft.textObj.destroy();
      vfx.floatingTexts.splice(i, 1);
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
  vfx.gatherRing.y = playerPos.y + TILE;

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

export function selectionRingUpdateSystem(
  vfx: VFXResource,
  dt: number,
  currentTarget: Entity | null,
  nodeKinds: Map<string, "tree" | "ore" | "twig" | "stone">,
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
      const kind = nodeKinds.get(currentTarget.id);
      if (kind === "tree") {
        targetY = sprite.y - 38;
      } else if (kind === "ore" || kind === "twig" || kind === "stone") {
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

export function ambientSoundSystem(
  vfx: VFXResource,
  dt: number,
  playerPos: { x: number; y: number },
  cells: Cell[],
  mapW: number
): void {
  vfx.ambientSoundTimer -= dt;
  if (vfx.ambientSoundTimer > 0) return;

  const gx = Math.round(playerPos.x / TILE);
  const gy = Math.round(playerPos.y / TILE);

  const inBounds = gx >= 0 && gy >= 0 && gx < mapW && gy < cells.length / mapW;
  if (!inBounds) {
    vfx.ambientSoundTimer = 3;
    return;
  }

  const cell = cells[gy * mapW + gx];
  switch (cell) {
    case Cell.Meadows:
    case Cell.CrimsonGrove:
    case Cell.Camp:
      playBirdChirp();
      vfx.ambientSoundTimer = 3 + Math.random() * 5;
      break;
    case Cell.Frostbane:
    case Cell.ScorchedWastes:
      playWindGust();
      vfx.ambientSoundTimer = 3.5 + Math.random() * 4;
      break;
    case Cell.Water:
    case Cell.FungalMire:
      playWaterBubble();
      vfx.ambientSoundTimer = 1.5 + Math.random() * 2.5;
      break;
    default:
      vfx.ambientSoundTimer = 3;
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
  entityLayer: Container
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

  vfx.floatingTexts.push({
    textObj,
    vx: 0,
    vy: -50,
    life: 0,
    maxLife: 0.8,
  });
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
  textObj.x = worldX + (Math.random() - 0.5) * 10;
  textObj.y = worldY;
  vfx.floatingTexts.push({ textObj, vx: (Math.random() - 0.5) * 12, vy: -60, life: 0, maxLife: 0.7 });
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
