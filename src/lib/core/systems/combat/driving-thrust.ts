import type { World } from "miniplex";
import { Graphics, type AnimatedSprite, type Container } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { collidesWithSolid, type MovementResource } from "$lib/core/systems/movement/movement";
import {
  DEFAULT_DRIVING_THRUST_CONFIG,
  canStartDrivingThrust,
  computeCollisionClippedTravelDistance,
  getDrivingThrustDistancePx,
  isPointInsideDrivingThrustCapsule,
  resetDrivingThrustState,
  type DrivingThrustConfig,
  type DrivingThrustHitbox,
  type DrivingThrustState,
  type Vec2,
} from "$lib/domain/combat/driving-thrust";
import { PLAYER_BODY } from "$lib/domain/collision";
import { spendStamina, stamina } from "$lib/state/rpg/stamina.svelte";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { Colors } from "$lib/utils/colors";
import {
  type VFXResource,
  spawnDrivingThrustSlash,
  spawnEnvFloatingText,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { applyDamage, type CombatConfig, type CombatResource } from "./combat";

const BODY_HX = PLAYER_BODY.hx;
const BODY_HY = PLAYER_BODY.hy;
const BODY_CY = PLAYER_BODY.cy;
const ENEMY_RADIUS = TILE * 0.4;

function playerCenter(player: Entity): Vec2 {
  return {
    x: player.position!.x + TILE / 2,
    y: player.position!.y + TILE / 2,
  };
}

function bodyCenter(player: Entity): Vec2 {
  return {
    x: player.position!.x + TILE / 2,
    y: player.position!.y + BODY_CY,
  };
}

function getCombatLevel(): number {
  const skills = gameState.rpg.skills as (typeof gameState.rpg.skills & { combat?: { level: number } }) | null;
  return skills?.combat?.level ?? 1;
}

function startDrivingThrust(args: {
  combat: CombatResource;
  config: DrivingThrustConfig;
  player: Entity;
  map: MapResource;
  movement: MovementResource;
  direction: Vec2;
}): void {
  const center = playerCenter(args.player);
  const body = bodyCenter(args.player);
  const intendedDistancePx = getDrivingThrustDistancePx(args.config, getCombatLevel());
  const actualDistancePx = computeCollisionClippedTravelDistance({
    origin: body,
    direction: args.direction,
    intendedDistancePx,
    stepPx: 6,
    collidesAt: (x, y) =>
      !args.movement.noclip && collidesWithSolid(x, y, BODY_HX, BODY_HY, args.map),
  });

  const state = args.combat.drivingThrustState;
  state.phase = "windup";
  state.elapsedMs = 0;
  state.direction = { ...args.direction };
  state.origin = center;
  state.intendedDistancePx = intendedDistancePx;
  state.actualDistancePx = actualDistancePx;
  state.traveledDistancePx = 0;
  state.hitEntityIds.clear();
}

function applyDrivingThrustHits(args: {
  world: World<Entity>;
  combat: CombatResource;
  config: CombatConfig;
  thrustConfig: DrivingThrustConfig;
  vfx: VFXResource;
  entityLayer: Container;
  hitbox: DrivingThrustHitbox;
  direction: Vec2;
  onEnemyKilled: (enemy: Entity) => void;
}): void {
  const candidates = [...args.world.with("health", "position").entities]
    .filter((e) => e.health!.faction === "hostile" && e.health!.current > 0 && !args.combat.drivingThrustState.hitEntityIds.has(e.id))
    .map((e) => {
      const ex = e.position!.x + TILE / 2;
      const ey = e.position!.y + TILE / 2;
      const projection =
        (ex - args.hitbox.origin.x) * args.direction.x +
        (ey - args.hitbox.origin.y) * args.direction.y;
      return { entity: e, ex, ey, projection };
    })
    .filter(({ ex, ey }) =>
      isPointInsideDrivingThrustCapsule(args.hitbox, { x: ex, y: ey }, ENEMY_RADIUS),
    )
    .sort((a, b) => a.projection - b.projection);

  const baseDamage = getPlayerStats().combat.attackDamage;
  for (const [index, hit] of candidates.entries()) {
    const isFirst = index === 0;
    const damageMultiplier = isFirst ? args.thrustConfig.damageMultiplier : args.thrustConfig.secondaryDamageMultiplier;
    const damage = Math.round(baseDamage * damageMultiplier);
    const sourceX = hit.ex - args.direction.x;
    const sourceY = hit.ey - args.direction.y;
    const died = applyDamage(
      hit.entity,
      damage,
      sourceX,
      sourceY,
      args.config.knockback * args.thrustConfig.knockbackForce,
      args.config,
      args.vfx,
      args.entityLayer,
      args.combat,
    );
    args.combat.drivingThrustState.hitEntityIds.add(hit.entity.id);

    if (!died) {
      const bleedChance = isFirst ? args.thrustConfig.bleedChancePct : args.thrustConfig.secondaryBleedChancePct;
      if (Math.random() * 100 < bleedChance) {
        hit.entity.bleed = {
          remainingSec: args.thrustConfig.bleedDurationSec,
          tickEverySec: args.thrustConfig.bleedTickEverySec,
          tickTimer: args.thrustConfig.bleedTickEverySec,
          damagePerTick: args.thrustConfig.bleedDamagePerTick,
          sourceId: "driving_thrust",
        };
      }
    }
    if (died) args.onEnemyKilled(hit.entity);
  }
}

function advanceDrivingThrust(args: {
  world: World<Entity>;
  combat: CombatResource;
  config: CombatConfig;
  vfx: VFXResource;
  dt: number;
  player: Entity;
  playerSprite: AnimatedSprite;
  setPlayerAnim: (state: "idle" | "run" | "attack") => void;
  entityLayer: Container;
  onEnemyKilled: (enemy: Entity) => void;
}): void {
  const state = args.combat.drivingThrustState;
  if (state.phase === "idle") return;

  state.elapsedMs += args.dt * 1000;
  args.setPlayerAnim("attack");
  args.playerSprite.scale.x =
    state.direction.x < 0 ? -Math.abs(args.playerSprite.scale.x) : Math.abs(args.playerSprite.scale.x);

  if (state.phase === "windup" && state.elapsedMs >= args.combat.drivingThrustConfig.windupMs) {
    state.phase = "active";
    state.elapsedMs = 0;
    const hitbox = {
      origin: state.origin,
      direction: state.direction,
      lengthPx: state.actualDistancePx,
      widthPx: args.combat.drivingThrustConfig.hitboxWidthPx,
    };
    applyDrivingThrustHits({
      world: args.world,
      combat: args.combat,
      config: args.config,
      thrustConfig: args.combat.drivingThrustConfig,
      vfx: args.vfx,
      entityLayer: args.entityLayer,
      hitbox,
      direction: state.direction,
      onEnemyKilled: args.onEnemyKilled,
    });
  }

  if (state.phase === "active") {
    const activeMs = Math.max(1, args.combat.drivingThrustConfig.activeMs);
    const targetTravel = Math.min(state.actualDistancePx, state.actualDistancePx * (state.elapsedMs / activeMs));
    const delta = Math.max(0, targetTravel - state.traveledDistancePx);
    if (delta > 0 && args.player.position) {
      args.player.position.x += state.direction.x * delta;
      args.player.position.y += state.direction.y * delta;
      state.traveledDistancePx = targetTravel;
      args.player.position.targetX = args.player.position.x;
      args.player.position.targetY = args.player.position.y;
      args.playerSprite.x = args.player.position.x + TILE / 2;
      args.playerSprite.y = args.player.position.y + TILE;
    }
    if (state.elapsedMs >= args.combat.drivingThrustConfig.activeMs) {
      state.phase = "recovery";
      state.elapsedMs = 0;
    }
  }

  if (state.phase === "recovery" && state.elapsedMs >= args.combat.drivingThrustConfig.recoveryMs) {
    resetDrivingThrustState(state);
  }
}

export function drivingThrustSystem(
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
  map: MapResource,
  isPlacementMode: boolean,
  onEnemyKilled: (enemy: Entity) => void,
): void {
  if (combat.drivingThrustCooldownTimer > 0) combat.drivingThrustCooldownTimer = Math.max(0, combat.drivingThrustCooldownTimer - dt);

  if (
    isPlacementMode ||
    movement.isDashing ||
    (player.knockback?.timer ?? 0) > 0 ||
    (player.health?.current ?? 1) <= 0
  ) {
    inputs.pendingDrivingThrust = null;
    resetDrivingThrustState(combat.drivingThrustState);
  }

  if (inputs.pendingDrivingThrust && combat.drivingThrustState.phase === "idle") {
    const pending = inputs.pendingDrivingThrust;
    inputs.pendingDrivingThrust = null;
    const nowMs = combat.currentTimeMs;
    const start = canStartDrivingThrust({
      nowMs,
      cooldownUntilMs: nowMs + combat.drivingThrustCooldownTimer * 1000,
      currentStamina: stamina.current,
      config: combat.drivingThrustConfig,
    });

    if (!start.ok) {
      spawnEnvFloatingText(
        vfx,
        start.reason === "cooldown" ? "thrust cooling" : "too winded to thrust",
        Colors.ui.error,
        player.position!,
        entityLayer,
      );
      playSound("combo.driving_thrust.denied", player.position ? { position: player.position } : {});
    } else {
      spendStamina(combat.drivingThrustConfig.staminaCost, "burst");
      combat.drivingThrustCooldownTimer = combat.drivingThrustConfig.cooldownMs / 1000;
      combat.attackCooldownTimer = Math.max(combat.attackCooldownTimer, combat.drivingThrustConfig.recoveryMs / 1000);
      combat.inCombatTimer = config.inCombatTimeout;
      startDrivingThrust({ combat, config: combat.drivingThrustConfig, player, map, movement, direction: pending.direction });
      const state = combat.drivingThrustState;
      spawnDrivingThrustSlash(vfx, entityLayer, state.origin, state.direction, state.actualDistancePx, combat.drivingThrustConfig.hitboxWidthPx);
      spawnEnvFloatingText(vfx, "Driving Thrust", Colors.combat.drivingThrust, player.position!, entityLayer);
      playSound("combo.driving_thrust", { position: state.origin });
      triggerCameraShake(vfx, 3.6, 0.14);
    }
  }

  advanceDrivingThrust({
    world,
    combat,
    config,
    vfx,
    dt,
    player,
    playerSprite,
    setPlayerAnim,
    entityLayer,
    onEnemyKilled,
  });
}

export function renderDrivingThrustPreview(
  vfx: VFXResource,
  entityLayer: Container,
  playerPos: { x: number; y: number } | undefined,
  inputs: InputResource,
  config: DrivingThrustConfig = DEFAULT_DRIVING_THRUST_CONFIG,
): void {
  if (!vfx.drivingThrustPreview) {
    vfx.drivingThrustPreview = new Graphics();
    vfx.drivingThrustPreview.visible = false;
    entityLayer.addChild(vfx.drivingThrustPreview);
  }

  const g = vfx.drivingThrustPreview;
  inputs.updatePointerAttackTracking();
  if (
    !playerPos ||
    !inputs.isMouseHeld ||
    inputs.armedPointerAttackIntent !== "driving_thrust" ||
    !inputs.primarySwipeStartWorld ||
    !inputs.primarySwipeCurrentWorld
  ) {
    g.visible = false;
    g.clear();
    return;
  }

  const worldDx = inputs.primarySwipeCurrentWorld.x - inputs.primarySwipeStartWorld.x;
  const worldDy = inputs.primarySwipeCurrentWorld.y - inputs.primarySwipeStartWorld.y;
  const len = Math.hypot(worldDx, worldDy) || 1;
  const dir = { x: worldDx / len, y: worldDy / len };
  const length = getDrivingThrustDistancePx(config, getCombatLevel());
  const cx = playerPos.x + TILE / 2;
  const cy = playerPos.y + TILE / 2;
  const ex = cx + dir.x * length;
  const ey = cy + dir.y * length;

  g.visible = true;
  g.clear();
  g.moveTo(cx, cy);
  g.lineTo(ex, ey);
  g.stroke({ color: Colors.combat.drivingThrustPreview, width: config.hitboxWidthPx, alpha: 0.14 });
  g.moveTo(cx, cy);
  g.lineTo(ex, ey);
  g.stroke({ color: Colors.combat.drivingThrust, width: 3, alpha: 0.75 });
}

