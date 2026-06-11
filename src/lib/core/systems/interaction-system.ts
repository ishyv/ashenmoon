import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input";
import { TILE, type MapResource } from "$lib/core/systems/map";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
  triggerCameraShake,
} from "$lib/core/vfx";
import { Cell } from "$lib/core/types";
import {
  playChopSound,
  playClinkSound,
  playPickupSound,
  playCraftSound,
  playFallSound,
  playDepleteSound,
  playWaterBubble,
} from "$lib/core/audio-synthesis";
import { rpgState, setRpgState } from "$lib/state/rpg-state.svelte";
import { getItemDef } from "$lib/domain/items";
import { spendStamina, stamina } from "$lib/domain/stamina.svelte";
import { Colors } from "$lib/utils/colors";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { awardSkillXp } from "$lib/domain/skill-xp";
import { SkillKey, InputAction, EntityId, GameEvent } from "$lib/domain/game-events";
import { getItemQty, getEquippedWeaponId } from "$lib/domain/inventory-api";
import { syncGather, syncPickup, syncRefuel } from "$lib/state/persistence/remote-sync";
import { transformStackQty } from "$lib/domain/systems/inventory-system";
import { findProcessableItem, resolveProcessingCompletion } from "$lib/domain/systems/processing-system";
import {
  checkGatherTool,
  gatherInterval,
  gatherQuantity,
  requiredToolKind,
  superGatherCooldown,
  superGatherCost,
} from "$lib/domain/gathering/gather-system";
import { rollGatherWound } from "$lib/domain/gathering/gather-risk";
import { applyStatusEffect } from "$lib/domain/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import type { InventoryEffect } from "$lib/domain/items/item-effects";

const INTERACT_RANGE = 2;

export class InteractionResource {
  public gatherInterval = 0.6;
  public gatherCooldownTimer = 0;
  public currentGatherInterval = 0.6;
  public superGatherCooldown = 2.0;
  public superGatherCooldownTimer = 0;
  public superGatherStaminaCost = 35;
  public triggerSuperGatherNextSwing = false;
  public gatheringTarget: Entity | null = null;
  public currentTarget: Entity | null = null;
  public nodeKinds = new Map<string, "tree" | "ore" | "twig" | "stone">();
  public campfireRefuelTimer = 0;
  public campfireHeatRadius = 3.5;
  public campfireSprite: AnimatedSprite | null = null;
  public refuelPendingConfirm = false;
  public refuelConfirmTimer = 0;
  /** Active item process (boiling, smelting); null when nothing is processing. */
  public activeProcess: {
    itemId: string;
    effect: InventoryEffect;
    remainingSec: number;
    bubbleTimer: number;
  } | null = null;
}


/** Tints a node's sprite to mark it as the active target (or clears it). */
export function setHighlight(
  entity: Entity | null,
  on: boolean,
  entitySprites: Map<string, Container>
): void {
  const sprite = entity && entitySprites.get(entity.id);
  if (sprite) {
    sprite.tint = on ? Colors.vfx.highlight : Colors.ui.white;
  }
}

/**
 * Resolves the interaction target from the mouse cursor position.
 * The target is the interactable entity whose tile is under the cursor AND
 * within INTERACT_RANGE tiles of the player. Also updates `facing` to the
 * direction from player to mouse.
 */
