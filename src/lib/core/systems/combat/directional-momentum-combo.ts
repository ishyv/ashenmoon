import { Graphics, Container, TextStyle, Text } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import type { VFXResource } from "$lib/core/vfx/vfx";
import type { MovementResource } from "$lib/core/systems/movement/movement";
import type { CombatResource, CombatConfig } from "./combat";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { spendStamina, stamina } from "$lib/state/rpg/stamina.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { spawnEnvFloatingText, triggerCameraShake, flashEntity } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { InputAction } from "$lib/domain/game-events";

export type ComboDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up_left"
  | "up_right"
  | "down_left"
  | "down_right";

export interface DirectionalMomentumComboState {
  isActive: boolean;
  lockedDirection: ComboDirection | null;
  currentStacks: number;
  validStepCount: number;
  lastStepAtMs: number;
  lastAttackAtMs: number;
  currentTimeMs: number;

  // Internal tracking variables
  lastMoveInputDirection: ComboDirection | null;
  lastMoveInputTime: number;
  lastEquippedWeaponId: string | null;
  overloadAttackSpeedPenaltyPct: number;
  overloadDebuffTimer: number;
}

export interface DirectionalMomentumComboConfig {
  activationStepCount: number;
  maxStacks: number;
  stackMoveSpeedBonusPct: number;
  stackAttackDamageBonusPct: number;
  stackKnockbackChanceBonusPct: number;
  overloadChancePerStackPct: number;
  overloadStaminaPenaltyPerStackPct: number;
  overloadAttackSpeedPenaltyPerStackPct: number;
  stepWindowMs: number;
  comboTimeoutMs: number;
}

export const DEFAULT_DIRECTIONAL_MOMENTUM_COMBO_CONFIG: DirectionalMomentumComboConfig = {
  activationStepCount: 2,
  maxStacks: 6,
  stackMoveSpeedBonusPct: 5,
  stackAttackDamageBonusPct: 5,
  stackKnockbackChanceBonusPct: 3,
  overloadChancePerStackPct: 1,
  overloadStaminaPenaltyPerStackPct: 2,
  overloadAttackSpeedPenaltyPerStackPct: 3,
  stepWindowMs: 800,
  comboTimeoutMs: 1400,
};

// --- Direction Helpers ---
export function getComboDirection(x: number, y: number): ComboDirection | null {
  const len = Math.hypot(x, y);
  if (len < 0.1) return null;

  let angle = Math.atan2(y, x);
  if (angle < 0) {
    angle += 2 * Math.PI;
  }

  const index = Math.round(angle / (Math.PI / 4)) % 8;
  const directions: ComboDirection[] = [
    "right",
    "down_right",
    "down",
    "down_left",
    "left",
    "up_left",
    "up",
    "up_right",
  ];
  return directions[index] ?? null;
}

export function getVectorFromDirection(direction: ComboDirection): { x: number; y: number } {
  switch (direction) {
    case "up": return { x: 0, y: -1 };
    case "down": return { x: 0, y: 1 };
    case "left": return { x: -1, y: 0 };
    case "right": return { x: 1, y: 0 };
    case "up_left": return { x: -Math.SQRT1_2, y: -Math.SQRT1_2 };
    case "up_right": return { x: Math.SQRT1_2, y: -Math.SQRT1_2 };
    case "down_left": return { x: -Math.SQRT1_2, y: Math.SQRT1_2 };
    case "down_right": return { x: Math.SQRT1_2, y: Math.SQRT1_2 };
  }
}

function getEquippedWeaponId(): string | null {
  if (typeof gameState === "undefined" || !gameState?.rpg?.profile) return null;
  const weapon = gameState.rpg.profile.loadout?.weapon;
  if (!weapon) return null;
  return typeof weapon === "string" ? weapon : weapon.itemId;
}

// --- Visual Effect Spawners ---
export function spawnComboBreakBurst(
  vfx: VFXResource,
  playerPos: { x: number; y: number },
  direction: ComboDirection | null,
  entityLayer: Container,
  color = 0x888888
): void {
  const px = playerPos.x + TILE / 2;
  const py = playerPos.y + TILE / 2;

  let burstVec = { x: 0, y: 0 };
  if (direction) {
    const vec = getVectorFromDirection(direction);
    burstVec = { x: -vec.x, y: -vec.y }; // opposite direction
  }

  for (let i = 0; i < 15; i++) {
    const g = new Graphics();
    g.rect(-2, -2, 4, 4).fill(color);
    g.x = px + (Math.random() - 0.5) * 16;
    g.y = py + (Math.random() - 0.5) * 16;

    const angle = burstVec.x === 0 && burstVec.y === 0
      ? Math.random() * Math.PI * 2
      : Math.atan2(burstVec.y, burstVec.x) + (Math.random() - 0.5) * 1.2;
    const speed = 80 + Math.random() * 80;

    vfx.particles.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 10,
      gravity: 50,
      life: 0,
      maxLife: 0.4 + Math.random() * 0.3,
    });
    entityLayer.addChild(g);
  }
}

