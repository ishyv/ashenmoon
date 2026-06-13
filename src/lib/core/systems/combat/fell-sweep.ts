import type { World } from "miniplex";
import { Graphics, type AnimatedSprite, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map/map";
import type { InputResource } from "$lib/core/input/input";
import { CombatResource, CombatConfig, applyDamage } from "./combat";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { spawnEnvFloatingText, spawnEnvParticles, spawnShockwaveRing, spawnSlashArc, triggerCameraShake, spawnFellSweepCleave, spawnFellSweepWhirl } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { spendStamina, stamina } from "$lib/state/rpg/stamina.svelte";
import { Colors } from "$lib/utils/colors";
import {
  chargeProgressFromHeldMs,
  createInitialFellSweepChargeState,
  DEFAULT_FELL_SWEEP_CONFIG,
  fellSweepCooldown,
  fellSweepCost,
  fellSweepScaling,
  fellSweepStage,
  normalizeAimDirection,
  smoothFellSweepAim,
  trackFellSweepWhirl,
  type FellSweepChargeStage,
  isPointInsideFissure,
} from "$lib/domain/combat/fell-sweep";

function resetFellSweepCharge(combat: CombatResource): void {
  combat.fellSweepChargeState = createInitialFellSweepChargeState();
  combat.fellSweepChargePulseTimer = 0;
  combat.fellSweepVfxPulseTimer = 0;
  combat.fellSweepDustTimer = 0;
}

function chargeTint(charge: number): number {
  if (charge <= 0) return Colors.ui.white;
  const t = Math.min(1, charge) * 0.45;
  const r = 0xff;
  const g = Math.round(0xff - (0xff - 0xaa) * t);
  const b = Math.round(0xff - (0xff - 0x44) * t);
  return (r << 16) | (g << 8) | b;
}

function releaseSoundForStage(stage: FellSweepChargeStage): "player.fellsweep.release.low" | "player.fellsweep.release.mid" | "player.fellsweep.release.high" {
  if (stage === "full" || stage === "critical") return "player.fellsweep.release.high";
  if (stage === "building") return "player.fellsweep.release.mid";
  return "player.fellsweep.release.low";
}

export function updateFellSweepChargeSystem(
  inputs: InputResource,
  combat: CombatResource,
  vfx: VFXResource,
  dt: number,
  player: Entity,
  entityLayer: Container,
  isDashing: boolean,
  isPlacementMode: boolean,
): void {
  if (combat.fellSweepCooldownTimer > 0) combat.fellSweepCooldownTimer = Math.max(0, combat.fellSweepCooldownTimer - dt);

  const state = combat.fellSweepChargeState;
  const playerDead = (player.health?.current ?? 1) <= 0;
  const knocked = (player.knockback?.timer ?? 0) > 0;

  if (!inputs.isMouseHeld) {
    if (!inputs.pendingFellSweep && state.isCharging) resetFellSweepCharge(combat);
    if (!inputs.pendingFellSweep && state.wasDeniedThisHold) resetFellSweepCharge(combat);
    return;
  }

  const heldMs = inputs.getMouseHeldMs();
  const progress = chargeProgressFromHeldMs(heldMs);
  const stage = fellSweepStage(progress);
  if (progress <= 0) {
    combat.fellSweepChargeState = { ...state, heldMs, chargeProgress: 0, chargeStage: "none", lastStage: state.chargeStage };
    return;
  }

  const hardCancelled = state.isCharging && (isDashing || isPlacementMode || playerDead || knocked);
  if (hardCancelled) {
    spawnEnvFloatingText(vfx, "Fell Sweep broken", Colors.ui.warning, player.position!, entityLayer);
    playSound("player.fellsweep.cancel");
    resetFellSweepCharge(combat);
    combat.fellSweepChargeState.interrupted = true;
    return;
  }

  const blocked = isDashing || isPlacementMode || playerDead || combat.fellSweepCooldownTimer > 0;
  if (blocked) {
    if (!state.wasDeniedThisHold) {
      const msg = combat.fellSweepCooldownTimer > 0 ? "Fell Sweep not ready" : "can't brace now";
      spawnEnvFloatingText(vfx, msg, Colors.ui.warning, player.position!, entityLayer);
      playSound("player.fellsweep.denied");
    }
    combat.fellSweepChargeState = {
      ...state,
      isCharging: false,
      heldMs,
      chargeProgress: 0,
      chargeStage: "none",
      wasDeniedThisHold: true,
      lastStage: "none",
    };
    return;
  }

  const pos = player.position!;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;
  const targetAim = normalizeAimDirection(inputs.mouseWorld.x - pcx, inputs.mouseWorld.y - pcy, state.aimDirection);
  const targetAimAngle = Math.atan2(targetAim.y, targetAim.x);
  const whirl = trackFellSweepWhirl(
    state.isCharging
      ? state
      : { ...state, whirlAngularTravelRad: 0, lastWhirlAimAngleRad: null, isWhirlReady: false },
    targetAimAngle,
  );
  const aimDirection = state.isCharging ? smoothFellSweepAim(state.aimDirection, targetAim, progress) : targetAim;
  const startedAtMs = state.isCharging ? state.startedAtMs : performance.now() - heldMs;

  if (stage !== state.chargeStage && stage !== "none") {
    if (stage === "bracing") playSound("player.fellsweep.charge.brace");
    else if (stage === "full") playSound("player.fellsweep.charge.full");
    else playSound("player.fellsweep.charge.pulse");
    combat.fellSweepChargePulseTimer = stage === "full" ? 0.35 : 0.55;
  } else if (stage === "building" || stage === "critical" || stage === "full") {
    combat.fellSweepChargePulseTimer -= dt;
    if (combat.fellSweepChargePulseTimer <= 0) {
      playSound(stage === "full" ? "player.fellsweep.charge.full" : "player.fellsweep.charge.pulse", {
        gain: stage === "critical" || stage === "full" ? 0.9 : 0.65,
      });
      combat.fellSweepChargePulseTimer = stage === "full" ? 0.5 : 0.7 - progress * 0.25;
    }
  }

  combat.fellSweepChargeState = {
    isCharging: true,
    startedAtMs,
    heldMs,
    chargeProgress: progress,
    chargeStage: stage,
    wasDeniedThisHold: false,
    aimDirection,
    lastStage: state.chargeStage,
    interrupted: false,
    isWhirlReady: whirl.isWhirlReady,
    whirlAngularTravelRad: whirl.whirlAngularTravelRad,
    lastWhirlAimAngleRad: whirl.lastWhirlAimAngleRad,
  };
}

export function renderFellSweepChargeFeedback(
  combat: CombatResource,
  vfx: VFXResource,
  dt: number,
  player: Entity,
  playerSprite: AnimatedSprite,
  entityLayer: Container,
): void {
  const state = combat.fellSweepChargeState;
  if (!state.isCharging || !player.position) {
    playerSprite.tint = Colors.ui.white;
    if (vfx.fellSweepChargeArc) {
      entityLayer.removeChild(vfx.fellSweepChargeArc);
      vfx.fellSweepChargeArc.destroy();
      vfx.fellSweepChargeArc = null;
    }
    return;
  }

  const charge = state.chargeProgress;
  const stage = state.chargeStage;
  const pos = player.position;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;
  const isWhirl = state.isWhirlReady;
  const amp = isWhirl ? 13 : stage === "full" ? 10 : stage === "critical" ? 8 : 3 + charge * 5;
  playerSprite.x += (Math.random() - 0.5) * amp;
  playerSprite.y += (Math.random() - 0.5) * amp * 0.65;
  playerSprite.tint = chargeTint(charge);

  combat.fellSweepDustTimer -= dt;
  const dustInterval = stage === "full" ? 0.09 : stage === "critical" ? 0.12 : stage === "building" ? 0.18 : 0.28;
  if (combat.fellSweepDustTimer <= 0) {
    spawnEnvParticles(
      vfx,
      isWhirl ? Colors.combat.fellSweepArc : stage === "bracing" ? Colors.vfx.footstep : Colors.world.dirt,
      isWhirl ? 8 : stage === "full" ? 5 : 2,
      "smoke",
      pos,
      entityLayer,
    );
    combat.fellSweepDustTimer = isWhirl ? Math.min(dustInterval, 0.08) : dustInterval;
  }

  combat.fellSweepVfxPulseTimer -= dt;
  if ((stage === "building" || stage === "critical" || stage === "full") && combat.fellSweepVfxPulseTimer <= 0) {
    triggerCameraShake(vfx, isWhirl ? 5.8 : stage === "full" ? 4.8 : stage === "critical" ? 3.6 : 1.7, 0.08 + charge * 0.04);
    if (stage === "full" || isWhirl) {
      spawnShockwaveRing(vfx, entityLayer, pcx, pcy, Colors.combat.fellSweepArc, isWhirl ? 0.38 : 0.28);
    }
    combat.fellSweepVfxPulseTimer = isWhirl ? 0.22 : stage === "full" ? 0.55 : 0.32 - charge * 0.12;
  }

  const preview = vfx.fellSweepChargeArc ?? new Graphics();
  if (!vfx.fellSweepChargeArc) {
    vfx.fellSweepChargeArc = preview;
    entityLayer.addChild(preview);
  }
  const reach = TILE * (1.1 + charge * 0.55);
  const halfAngle = (Math.PI / 5) * (1 + charge * 0.25);
  const angle = Math.atan2(state.aimDirection.y, state.aimDirection.x);
  const alpha = stage === "full" ? 0.44 : 0.16 + charge * 0.22;
  preview.clear();
  preview.x = pcx;
  preview.y = pcy;
  if (isWhirl) {
    preview.circle(0, 0, reach * 1.2);
    preview.stroke({ color: Colors.combat.fellSweepArc, width: 6, alpha: Math.max(alpha, 0.5) });
    preview.circle(0, 0, reach * 0.72);
    preview.stroke({ color: Colors.ui.white, width: 2, alpha: 0.28 });
  } else {
    preview.moveTo(Math.cos(angle - halfAngle) * TILE * 0.3, Math.sin(angle - halfAngle) * TILE * 0.3);
    preview.arc(0, 0, reach, angle - halfAngle, angle + halfAngle);
    preview.stroke({ color: Colors.combat.fellSweepArc, width: stage === "full" ? 5 : 2.5 + charge * 2, alpha });
  }
}

/**
 * Fell Sweep â€” charged melee attack. Activated by holding LMB for >= 800ms.
 * Charge level (0â€“1) scales arc width (+30%), reach (+50%), and damage (1.8xâ€“3x).
 * Long cooldown at level 1, reduced by 0.4s per level (floor 4s).
 */
export function fellSweepSystem(
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
  fellSweepLevel: number,
  onEnemyKilled: (enemy: Entity) => void,
): void {
  if (!inputs.pendingFellSweep) return;
  inputs.pendingFellSweep = false;

  if (isPlacementMode || isDashing || combat.fellSweepCooldownTimer > 0) return;

  const staminaCost = fellSweepCost(fellSweepLevel);
  if (stamina.current < staminaCost) {
    spawnEnvFloatingText(vfx, "too winded to charge", Colors.ui.error, player.position!, entityLayer);
    playSound("player.fellsweep.denied");
    resetFellSweepCharge(combat);
    return;
  }

  const charge = combat.fellSweepChargeState.chargeProgress || inputs.fellSweepCharge;
  const stage = fellSweepStage(charge);
  const isWhirl = combat.fellSweepChargeState.isWhirlReady;
  const scaling = fellSweepScaling(charge, config, DEFAULT_FELL_SWEEP_CONFIG, isWhirl);

  const pos = player.position!;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;
  const aimed = combat.fellSweepChargeState.isCharging
    ? combat.fellSweepChargeState.aimDirection
    : normalizeAimDirection(inputs.mouseWorld.x - pcx, inputs.mouseWorld.y - pcy);
  const ax = aimed.x;
  const ay = aimed.y;
  const angle = Math.atan2(ay, ax);

  combat.swingActiveTimer = 0.28;
  combat.fellSweepCooldownTimer = fellSweepCooldown(fellSweepLevel);
  combat.inCombatTimer = config.inCombatTimeout;
  spendStamina(staminaCost, "burst");

  playerSprite.scale.x = ax < 0 ? -Math.abs(playerSprite.scale.x) : Math.abs(playerSprite.scale.x);
  setPlayerAnim("attack");

  if (isWhirl) {
    spawnFellSweepWhirl(vfx, entityLayer, { x: pcx, y: pcy }, scaling.reach, Colors.combat.fellSweepArc);
  } else {
    spawnFellSweepCleave(vfx, entityLayer, { x: pcx, y: pcy }, aimed, scaling.reach * 1.5, TILE * 1.2, Colors.combat.fellSweepArc);
  }

  playSound(releaseSoundForStage(stage));
  triggerCameraShake(vfx, isWhirl ? 10 : 4 + charge * 5, isWhirl ? 0.42 : 0.2 + charge * 0.14);
  spawnEnvParticles(vfx, isWhirl ? Colors.combat.fellSweepArc : Colors.world.dirt, isWhirl ? 30 : stage === "full" || stage === "critical" ? 18 : 9, "smoke", pos, entityLayer);
  if (stage === "critical" || stage === "full" || isWhirl) {
    spawnShockwaveRing(vfx, entityLayer, pcx, pcy, Colors.combat.fellSweepArc, isWhirl ? 0.65 : stage === "full" ? 0.5 : 0.35);
  }

  const enemyRadius = TILE * 0.4;
  let hitCount = 0;

  if (isWhirl) {
    // 1. Vacuum Pull: pull hostiles within reach * 1.5 closer (75% closer to player center)
    const pulledEntities: Entity[] = [];
    const pullRadius = scaling.reach * 1.5;
    for (const e of world.with("health", "position").entities) {
      const h = e.health!;
      if (h.faction !== "hostile" || h.current <= 0) continue;
      const ex = e.position!.x + TILE / 2;
      const ey = e.position!.y + TILE / 2;
      const dx = ex - pcx;
      const dy = ey - pcy;
      const d = Math.hypot(dx, dy);
      if (d <= pullRadius) {
        const ex_new = ex * 0.25 + pcx * 0.75;
        const ey_new = ey * 0.25 + pcy * 0.75;
        e.position!.x = ex_new - TILE / 2;
        e.position!.y = ey_new - TILE / 2;
        e.position!.targetX = e.position!.x;
        e.position!.targetY = e.position!.y;
        pulledEntities.push(e);
      }
    }

    // 2. Damage calculation: deals +10% damage per extra target caught
    const numPulled = pulledEntities.length;
    const damageMultiplier = 1 + Math.max(0, numPulled - 1) * 0.1;
    const finalDamage = Math.round(scaling.damage * damageMultiplier);

    // 3. Apply damage and radial knockback to all hostiles within the whirl reach
    for (const e of world.with("health", "position").entities) {
      const h = e.health!;
      if (h.faction !== "hostile" || h.current <= 0) continue;
      const ex = e.position!.x + TILE / 2;
      const ey = e.position!.y + TILE / 2;
      const dx = ex - pcx;
      const dy = ey - pcy;
      const d = Math.hypot(dx, dy);
      if (d <= scaling.reach + enemyRadius) {
        const died = applyDamage(e, finalDamage, pcx, pcy, scaling.knockback, config, vfx, entityLayer);
        hitCount++;
        if (died) onEnemyKilled(e);
      }
    }
  } else {
    // Fissure Slam (Cleave)
    const fissureLength = scaling.reach * 1.5;
    const fissureWidth = TILE * 1.2;
    for (const e of world.with("health", "position").entities) {
      const h = e.health!;
      if (h.faction !== "hostile" || h.current <= 0) continue;
      const ex = e.position!.x + TILE / 2;
      const ey = e.position!.y + TILE / 2;

      const hit = isPointInsideFissure(
        { x: pcx, y: pcy },
        aimed,
        fissureLength,
        fissureWidth,
        { x: ex, y: ey },
        enemyRadius
      );
      if (hit) {
        const dx = ex - pcx;
        const dy = ey - pcy;
        const along = dx * ax + dy * ay;
        const perpX = dx - ax * along;
        const perpY = dy - ay * along;
        const perpDist = Math.hypot(perpX, perpY);

        const isDirectHit = perpDist <= TILE * 0.3 && along >= 0 && along <= fissureLength;

        let finalDamage = scaling.damage;
        if (isDirectHit) {
          finalDamage = Math.round(scaling.damage * 1.3);
          e.bleed = {
            remainingSec: 6,
            tickEverySec: 2,
            tickTimer: 2,
            damagePerTick: 4
          };
          spawnEnvFloatingText(vfx, "💥 Direct Hit!", Colors.ui.warning, e.position!, entityLayer);
          playSound("combo.crosscut.bleed", e.position ? { position: e.position } : {});
        }

        // Apply linear knockback along fissure direction using coordinates relative to direction
        const died = applyDamage(e, finalDamage, ex - ax, ey - ay, scaling.knockback, config, vfx, entityLayer);
        hitCount++;
        if (died) onEnemyKilled(e);
      }
    }
  }

  if (hitCount > 0 && (stage === "critical" || stage === "full")) {
    triggerCameraShake(vfx, 7 + charge * 3, 0.16);
  }
  resetFellSweepCharge(combat);
}

