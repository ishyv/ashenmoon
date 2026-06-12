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
import { Graphics } from "pixi.js";
import type { AnimatedSprite, Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { collidesWithSolid, type MovementResource } from "$lib/core/systems/movement/movement";
import type { InputResource } from "$lib/core/input/input";
import { InputAction } from "$lib/domain/game-events";
import {
  type DirectionalMomentumComboState,
  type DirectionalMomentumComboConfig,
  DEFAULT_DIRECTIONAL_MOMENTUM_COMBO_CONFIG,
  updateDirectionalMomentumCombo,
  processDirectionalMomentumStrike,
} from "./directional-momentum-combo";
import {
  updateKiteCombo,
  checkKiteComboTrigger,
  applyKiteComboFinisher,
  handleKiteComboHit,
} from "./kite-combo";
import {
  type VFXResource,
  flashEntity,
  spawnDamageNumber,
  spawnSlashArc,
  spawnCrosscutSlash,
  spawnFourfoldFinisherSlash,
  spawnEnvFloatingText,
  triggerCameraShake,
  spawnCrosscutIndicator,
  clearCrosscutIndicators,
} from "$lib/core/vfx/vfx";
import { spendStamina, stamina } from "$lib/domain/stamina.svelte";
import { getPlayerStats } from "$lib/domain/stats.svelte";
import { mitigatePhysical, staminaCost } from "$lib/domain/stats/stat-calculation";
import { playSound } from "$lib/audio/audio-engine";
import { Colors } from "$lib/utils/colors";
import { gameState } from "$lib/state/game-state.svelte";
import { PLAYER_BODY } from "$lib/domain/collision";
import { createInitialFellSweepChargeState, type FellSweepChargeState } from "$lib/domain/combat/fell-sweep";
import {
  advanceCrosscutChain,
  clearCrosscutState,
  createDefaultCrosscutComboConfig,
  createInitialCrosscutComboState,
  storeFirstCrosscutClick,
  tryResolveCrosscutCombo,
  type CrosscutComboConfig,
  type CrosscutComboResult,
  type CrosscutComboState,
  type CrosscutGrade,
} from "$lib/domain/combat/crosscut-combo";
import { evaluate as evaluateRhythm, type RhythmResult } from "$lib/domain/combat/rhythm";
import {
  clearFourfoldSlashState,
  createInitialFourfoldSlashState,
  createDefaultFourfoldSlashConfig,
  detectClickDirection,
  pushFourfoldSlashInput,
  type FourfoldSlashState,
  type FourfoldSlashConfig,
  type FourfoldSlashResult,
  type FourfoldSlashType,
} from "$lib/domain/combat/fourfold-slash";
import {
  DEFAULT_DRIVING_THRUST_CONFIG,
  createInitialDrivingThrustState,
  type DrivingThrustConfig,
  type DrivingThrustState,
} from "$lib/domain/combat/driving-thrust";

export { trackMovementCombo } from "./kite-combo";
export { fellSweepSystem, renderFellSweepChargeFeedback, updateFellSweepChargeSystem } from "./fell-sweep";

/** Generic body half-extents used for knockback collision (feet-anchored). */
const BODY_HX = PLAYER_BODY.hx;
const BODY_HY = PLAYER_BODY.hy;
const BODY_CY = PLAYER_BODY.cy;

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
  public swingActiveTimer = 0;
  public fellSweepCooldownTimer = 0;
  public fellSweepChargeState: FellSweepChargeState = createInitialFellSweepChargeState();
  public fellSweepChargePulseTimer = 0;
  public fellSweepVfxPulseTimer = 0;
  public fellSweepDustTimer = 0;
  public inCombatTimer = 0;
  /**
   * Recent significant movement direction changes, oldest first (max 3).
   * Used to detect the A → -A → A footwork pattern that triggers the thrust combo.
   */
  public movePhases: { x: number; y: number }[] = [];
  /** Last recorded movement direction — used to detect phase transitions. */
  public lastMoveVec: { x: number; y: number } | null = null;
  /** Seconds until the phase history expires due to inactivity. */
  public comboResetTimer = 0;
  static readonly COMBO_WINDOW = 1.5;
  public kiteStacks = 0;
  public kiteStacksDecayTimer = 0;
  public kiteParticleTimer = 0;
  public currentTimeMs = 0;
  public lastBasicAttackAtMs: number | null = null;
  public crosscutState: CrosscutComboState = createInitialCrosscutComboState();
  public crosscutConfig: CrosscutComboConfig = createDefaultCrosscutComboConfig();
  public lastCrosscutWeaponId: string | null = null;
  public fourfoldState: FourfoldSlashState = createInitialFourfoldSlashState();
  public fourfoldConfig: FourfoldSlashConfig = createDefaultFourfoldSlashConfig();
  public drivingThrustState: DrivingThrustState = createInitialDrivingThrustState();
  public drivingThrustConfig: DrivingThrustConfig = { ...DEFAULT_DRIVING_THRUST_CONFIG };
  public drivingThrustCooldownTimer = 0;
  public directionalMomentumState: DirectionalMomentumComboState = {
    isActive: false,
    lockedDirection: null,
    currentStacks: 0,
    validStepCount: 0,
    lastStepAtMs: 0,
    lastAttackAtMs: 0,
    currentTimeMs: 0,
    lastMoveInputDirection: null,
    lastMoveInputTime: 0,
    lastEquippedWeaponId: null,
    overloadAttackSpeedPenaltyPct: 0,
    overloadDebuffTimer: 0,
  };
  public directionalMomentumConfig: DirectionalMomentumComboConfig = { ...DEFAULT_DIRECTIONAL_MOMENTUM_COMBO_CONFIG };
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
  combat?: CombatResource,
): boolean {
  const h = target.health;
  if (!h || h.invulnTimer > 0 || h.current <= 0) return false;

  const isPlayer = h.faction === "player";
  if (isPlayer) {
    // Armor mitigation from the stat layer. Enemy armor deferred until
    // enemies get archetype-level stats.
    amount = Math.round(mitigatePhysical(amount, getPlayerStats().combat.armor));
  }
  if (isPlayer && combat && combat.kiteStacks > 0) {
    amount = Math.round(amount * (1 + 0.15 * combat.kiteStacks));
    spawnEnvFloatingText(
      vfx,
      "⚠️ Focus Broken!",
      Colors.ui.error,
      target.position!,
      entityLayer,
    );
    combat.kiteStacks = 0;
    combat.kiteStacksDecayTimer = 0;
  }

  h.current = Math.max(0, h.current - amount);

  let shouldApplyKnockback = true;
  if (!isPlayer && combat) {
    const dmState = combat.directionalMomentumState;
    if (dmState) {
      const baseChance = 100;
      const bonusChance = dmState.isActive ? dmState.currentStacks * (combat.directionalMomentumConfig?.stackKnockbackChanceBonusPct ?? 3) : 0;
      const roll = Math.random() * 100;
      shouldApplyKnockback = roll < (baseChance + bonusChance);
    }
  }

  if (target.position && knockbackStrength > 0 && shouldApplyKnockback) {
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
  const hitPos = { x: fx, y: (target.position?.y ?? sourceY) + TILE / 2 };
  playSound(isPlayer ? "combat.hit.player" : "combat.hit.enemy", { position: hitPos });

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

function currentEquippedWeaponId(): string | null {
  const currentWeapon = gameState.rpg.profile?.loadout?.weapon;
  return currentWeapon
    ? typeof currentWeapon === "string" ? currentWeapon : currentWeapon.itemId
    : null;
}

function crosscutColor(grade: CrosscutGrade): number {
  switch (grade) {
    case "excellent":
      return Colors.combat.crosscutExcellent;
    case "good":
      return Colors.combat.crosscutGood;
    case "weak":
      return Colors.combat.crosscutWeak;
  }
}

function crosscutText(grade: CrosscutGrade): string {
  switch (grade) {
    case "excellent":
      return "Perfect Crosscut";
    case "good":
      return "Crosscut";
    case "weak":
      return "Weak Crosscut";
  }
}

function clearCrosscut(combat: CombatResource, vfx: VFXResource, entityLayer: Container) {
  clearCrosscutState(combat.crosscutState);
  clearCrosscutIndicators(vfx, entityLayer);
}


function maybeApplyCrosscutBleed(
  target: Entity,
  result: CrosscutComboResult,
  config: CombatConfig,
  vfx: VFXResource,
  entityLayer: Container,
  combat: CombatResource,
): boolean {
  if (!result.grade || !result.bleedChancePct || Math.random() * 100 >= result.bleedChancePct) return false;
  if (!target.health || target.health.current <= 0) return false;

  target.bleed = {
    remainingSec: result.bleedDurationSec ?? 6,
    tickEverySec: result.bleedTickEverySec ?? 2,
    tickTimer: result.bleedTickEverySec ?? 2,
    damagePerTick: result.bleedDamagePerTick ?? 1,
    sourceId: `crosscut:${result.grade}`,
  };

  const immediateDamage = result.bleedImmediateDamage ?? 0;
  if (immediateDamage > 0) {
    applyDamage(
      target,
      immediateDamage,
      target.position!.x + TILE / 2,
      target.position!.y + TILE / 2,
      0,
      config,
      vfx,
      entityLayer,
      combat,
    );
  }

  if (target.position) {
    spawnEnvFloatingText(vfx, "bleeding", Colors.combat.crosscutBleed, target.position, entityLayer, `bleed:${target.id}`);
  }
  playSound("combo.crosscut.bleed", { position: target.position });
  return true;
}

function clearEnemyBleed(entity: Entity): void {
  entity.bleed = undefined;
}

export function tickEnemyBleedSystem(
  world: World<Entity>,
  combat: CombatResource,
  config: CombatConfig,
  vfx: VFXResource,
  entityLayer: Container,
  dt: number,
  onEnemyKilled: (enemy: Entity) => void,
): void {
  for (const e of world.with("health", "position", "bleed").entities) {
    const h = e.health!;
    const bleed = e.bleed!;
    if (h.faction !== "hostile" || h.current <= 0) {
      clearEnemyBleed(e);
      continue;
    }

    bleed.remainingSec -= dt;
    bleed.tickTimer -= dt;
    if (bleed.tickTimer <= 0) {
      bleed.tickTimer += bleed.tickEverySec;
      const cx = e.position!.x + TILE / 2;
      const cy = e.position!.y + TILE / 2;
      const died = applyDamage(e, bleed.damagePerTick, cx, cy, 0, config, vfx, entityLayer, combat);
      if (died) {
        clearEnemyBleed(e);
        onEnemyKilled(e);
        continue;
      }
    }

    if (bleed.remainingSec <= 0) clearEnemyBleed(e);
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
  movement: MovementResource,
  isPlacementMode: boolean,
  onEnemyKilled: (enemy: Entity) => void,
): void {
  updateDirectionalMomentumCombo(
    combat,
    inputs,
    combat.directionalMomentumConfig,
    movement,
    player,
    dt,
    vfx,
    entityLayer
  );

  if (combat.swingActiveTimer > 0) {
    combat.swingActiveTimer -= dt;
    if (player.position) {
      const pcx = player.position.x + TILE / 2;
      const ax = inputs.mouseWorld.x - pcx;
      playerSprite.scale.x =
        ax < 0 ? -Math.abs(playerSprite.scale.x) : Math.abs(playerSprite.scale.x);
    }
  }

  if (combat.attackCooldownTimer > 0) combat.attackCooldownTimer -= dt;
  if (combat.inCombatTimer > 0) combat.inCombatTimer -= dt;
  if (combat.comboResetTimer > 0) {
    combat.comboResetTimer -= dt;
    if (combat.comboResetTimer <= 0) {
      combat.movePhases = [];
      combat.lastMoveVec = null;
    }
  }

  // Update Kite Combo timers and foot embers/flames
  updateKiteCombo(combat, player, vfx, entityLayer, dt);

  const currentWeaponId = currentEquippedWeaponId();
  if (combat.lastCrosscutWeaponId === null) {
    combat.lastCrosscutWeaponId = currentWeaponId;
  } else if (combat.lastCrosscutWeaponId !== currentWeaponId) {
    clearCrosscut(combat, vfx, entityLayer);
    clearFourfoldSlashState(combat.fourfoldState);
    combat.lastCrosscutWeaponId = currentWeaponId;
  }

  if (
    isPlacementMode ||
    movement?.isDashing ||
    (player.knockback?.timer ?? 0) > 0 ||
    (player.health?.current ?? 1) <= 0
  ) {
    clearCrosscut(combat, vfx, entityLayer);
    clearFourfoldSlashState(combat.fourfoldState);
  }

  if (!inputs.pendingAttack) return;
  inputs.pendingAttack = false;

  // Failure states: placement mode / mid-dash.
  if (isPlacementMode || (movement && movement.isDashing)) return;

  const pos = player.position!;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;

  // Check if Kite Combo is ready (no side effects)
  const isKiteReady =
    combat.comboResetTimer > 0 &&
    combat.movePhases.length >= 3 &&
    (() => {
      const phases = combat.movePhases;
      const p0 = phases[phases.length - 3]!;
      const p1 = phases[phases.length - 2]!;
      const p2 = phases[phases.length - 1]!;
      const sameDir = p0.x * p2.x + p0.y * p2.y;
      const oppDir  = p0.x * p1.x + p0.y * p1.y;
      return sameDir > 0.5 && oppDir < -0.5;
    })();

  // Fourfold Slash input check
  const clickDir = detectClickDirection({ x: pcx, y: pcy }, inputs.mouseWorld);
  const fourfoldResult = pushFourfoldSlashInput(
    combat.fourfoldState,
    combat.fourfoldConfig,
    clickDir,
    combat.currentTimeMs
  );

  if (fourfoldResult.status === "failed_repeated") {
    spawnEnvFloatingText(vfx, "combo broken", Colors.ui.error, player.position!, entityLayer);
    playSound("combo.crosscut"); // play a fail/break sound
    triggerCameraShake(vfx, 1.5, 0.1);
  }

  const isFourfold = fourfoldResult.status === "completed";

  const crosscutResult = !isKiteReady && !isFourfold
    ? tryResolveCrosscutCombo({
        state: combat.crosscutState,
        config: combat.crosscutConfig,
        nowMs: combat.currentTimeMs,
        playerPosition: { x: pcx, y: pcy },
        clickWorldPosition: inputs.mouseWorld,
        currentStamina: stamina.current,
      })
    : { triggered: false };
  const isCrosscut = crosscutResult.triggered === true;
  const isCombo = isKiteReady || isCrosscut || isFourfold;

  // Primed/triggered combos respect the attack cooldown.
  // Basic attacks (not combos) bypass the hard cooldown check.
  if (combat.attackCooldownTimer > 0 && isCombo) return;

  let ax = inputs.mouseWorld.x - pcx;
  let ay = inputs.mouseWorld.y - pcy;
  const len = Math.hypot(ax, ay) || 1;
  ax /= len;
  ay /= len;
  let angle = Math.atan2(ay, ax);
  let crosscutSlashX = pcx;
  let crosscutSlashY = pcy;
  let crosscutSlashReach = config.reach;
  if (isCrosscut && combat.crosscutState.firstClickWorldPosition) {
    const previousClick = combat.crosscutState.firstClickWorldPosition;
    const segmentX = inputs.mouseWorld.x - previousClick.x;
    const segmentY = inputs.mouseWorld.y - previousClick.y;
    const segmentLength = Math.hypot(segmentX, segmentY);
    if (segmentLength > 0.0001) {
      ax = segmentX / segmentLength;
      ay = segmentY / segmentLength;
      angle = Math.atan2(ay, ax);
      crosscutSlashX = (previousClick.x + inputs.mouseWorld.x) / 2;
      crosscutSlashY = (previousClick.y + inputs.mouseWorld.y) / 2;
      crosscutSlashReach = segmentLength;
    }
  }

  // Check if Kite Combo is triggered (this resets the movePhases/lastMoveVec if true)
  const isKiteCombo = checkKiteComboTrigger(combat);

  const playerCombatStats = getPlayerStats().combat;

  let effectiveReach = config.reach;
  let effectiveHalfAngle = config.arcHalfAngle;
  let effectiveDamage = playerCombatStats.attackDamage;
  let arcColor: number = Colors.combat.slashArc;
  let useStaminaCost = staminaCost(config.staminaCost, 1, 1);

  let rhythmEval: RhythmResult | null = null;

  let finisherType: FourfoldSlashType | null = null;
  let finisherColor = 0xd9c5b2;

  if (isKiteCombo) {
    const finisher = applyKiteComboFinisher(combat, config, player, vfx, entityLayer, angle, pcx, pcy);
    effectiveReach = finisher.effectiveReach;
    effectiveHalfAngle = finisher.effectiveHalfAngle;
    effectiveDamage = finisher.effectiveDamage;
    useStaminaCost = finisher.useStaminaCost;
    arcColor = finisher.arcColor;
  } else if (isFourfold) {
    finisherType = fourfoldResult.finisherType!;
    const dmgMult = combat.fourfoldConfig.damageMultipliers[finisherType];
    const staminaCostVal = combat.fourfoldConfig.staminaCosts[finisherType];

    effectiveReach = config.reach * 1.35;
    effectiveHalfAngle = Math.PI; // 360 degrees sweep
    effectiveDamage = Math.round(effectiveDamage * dmgMult);
    useStaminaCost = staminaCostVal;

    if (finisherType === "wheel_slash") {
      finisherColor = 0xd9c5b2;
    } else if (finisherType === "falling_wheel") {
      finisherColor = 0x8c7e73;
    } else if (finisherType === "rising_wheel") {
      finisherColor = 0xa6b8b1;
    } else if (finisherType === "crosswind_cut") {
      finisherColor = 0xbf8585;
    }
    arcColor = finisherColor;
  } else if (isCrosscut) {
    effectiveDamage = Math.round(effectiveDamage * (crosscutResult.damageMultiplier ?? 1));
    useStaminaCost = crosscutResult.staminaCost ?? combat.crosscutConfig.staminaCosts.weak;
    arcColor = crosscutColor(crosscutResult.grade!);
  } else {
    // Reset stacks on standard attack
    combat.kiteStacks = 0;
    combat.kiteStacksDecayTimer = 0;

    // Evaluate rhythm
    rhythmEval = evaluateRhythm(combat.currentTimeMs, combat.lastBasicAttackAtMs);
    effectiveDamage = Math.round(effectiveDamage * rhythmEval.damageMultiplier);
    useStaminaCost = rhythmEval.staminaCost;
  }

  // Refuse swing if stamina is too low
  if (stamina.current < (isKiteCombo || isFourfold ? useStaminaCost : config.minStamina)) {
    spawnEnvFloatingText(
      vfx,
      isKiteCombo ? "⚡️ too winded to kite" : isFourfold ? "⚡️ too winded to finish" : "⚡️ too winded to swing",
      Colors.ui.error,
      player.position!,
      entityLayer,
    );
    return;
  }

  if (rhythmEval) {
    let gradeText = rhythmEval.grade === "perfect" ? "clean" : rhythmEval.grade;
    let gradeColor: number = Colors.ui.muted;
    if (rhythmEval.grade === "perfect") {
      gradeColor = Colors.combat.crosscutExcellent;
    } else if (rhythmEval.grade === "good") {
      gradeColor = Colors.ui.success;
    } else if (rhythmEval.grade === "strained") {
      gradeColor = Colors.ui.warning;
    } else if (rhythmEval.grade === "rushed") {
      gradeColor = Colors.ui.error;
    }
    spawnEnvFloatingText(vfx, gradeText, gradeColor, player.position!, entityLayer);
  }

  if (!isCrosscut && crosscutResult.reason === "insufficient_stamina") {
    spawnEnvFloatingText(vfx, "too winded", Colors.ui.error, player.position!, entityLayer);
  }

  // Directional Momentum Combo application
  if (!isCrosscut) {
    const momentumDamageMult = processDirectionalMomentumStrike(
      combat,
      inputs,
      combat.directionalMomentumConfig,
      movement,
      player,
      vfx,
      entityLayer,
      angle,
      currentWeaponId
    );
    
    effectiveDamage = Math.round(effectiveDamage * momentumDamageMult);
  }

  if (combat.directionalMomentumState.isActive && !isKiteCombo) {
    const count = combat.directionalMomentumState.currentStacks;
    const colors = [
      0x06b6d4, // Cyan (stack 1)
      0x3b82f6, // Blue (stack 2)
      0x8b5cf6, // Purple (stack 3)
      0xa855f7, // Violet (stack 4)
      0xec4899, // Pink (stack 5)
      0xef4444, // Red (stack 6)
    ];
    arcColor = colors[Math.min(count - 1, colors.length - 1)] ?? 0xa855f7;
  }

  // Set attack cooldown: base cooldown shortened by attack speed (1.0 = no
  // change), then the overload penalty stretches it back out.
  const speedPenaltyPct = combat.directionalMomentumState.overloadAttackSpeedPenaltyPct;
  const speedMult = speedPenaltyPct > 0 ? (1 + speedPenaltyPct / 100) : 1.0;
  combat.attackCooldownTimer = (config.cooldown / playerCombatStats.attackSpeed) * speedMult;
  combat.swingActiveTimer = 0.28;

  combat.inCombatTimer = config.inCombatTimeout;
  spendStamina(useStaminaCost, "burst");
  const crosscutStacks = isCrosscut ? combat.crosscutState.stacks + 1 : 0;
  if (isCrosscut) {
    advanceCrosscutChain(combat.crosscutState, {
      clickWorldPosition: inputs.mouseWorld,
      playerPosition: { x: pcx, y: pcy },
      nowMs: combat.currentTimeMs,
    });
    const nextWindowMs = Math.max(
      combat.crosscutConfig.minComboWindowMs,
      combat.crosscutConfig.comboWindowMs * Math.pow(combat.crosscutConfig.windowDecayRate, combat.crosscutState.stacks)
    );
    spawnCrosscutIndicator(vfx, entityLayer, inputs.mouseWorld.x, inputs.mouseWorld.y, nextWindowMs / 1000);
  } else if (!isKiteCombo) {
    combat.lastBasicAttackAtMs = combat.currentTimeMs;
  }

  // Face + animate + swing VFX.
  playerSprite.scale.x =
    ax < 0 ? -Math.abs(playerSprite.scale.x) : Math.abs(playerSprite.scale.x);
  setPlayerAnim("attack");

  if (isFourfold && finisherType) {
    spawnFourfoldFinisherSlash(vfx, entityLayer, pcx, pcy, effectiveReach, arcColor, finisherType);
    spawnEnvFloatingText(vfx, finisherName(finisherType), arcColor, player.position!, entityLayer);
    playSound("combo.crosscut.excellent");
    triggerCameraShake(vfx, 6.0, 0.22);
  } else if (isCrosscut) {
    spawnCrosscutSlash(vfx, entityLayer, crosscutSlashX, crosscutSlashY, angle, crosscutSlashReach, arcColor, crosscutResult.grade!, crosscutStacks);
    spawnEnvFloatingText(vfx, crosscutText(crosscutResult.grade!), arcColor, player.position!, entityLayer);
    playSound(crosscutResult.grade === "excellent" ? "combo.crosscut.excellent" : "combo.crosscut", {
      position: { x: pcx, y: pcy },
      gain: 1 + Math.min(4, crosscutStacks - 1) * 0.08,
      params: { grade: crosscutResult.grade, stacks: crosscutStacks },
    });
    triggerCameraShake(
      vfx,
      (crosscutResult.grade === "excellent" ? 5.5 : crosscutResult.grade === "good" ? 3.8 : 2.4) + Math.min(4, crosscutStacks - 1) * 0.65,
      0.13 + Math.min(4, crosscutStacks - 1) * 0.02
    );
  } else if (!isKiteCombo) {
    spawnSlashArc(vfx, entityLayer, pcx, pcy, angle, effectiveReach, effectiveHalfAngle, arcColor);
    playSound("player.swing");
  }

  // Resolve every hostile inside the cone.
  const cosHalf = Math.cos(effectiveHalfAngle);
  const enemyRadius = TILE * 0.4;
  let hitCount = 0;

  for (const e of world.with("health", "position").entities) {
    const h = e.health!;
    if (h.faction !== "hostile" || h.current <= 0) continue;
    const ex = e.position!.x + TILE / 2;
    const ey = e.position!.y + TILE / 2;
    const dx = ex - pcx;
    const dy = ey - pcy;
    const d = Math.hypot(dx, dy);
    if (d > effectiveReach + enemyRadius) continue;
    if (d > 1 && (ax * dx + ay * dy) / d < cosHalf) continue;
    const died = applyDamage(
      e,
      effectiveDamage,
      pcx,
      pcy,
      config.knockback * (isCrosscut ? (crosscutResult.knockbackMultiplier ?? 1) : isFourfold && finisherType ? combat.fourfoldConfig.knockbackMultipliers[finisherType] : 1),
      config,
      vfx,
      entityLayer,
      combat,
    );
    if (isCrosscut && !died) {
      const bleedKilled = maybeApplyCrosscutBleed(e, crosscutResult, config, vfx, entityLayer, combat);
      if (bleedKilled && (e.health?.current ?? 0) <= 0) onEnemyKilled(e);
    }
    if (died) onEnemyKilled(e);
    hitCount++;
  }

  // Handle Kite Combo stamina refunds and HP strain
  if (isKiteCombo) {
    handleKiteComboHit(combat, player, vfx, entityLayer, hitCount);
  } else if (!isCrosscut) {
    if (crosscutResult.reason && crosscutResult.reason !== "no_starter" && crosscutResult.reason !== "cooldown") {
      if (crosscutResult.reason === "expired") {
        combat.crosscutState.cooldownUntilMs = combat.currentTimeMs + combat.crosscutConfig.comboCooldownMs;
        clearCrosscut(combat, vfx, entityLayer);
        storeFirstCrosscutClick(combat.crosscutState, {
          clickWorldPosition: inputs.mouseWorld,
          playerPosition: { x: pcx, y: pcy },
          nowMs: combat.currentTimeMs,
          config: combat.crosscutConfig,
        });
        spawnCrosscutIndicator(vfx, entityLayer, inputs.mouseWorld.x, inputs.mouseWorld.y, combat.crosscutConfig.comboWindowMs / 1000);
      } else {
        combat.crosscutState.cooldownUntilMs = combat.currentTimeMs + combat.crosscutConfig.comboCooldownMs;
        clearCrosscut(combat, vfx, entityLayer);
      }
    } else if (crosscutResult.reason === "no_starter") {
      storeFirstCrosscutClick(combat.crosscutState, {
        clickWorldPosition: inputs.mouseWorld,
        playerPosition: { x: pcx, y: pcy },
        nowMs: combat.currentTimeMs,
        config: combat.crosscutConfig,
      });
      spawnCrosscutIndicator(vfx, entityLayer, inputs.mouseWorld.x, inputs.mouseWorld.y, combat.crosscutConfig.comboWindowMs / 1000);
    }
  }
}

function finisherName(type: FourfoldSlashType): string {
  switch (type) {
    case "wheel_slash": return "Wheel Slash";
    case "falling_wheel": return "Falling Wheel";
    case "rising_wheel": return "Rising Wheel";
    case "crosswind_cut": return "Crosswind Cut";
  }
}