export function spawnDirectionalTrail(
  vfx: VFXResource,
  playerPos: { x: number; y: number },
  direction: ComboDirection,
  entityLayer: Container,
  color = 0xa855f7
): void {
  const px = playerPos.x + TILE / 2;
  const py = playerPos.y + TILE / 2;
  const vec = getVectorFromDirection(direction);
  const baseAngle = Math.atan2(vec.y, vec.x);

  for (let i = 0; i < 8; i++) {
    const g = new Graphics();
    g.rect(-8, -1.5, 16, 3).fill(color);
    g.rotation = baseAngle;
    g.x = px + (Math.random() - 0.5) * 16;
    g.y = py + (Math.random() - 0.5) * 16;

    const speed = 150 + Math.random() * 100;
    vfx.particles.push({
      graphic: g,
      vx: vec.x * speed + (Math.random() - 0.5) * 20,
      vy: vec.y * speed + (Math.random() - 0.5) * 20,
      gravity: 0,
      life: 0,
      maxLife: 0.35 + Math.random() * 0.15,
    });
    entityLayer.addChild(g);
  }
}

export function updateComboRingVFX(
  vfx: VFXResource,
  playerPos: { x: number; y: number } | undefined,
  state: DirectionalMomentumComboState,
  config: DirectionalMomentumComboConfig
): void {
  if (!vfx.comboRing) return;
  if (!playerPos || !state || !state.isActive || state.currentStacks <= 0) {
    vfx.comboRing.visible = false;
    return;
  }

  vfx.comboRing.visible = true;
  vfx.comboRing.x = playerPos.x + TILE / 2;
  vfx.comboRing.y = playerPos.y + TILE; // Center at feet
  vfx.comboRing.clear();

  const count = state.currentStacks;
  const colors = [
    0x06b6d4, // Cyan (stack 1)
    0x3b82f6, // Blue (stack 2)
    0x8b5cf6, // Purple (stack 3)
    0xa855f7, // Violet (stack 4)
    0xec4899, // Pink (stack 5)
    0xef4444, // Red (stack 6)
  ];
  const color = colors[Math.min(count - 1, colors.length - 1)] ?? 0xffffff;

  // 1. Draw orbiting dots representing stacks
  const radius = 22;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (performance.now() / 1000) * 1.8;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius * 0.5; // squashed for isometric/top-down perspective
    vfx.comboRing.circle(dx, dy, 3.5).fill({ color, alpha: 0.85 });
  }

  // 2. Draw directional pointer arrow pointing in locked direction
  if (state.lockedDirection) {
    const vec = getVectorFromDirection(state.lockedDirection);
    const arrowLen = 30;
    const startX = vec.x * 12;
    const startY = vec.y * 6; // perspective squash
    const endX = vec.x * arrowLen;
    const endY = vec.y * arrowLen * 0.5;

    // Draw main arrow line
    vfx.comboRing.moveTo(startX, startY);
    vfx.comboRing.lineTo(endX, endY);
    vfx.comboRing.stroke({ color, width: 3.5, alpha: 0.65 });

    // Draw arrow head
    const baseAngle = Math.atan2(vec.y, vec.x);
    const headLen = 6;
    const angle1 = baseAngle + Math.PI - 0.55;
    const angle2 = baseAngle + Math.PI + 0.55;

    vfx.comboRing.moveTo(endX, endY);
    vfx.comboRing.lineTo(endX + Math.cos(angle1) * headLen, endY + Math.sin(angle1) * headLen * 0.5);
    vfx.comboRing.moveTo(endX, endY);
    vfx.comboRing.lineTo(endX + Math.cos(angle2) * headLen, endY + Math.sin(angle2) * headLen * 0.5);
    vfx.comboRing.stroke({ color, width: 3.5, alpha: 0.65 });
  }
}

