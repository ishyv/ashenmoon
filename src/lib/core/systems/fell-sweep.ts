import type { World } from "miniplex";
import type { AnimatedSprite, Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import { TILE } from "$lib/core/systems/map";
import type { InputResource } from "$lib/core/input";
import { CombatResource, CombatConfig, applyDamage } from "./combat";
import type { VFXResource } from "$lib/core/vfx";
import { spawnEnvFloatingText, spawnSlashArc, triggerCameraShake } from "$lib/core/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { spendStamina, stamina } from "$lib/domain/stamina.svelte";
import { Colors } from "$lib/utils/colors";

/**
 * Fell Sweep — charged melee attack. Activated by holding LMB for >= 800ms.
 * Charge level (0–1) scales arc width (+30%), reach (+50%), and damage (1.8x–3x).
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
  if (combat.fellSweepCooldownTimer > 0) combat.fellSweepCooldownTimer -= dt;

  if (!inputs.pendingFellSweep) return;
  inputs.pendingFellSweep = false;

  if (isPlacementMode || isDashing || combat.fellSweepCooldownTimer > 0) return;

  combat.swingActiveTimer = 0.28;

  const staminaCost = Math.max(10, 20 - (fellSweepLevel - 1));
  if (stamina.current < staminaCost) {
    spawnEnvFloatingText(vfx, "too winded to charge", Colors.ui.error, player.position!, entityLayer);
    return;
  }

  const charge = inputs.fellSweepCharge;
  const scaledArcHalfAngle = config.arcHalfAngle * (1.0 + charge * 0.3);
  const scaledReach = config.reach * (1.2 + charge * 0.3);
  const damage = Math.round(config.damage * (1.8 + charge * 1.2));
  const knock = config.knockback * (1.5 + charge * 1.0);

  const pos = player.position!;
  const pcx = pos.x + TILE / 2;
  const pcy = pos.y + TILE / 2;
  let ax = inputs.mouseWorld.x - pcx;
  let ay = inputs.mouseWorld.y - pcy;
  const len = Math.hypot(ax, ay) || 1;
  ax /= len;
  ay /= len;
  const angle = Math.atan2(ay, ax);

  const baseCooldown = 8.0;
  combat.fellSweepCooldownTimer = Math.max(4.0, baseCooldown - (fellSweepLevel - 1) * 0.4);
  combat.inCombatTimer = config.inCombatTimeout;
  spendStamina(staminaCost, "burst");

  playerSprite.scale.x = ax < 0 ? -Math.abs(playerSprite.scale.x) : Math.abs(playerSprite.scale.x);
  setPlayerAnim("attack");
  spawnSlashArc(vfx, entityLayer, pcx, pcy, angle, scaledReach, scaledArcHalfAngle, Colors.combat.fellSweepArc);
  playSound("player.fellsweep");
  triggerCameraShake(vfx, 4 + charge * 4, 0.2 + charge * 0.1);

  const cosHalf = Math.cos(scaledArcHalfAngle);
  const enemyRadius = TILE * 0.4;
  for (const e of world.with("health", "position").entities) {
    const h = e.health!;
    if (h.faction !== "hostile" || h.current <= 0) continue;
    const ex = e.position!.x + TILE / 2;
    const ey = e.position!.y + TILE / 2;
    const dx = ex - pcx;
    const dy = ey - pcy;
    const d = Math.hypot(dx, dy);
    if (d > scaledReach + enemyRadius) continue;
    if (d > 1 && (ax * dx + ay * dy) / d < cosHalf) continue;
    const died = applyDamage(e, damage, pcx, pcy, knock, config, vfx, entityLayer);
    if (died) onEnemyKilled(e);
  }
}
