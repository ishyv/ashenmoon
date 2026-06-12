import { Graphics, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import type { VFXResource } from "$lib/core/vfx/vfx";
import { TILE } from "$lib/core/systems/map/map";
import { Colors } from "$lib/utils/colors";
import { stamina, staminaConfig } from "$lib/domain/stamina.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { awardSkillXp } from "$lib/domain/skill-xp";
import { InputAction, SkillKey } from "$lib/domain/game-events";
import { CombatResource, CombatConfig } from "./combat";
import { spawnEnvFloatingText, spawnSlashArc, triggerCameraShake } from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";

/**
 * Records significant player movement direction changes into `combat.movePhases`
 * so `playerAttackSystem` can detect the A → -A → A thrust combo. Call every frame
 * regardless of whether an attack is pending.
 */
export function trackMovementCombo(combat: CombatResource, inputs: InputResource): void {
  const mx = (inputs.isActionPressed(InputAction.MoveRight) ? 1 : 0)
           - (inputs.isActionPressed(InputAction.MoveLeft)  ? 1 : 0);
  const my = (inputs.isActionPressed(InputAction.MoveDown)  ? 1 : 0)
           - (inputs.isActionPressed(InputAction.MoveUp)    ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len < 0.1) return; // standing still — no phase advance

  const nx = mx / len;
  const ny = my / len;

  if (!combat.lastMoveVec) {
    combat.lastMoveVec = { x: nx, y: ny };
    combat.movePhases = [{ x: nx, y: ny }];
    combat.comboResetTimer = CombatResource.COMBO_WINDOW;
    return;
  }

  const dot = combat.lastMoveVec.x * nx + combat.lastMoveVec.y * ny;
  if (dot < 0.25) {
    combat.lastMoveVec = { x: nx, y: ny };
    combat.movePhases.push({ x: nx, y: ny });
    if (combat.movePhases.length > 3) combat.movePhases.shift();
    combat.comboResetTimer = CombatResource.COMBO_WINDOW;
  }
}

/** Handles stack decaying and foot fire particle VFX updates. */
export function updateKiteCombo(
  combat: CombatResource,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  dt: number
): void {
  if (combat.kiteStacks > 0) {
    combat.kiteStacksDecayTimer -= dt;
    if (combat.kiteStacksDecayTimer <= 0) {
      combat.kiteStacks--;
      if (combat.kiteStacks > 0) {
        combat.kiteStacksDecayTimer = 3.0;
      }
    }

    // --- Feet fire particles VFX juice while Kite Focus is active ---
    combat.kiteParticleTimer -= dt;
    if (combat.kiteParticleTimer <= 0) {
      // Spawn interval: faster at higher stacks (e.g. 0.12s down to 0.04s)
      combat.kiteParticleTimer = 0.12 / combat.kiteStacks;

      const count = combat.kiteStacks;
      const colors = [0x33e0a6, 0x00ff88, 0x00f0ff, 0xffcc00];
      const pColor = colors[Math.min(combat.kiteStacks, colors.length - 1)]!;

      for (let i = 0; i < count; i++) {
        const g = new Graphics();
        const size = 1.0 + Math.random() * 2.0;
        g.circle(0, 0, size).fill({ color: pColor, alpha: 0.6 + Math.random() * 0.4 });
        
        const px = player.position!.x + TILE / 2 + (Math.random() - 0.5) * 16;
        const py = player.position!.y + TILE  / 1.5 + (Math.random() - 0.8) * 6;
        g.x = px;
        g.y = py;

        vfx.particles.push({
          graphic: g,
          vx: (Math.random() - 0.5) * 20,
          vy: -(20 + Math.random() * 30), // rising up from feet
          gravity: -10, // slight upward float, no gravity fall
          life: 0,
          maxLife: 0.4 + Math.random() * 0.3,
        });
        entityLayer.addChild(g);
      }
    }
  }
}

/** Check if conditions are primed to execute a Kite Combo strike. */
export function checkKiteComboTrigger(combat: CombatResource): boolean {
  const phases = combat.movePhases;
  const isKiteCombo =
    combat.comboResetTimer > 0 &&
    phases.length >= 3 &&
    (() => {
      const p0 = phases[phases.length - 3]!;
      const p1 = phases[phases.length - 2]!;
      const p2 = phases[phases.length - 1]!;
      const sameDir = p0.x * p2.x + p0.y * p2.y; // want > 0.5
      const oppDir  = p0.x * p1.x + p0.y * p1.y; // want < -0.5
      return sameDir > 0.5 && oppDir < -0.5;
    })();

  if (isKiteCombo) {
    combat.movePhases = [];
    combat.lastMoveVec = null;
  }

  return isKiteCombo;
}

export interface KiteComboFinisherResult {
  effectiveReach: number;
  effectiveHalfAngle: number;
  effectiveDamage: number;
  useStaminaCost: number;
  arcColor: number;
}

/** Apply stack level increments, compute bonus scalings, trigger shakes/visual arcs, and award skill XP. */
export function applyKiteComboFinisher(
  combat: CombatResource,
  config: CombatConfig,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  angle: number,
  pcx: number,
  pcy: number
): KiteComboFinisherResult {
  const kiteLevel = gameState.rpg.skills?.kiteCombo?.level ?? 1;

  // Increment stacks BEFORE calculating the values!
  combat.kiteStacks = Math.min(3, combat.kiteStacks + 1);
  combat.kiteStacksDecayTimer = 3.0;

  const currentStacks = combat.kiteStacks;
  
  const reachMult = 1 + (0.12 + 0.03 * kiteLevel) * currentStacks;
  const damageMult = 1 + (0.15 + 0.03 * kiteLevel) * currentStacks;
  
  const effectiveReach = config.reach * 2.2 * reachMult;
  const effectiveHalfAngle = config.arcHalfAngle * 0.35;
  const effectiveDamage = Math.round(config.damage * 1.4 * damageMult);
  
  const useStaminaCost = Math.max(1, config.staminaCost - (2 + kiteLevel) * (currentStacks - 1));

  let arcColor: number = Colors.combat.kiteArc;
  if (currentStacks === 1) {
    spawnEnvFloatingText(vfx, "🪶 Kite Focus I", Colors.combat.kiteArc, player.position!, entityLayer);
    triggerCameraShake(vfx, 3, 0.1);
  } else if (currentStacks === 2) {
    arcColor = 0x00f0ff; // Cyan
    spawnEnvFloatingText(vfx, "⚡ Kite Focus II", 0x00f0ff, player.position!, entityLayer);
    triggerCameraShake(vfx, 4.5, 0.12);
  } else {
    arcColor = 0xffcc00; // Gold
    spawnEnvFloatingText(vfx, "🔥 Kite Focus III [MAX]", 0xffcc00, player.position!, entityLayer);
    triggerCameraShake(vfx, 6.5, 0.15);
  }

  spawnSlashArc(vfx, entityLayer, pcx, pcy, angle, effectiveReach, effectiveHalfAngle, arcColor);
  playSound("combo.kite", { params: { stacks: currentStacks } });

  awardSkillXp(SkillKey.KiteCombo, 15, vfx, player.position!, entityLayer);

  return {
    effectiveReach,
    effectiveHalfAngle,
    effectiveDamage,
    useStaminaCost,
    arcColor,
  };
}

/** Handles stamina refunds and HP strain penalties upon landing a Kite Combo finisher. */
export function handleKiteComboHit(
  combat: CombatResource,
  player: Entity,
  vfx: VFXResource,
  entityLayer: Container,
  hitCount: number
): void {
  if (hitCount > 0) {
    const currentStacks = combat.kiteStacks;
    
    // Reward stamina
    const staminaReward = 15 + 5 * currentStacks;
    stamina.current = Math.min(staminaConfig.max, stamina.current + staminaReward);
    spawnEnvFloatingText(vfx, `⚡ +${staminaReward} Stamina`, 0x55ff55, player.position!, entityLayer);

    // HP sacrifice penalty to avoid high stack spamming
    if (currentStacks >= 2) {
      const hpCost = 5 * (currentStacks - 1);
      const pHp = player.health!;
      pHp.current = Math.max(1, pHp.current - hpCost);
      spawnEnvFloatingText(vfx, `💔 -${hpCost} HP (Strain)`, Colors.ui.error, player.position!, entityLayer);
    }
  }
}