export function updateTargetSystem(
  world: World<Entity>,
  inputs: InputResource,
  map: MapResource,
  interaction: InteractionResource,
  playerEntity: Entity,
  entitySprites: Map<string, Container>,
  isPlacementMode: boolean,
  setFacing: (f: { x: number; y: number }) => void
): void {
  if (isPlacementMode) {
    setHighlight(interaction.currentTarget, false, entitySprites);
    interaction.currentTarget = null;
    return;
  }

  const pos = playerEntity.position!;
  const playerCx = pos.x + TILE / 2;
  const playerCy = pos.y + TILE / 2;

  // Update facing from mouse direction (>=4px dead-zone avoids centre jitter).
  const dx = inputs.mouseWorld.x - playerCx;
  const dy = inputs.mouseWorld.y - playerCy;
  if (dx * dx + dy * dy > 16) {
    setFacing({ x: dx > 0 ? 1 : -1, y: dy > 0 ? 1 : -1 });
  }

  // Find entity at mouse tile within INTERACT_RANGE (Chebyshev distance).
  const mx = Math.floor(inputs.mouseWorld.x / TILE);
  const my = Math.floor(inputs.mouseWorld.y / TILE);
  const px = Math.floor(playerCx / TILE);
  const py = Math.floor(playerCy / TILE);
  const inRange = Math.max(Math.abs(mx - px), Math.abs(my - py)) <= INTERACT_RANGE;

  const target = inRange
    ? (world
        .with("interactable", "position")
        .entities.find(
          (e: Entity) =>
            Math.floor(e.position!.x / TILE) === mx && Math.floor(e.position!.y / TILE) === my
        ) ?? null)
    : null;

  if (target === interaction.currentTarget) return;
  setHighlight(interaction.currentTarget, false, entitySprites);
  setHighlight(target, true, entitySprites);
  interaction.currentTarget = target;
}

/**
 * Triggers a double-tap E super-gather action.
 */
export function triggerSuperGatherSystem(
  interaction: InteractionResource,
  vfx: VFXResource,
  playerEntity: Entity,
  entityLayer: Container,
  zeroCooldowns: boolean
): void {
  if (interaction.triggerSuperGatherNextSwing) return; // already queued
  if (!zeroCooldowns && interaction.superGatherCooldownTimer > 0) return;

  const sgLevel = rpgState.skills?.superGather?.level ?? 1;
  const currentCost = superGatherCost(interaction.superGatherStaminaCost, sgLevel);

  if (stamina.current < currentCost) {
    spawnEnvFloatingText(vfx, "⚡️ Out of Stamina!", Colors.ui.error, playerEntity.position!, entityLayer);
    return;
  }

  spendStamina(currentCost, "burst");

  const currentCooldown = superGatherCooldown(interaction.superGatherCooldown, sgLevel);
  interaction.superGatherCooldownTimer = currentCooldown;

  interaction.triggerSuperGatherNextSwing = true;
  interaction.gatherCooldownTimer = 0; // Trigger first swing immediately
  spawnEnvFloatingText(vfx, "⚡ SUPER GATHER! ⚡", Colors.vfx.superGather, playerEntity.position!, entityLayer);
  playClinkSound();
}

/**
 * Handles hit visual feedback (squash, shake, hit flash, particles, floating texts).
 */
