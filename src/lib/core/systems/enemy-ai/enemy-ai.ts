/**
 * Enemy behaviour: one reusable AI state machine that drives every hostile. An
 * enemy "type" is an `EnemyArchetype` (data), not a bespoke brain — the same
 * perception → chase → telegraphed-strike → recover/leash loop runs for all of
 * them, and a different enemy is just different numbers (and a different sprite
 * colour). Swapping melee for a ranged behaviour later means adding a sibling
 * system, not forking this one.
 *
 * This file owns *decisions*. The act of dealing damage, knockback, i-frames and
 * hit feedback all route through combat.ts so the player and enemies react
 * identically. Presentation (sprite frames/flip/telegraph tint) is applied here
 * because the AI owns which animation state the body is in.
 */

import type { World } from "miniplex";
import type { AnimatedSprite, Container, Texture } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { AnimState } from "$lib/core/types";
import type { UnitColor } from "$lib/core/assets/assets";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import { type VFXResource, spawnEnvFloatingText } from "$lib/core/vfx/vfx";
import { applyDamage, type CombatConfig, type CombatResource } from "$lib/core/systems/combat/combat";
import { Colors } from "$lib/utils/colors";

const ENEMY_HX = TILE * 0.3;
const ENEMY_HY = TILE * 0.26;
const ENEMY_CY = TILE * 0.7;

/** Data definition of an enemy kind. Reused to stamp out entities + sprites. */
export interface EnemyArchetype {
  maxHp: number;
  /** locomotion speed, world px/sec. */
  speed: number;
  aggroRadius: number;
  leashRadius: number;
  /** melee reach: how close it must be to land a strike. */
  range: number;
  damage: number;
  knockback: number;
  /** seconds between strikes. */
  cooldown: number;
  /** telegraph window before the strike lands (the player's dodge window). */
  windup: number;
  xpReward: number;
  /** warrior sprite colour used to render this kind. */
  color: UnitColor;
}

/** Baseline melee grunt: a red warrior that chases and swings. */
export const GRUNT: EnemyArchetype = {
  maxHp: 60,
  speed: TILE * 3.2,
  aggroRadius: TILE * 6,
  leashRadius: TILE * 11,
  range: TILE * 1.0,
  damage: 12,
  knockback: 200,
  cooldown: 1.4,
  windup: 0.45,
  xpReward: 40,
  color: "red",
};

/**
 * Builds the ECS entity for an enemy from an archetype. The sprite is created by
 * the engine (it owns the render layer); this only assembles components.
 */
export function makeEnemyEntity(id: string, x: number, y: number, arch: EnemyArchetype): Entity {
  return {
    id,
    position: { x, y, targetX: x, targetY: y },
    health: { current: arch.maxHp, max: arch.maxHp, faction: "hostile", invulnTimer: 0 },
    knockback: { vx: 0, vy: 0, timer: 0 },
    mover: { speed: arch.speed },
    ai: {
      state: "idle",
      aggroRadius: arch.aggroRadius,
      leashRadius: arch.leashRadius,
      home: { x, y },
      animState: "idle",
      facingX: 1,
    },
    melee: {
      range: arch.range,
      damage: arch.damage,
      knockback: arch.knockback,
      cooldown: arch.cooldown,
      cooldownTimer: 0,
      windup: arch.windup,
      windupTimer: 0,
    },
    loot: { xpReward: arch.xpReward },
  };
}

function applyEnemyAnim(
  sprite: AnimatedSprite,
  entity: Entity,
  state: AnimState,
  getEnemyFrames: (entity: Entity, state: AnimState) => Texture[]
): void {
  const ai = entity.ai!;
  if (ai.animState === state) return;
  ai.animState = state;
  sprite.textures = getEnemyFrames(entity, state);
  sprite.loop = state !== "attack";
  sprite.animationSpeed = state === "attack" ? 0.22 : 0.12;
  sprite.play();
}

/**
 * Ticks every hostile. The player is the only target. Strikes land on the player
 * through the shared damage path; the engine handles player death/respawn by
 * inspecting player health after this runs.
 */