// --- Hook Implementations ---
export function breakCombo(
  combat: CombatResource,
  vfx: VFXResource,
  player: Entity,
  entityLayer: Container,
  reason: "timeout" | "direction_change" | "weapon_change" | "knockback"
): void {
  const state = combat.directionalMomentumState;
  if (!state.isActive && state.validStepCount === 0) return;

  const oldDirection = state.lockedDirection;
  
  // Play feedback
  if (state.isActive) {
    playSound("combo.momentum.break");
    if (player.position) {
      spawnEnvFloatingText(vfx, "âš ï¸ Chain Broken!", Colors.ui.warning, player.position, entityLayer);
      spawnComboBreakBurst(vfx, player.position, oldDirection, entityLayer);
    }
  }

  // Reset state
  state.isActive = false;
  state.lockedDirection = null;
  state.currentStacks = 0;
  state.validStepCount = 0;
}

export function updateDirectionalMomentumCombo(
  combat: CombatResource,
  inputs: InputResource,
  config: DirectionalMomentumComboConfig,
  movement: MovementResource | undefined,
  player: Entity,
  dt: number,
  vfx: VFXResource,
  entityLayer: Container
): void {
  const state = combat.directionalMomentumState;
  
  // Track accumulated milliseconds
  combat.currentTimeMs = (combat.currentTimeMs ?? 0) + dt * 1000;
  state.currentTimeMs = combat.currentTimeMs;

  // 1. Tick down debuff
  if (state.overloadDebuffTimer > 0) {
    state.overloadDebuffTimer -= dt;
    if (state.overloadDebuffTimer <= 0) {
      state.overloadAttackSpeedPenaltyPct = 0;
    }
  }

  // 2. Track non-null movement inputs for step window tolerance
  let moveX = 0;
  let moveY = 0;
  if (movement?.isDashing) {
    moveX = movement.dashVelocity.x;
    moveY = movement.dashVelocity.y;
  } else {
    if (inputs.isActionPressed(InputAction.MoveUp)) moveY = -1;
    if (inputs.isActionPressed(InputAction.MoveDown)) moveY = 1;
    if (inputs.isActionPressed(InputAction.MoveLeft)) moveX = -1;
    if (inputs.isActionPressed(InputAction.MoveRight)) moveX = 1;
  }
  const currentMoveDir = getComboDirection(moveX, moveY);
  if (currentMoveDir !== null) {
    state.lastMoveInputDirection = currentMoveDir;
    state.lastMoveInputTime = state.currentTimeMs;
  }

  // 3. Break check: weapon change
  const currentWeaponId = getEquippedWeaponId();
  if (state.lastEquippedWeaponId === null) {
    state.lastEquippedWeaponId = currentWeaponId;
  } else if (state.lastEquippedWeaponId !== currentWeaponId) {
    breakCombo(combat, vfx, player, entityLayer, "weapon_change");
    state.lastEquippedWeaponId = currentWeaponId;
  }

  // 4. Break check: active knockback
  if (player.knockback && player.knockback.timer > 0) {
    breakCombo(combat, vfx, player, entityLayer, "knockback");
    return;
  }

  // 5. Break check: active direction mismatch
  if (state.isActive && state.lockedDirection) {
    if (currentMoveDir !== null && currentMoveDir !== state.lockedDirection) {
      breakCombo(combat, vfx, player, entityLayer, "direction_change");
      return;
    }
  }

  // 6. Break check: timeouts
  const timeSinceLastStep = state.currentTimeMs - state.lastStepAtMs;
  if (state.isActive) {
    if (timeSinceLastStep > config.comboTimeoutMs) {
      breakCombo(combat, vfx, player, entityLayer, "timeout");
    }
  } else if (state.validStepCount > 0) {
    if (timeSinceLastStep > config.stepWindowMs) {
      state.validStepCount = 0;
      state.lockedDirection = null;
    }
  }

  // 7. Update Pixi stack ring visuals
  updateComboRingVFX(vfx, player.position, state, config);
}

function rollOverload(
  state: DirectionalMomentumComboState,
  config: DirectionalMomentumComboConfig,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container
): boolean {
  const roll = Math.random() * 100;
  const overloadChance = state.currentStacks * config.overloadChancePerStackPct;
  if (roll < overloadChance) {
    // Overload backfire!
    const staminaPenaltyPct = state.currentStacks * config.overloadStaminaPenaltyPerStackPct;
    const staminaLoss = stamina.current * (staminaPenaltyPct / 100);
    spendStamina(staminaLoss, "burst"); // Reduces current stamina by percentage

    state.overloadAttackSpeedPenaltyPct = state.currentStacks * config.overloadAttackSpeedPenaltyPerStackPct;
    state.overloadDebuffTimer = 3.0; // 3 seconds penalty

    playSound("combo.momentum.overload");
    if (player.position) {
      spawnEnvFloatingText(vfx, "âš ï¸ Overextended!", Colors.ui.error, player.position, entityLayer);
      flashEntity(vfx, entityLayer, player.id, player.position.x + TILE / 2, player.position.y + TILE, Colors.combat.playerHit);
    }
    triggerCameraShake(vfx, 3.5, 0.15);
    return true;
  }
  return false;
}

