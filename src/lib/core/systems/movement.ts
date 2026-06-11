import type { AnimatedSprite, Container } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input";
import { TILE, type MapResource } from "$lib/core/systems/map";
import type { VFXResource } from "$lib/core/vfx";
import { spawnEnvFloatingText, spawnEnvParticles, triggerCameraShake } from "$lib/core/vfx";
import { gameState } from "$lib/state/game-state.svelte";
import { spendStamina, stamina } from "$lib/domain/stamina.svelte";
import { Colors } from "$lib/utils/colors";
import { findPlayerEntity } from "$lib/core/ecs/entity-queries";
import { awardSkillXp } from "$lib/domain/skill-xp";
import { SkillKey, InputAction } from "$lib/domain/game-events";

// Hitbox configuration constants
const HITBOX_X = TILE * 0.45;
const HITBOX_Y = TILE * 0.22;
const HITBOX_CY = TILE * 0.78;
const CORNER_LIMIT = TILE * 0.25;

export class MovementConfig {
  public sprintSpeedMultiplier = 1.6;
  public sprintStaminaCost = 15;
  public dashStaminaCost = 25;
  public dashCooldown = 1.0;
  public dashDistance = 3;
  public dashDuration = 0.12;
  public invulnDuration = 0.4;
  public sprintLockDuration = 1.0;
}

export class MovementResource {
  public dashCooldownTimer = 0;
  public dashActiveTimer = 0;
  public dashVelocity = { x: 0, y: 0 };
  public isDashing = false;
  public isInvulnerable = false;
  public invulnTimer = 0;
  public sprintLockTimer = 0;
  public lastMoveDirection = { x: 0, y: 1 };
  public noclip = false;
}

/**
 * Returns true if an AABB overlaps any solid map boundaries or solid entities.
 */