export function handleHitFeedbackSystem(
  entity: Entity,
  yieldName: string,
  quantity: number,
  interaction: InteractionResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  getParticleFXFrames: (name: any) => any[],
  getWoodItemTexture: () => any
): void {
  const isTree = interaction.nodeKinds.get(entity.id) === "tree";

  if (isTree) {
    playChopSound();
  } else {
    playClinkSound();
  }

  const sprite = entitySprites.get(entity.id);
  if (sprite && entity.position) {
    if (!vfx.baseScales.has(entity.id)) {
      vfx.baseScales.set(entity.id, { x: Math.abs(sprite.scale.x), y: sprite.scale.y });
    }

    sprite.scale.y = sprite.scale.y * 0.82;
    sprite.scale.x = sprite.scale.x * 1.18;

    vfx.activeShakes.set(entity.id, { duration: 0.22, time: 0, xOffset: 0 });
    triggerCameraShake(vfx, 2.5, 0.1);

    // Hit flash
    const oldFlash = vfx.hitFlashes.get(entity.id);
    if (oldFlash) {
      entityLayer.removeChild(oldFlash.graphic);
      oldFlash.graphic.destroy();
    }
    const flashG = new Graphics();
    flashG.rect(-TILE * 0.45, -TILE, TILE * 0.9, TILE).fill({ color: Colors.vfx.hitFlash, alpha: 0.55 });
    flashG.blendMode = "add";
    flashG.x = entity.position.x + TILE / 2;
    flashG.y = entity.position.y + TILE;
    entityLayer.addChild(flashG);
    vfx.hitFlashes.set(entity.id, { graphic: flashG, timer: 0.08 });

    // Floating text
    const contactX = entity.position.x + TILE / 2;
    const contactY = entity.position.y + TILE * 0.5;

    const isSuper = quantity > 1;
    const textStyle = new TextStyle({
      fontFamily: "monospace",
      fontSize: isSuper ? 22 : 15,
      fontWeight: "bold",
      fill: isSuper ? Colors.resource.superText : isTree ? Colors.resource.wood : Colors.resource.ore,
      stroke: { color: Colors.ui.stroke, width: isSuper ? 4 : 3 },
    });
    const textObj = new Text({ text: `+${quantity} ${yieldName}`, style: textStyle });
    textObj.anchor.set(0.5, 0.5);
    textObj.x = contactX + (isSuper ? (Math.random() - 0.5) * 10 : 0);
    textObj.y = entity.position.y - 12;

    vfx.floatingTexts.push({
      textObj,
      vx: isSuper ? (Math.random() - 0.5) * 15 : 0,
      vy: isSuper ? -65 : -45,
      life: 0,
      maxLife: isSuper ? 0.95 : 0.75,
    });
    entityLayer.addChild(textObj);

    // Sprite particle puffs
    const fxFrames = getParticleFXFrames(isTree ? "dust1" : "dust2");
    const fxCount = isSuper ? 4 : 2;
    for (let i = 0; i < fxCount; i++) {
      const ps = new AnimatedSprite(fxFrames);
      ps.animationSpeed = 0.18 + Math.random() * 0.12;
      ps.loop = false;
      ps.play();
      ps.anchor.set(0.5, 0.5);
      ps.scale.set(0.28 + Math.random() * 0.2);
      ps.x = contactX + (Math.random() - 0.5) * 20;
      ps.y = contactY + (Math.random() - 0.5) * 14;
      const angle = (Math.random() - 0.5) * Math.PI * 0.8 - Math.PI / 2;
      const spd = 30 + Math.random() * 50;
      vfx.spriteParticles.push({
        sprite: ps,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        gravity: 120,
        life: 0,
        maxLife: 0.42 + Math.random() * 0.22,
      });
      entityLayer.addChild(ps);
    }

    // Debris graphic particles
    let particleColor: number = isTree ? Colors.particle.woodDebris : Colors.particle.oreDebris;
    let isSpark = false;
    let isFlake = false;
    let isStar = false;

    if (!isTree) {
      const lowerYield = yieldName.toLowerCase();
      if (lowerYield.includes("copper")) {
        particleColor = 0xf97316; // orange/copper
        isSpark = true;
      } else if (lowerYield.includes("iron")) {
        particleColor = 0x475569; // slate/iron grey
        isFlake = true;
      } else if (lowerYield.includes("silver")) {
        particleColor = 0xe2e8f0; // bright white/silver
        isStar = true;
      }
    }

    const pCount = isSuper ? 24 : 12;
    for (let i = 0; i < pCount; i++) {
      const g = new Graphics();
      if (isTree) {
        g.rect(-2.5, -1.5, 5, 3).fill(particleColor);
      } else if (isSpark) {
        // Shiny copper sparks (diamond)
        g.moveTo(-3, 0);
        g.lineTo(0, -2);
        g.lineTo(3, 0);
        g.lineTo(0, 2);
        g.closePath();
        g.fill(particleColor);
      } else if (isFlake) {
        // Dark metallic steel flakes (irregular rectangle)
        g.rect(-2, -2, 4, 3).fill(particleColor);
      } else if (isStar) {
        // Bright white glinting stars (4-point star)
        g.moveTo(0, -4);
        g.lineTo(1, -1);
        g.lineTo(4, 0);
        g.lineTo(1, 1);
        g.lineTo(0, 4);
        g.lineTo(-1, 1);
        g.lineTo(-4, 0);
        g.lineTo(-1, -1);
        g.closePath();
        g.fill(particleColor);
      } else {
        g.circle(0, 0, 2).fill(particleColor);
      }
      g.x = contactX + (Math.random() - 0.5) * 12;
      g.y = contactY + (Math.random() - 0.5) * 12;

      const angle = (Math.random() - 0.5) * Math.PI * 0.6 - Math.PI / 2;
      const speed = 70 + Math.random() * 110;
      vfx.particles.push({
        graphic: g,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 280,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
      });
      entityLayer.addChild(g);
    }
  }
}