export function processDirectionalMomentumStrike(
  combat: CombatResource,
  inputs: InputResource,
  config: DirectionalMomentumComboConfig,
  movement: MovementResource | undefined,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  attackAngle: number,
  currentWeaponId: string | null
): number {
  const state = combat.directionalMomentumState;
  
  // Resolve attack direction
  const ax = Math.cos(attackAngle);
  const ay = Math.sin(attackAngle);
  const attackDir = getComboDirection(ax, ay);
  if (!attackDir) return 1.0;

  // Resolve movement direction (with tolerance window)
  let moveX = 0;
  let moveY = 0;
  if (movement?.isDashing) {
    moveX = movement.dashVelocity.x;
    moveY = movement.dashVelocity.y;
  } else {
    if (inputs.isActionPressed(InputAction.MoveUp)) moveY = -1;
    if (inputs.isActionPressed(InputAction.MoveDown)) moveY = 1;
    if (inputs.isActionPressed(InputAction.MoveLeft)) moveX = -1;
    if (inputs.isActionPressed(InputAction.MoveRight)) moveX = 1;
  }
  let activeMoveDir = getComboDirection(moveX, moveY);
  if (activeMoveDir === null && state.lastMoveInputDirection !== null) {
    const timeSinceLastMove = state.currentTimeMs - state.lastMoveInputTime;
    if (timeSinceLastMove <= config.stepWindowMs) {
      activeMoveDir = state.lastMoveInputDirection;
    }
  }

  // Validate combo step
  const isStepValid = activeMoveDir !== null && activeMoveDir === attackDir;

  if (isStepValid) {
    if (state.isActive) {
      if (attackDir === state.lockedDirection) {
        // Increment stacks
        state.currentStacks = Math.min(config.maxStacks, state.currentStacks + 1);
        state.lastStepAtMs = state.currentTimeMs;
        state.lastAttackAtMs = state.currentTimeMs;

        const overloaded = rollOverload(state, config, player, vfx, entityLayer);
        if (!overloaded) {
          // Normal stack gain
          playSound("combo.momentum.stack", { params: { stacks: state.currentStacks } });
          if (player.position) {
            spawnEnvFloatingText(vfx, `âš¡ Momentum x${state.currentStacks}`, 0x8b5cf6, player.position, entityLayer);
            triggerCameraShake(vfx, 1.5 + state.currentStacks * 0.5, 0.08);
          }
        }
      } else {
        // Direction changed -> break current, and start step 1 of new direction
        breakCombo(combat, vfx, player, entityLayer, "direction_change");
        state.validStepCount = 1;
        state.lockedDirection = attackDir;
        state.lastStepAtMs = state.currentTimeMs;
        state.lastAttackAtMs = state.currentTimeMs;
      }
    } else {
      // Inactive, building combo
      if (state.validStepCount > 0) {
        if (attackDir === state.lockedDirection) {
          state.validStepCount++;
          state.lastStepAtMs = state.currentTimeMs;
          state.lastAttackAtMs = state.currentTimeMs;

          if (state.validStepCount >= config.activationStepCount) {
            state.isActive = true;
            state.currentStacks = 1;
            state.lockedDirection = attackDir;

            const overloaded = rollOverload(state, config, player, vfx, entityLayer);
            if (!overloaded) {
              playSound("combo.momentum.activate");
              if (player.position) {
                spawnEnvFloatingText(vfx, "âš¡ Momentum Chain!", 0x06b6d4, player.position, entityLayer);
                spawnDirectionalTrail(vfx, player.position, attackDir, entityLayer);
              }
            }
          }
        } else {
          // Changed direction before activation -> reset to new direction
          state.validStepCount = 1;
          state.lockedDirection = attackDir;
          state.lastStepAtMs = state.currentTimeMs;
          state.lastAttackAtMs = state.currentTimeMs;
        }
      } else {
        // First step
        state.validStepCount = 1;
        state.lockedDirection = attackDir;
        state.lastStepAtMs = state.currentTimeMs;
        state.lastAttackAtMs = state.currentTimeMs;
      }
    }
  } else {
    // Attack does not match movement.
    // If active, reset/timeout keeps ticking.
    // If inactive, reset progress.
    if (!state.isActive) {
      state.validStepCount = 0;
      state.lockedDirection = null;
    }
  }

  // Return damage multiplier
  if (state.isActive) {
    return 1.0 + (config.stackAttackDamageBonusPct / 100) * state.currentStacks;
  }
  return 1.0;
}