export function enemyAiSystem(
  world: World<Entity>,
  map: MapResource,
  config: CombatConfig,
  combat: CombatResource,
  dt: number,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getEnemyFrames: (entity: Entity, state: AnimState) => Texture[]
): void {
  const pp = player.position;
  if (!pp) return;
  const pcx = pp.x + TILE / 2;
  const pcy = pp.y + TILE / 2;

  for (const e of world.with("ai", "position", "mover", "melee", "health").entities) {
    const ai = e.ai!;
    const pos = e.position!;
    const melee = e.melee!;
    const h = e.health!;
    if (h.current <= 0) continue;

    const sprite = entitySprites.get(e.id) as AnimatedSprite | undefined;

    if (h.invulnTimer > 0) h.invulnTimer -= dt;
    if (melee.cooldownTimer > 0) melee.cooldownTimer -= dt;

    const ecx = pos.x + TILE / 2;
    const ecy = pos.y + TILE / 2;
    const distPlayer = Math.hypot(pcx - ecx, pcy - ecy);
    const distHome = Math.hypot(ai.home.x - pos.x, ai.home.y - pos.y);

    // Cheap idle for far-off enemies that aren't already engaged.
    if (ai.state === "idle" && distPlayer > config.activeAiRadius) continue;

    if (distPlayer <= ai.aggroRadius || ai.state !== "idle") {
      combat.inCombatTimer = config.inCombatTimeout;
    }

    const knocked = (e.knockback?.timer ?? 0) > 0;
    if (knocked) {
      ai.state = "stagger";
    } else {
      switch (ai.state) {
        case "stagger":
          ai.state = "chase";
          break;
        case "idle":
          if (distPlayer <= ai.aggroRadius) ai.state = "chase";
          break;
        case "chase":
          if (distPlayer > ai.leashRadius) ai.state = "leash";
          else if (distPlayer <= melee.range && melee.cooldownTimer <= 0) {
            ai.state = "windup";
            melee.windupTimer = melee.windup;
            // Telegraph: the player needs to read the incoming swing.
            spawnEnvFloatingText(vfx, "!", Colors.ui.error, pos, entityLayer);
          }
          break;
        case "windup":
          melee.windupTimer -= dt;
          if (melee.windupTimer <= 0) {
            // Strike resolves only if the player is still in reach (dodgeable).
            if (distPlayer <= melee.range * 1.4) {
              applyDamage(player, melee.damage, ecx, ecy, melee.knockback, config, vfx, entityLayer, combat);
            }
            melee.cooldownTimer = melee.cooldown;
            ai.state = "recover";
          }
          break;
        case "recover":
          if (melee.cooldownTimer <= 0) {
            ai.state = distPlayer <= ai.aggroRadius ? "chase" : "idle";
          }
          break;
        case "leash":
          if (distHome < TILE * 0.5) ai.state = "idle";
          else if (distPlayer <= ai.aggroRadius * 0.7) ai.state = "chase";
          break;
      }
    }

    // --- movement intent + facing per state ---
    let targetX: number | null = null;
    let targetY: number | null = null;
    let desiredAnim: AnimState = "idle";
    if (ai.state === "chase") {
      targetX = pcx;
      targetY = pcy;
      desiredAnim = "run";
    } else if (ai.state === "leash") {
      targetX = ai.home.x + TILE / 2;
      targetY = ai.home.y + TILE / 2;
      desiredAnim = "run";
    } else if (ai.state === "windup") {
      desiredAnim = "attack";
      ai.facingX = pcx < ecx ? -1 : 1;
    }

    if (targetX !== null && targetY !== null && !knocked) {
      let dx = targetX - ecx;
      let dy = targetY - ecy;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      ai.facingX = dx < 0 ? -1 : 1;
      const step = e.mover!.speed * dt;
      const cx = pos.x + TILE / 2;
      const cy = pos.y + ENEMY_CY;
      const mx = dx * step;
      const my = dy * step;
      if (!collidesWithSolid(cx + mx, cy, ENEMY_HX, ENEMY_HY, map)) {
        pos.x += mx;
      }
      if (!collidesWithSolid(cx, cy + my, ENEMY_HX, ENEMY_HY, map)) {
        pos.y += my;
      }
      pos.targetX = pos.x;
      pos.targetY = pos.y;
    }

    // --- render ---
    if (sprite) {
      applyEnemyAnim(sprite, e, desiredAnim, getEnemyFrames);
      sprite.scale.x = ai.facingX * Math.abs(sprite.scale.x);
      // Telegraph tint while winding up; otherwise show hit-flash i-frame tint.
      sprite.tint =
        ai.state === "windup"
          ? Colors.combat.windupTint
          : h.invulnTimer > 0
            ? Colors.combat.invulnTint
            : Colors.ui.white;
      if (e.knockback!.timer <= 0) {
        sprite.x = pos.x + TILE / 2;
        sprite.y = pos.y + TILE;
      }
    }
  }
}