/**
 * Removes a depleted node and creates depletion particles, falling sprites, or sounds.
 */
export function depleteNodeSystem(
  world: World<Entity>,
  entity: Entity,
  interaction: InteractionResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  triggerQuestEvent: (evt: string, val?: any) => void,
  getTreeFrames: () => any[],
  getStumpTexture: () => any
): void {
  const pos = entity.position!;
  const gx = Math.round(pos.x / TILE);
  const gy = Math.round(pos.y / TILE);
  const wasTree = interaction.nodeKinds.get(entity.id) === "tree";
  if (wasTree) {
    triggerQuestEvent(GameEvent.Harvest, entity.resource?.drop);
  }

  const sprite = entitySprites.get(entity.id);
  if (sprite) {
    entityLayer.removeChild(sprite);
    sprite.destroy();
    entitySprites.delete(entity.id);
  }
  world.remove(entity);
  interaction.nodeKinds.delete(entity.id);
  vfx.activeShakes.delete(entity.id);
  vfx.baseScales.delete(entity.id);

  if (interaction.currentTarget === entity) {
    interaction.currentTarget = null;
  }

  // Spray particles
  const burstCount = 22 + Math.floor(Math.random() * 10);
  const burstColor = wasTree ? Colors.particle.treeBurst : Colors.particle.oreBurst;
  for (let i = 0; i < burstCount; i++) {
    const g = new Graphics();
    if (wasTree) {
      g.rect(-3, -2, 6, 4).fill(burstColor);
    } else {
      g.circle(0, 0, 2.5).fill(burstColor);
    }
    g.x = pos.x + TILE / 2 + (Math.random() - 0.5) * 32;
    g.y = pos.y + TILE * 0.65;
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 150;
    vfx.particles.push({
      graphic: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 40,
      gravity: 300,
      life: 0,
      maxLife: 0.55 + Math.random() * 0.4,
    });
    entityLayer.addChild(g);
  }

  // Shockwave ring
  const ringG = new Graphics();
  ringG.x = pos.x + TILE / 2;
  ringG.y = pos.y + TILE;
  entityLayer.addChild(ringG);
  vfx.shockwaveRings.push({
    graphic: ringG,
    life: 0,
    maxLife: 0.35,
    color: wasTree ? Colors.particle.treeRing : Colors.particle.oreRing,
  });

  triggerCameraShake(vfx, 5, 0.18);

  if (wasTree) {
    playFallSound();

    const fallFrames = getTreeFrames().slice(1);
    const fallingSprite = new AnimatedSprite(fallFrames);
    fallingSprite.anchor.set(0.5, 1);
    fallingSprite.x = gx * TILE + TILE / 2;
    fallingSprite.y = gy * TILE + TILE;
    fallingSprite.scale.set((TILE * 1.5) / 256);
    fallingSprite.loop = false;
    fallingSprite.animationSpeed = 0.16;

    fallingSprite.onComplete = () => {
      const stump = new Sprite(getStumpTexture());
      stump.anchor.set(0.5, 1);
      stump.x = gx * TILE + TILE / 2;
      stump.y = gy * TILE + TILE;
      stump.width = TILE * 0.8;
      stump.height = TILE * 0.8;
      entityLayer.addChild(stump);

      entityLayer.removeChild(fallingSprite);
      fallingSprite.destroy();
    };

    entityLayer.addChild(fallingSprite);
    fallingSprite.play();
  } else {
    playDepleteSound();
  }
}

/**
 * Handles immediate interactions (pickups, refuels, talking).
 */
