/**
 * Weapon-driven attack system — the executor of the new combat path.
 *
 * Reads the gesture the player committed (`inputs.pendingWeaponAttack`), resolves
 * it against the equipped weapon's definition, and runs a windup → active →
 * recovery lifecycle. During the active window it tests the attack's reusable hit
 * shape against hostiles and routes damage through the unchanged `applyDamage`
 * (still the sole health writer). It emits `attack_*` events; it never spawns VFX
 * or plays sound directly — the feedback router does that.
 *
 * Every normal player attack flows through this system. Items without authored
 * weapon data resolve to a generic unarmed definition, so legacy combo systems do
 * not remain reachable in normal play.
 */
import type { World } from "miniplex";
import type { Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { AnimState } from "$lib/core/types";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { collidesWithSolid } from "$lib/core/systems/movement/movement";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import { PLAYER_BODY } from "$lib/domain/collision";
import type { InputResource } from "$lib/core/input/input";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { BASE_COMBAT_STATS } from "$lib/domain/stats/player-stat-growth";
import { spendStamina, stamina } from "$lib/state/rpg/stamina.svelte";
import { getEquippedWeaponId } from "$lib/state/rpg/inventory-api";
import { weaponDefForItem } from "$lib/domain/combat/weapons/weapon-registry";
// Side-effect import: registers the prototype weapon definitions.
import "$lib/domain/combat/weapons/prototype-weapons";
import { classifyInputIntent } from "$lib/domain/combat/input-intent";
import { resolveAttack, type AttackPlan } from "$lib/domain/combat/weapons/attack-resolution";
import { hitShapeContains } from "$lib/domain/combat/weapons/hit-shapes";
import { getWeaponTechnique } from "$lib/domain/combat/weapons/weapon-techniques";
import { createInitialWeaponComboRuntime, phaseAtElapsed } from "$lib/domain/combat/weapons/attack-runtime";
import type { AttackHitShapeDefinition, WeaponDefinition, Vec2 } from "$lib/domain/combat/weapons/weapon-types";
import { applyDamage, type CombatConfig, type CombatResource } from "./combat";
import type { VFXResource } from "$lib/core/vfx/vfx";

const TARGET_POINT_RADIUS_PX = TILE * 0.45;

export interface WeaponAttackSystemArgs {
  world: World<Entity>;
  inputs: InputResource;
  combat: CombatResource;
  config: CombatConfig;
  vfx: VFXResource;
  entityLayer: Container;
  map?: MapResource;
  dt: number;
  player: Entity;
  setPlayerAnim: (state: AnimState) => void;
  isPlacementMode: boolean;
  isDashing: boolean;
  onEnemyKilled: (enemy: Entity) => void;
  events: GameEventQueue;
}

export interface WeaponGuardSystemArgs {
  inputs: InputResource;
  combat: CombatResource;
  player: Entity;
  isPlacementMode: boolean;
  isDashing: boolean;
  events: GameEventQueue;
}

/** Player body centre used as the attack origin (mirrors playerAttackSystem). */
function playerCentre(player: Entity): Vec2 {
  const pos = player.position!;
  return {
    x: pos.x + TILE / 2,
    y: pos.y + TILE - (ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_HEIGHT_TILES * TILE) / 2,
  };
}

function playerScale(): number {
  return ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_HEIGHT_TILES / 1.3;
}

/** Scale a hit shape's extents by the player's body scale. */
function scaleHitShape(shape: AttackHitShapeDefinition, factor: number): AttackHitShapeDefinition {
  switch (shape.kind) {
    case "arc":
      return { ...shape, radiusPx: shape.radiusPx * factor };
    case "capsule":
      return { ...shape, lengthPx: shape.lengthPx * factor };
    case "circle":
    case "point":
      return { ...shape, radiusPx: shape.radiusPx * factor };
  }
}

/** Knockback strength for the weapon's weight class. */
function knockbackForWeight(weightClass: WeaponDefinition["handling"]["weightClass"], base: number): number {
  return weightClass === "heavy" ? base * 1.5 : weightClass === "light" ? base * 0.65 : base;
}

/** Coarse descriptors a technique can branch on without importing the entity type. */
function targetTags(target: Entity): string[] {
  const tags: string[] = [];
  if (target.animal) tags.push(target.animal.speciesId);
  if (target.building) tags.push("structure", "wood");
  return tags;
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function targetAttackDisplacementPx(plan: AttackPlan, elapsedMs: number): number {
  const lunge = plan.attack.movement.lungePx ?? 0;
  const retreat = plan.attack.movement.retreatPx ?? 0;
  const lungeDuration = Math.max(1, plan.windupMs + plan.activeMs * 0.35);
  const recoveryStart = plan.windupMs + plan.activeMs;
  const recoveryDuration = Math.max(1, plan.recoveryMs);
  const lungePx = lunge * smoothstep(elapsedMs / lungeDuration);
  const retreatPx = retreat * smoothstep((elapsedMs - recoveryStart) / recoveryDuration);
  return lungePx - retreatPx;
}

function applyAttackMovement(
  player: Entity,
  aimAngle: number,
  plan: AttackPlan,
  elapsedMs: number,
  appliedPx: number,
  map?: MapResource,
): number {
  const currentTargetPx = targetAttackDisplacementPx(plan, elapsedMs);
  const deltaPx = currentTargetPx - appliedPx;
  if (!player.position || Math.abs(deltaPx) < 0.001) return appliedPx;

  const dx = Math.cos(aimAngle) * deltaPx;
  const dy = Math.sin(aimAngle) * deltaPx;
  const pos = player.position;

  if (!map) {
    pos.x += dx;
    pos.y += dy;
  } else {
    const cx = pos.x + TILE / 2;
    const cy = pos.y + PLAYER_BODY.cy;
    if (!collidesWithSolid(cx + dx, cy, PLAYER_BODY.hx, PLAYER_BODY.hy, map)) pos.x += dx;
    if (!collidesWithSolid(cx, cy + dy, PLAYER_BODY.hx, PLAYER_BODY.hy, map)) pos.y += dy;
    pos.x = Math.max(0, Math.min((map.mapW - 1) * TILE, pos.x));
    pos.y = Math.max(0, Math.min((map.mapH - 1) * TILE, pos.y));
  }

  pos.targetX = pos.x;
  pos.targetY = pos.y;
  return appliedPx + deltaPx;
}

function releaseGuard(combat: CombatResource, player: Entity, events: GameEventQueue): void {
  if (!combat.guard.active) return;
  const weaponDefId = combat.guard.weaponDefId;
  combat.guard.active = false;
  events.push({
    type: "guard_released",
    actorId: player.id,
    weaponDefId,
  });
}

export function updateWeaponGuardSystem(args: WeaponGuardSystemArgs): void {
  const { inputs, combat, player, events } = args;
  const weaponDef = weaponDefForItem(getEquippedWeaponId());
  const guardProfile = weaponDef.guard;
  const canGuard =
    inputs.isStanceHeld() &&
    !combat.weaponAttack.active &&
    !args.isPlacementMode &&
    !args.isDashing &&
    (player.health?.current ?? 1) > 0 &&
    (player.knockback?.timer ?? 0) <= 0;

  if (!canGuard) {
    releaseGuard(combat, player, events);
    return;
  }

  const centre = playerCentre(player);
  const dx = inputs.mouseWorld.x - centre.x;
  const dy = inputs.mouseWorld.y - centre.y;
  const angleRad = Math.atan2(dy, dx);
  const wasActive = combat.guard.active;
  combat.guard.active = true;
  combat.guard.weaponDefId = weaponDef.id;
  combat.guard.angleRad = angleRad;
  combat.guard.moveSpeedMultiplier = guardProfile?.moveSpeedMultiplier ?? weaponDef.handling.stanceMoveSpeedMultiplier;
  combat.guard.reductionPct = guardProfile?.reductionPct ?? 0.6;
  combat.guard.staminaCostMultiplier = guardProfile?.staminaCostMultiplier ?? 0.5;
  combat.guard.frontalArcDegrees = guardProfile?.frontalArcDegrees ?? 120;

  if (!wasActive) {
    events.push({
      type: "guard_started",
      actorId: player.id,
      weaponDefId: weaponDef.id,
    });
  }
}

export function weaponAttackSystem(args: WeaponAttackSystemArgs): void {
  const { inputs, combat, player } = args;
  const runtime = combat.weaponAttack;
  combat.currentTimeMs += args.dt * 1000;

  if (runtime.active) {
    // Mid-swing: the player is committed. Swallow any fresh gestures so neither
    // this system nor the legacy one reacts to clicks during a swing.
    inputs.pendingWeaponAttack = null;
    inputs.pendingAttack = false;
    inputs.pendingFellSweep = false;
    inputs.pendingDrivingThrust = null;
    advanceActiveAttack(args);
    return;
  }

  const snapshot = inputs.pendingWeaponAttack;
  if (!snapshot) return;

  const weaponDef = weaponDefForItem(getEquippedWeaponId());
  if (combat.weaponCombo.weaponDefId && combat.weaponCombo.weaponDefId !== weaponDef.id) {
    combat.weaponCombo = createInitialWeaponComboRuntime();
  }
  if (combat.weaponCombo.expiresAtMs > 0 && combat.currentTimeMs > combat.weaponCombo.expiresAtMs) {
    combat.weaponCombo = createInitialWeaponComboRuntime();
  }

  // This weapon owns the swing. Take the gesture and suppress the legacy flags.
  inputs.pendingWeaponAttack = null;
  inputs.pendingAttack = false;
  inputs.pendingFellSweep = false;
  inputs.pendingDrivingThrust = null;

  if (args.isPlacementMode || args.isDashing || (player.health?.current ?? 1) <= 0) {
    combat.weaponCombo = createInitialWeaponComboRuntime();
    return;
  }
  if ((player.knockback?.timer ?? 0) > 0) {
    combat.weaponCombo = createInitialWeaponComboRuntime();
    return;
  }

  const intent = classifyInputIntent(snapshot);
  const plan = resolveAttack(intent, weaponDef, {
    ...combat.weaponCombo,
    nowMs: combat.currentTimeMs,
  });
  if (!plan) {
    args.events.push({
      type: "feedback_requested",
      channel: "ui",
      message: "weapon cannot do that",
      tone: "info",
    });
    return;
  }

  if (stamina.current < plan.staminaCost) {
    combat.weaponCombo = createInitialWeaponComboRuntime();
    args.events.push({
      type: "feedback_requested",
      channel: "floating_text",
      message: "too winded",
      tone: "warning",
    });
    return;
  }
  spendStamina(plan.staminaCost, "burst");
  releaseGuard(combat, player, args.events);

  const centre = playerCentre(player);
  const isSwipe = intent.kind === "swipe" || intent.kind === "stance_swipe";
  const aimDir = isSwipe
    ? intent.direction
    : (() => {
        const dx = inputs.mouseWorld.x - centre.x;
        const dy = inputs.mouseWorld.y - centre.y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: dx / len, y: dy / len };
      })();

  runtime.active = true;
  runtime.plan = plan;
  runtime.weaponDefId = weaponDef.id;
  runtime.attackId = plan.attack.id;
  runtime.animationProfile = weaponDef.animationProfile;
  runtime.soundProfile = weaponDef.soundProfile;
  runtime.phase = "windup";
  runtime.elapsedMs = 0;
  runtime.origin = centre;
  runtime.aimAngle = Math.atan2(aimDir.y, aimDir.x);
  runtime.hitEntityIds = new Set();
  runtime.didHit = false;
  runtime.justBecameActive = false;
  runtime.movementAppliedPx = 0;

  args.setPlayerAnim("attack");
  args.events.push({
    type: "attack_started",
    attackerId: player.id,
    weaponDefId: weaponDef.id,
    attackId: plan.attack.id,
    animationProfile: weaponDef.animationProfile,
    soundProfile: weaponDef.soundProfile,
    direction: aimDir,
    origin: centre,
    aimAngle: runtime.aimAngle,
    reachPx: plan.reachPx * playerScale(),
    arcDegrees: plan.hitShape.kind === "arc" ? plan.hitShape.arcDegrees : plan.hitShape.kind === "circle" ? 180 : 26,
    hitShapeKind: plan.hitShape.kind,
    trail: plan.attack.presentation?.trail ?? (plan.hitShape.kind === "capsule" ? "thrust" : "arc"),
    windupMs: plan.windupMs,
    activeMs: plan.activeMs,
    recoveryMs: plan.recoveryMs,
  });
}

function advanceActiveAttack(args: WeaponAttackSystemArgs): void {
  const { combat, player, events } = args;
  const runtime = combat.weaponAttack;
  const plan = runtime.plan;
  if (!plan) {
    runtime.active = false;
    return;
  }

  const prevPhase = runtime.phase;
  runtime.elapsedMs += args.dt * 1000;
  runtime.movementAppliedPx = applyAttackMovement(
    player,
    runtime.aimAngle,
    plan,
    Math.min(runtime.elapsedMs, plan.windupMs + plan.activeMs + plan.recoveryMs),
    runtime.movementAppliedPx,
    args.map,
  );
  const phase = phaseAtElapsed(plan, runtime.elapsedMs);

  if (phase === "done") {
    runtime.active = false;
    runtime.phase = "recovery";
    combat.weaponCombo = {
      weaponDefId: runtime.weaponDefId,
      lastAttackId: runtime.attackId,
      expiresAtMs: combat.currentTimeMs + (plan.attack.comboWindowMs ?? 450),
      depth: combat.weaponCombo.weaponDefId === runtime.weaponDefId ? combat.weaponCombo.depth + 1 : 1,
    };
    events.push({
      type: "attack_recovered",
      attackerId: player.id,
      weaponDefId: runtime.weaponDefId,
      attackId: runtime.attackId,
    });
    return;
  }
  runtime.phase = phase;

  if (phase === "active") {
    if (prevPhase !== "active") {
      events.push({
        type: "attack_active",
        attackerId: player.id,
        weaponDefId: runtime.weaponDefId,
        attackId: runtime.attackId,
      });
    }
    runHitDetection(args, plan);
  }

  // Transition active → recovery: report a clean whiff once.
  if (prevPhase === "active" && phase === "recovery" && !runtime.didHit) {
    events.push({
      type: "attack_missed",
      attackerId: player.id,
      weaponDefId: runtime.weaponDefId,
      attackId: runtime.attackId,
      soundProfile: runtime.soundProfile,
    });
  }
}

function runHitDetection(args: WeaponAttackSystemArgs, plan: AttackPlan): void {
  const { world, combat, player, config, vfx, entityLayer, events } = args;
  const runtime = combat.weaponAttack;
  const scaledShape = scaleHitShape(plan.hitShape, playerScale());
  const damageScale = getPlayerStats().combat.attackDamage / BASE_COMBAT_STATS.attackDamage;
  const weaponDef = weaponDefForItem(getEquippedWeaponId());
  const weightClass = weaponDef?.handling.weightClass ?? "medium";

  for (const target of world.with("health", "position").entities) {
    if (target.health.faction !== "hostile") continue;
    if (target.health.current <= 0) continue;
    if (runtime.hitEntityIds.has(target.id)) continue;

    const tcx = target.position.x + TILE / 2;
    const tcy = target.position.y + TILE / 2;
    const inside = hitShapeContains({
      shape: scaledShape,
      origin: {
        x: runtime.origin.x + Math.cos(runtime.aimAngle) * (plan.attack.hitOriginOffsetPx ?? 0),
        y: runtime.origin.y + Math.sin(runtime.aimAngle) * (plan.attack.hitOriginOffsetPx ?? 0),
      },
      aimAngle: runtime.aimAngle,
      point: { x: tcx, y: tcy },
      pointRadiusPx: TARGET_POINT_RADIUS_PX,
    });
    if (!inside) continue;

    const distancePx = Math.hypot(tcx - runtime.origin.x, tcy - runtime.origin.y);
    let damage = plan.weaponDamage * damageScale;
    let bleed: { damagePerTick: number; durationSec: number; tickEverySec: number } | undefined;

    const technique = getWeaponTechnique(plan.techniqueId);
    if (technique) {
      const out = technique.onHit({ weaponDamage: damage, distancePx, targetTags: targetTags(target) });
      damage = out.damage;
      if (out.bleed) bleed = out.bleed;
    }

    // Generic status effects authored on the attack (e.g. knife bleed).
    for (const effect of plan.attack.statusEffects ?? []) {
      if (effect.kind === "bleed" && Math.random() * 100 < effect.chancePct) {
        bleed = {
          damagePerTick: effect.magnitude,
          durationSec: effect.durationSec ?? 6,
          tickEverySec: effect.tickEverySec ?? 2,
        };
      }
    }

    const finalDamage = Math.max(1, Math.round(damage));
    const knockback = knockbackForWeight(weightClass, config.knockback);
    const lethal = applyDamage(
      target,
      finalDamage,
      runtime.origin.x,
      runtime.origin.y,
      knockback,
      config,
      vfx,
      entityLayer,
      combat,
      events,
      0,
    );

    runtime.hitEntityIds.add(target.id);
    runtime.didHit = true;

    if (bleed && !lethal) {
      target.bleed = {
        remainingSec: bleed.durationSec,
        tickEverySec: bleed.tickEverySec,
        tickTimer: bleed.tickEverySec,
        damagePerTick: bleed.damagePerTick,
        sourceId: `weapon:${runtime.attackId}`,
      };
    }

    events.push({
      type: "attack_hit",
      attackerId: player.id,
      targetId: target.id,
      weaponDefId: runtime.weaponDefId,
      attackId: runtime.attackId,
      damageType: plan.attack.damageType,
      amount: finalDamage,
      soundProfile: runtime.soundProfile,
      position: { x: tcx, y: tcy },
    });

    if (lethal) args.onEnemyKilled(target);
  }
}