export function collidesWithSolid(
  cx: number,
  cy: number,
  hx: number,
  hy: number,
  map: MapResource
): boolean {
  const minGx = Math.floor((cx - hx) / TILE);
  const maxGx = Math.floor((cx + hx - 0.01) / TILE);
  const minGy = Math.floor((cy - hy) / TILE);
  const maxGy = Math.floor((cy + hy - 0.01) / TILE);

  const pMinX = cx - hx;
  const pMaxX = cx + hx;
  const pMinY = cy - hy;
  const pMaxY = cy + hy;

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      if (!map.inBounds(gx, gy)) return true;
      const key = `${gx},${gy}`;
      if (map.solidCoords.has(key)) {
        const custom = map.customSolids.get(key);
        if (custom) {
          if (
            pMinX < custom.maxX &&
            pMaxX > custom.minX &&
            pMinY < custom.maxY &&
            pMaxY > custom.minY
          ) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Corner correction logic: calculates standard perpendicular slide shifts
 * when player movement is slightly clipped by solid blocks.
 */
export function cornerNudge(
  blockedCx: number,
  blockedCy: number,
  hx: number,
  hy: number,
  axis: "x" | "y",
  map: MapResource
): number | null {
  const LIMIT = CORNER_LIMIT;
  const minGx = Math.floor((blockedCx - hx) / TILE);
  const maxGx = Math.floor((blockedCx + hx - 0.01) / TILE);
  const minGy = Math.floor((blockedCy - hy) / TILE);
  const maxGy = Math.floor((blockedCy + hy - 0.01) / TILE);

  const pMinX = blockedCx - hx;
  const pMaxX = blockedCx + hx;
  const pMinY = blockedCy - hy;
  const pMaxY = blockedCy + hy;

  let nudge: number | null = null;
  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      if (!map.inBounds(gx, gy)) {
        const n =
          axis === "x"
            ? Math.abs(gx * TILE - (blockedCx + hx)) <= Math.abs((gx + 1) * TILE - (blockedCx - hx))
              ? gx * TILE - (blockedCx + hx)
              : (gx + 1) * TILE - (blockedCx - hx)
            : Math.abs(gy * TILE - (blockedCy + hy)) <= Math.abs((gy + 1) * TILE - (blockedCy - hy))
              ? gy * TILE - (blockedCy + hy)
              : (gy + 1) * TILE - (blockedCy - hy);
        if (Math.abs(n) > LIMIT) return null;
        if (nudge !== null && Math.sign(n) !== Math.sign(nudge)) return null;
        if (nudge === null || Math.abs(n) > Math.abs(nudge)) nudge = n;
      } else if (map.solidCoords.has(`${gx},${gy}`)) {
        const custom = map.customSolids.get(`${gx},${gy}`);
        const minX = custom ? custom.minX : gx * TILE;
        const maxX = custom ? custom.maxX : (gx + 1) * TILE;
        const minY = custom ? custom.minY : gy * TILE;
        const maxY = custom ? custom.maxY : (gy + 1) * TILE;

        if (pMinX < maxX && pMaxX > minX && pMinY < maxY && pMaxY > minY) {
          const n =
            axis === "x"
              ? Math.abs(minX - (blockedCx + hx)) <= Math.abs(maxX - (blockedCx - hx))
                ? minX - (blockedCx + hx)
                : maxX - (blockedCx - hx)
              : Math.abs(minY - (blockedCy + hy)) <= Math.abs(maxY - (blockedCy - hy))
                ? minY - (blockedCy + hy)
                : maxY - (blockedCy - hy);
          if (Math.abs(n) > LIMIT) return null;
          if (nudge !== null && Math.sign(n) !== Math.sign(nudge)) return null;
          if (nudge === null || Math.abs(n) > Math.abs(nudge)) nudge = n;
        }
      }
    }
  }
  return nudge;
}

/**
 * Triggers a fast dash impulse.
 */
export function triggerDashSystem(
  movement: MovementResource,
  inputs: InputResource,
  config: MovementConfig,
  vfx: VFXResource,
  entityLayer: Container,
  playerSprite: AnimatedSprite,
  playerEntity: Entity,
  zeroCooldowns: boolean
): void {
  if (!zeroCooldowns && (movement.dashCooldownTimer > 0 || movement.isDashing)) return;
  if (stamina.current < config.dashStaminaCost) {
    spawnEnvFloatingText(vfx, "⚡️ Out of Stamina!", Colors.ui.error, playerEntity.position!, entityLayer);
    return;
  }

  spendStamina(config.dashStaminaCost, "burst");

  awardSkillXp(SkillKey.Evade, 15, vfx, playerEntity.position!, entityLayer);

  // Determine direction based on movement inputs
  let dirX = 0;
  let dirY = 0;
  if (inputs.isActionPressed(InputAction.MoveUp)) dirY = -1;
  if (inputs.isActionPressed(InputAction.MoveDown)) dirY = 1;
  if (inputs.isActionPressed(InputAction.MoveLeft)) dirX = -1;
  if (inputs.isActionPressed(InputAction.MoveRight)) dirX = 1;

  const isNeutral = dirX === 0 && dirY === 0;
  let normX = 0;
  let normY = 0;

  if (isNeutral) {
    normX = 0;
    normY = -1;
    movement.isInvulnerable = true;
    movement.invulnTimer = config.invulnDuration;
    spawnEnvFloatingText(vfx, "✿ EVADE! ✿", Colors.evade.flash, playerEntity.position!, entityLayer);
    spawnEnvParticles(vfx, Colors.evade.flash, 12, "bubble", playerEntity.position!, entityLayer);
  } else {
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    normX = dirX / len;
    normY = dirY / len;
    spawnEnvFloatingText(vfx, "💨 DASH! 💨", Colors.evade.dashText, playerEntity.position!, entityLayer);
    spawnEnvParticles(vfx, Colors.evade.dashParticle, 10, "smoke", playerEntity.position!, entityLayer);
  }

  movement.isDashing = true;
  movement.dashActiveTimer = config.dashDuration;
  const evadeLevel = gameState.rpg.skills?.evade?.level ?? 1;
  const currentEvadeCooldown = Math.max(0.5, config.dashCooldown - (evadeLevel - 1) * 0.05);
  movement.dashCooldownTimer = currentEvadeCooldown;

  const speed = (config.dashDistance * TILE) / config.dashDuration;
  movement.dashVelocity = { x: normX * speed, y: normY * speed };

  movement.lastMoveDirection = { x: normX, y: normY };
}

/**
 * Updates player position based on keyboard input, active dash velocity, and sprint state.
 * Collisions are handled per-axis using AABB sliding. Returns whether player is actively
 * sprinting and moving (which blocks passive stamina regeneration).
 */
export function playerMovementSystem(
  world: World<Entity>,
  movement: MovementResource,
  inputs: InputResource,
  config: MovementConfig,
  vfx: VFXResource,
  map: MapResource,
  dt: number,
  playerSprite: AnimatedSprite,
  setPlayerAnim: (state: "idle" | "run" | "attack") => void,
  entityLayer: Container
): boolean {
  if (inputs.dashTriggered) {
    inputs.dashTriggered = false;
    const playerEntity = findPlayerEntity();
    if (playerEntity) {
      triggerDashSystem(
        movement,
        inputs,
        config,
        vfx,
        entityLayer,
        playerSprite,
        playerEntity,
        gameState.rpg.profile === null
      );
    }
  }

  // Decay timers
  if (movement.dashCooldownTimer > 0) movement.dashCooldownTimer -= dt;
  if (movement.invulnTimer > 0) {
    movement.invulnTimer -= dt;
    if (movement.invulnTimer <= 0) {
      movement.isInvulnerable = false;
      playerSprite.alpha = 1.0;
      playerSprite.tint = Colors.ui.white;
    }
  }
  if (movement.sprintLockTimer > 0) movement.sprintLockTimer -= dt;
  if (movement.dashActiveTimer > 0) {
    movement.dashActiveTimer -= dt;
  }

  if (movement.isInvulnerable) {
    playerSprite.alpha = 0.5;
    playerSprite.tint = Colors.evade.flash;
  }

  const playerEntity = findPlayerEntity();
  if (!playerEntity || !playerEntity.position || !playerEntity.playerControlled) return false;

  const pos = playerEntity.position;
  let cx = pos.x + TILE / 2;
  let cy = pos.y + HITBOX_CY;

  // 1. Dash physics execution
  if (movement.isDashing) {
    const moveX = movement.dashVelocity.x * dt;
    const moveY = movement.dashVelocity.y * dt;

    const newCx = cx + moveX;
    if (movement.noclip || !collidesWithSolid(newCx, cy, HITBOX_X, HITBOX_Y, map)) {
      pos.x += moveX;
      cx = newCx;
    }

    const newCy = cy + moveY;
    if (movement.noclip || !collidesWithSolid(cx, newCy, HITBOX_X, HITBOX_Y, map)) {
      pos.y += moveY;
    }

    pos.x = Math.max(0, Math.min((map.mapW - 1) * TILE, pos.x));
    pos.y = Math.max(0, Math.min((map.mapH - 1) * TILE, pos.y));
    pos.targetX = pos.x;
    pos.targetY = pos.y;

    if (movement.dashVelocity.x !== 0 || movement.dashVelocity.y !== 0) {
      spawnEnvParticles(vfx, Colors.evade.dashParticle, 1, "smoke", pos, entityLayer);
    }

    playerSprite.x = pos.x + TILE / 2;
    playerSprite.y = pos.y + TILE;

    if (movement.dashActiveTimer <= 0) {
      movement.isDashing = false;
      movement.sprintLockTimer = config.sprintLockDuration;
    }

    return false;
  }

  // 2. Normal movement inputs
  const speed = playerEntity.playerControlled.speed;

  let inputX = 0;
  let inputY = 0;
  if (inputs.isActionPressed(InputAction.MoveUp)) inputY = -1;
  if (inputs.isActionPressed(InputAction.MoveDown)) inputY = 1;
  if (inputs.isActionPressed(InputAction.MoveLeft)) inputX = -1;
  if (inputs.isActionPressed(InputAction.MoveRight)) inputX = 1;

  const wantsSprint = inputs.isActionPressed(InputAction.Sprint) || movement.sprintLockTimer > 0;
  const isSprinting = wantsSprint && stamina.current > 0;

  if (inputX === 0 && inputY === 0) {
    if (movement.sprintLockTimer > 0 && isSprinting) {
      inputX = movement.lastMoveDirection.x;
      inputY = movement.lastMoveDirection.y;
    }
  }

  if (inputX === 0 && inputY === 0) {
    setPlayerAnim("idle");
    playerSprite.x = pos.x + TILE / 2;
    playerSprite.y = pos.y + TILE;
    return false;
  }

  const len = Math.sqrt(inputX * inputX + inputY * inputY);
  const dirX = inputX / len;
  const dirY = inputY / len;

  if (
    inputs.isActionPressed(InputAction.MoveUp) ||
    inputs.isActionPressed(InputAction.MoveDown) ||
    inputs.isActionPressed(InputAction.MoveLeft) ||
    inputs.isActionPressed(InputAction.MoveRight)
  ) {
    movement.lastMoveDirection = { x: dirX, y: dirY };
  }

  const currentSpeed = isSprinting ? speed * config.sprintSpeedMultiplier : speed;
  const moveX = dirX * currentSpeed * dt;
  const moveY = dirY * currentSpeed * dt;

  const newCx = cx + moveX;
  if (movement.noclip || !collidesWithSolid(newCx, cy, HITBOX_X, HITBOX_Y, map)) {
    pos.x += moveX;
    cx = newCx;
  } else if (!movement.noclip) {
    const nudge = cornerNudge(newCx, cy, HITBOX_X, HITBOX_Y, "y", map);
    if (nudge !== null && !collidesWithSolid(newCx, cy + nudge, HITBOX_X, HITBOX_Y, map)) {
      pos.y += nudge;
      cy += nudge;
      pos.x += moveX;
      cx = newCx;
    }
  }

  const newCy = cy + moveY;
  if (movement.noclip || !collidesWithSolid(cx, newCy, HITBOX_X, HITBOX_Y, map)) {
    pos.y += moveY;
  } else if (!movement.noclip) {
    const nudge = cornerNudge(cx, newCy, HITBOX_X, HITBOX_Y, "x", map);
    if (nudge !== null && !collidesWithSolid(cx + nudge, newCy, HITBOX_X, HITBOX_Y, map)) {
      pos.x += nudge;
      pos.y += moveY;
    }
  }

  pos.x = Math.max(0, Math.min((map.mapW - 1) * TILE, pos.x));
  pos.y = Math.max(0, Math.min((map.mapH - 1) * TILE, pos.y));
  pos.targetX = pos.x;
  pos.targetY = pos.y;

  if (dirX < 0) playerSprite.scale.x = -Math.abs(playerSprite.scale.x);
  if (dirX > 0) playerSprite.scale.x = Math.abs(playerSprite.scale.x);

  setPlayerAnim("run");
  playerSprite.x = pos.x + TILE / 2;
  playerSprite.y = pos.y + TILE;

  if (isSprinting) {
    spendStamina(config.sprintStaminaCost * dt, "drain");
    return true;
  }

  return false;
}