export function triggerImmediateInteraction(
  world: World<Entity>,
  target: Entity,
  interaction: InteractionResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  playerSprite: AnimatedSprite,
  triggerQuestEvent: (evt: string, arg?: any, arg2?: any) => void,
  dialogueState: any,
  getTreeFrames: () => any[],
  getStumpTexture: () => any
): void {
  const action = target.interactable?.action;
  if (!action) return;

  if (action === "pickup") {
    const baseScale = (TILE * 1.1) / 192;
    playerSprite.scale.y = baseScale * 0.75;
    setTimeout(() => {
      playerSprite.scale.y = baseScale;
    }, 150);

    playPickupSound();

    if (target.pickup) {
      const item = target.pickup.itemId;
      const qty = target.pickup.qty;

      void syncPickup(item, target.id).then((r) => {
        if (r.ok) setRpgState(r.data.playerState);
      });

      const itemName = getItemDef(item)?.name ?? item;
      const playerEntity = getPlayerEntity();
      spawnEnvFloatingText(vfx, `+${qty} ${itemName}`, Colors.resource.gold, playerEntity.position!, entityLayer);
      triggerQuestEvent(GameEvent.Pickup, item, qty);
    }

    depleteNodeSystem(
      world,
      target,
      interaction,
      vfx,
      entityLayer,
      entitySprites,
      triggerQuestEvent,
      getTreeFrames,
      getStumpTexture
    );
  } else if (action === "refuel") {
    const playerEntity = getPlayerEntity();

    // Processing takes the first interaction when the player carries processable
    // items: it costs nothing, can't fail, and is the core loop's reason to
    // visit the station. A second interaction (while processing) reaches refuel.
    const processable =
      !interaction.activeProcess && !interaction.refuelPendingConfirm && rpgState.inventory
        ? findProcessableItem(rpgState.inventory, { kind: "campfire", ambientTemp: 100 })
        : null;

    if (processable) {
      interaction.activeProcess = {
        itemId: processable.itemId,
        effect: processable.effect,
        remainingSec: processable.durationSec,
        bubbleTimer: 0,
      };
      playWaterBubble();
      const itemName = getItemDef(processable.itemId)?.name ?? processable.itemId;
      spawnEnvFloatingText(
        vfx,
        `💧 Boiling ${itemName}...`,
        Colors.vfx.campfireMsg,
        playerEntity.position!,
        entityLayer
      );
      return;
    }


    const woodQty = getItemQty("oak_wood");
    if (woodQty >= 5) {
      if (!interaction.refuelPendingConfirm) {
        interaction.refuelPendingConfirm = true;
        interaction.refuelConfirmTimer = 2.5;
        spawnEnvFloatingText(
          vfx,
          "🔥 Interact again to Confirm Refuel (5x Wood)",
          Colors.vfx.campfireMsg,
          playerEntity.position!,
          entityLayer
        );
        return;
      }

      interaction.refuelPendingConfirm = false;
      interaction.refuelConfirmTimer = 0;

      void syncRefuel().then((r) => {
        if (r.ok) setRpgState(r.data.playerState);
      });

      playCraftSound();

      interaction.campfireHeatRadius = 7.0;
      interaction.campfireRefuelTimer = 60.0;
      if (interaction.campfireSprite) {
        interaction.campfireSprite.scale.set((TILE * 1.3) / 48);
      }
      spawnEnvParticles(vfx, Colors.vfx.campfire, 25, "smoke", playerEntity.position!, entityLayer);
      spawnEnvFloatingText(
        vfx,
        "🔥 Campfire refueled! Heat radius extended.",
        Colors.resource.gold,
        playerEntity.position!,
        entityLayer
      );

      triggerQuestEvent(GameEvent.Refuel);
    } else {
      spawnEnvFloatingText(
        vfx,
        "❌ Needs 5x Oak Wood to refuel",
        Colors.ui.error,
        playerEntity.position!,
        entityLayer
      );
    }
  } else if (action === "talk") {
    dialogueState.activeNpc = {
      id: target.id,
      name: target.interactable?.name ?? "NPC",
    };

    triggerQuestEvent(GameEvent.Talk, target.id);
  }
}

