/**
 * Combat core: the shared damage path, the player's melee swing, and knockback
 * integration. Everything here is faction-agnostic and entity-agnostic — the
 * player and every enemy run through the same `applyDamage` so hit reactions,
 * i-frames, and knockback behave identically on both sides. Enemy *behaviour*
 * (who swings, when) lives in enemy-ai.ts; this file owns the rules of a hit.
 *
 * OWNERSHIP / INVARIANTS
 * - `applyDamage` is the ONLY writer of `health.current` and the ONLY place that
 *   grants i-frames. Systems decide *whether* to call it; they never poke health.
 * - A target with no `health` component is never a valid combat target (resources,
 *   NPCs, the campfire). That is what keeps gathering and combat separate while
 *   both reuse the attack animation.
 * - Knockback writes to `position` through `collidesWithSolid`, so impulses can
 *   never shove an entity through a wall.
 */

import type { World } from "miniplex";
import type { AnimatedSprite, Container } from "pixi.js";
import type { Entity } from "./ecs-miniplex";
import { TILE, type MapResource } from "./map";
import { collidesWithSolid } from "./movement";
import type { InputResource } from "./input";
import {
  type VFXResource,
  flashEntity,
  spawnDamageNumber,
  spawnSlashArc,
  spawnEnvFloatingText,
  triggerCameraShake,
} from "./vfx";
import { spendStamina, stamina } from "./stamina.svelte";
import {
  playChopSound,
  playClinkSound,
  playFallSound,
} from "./audio-synthesis";
import { Colors } from "./colors";

/** Generic body half-extents used for knockback collision (feet-anchored). */
const BODY_HX = TILE * 0.34;
const BODY_HY = TILE * 0.28;
const BODY_CY = TILE * 0.7;

/**
 * Player swing tuning + shared combat constants. Every value is a designer knob;
 * the dev console can mutate the live instance (see engine dev commands).
 */
export class CombatConfig {
  // --- player swing ---
  /** how far the arc reaches from the player centre (world px). */
  public reach = TILE * 1;

  /* Roughly represents the arc size, could be used to tweak as per player skills */
  public arcSize = 30; 
  
  /** half the swing cone; the arc spans aim ± this (radians). */
  public arcHalfAngle =
    (this.arcSize * Math.PI) / 180; /* first value should be between 30 and 60 ideally */
  public damage = 25;
  /** seconds between swings, independent of animation length. */
  public cooldown = 0.45;
  public staminaCost = 8;
  /** below this stamina the swing is refused (with feedback). */
  public minStamina = 4;
  public knockback = 240;

  // --- shared ---
  /** seconds the player stays "in combat" after dealing/taking damage. */
  public inCombatTimeout = 4;
  /** AI beyond this distance from the player idles cheaply. */
  public activeAiRadius = TILE * 24;
  /** player i-frames after taking a hit (anti-stunlock). */
  public playerIFrames = 0.6;
  /** player i-frames granted on respawn. */
  public respawnIFrames = 2.0;
  /** how long a knockback impulse takes to bleed out. */
  public knockbackDecay = 0.18;
}

/** Live, per-run combat state owned by the engine. */
export class CombatResource {
  public attackCooldownTimer = 0;
  public inCombatTimer = 0;
}

/**
 * Apply one hit to a target. Returns whether the hit was lethal so the caller
 * can run the appropriate death flow (enemy despawn+loot, or player respawn).
 * No-ops (returns false) when the target has no health, is mid-i-frames, or is
 * already dead — callers can fire this freely without pre-checking.
 */
export function applyDamage(
  target: Entity,
  amount: number,
  sourceX: number,
  sourceY: number,
  knockbackStrength: number,
  config: CombatConfig,
  vfx: VFXResource,
  entityLayer: Container,
): boolean {
  const h = target.health;
  if (!h || h.invulnTimer > 0 || h.current <= 0) return false;

  h.current = Math.max(0, h.current - amount);

  if (target.position && knockbackStrength > 0) {
    const tcx = target.position.x + TILE / 2;
    const tcy = target.position.y + TILE / 2;
    const dx = tcx - sourceX;
    const dy = tcy - sourceY;
    const len = Math.hypot(dx, dy) || 1;
    const vx = (dx / len) * knockbackStrength;
    const vy = (dy / len) * knockbackStrength;
    if (target.knockback) {
      target.knockback.vx = vx;
      target.knockback.vy = vy;
      target.knockback.timer = config.knockbackDecay;
    } else {
      target.knockback = { vx, vy, timer: config.knockbackDecay };
    }
  }

  const isPlayer = h.faction === "player";
  if (isPlayer) h.invulnTimer = config.playerIFrames;

  // --- feedback: flash, damage number, impact shake, hurt/hit sfx ---
  const fx = (target.position?.x ?? sourceX) + TILE / 2;
  const flashY = (target.position?.y ?? sourceY) + TILE;
  const numberY = (target.position?.y ?? sourceY) + TILE * 0.4;
  flashEntity(
    vfx,
    entityLayer,
    target.id,
    fx,
    flashY,
    isPlayer ? Colors.combat.playerHit : Colors.combat.enemyHit,
  );
  spawnDamageNumber(
    vfx,
    entityLayer,
    fx,
    numberY,
    amount,
    isPlayer ? Colors.combat.playerDmgNum : Colors.combat.enemyDmgNum,
  );
  triggerCameraShake(vfx, isPlayer ? 4 : 2.5, 0.12);
  if (isPlayer) playFallSound();
  else playClinkSound();

  return h.current <= 0;
}