/**
 * Runs the gather timers, auto-gathering loop, and handles interactions tick.
 */
export function runInteractionSystem(
  world: World<Entity>,
  inputs: InputResource,
  interaction: InteractionResource,
  vfx: VFXResource,
  dt: number,
  playerSprite: AnimatedSprite,
  setPlayerAnim: (state: "idle" | "run" | "attack") => void,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  onInteract: (target: Entity) => void,
  devConsoleLog: (text: string) => void,
  triggerQuestEvent: (evt: string, arg?: any, arg2?: any) => void,
  dialogueState: any,
  getParticleFXFrames: (name: any) => any[],
  getWoodItemTexture: () => any,
  getTreeFrames: () => any[],
  getStumpTexture: () => any,
  isPlacementMode: boolean,
  isDashing: boolean,
  onHit: (entity: Entity, yieldName: string, quantity: number) => void
): void {
  if (interaction.campfireRefuelTimer > 0) {
    interaction.campfireRefuelTimer -= dt;
    if (interaction.campfireRefuelTimer <= 0) {
      interaction.campfireHeatRadius = 3.5;
      if (interaction.campfireSprite) {
        interaction.campfireSprite.scale.set((TILE * 0.8) / 48);
      }
      const playerEntity = getPlayerEntity();
      spawnEnvFloatingText(
        vfx,
        "🔥 Campfire heat starts to fade...",
        Colors.ui.warning,
        playerEntity.position!,
        entityLayer
      );
    }
  }

  // Advance an active process; walking out of the heat cancels it.
  if (interaction.activeProcess) {
    const playerEntity = getPlayerEntity();
    const campfire = world.with("position").entities.find((e) => e.id === EntityId.Campfire);
    let inHeat = true;
    if (campfire?.position && playerEntity.position) {
      const dx = (campfire.position.x - playerEntity.position.x) / TILE;
      const dy = (campfire.position.y - playerEntity.position.y) / TILE;
      inHeat = Math.hypot(dx, dy) <= interaction.campfireHeatRadius;
    }

    if (!inHeat) {
      spawnEnvFloatingText(
        vfx,
        "💧 Process interrupted.",
        Colors.ui.muted,
        playerEntity.position!,
        entityLayer
      );
      interaction.activeProcess = null;
    } else {
      const proc = interaction.activeProcess;
      proc.remainingSec -= dt;
      proc.bubbleTimer -= dt;
      if (proc.bubbleTimer <= 0 && campfire?.position) {
        proc.bubbleTimer = 0.8;
        spawnEnvParticles(vfx, Colors.vfx.smoke, 4, "smoke", campfire.position, entityLayer);
        playWaterBubble();
      }
      if (proc.remainingSec <= 0) {
        if (rpgState.inventory) {
          const next = resolveProcessingCompletion(
            rpgState.inventory,
            proc.itemId,
            proc.effect,
            1,
            Math.random
          );
          if (next !== rpgState.inventory) {
            rpgState.inventory = next;
            const resultName =
              proc.effect.kind === "transform"
                ? getItemDef(proc.effect.into)?.name ?? proc.effect.into
                : "Result";
            spawnEnvFloatingText(
              vfx,
              `💧 Process complete: ${resultName}`,
              Colors.ui.success,
              playerEntity.position!,
              entityLayer
            );
            playCraftSound();

            if (proc.effect.kind === "transform") {
              triggerQuestEvent(GameEvent.Boil, proc.effect.into);
            }
          } else {
            spawnEnvFloatingText(
              vfx,
              "💧 The materials are gone.",
              Colors.ui.muted,
              playerEntity.position!,
              entityLayer
            );
          }
        }
        interaction.activeProcess = null;
      }
    }
  }


  // Decay refuel confirm timer and reset state on timeout
  if (interaction.refuelPendingConfirm) {
    interaction.refuelConfirmTimer -= dt;
    if (interaction.refuelConfirmTimer <= 0) {
      interaction.refuelPendingConfirm = false;
      const playerEntity = getPlayerEntity();
      spawnEnvFloatingText(
        vfx,
        "🔥 Refuel cancelled",
        Colors.ui.muted,
        playerEntity.position!,
        entityLayer
      );
    }
  }

  // Cancel refuel confirmation if player moves, dashes, or target changes
  if (interaction.refuelPendingConfirm) {
    const moving =
      inputs.isActionPressed(InputAction.MoveUp) ||
      inputs.isActionPressed(InputAction.MoveDown) ||
      inputs.isActionPressed(InputAction.MoveLeft) ||
      inputs.isActionPressed(InputAction.MoveRight) ||
      isDashing;

    if (moving || interaction.currentTarget?.id !== EntityId.Campfire) {
      interaction.refuelPendingConfirm = false;
      interaction.refuelConfirmTimer = 0;
    }
  }

  if (isPlacementMode) {
    interaction.gatheringTarget = null;
    interaction.gatherCooldownTimer = 0;
    return;
  }

  if (interaction.gatherCooldownTimer > 0) {
    interaction.gatherCooldownTimer -= dt;
  }
  if (interaction.superGatherCooldownTimer > 0) {
    interaction.superGatherCooldownTimer -= dt;
  }

  if (inputs.superGatherTriggered) {
    inputs.superGatherTriggered = false;
    const playerEntity = getPlayerEntity();
    triggerSuperGatherSystem(
      interaction,
      vfx,
      playerEntity,
      entityLayer,
      rpgState.profile === null
    );
  }

  // Cancel gathering if moving, dashing, or target changes/depletes
  if (interaction.gatheringTarget !== null) {
    const moving =
      inputs.isActionPressed(InputAction.MoveUp) ||
      inputs.isActionPressed(InputAction.MoveDown) ||
      inputs.isActionPressed(InputAction.MoveLeft) ||
      inputs.isActionPressed(InputAction.MoveRight) ||
      isDashing; // Inputs dash active

    if (moving || interaction.currentTarget !== interaction.gatheringTarget) {
      interaction.gatheringTarget = null;
    }
  }

  const wantsInteract = inputs.isActionPressed(InputAction.Harvest) || inputs.pendingInteract;
  inputs.pendingInteract = false;

  if (wantsInteract && interaction.gatheringTarget === null) {
    const target = interaction.currentTarget;
    if (target) {
      if (target.resource) {
        const res = target.resource;
        if (res.rpgLocationId && res.rpgAction) {
          const weaponId = getEquippedWeaponId();
          const expectedKind = requiredToolKind(res.rpgAction);

          const spawnFailText = (msg: string) => {
            const playerEntity = getPlayerEntity();
            const textStyle = new TextStyle({
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: "bold",
              fill: Colors.ui.error,
              stroke: { color: Colors.ui.stroke, width: 3 },
            });
            const textObj = new Text({ text: msg, style: textStyle });
            textObj.anchor.set(0.5, 1);
            textObj.x = playerEntity.position!.x + TILE / 2;
            textObj.y = playerEntity.position!.y;
            vfx.floatingTexts.push({ textObj, vx: 0, vy: -28, life: 0, maxLife: 0.6 });
            entityLayer.addChild(textObj);
          };

          const gate = checkGatherTool(weaponId, expectedKind);
          if (!gate.ok) {
            const detail =
              gate.reason === "no_tool"
                ? `No tool equipped! Equip a ${expectedKind} first.`
                : `Wrong tool! Equip an ${expectedKind} to harvest this.`;
            devConsoleLog(`[Error] ${detail}`);
            spawnFailText(`need ${expectedKind}`);
            onInteract(target);
            interaction.gatherCooldownTimer = interaction.gatherInterval;
            return;
          }
        }

        interaction.gatheringTarget = target;
        const isTree = interaction.nodeKinds.get(target.id) === "tree";
        const skillKey = isTree ? SkillKey.Lumberjacking : SkillKey.Mining;
        const skillLevel = rpgState.skills?.[skillKey]?.level ?? 1;
        interaction.currentGatherInterval = gatherInterval(interaction.gatherInterval, skillLevel);
        interaction.gatherCooldownTimer = 0;
      } else {
        triggerImmediateInteraction(
          world,
          target,
          interaction,
          vfx,
          entityLayer,
          entitySprites,
          playerSprite,
          triggerQuestEvent,
          dialogueState,
          getTreeFrames,
          getStumpTexture
        );
      }
    }
  }

  // Execute active auto-gathering tick
  if (interaction.gatheringTarget !== null) {
    if (interaction.gatherCooldownTimer <= 0) {
      const target = interaction.gatheringTarget;
      const res = target.resource;

      const playerEntity = getPlayerEntity();
      if (playerEntity.position && target.position) {
        const dx = target.position.x - playerEntity.position.x;
        if (dx < 0) {
          playerSprite.scale.x = -Math.abs(playerSprite.scale.x);
        } else if (dx > 0) {
          playerSprite.scale.x = Math.abs(playerSprite.scale.x);
        }
      }

      setPlayerAnim("attack");

      const isTree = interaction.nodeKinds.get(target.id) === "tree";
      const skillKey = isTree ? SkillKey.Lumberjacking : SkillKey.Mining;
      const skillLevel = rpgState.skills?.[skillKey]?.level ?? 1;
      const scaledInterval = gatherInterval(interaction.gatherInterval, skillLevel);
      interaction.currentGatherInterval = scaledInterval;
      interaction.gatherCooldownTimer = scaledInterval;

      const isSuper = interaction.triggerSuperGatherNextSwing;
      interaction.triggerSuperGatherNextSwing = false;

      const quantity = gatherQuantity(isSuper);
      const dropName = res?.drop ?? "resource";

      onHit(target, dropName, quantity);

      // Bare-hand gathering (forage nodes with no tool requirement) can wound.
      // Tool-gated nodes always have a tool here, so they never trigger this.
      const wound = rollGatherWound({
        hasTool: !!getEquippedWeaponId(),
        nodeKind: interaction.nodeKinds.get(target.id) ?? "forage",
      });
      if (wound) {
        applyStatusEffect(wound.status, wound.durationSec, "hazard:gather");
        spawnEnvFloatingText(
          vfx,
          wound.status === StatusId.Cut ? "🩸 Cut!" : "🩸 Bleeding!",
          Colors.ui.error,
          getPlayerEntity().position!,
          entityLayer,
        );
      }

      // Award XP. awardSkillXp no-ops if a skill isn't loaded, so no guard needed.
      const xpPos = getPlayerEntity().position!;
      awardSkillXp(isTree ? SkillKey.Lumberjacking : SkillKey.Mining, 10, vfx, xpPos, entityLayer);
      if (isSuper) {
        awardSkillXp(SkillKey.SuperGather, 15, vfx, xpPos, entityLayer);
      }

      if (res) {
        res.hp -= quantity;
        if (res.hp <= 0) {
          devConsoleLog(`${target.interactable?.name ?? target.id} depleted`);
          depleteNodeSystem(
            world,
            target,
            interaction,
            vfx,
            entityLayer,
            entitySprites,
            triggerQuestEvent,
            getTreeFrames,
            getStumpTexture
          );
          interaction.gatheringTarget = null;
        }
      }

      // Backend sync (persists yields + tool durability).
      if (res && res.rpgLocationId && res.rpgAction) {
        void syncGather(res.rpgAction, res.rpgLocationId, isSuper).then((r) => {
          if (r.ok) {
            setRpgState(r.data.playerState);
            for (const mat of r.data.materialsGained) {
              devConsoleLog(`gathered ${mat.id} (+${mat.quantity})`);
            }
            if (r.data.toolBroken) {
              devConsoleLog(`[Warning] Your equipped tool broke!`);
            }
          } else {
            devConsoleLog(`[Error] Gathering failed: ${r.error}`);
          }
        });
      }
    }
  }
}