/**
 * Removes an entity and its sprite from the world and clears any VFX state keyed
 * to it. Shared by enemy death and any future "despawn this thing" need.
 */
export function despawnEntity(
  world: World<Entity>,
  entity: Entity,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  vfx: VFXResource,
): void {
  const sprite = entitySprites.get(entity.id);
  if (sprite) {
    entityLayer.removeChild(sprite);
    sprite.destroy();
    entitySprites.delete(entity.id);
  }
  vfx.activeShakes.delete(entity.id);
  vfx.baseScales.delete(entity.id);
  const flash = vfx.hitFlashes.get(entity.id);
  if (flash) {
    entityLayer.removeChild(flash.graphic);
    flash.graphic.destroy();
    vfx.hitFlashes.delete(entity.id);
  }
  world.remove(entity);
}

/**
 * Integrates active knockback impulses for every entity that has one, sliding
 * per-axis against solids and keeping the registered sprite pinned to the body.
 * Runs after movement/AI so a hit can visibly shove the player or an enemy.
 */
export function knockbackSystem(
  world: World<Entity>,
  map: MapResource,
  entitySprites: Map<string, Container>,
  dt: number,
): void {
  for (const e of world.with("knockback", "position").entities) {
    const kb = e.knockback!;
    if (kb.timer <= 0) continue;
    kb.timer -= dt;

    const pos = e.position!;
    const cx = pos.x + TILE / 2;
    const cy = pos.y + BODY_CY;
    const mx = kb.vx * dt;
    const my = kb.vy * dt;

    if (!collidesWithSolid(cx + mx, cy, BODY_HX, BODY_HY, map)) pos.x += mx;
    if (!collidesWithSolid(cx, cy + my, BODY_HX, BODY_HY, map)) pos.y += my;
    pos.x = Math.max(0, Math.min((map.mapW - 1) * TILE, pos.x));
    pos.y = Math.max(0, Math.min((map.mapH - 1) * TILE, pos.y));
    pos.targetX = pos.x;
    pos.targetY = pos.y;

    const decay = Math.exp(-6 * dt);
    kb.vx *= decay;
    kb.vy *= decay;
    if (kb.timer <= 0) {
      kb.vx = 0;
      kb.vy = 0;
    }

    const sprite = entitySprites.get(e.id);
    if (sprite) {
      sprite.x = pos.x + TILE / 2;
      sprite.y = pos.y + TILE;
    }
  }
}

/**
 * The player's melee swing. Free-aimed at the mouse: the hit region is a cone in
 * the aim direction, and every hostile inside it takes damage on the same swing.
 * Presentation (animation, swing arc, sound) fires here; lethal hits are handed
 * back to the engine via `onEnemyKilled` for loot/despawn.
 */
export function playerAttackSystem(
  world: World<Entity>,
  inputs: InputResource,
  combat: CombatResource,
  config: CombatConfig,
  vfx: VFXResource,
  dt: number,
  player: Entity,
  playerSprite: AnimatedSprite,
  setPlayerAnim: (state: "idle" | "run" | "attack") => void,
  entityLayer: Container,
  isDashing: boolean,
  isPlacementMode: boolean,
  onEnemyKilled: (enemy: Entity) => void,
): void {
  if (combat.attackCooldownTimer > 0) combat.attackCooldownTimer -= dt;
  if (combat.inCombatTimer > 0) combat.inCombatTimer -= dt;

  if (!inputs.pendingAttack) return;
  inputs.pendingAttack = false;

  // Failure states: placement mode / mid-dash / on cooldown / too tired.
  if (isPlacementMode || isDashing || combat.attackCooldownTimer > 0) return;
  if (stamina.current < config.minStamina) {
    spawnEnvFloatingText(
      vfx,
      "⚡️ too winded to swing",
      Colors.ui.error,
      player.position!,
      entityLayer,
    );
    return;
  }

  const pos = player.position!;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;
  let ax = inputs.mouseWorld.x - pcx;
  let ay = inputs.mouseWorld.y - pcy;
  const len = Math.hypot(ax, ay) || 1;
  ax /= len;
  ay /= len;
  const angle = Math.atan2(ay, ax);

  combat.attackCooldownTimer = config.cooldown;
  combat.inCombatTimer = config.inCombatTimeout;
  spendStamina(config.staminaCost, "burst");

  // Face + animate + swing VFX + whoosh.
  playerSprite.scale.x =
    ax < 0 ? -Math.abs(playerSprite.scale.x) : Math.abs(playerSprite.scale.x);
  setPlayerAnim("attack");
  spawnSlashArc(
    vfx,
    entityLayer,
    pcx,
    pcy,
    angle,
    config.reach,
    config.arcHalfAngle,
    Colors.combat.slashArc,
  );
  playChopSound();

  // Resolve every hostile inside the cone.
  const cosHalf = Math.cos(config.arcHalfAngle);
  const enemyRadius = TILE * 0.4;
  for (const e of world.with("health", "position").entities) {
    const h = e.health!;
    if (h.faction !== "hostile" || h.current <= 0) continue;
    const ex = e.position!.x + TILE / 2;
    const ey = e.position!.y + TILE / 2;
    const dx = ex - pcx;
    const dy = ey - pcy;
    const d = Math.hypot(dx, dy);
    if (d > config.reach + enemyRadius) continue;
    if (d > 1 && (ax * dx + ay * dy) / d < cosHalf) continue;
    const died = applyDamage(
      e,
      config.damage,
      pcx,
      pcy,
      config.knockback,
      config,
      vfx,
      entityLayer,
    );
    if (died) onEnemyKilled(e);
  }
}
