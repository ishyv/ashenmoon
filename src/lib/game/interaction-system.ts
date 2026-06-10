import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "./ecs-miniplex";
import type { InputResource } from "./input";
import { TILE, type MapResource } from "./map";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
  triggerCameraShake,
} from "./vfx";
import { Cell } from "./types";
import {
  playChopSound,
  playClinkSound,
  playPickupSound,
  playCraftSound,
  playFallSound,
  playDepleteSound,
} from "./audio-synthesis";
import { rpgState, setRpgState, ITEM_METADATA } from "./rpg-state.svelte";
import { spendStamina, stamina } from "./stamina.svelte";

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
}

/** Tints a node's sprite to mark it as the active target (or clears it). */
export function setHighlight(
  entity: Entity | null,
  on: boolean,
  entitySprites: Map<string, Container>
): void {
  const sprite = entity && entitySprites.get(entity.id);
  if (sprite) {
    sprite.tint = on ? 0xffe9a8 : 0xffffff;
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
  const currentCost = Math.max(15, interaction.superGatherStaminaCost - (sgLevel - 1) * 2);

  if (stamina.current < currentCost) {
    spawnEnvFloatingText(vfx, "⚡️ Out of Stamina!", 0xff5555, playerEntity.position!, entityLayer);
    return;
  }

  spendStamina(currentCost, "burst");

  const currentCooldown = Math.max(0.5, interaction.superGatherCooldown - (sgLevel - 1) * 0.15);
  interaction.superGatherCooldownTimer = currentCooldown;

  interaction.triggerSuperGatherNextSwing = true;
  interaction.gatherCooldownTimer = 0; // Trigger first swing immediately
  spawnEnvFloatingText(vfx, "⚡ SUPER GATHER! ⚡", 0xffa500, playerEntity.position!, entityLayer);
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
    flashG.rect(-TILE * 0.45, -TILE, TILE * 0.9, TILE).fill({ color: 0xffffff, alpha: 0.55 });
    (flashG as any).blendMode = "add";
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
      fill: isSuper ? 0xffc84a : isTree ? 0xd4ffc8 : 0xffe0a0,
      stroke: { color: 0x000000, width: isSuper ? 4 : 3 },
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
    const particleColor = isTree ? 0x9c704c : 0xffa500;
    const pCount = isSuper ? 24 : 12;
    for (let i = 0; i < pCount; i++) {
      const g = new Graphics();
      if (isTree) {
        g.rect(-2.5, -1.5, 5, 3).fill(particleColor);
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
    triggerQuestEvent("harvest", entity.resource?.drop);
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
  const burstColor = wasTree ? 0x6aaa44 : 0xb8b8c8;
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
    color: wasTree ? 0x88cc44 : 0xccccdd,
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

      fetch("/api/rpg/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pickup",
          locationId: item,
          pickupId: target.id,
        }),
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            setRpgState(data.playerState);
          }
        })
        .catch((err) => {
          console.error("Pickup sync failed:", err);
        });

      const itemName = ITEM_METADATA[item]?.name ?? item;
      const playerEntity = world.entities.find((e) => e.id === "player")!;
      spawnEnvFloatingText(vfx, `+${qty} ${itemName}`, 0xffdc78, playerEntity.position!, entityLayer);
      triggerQuestEvent("pickup", item, qty);
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
    const slots = rpgState.inventory?.slots;
    const woodQty = slots && slots.oak_wood && "qty" in slots.oak_wood ? slots.oak_wood.qty : 0;
    const playerEntity = world.entities.find((e) => e.id === "player")!;
    if (woodQty >= 5) {
      if (!interaction.refuelPendingConfirm) {
        interaction.refuelPendingConfirm = true;
        interaction.refuelConfirmTimer = 2.5;
        spawnEnvFloatingText(
          vfx,
          "🔥 Interact again to Confirm Refuel (5x Wood)",
          0xffe066,
          playerEntity.position!,
          entityLayer
        );
        return;
      }
      
      interaction.refuelPendingConfirm = false;
      interaction.refuelConfirmTimer = 0;

      fetch("/api/rpg/gather", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refuel",
          locationId: "campfire",
        }),
      })
        .then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            setRpgState(data.playerState);
          }
        })
        .catch((err) => {
          console.error("Refuel sync failed:", err);
        });

      playCraftSound();

      interaction.campfireHeatRadius = 7.0;
      interaction.campfireRefuelTimer = 60.0;
      if (interaction.campfireSprite) {
        interaction.campfireSprite.scale.set((TILE * 1.3) / 48);
      }
      spawnEnvParticles(vfx, 0xff6600, 25, "smoke", playerEntity.position!, entityLayer);
      spawnEnvFloatingText(
        vfx,
        "🔥 Campfire refueled! Heat radius extended.",
        0xffdc78,
        playerEntity.position!,
        entityLayer
      );

      triggerQuestEvent("refuel");
    } else {
      spawnEnvFloatingText(
        vfx,
        "❌ Needs 5x Oak Wood to refuel",
        0xff3333,
        playerEntity.position!,
        entityLayer
      );
    }
  } else if (action === "talk") {
    dialogueState.activeNpc = {
      id: target.id,
      name: target.interactable?.name ?? "NPC",
    };

    triggerQuestEvent("talk", target.id);
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
      const playerEntity = world.entities.find((e) => e.id === "player")!;
      spawnEnvFloatingText(
        vfx,
        "🔥 Campfire heat starts to fade...",
        0xffaa55,
        playerEntity.position!,
        entityLayer
      );
    }
  }

  // Decay refuel confirm timer and reset state on timeout
  if (interaction.refuelPendingConfirm) {
    interaction.refuelConfirmTimer -= dt;
    if (interaction.refuelConfirmTimer <= 0) {
      interaction.refuelPendingConfirm = false;
      const playerEntity = world.entities.find((e) => e.id === "player")!;
      spawnEnvFloatingText(
        vfx,
        "🔥 Refuel cancelled",
        0xaaaaaa,
        playerEntity.position!,
        entityLayer
      );
    }
  }

  // Cancel refuel confirmation if player moves, dashes, or target changes
  if (interaction.refuelPendingConfirm) {
    const moving =
      inputs.isActionPressed("MOVE_UP") ||
      inputs.isActionPressed("MOVE_DOWN") ||
      inputs.isActionPressed("MOVE_LEFT") ||
      inputs.isActionPressed("MOVE_RIGHT") ||
      isDashing;

    if (moving || interaction.currentTarget?.id !== "campfire") {
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
    const playerEntity = world.entities.find((e) => e.id === "player")!;
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
      inputs.isActionPressed("MOVE_UP") ||
      inputs.isActionPressed("MOVE_DOWN") ||
      inputs.isActionPressed("MOVE_LEFT") ||
      inputs.isActionPressed("MOVE_RIGHT") ||
      isDashing; // Inputs dash active

    if (moving || interaction.currentTarget !== interaction.gatheringTarget) {
      interaction.gatheringTarget = null;
    }
  }

  const wantsInteract = inputs.isActionPressed("HARVEST") || inputs.pendingInteract;
  inputs.pendingInteract = false;

  if (wantsInteract && interaction.gatheringTarget === null) {
    const target = interaction.currentTarget;
    if (target) {
      if (target.resource) {
        const res = target.resource;
        if (res.rpgLocationId && res.rpgAction) {
          const weapon = rpgState.profile?.loadout?.weapon;
          const expectedKind = res.rpgAction === "mine" ? "pickaxe" : "axe";

          const spawnFailText = (msg: string) => {
            const playerEntity = world.entities.find((e) => e.id === "player")!;
            const textStyle = new TextStyle({
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: "bold",
              fill: 0xff5555,
              stroke: { color: 0x000000, width: 3 },
            });
            const textObj = new Text({ text: msg, style: textStyle });
            textObj.anchor.set(0.5, 1);
            textObj.x = playerEntity.position!.x + TILE / 2;
            textObj.y = playerEntity.position!.y;
            vfx.floatingTexts.push({ textObj, vx: 0, vy: -28, life: 0, maxLife: 0.6 });
            entityLayer.addChild(textObj);
          };

          if (!weapon) {
            devConsoleLog(`[Error] No tool equipped! Equip a ${expectedKind} first.`);
            spawnFailText(`need ${expectedKind}`);
            onInteract(target);
            interaction.gatherCooldownTimer = interaction.gatherInterval;
            return;
          }

          const itemId = typeof weapon === "string" ? weapon : weapon.itemId;
          const isAxe = itemId.includes("axe");
          const isPickaxe = itemId.includes("pickaxe");
          if ((expectedKind === "axe" && !isAxe) || (expectedKind === "pickaxe" && !isPickaxe)) {
            devConsoleLog(`[Error] Wrong tool! Equip an ${expectedKind} to harvest this.`);
            spawnFailText(`need ${expectedKind}`);
            onInteract(target);
            interaction.gatherCooldownTimer = interaction.gatherInterval;
            return;
          }
        }

        interaction.gatheringTarget = target;
        const isTree = interaction.nodeKinds.get(target.id) === "tree";
        const skillKey = isTree ? "lumberjacking" : "mining";
        const skillLevel = rpgState.skills?.[skillKey]?.level ?? 1;
        interaction.currentGatherInterval = Math.max(0.15, interaction.gatherInterval * Math.pow(0.95, skillLevel - 1));
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

      const playerEntity = world.entities.find((e) => e.id === "player");
      if (playerEntity?.position && target.position) {
        const dx = target.position.x - playerEntity.position.x;
        if (dx < 0) {
          playerSprite.scale.x = -Math.abs(playerSprite.scale.x);
        } else if (dx > 0) {
          playerSprite.scale.x = Math.abs(playerSprite.scale.x);
        }
      }

      setPlayerAnim("attack");

      const isTree = interaction.nodeKinds.get(target.id) === "tree";
      const skillKey = isTree ? "lumberjacking" : "mining";
      const skillLevel = rpgState.skills?.[skillKey]?.level ?? 1;
      const scaledInterval = Math.max(0.15, interaction.gatherInterval * Math.pow(0.95, skillLevel - 1));
      interaction.currentGatherInterval = scaledInterval;
      interaction.gatherCooldownTimer = scaledInterval;

      const isSuper = interaction.triggerSuperGatherNextSwing;
      interaction.triggerSuperGatherNextSwing = false;

      const quantity = isSuper ? 2 : 1;
      const dropName = res?.drop ?? "resource";

      onHit(target, dropName, quantity);

      // Award XP
      const skills = rpgState.skills;
      if (skills) {
        const isTree = interaction.nodeKinds.get(target.id) === "tree";
        const skillKey = isTree ? "lumberjacking" : "mining";
        const skill = skills[skillKey];
        if (skill) {
          const xpGained = 10;
          const newXp = skill.xp + xpGained;
          const playerEntity = world.entities.find((e) => e.id === "player")!;
          if (newXp >= skill.nextXp) {
            const newLevel = skill.level + 1;
            const overflow = newXp - skill.nextXp;
            const newNextXp = newLevel * 100;
            rpgState.skills = {
              ...rpgState.skills,
              [skillKey]: { level: newLevel, xp: overflow, nextXp: newNextXp },
            } as any;
            spawnEnvFloatingText(
              vfx,
              `🎉 ${isTree ? "Lumberjacking" : "Mining"} Level ${newLevel}!`,
              0x55ff55,
              playerEntity.position!,
              entityLayer
            );
          } else {
            rpgState.skills = {
              ...rpgState.skills,
              [skillKey]: { ...skill, xp: newXp },
            } as any;
          }
        }

        if (isSuper && skills.superGather) {
          const sgSkill = skills.superGather;
          const newXp = sgSkill.xp + 15;
          const playerEntity = world.entities.find((e) => e.id === "player")!;
          if (newXp >= sgSkill.nextXp) {
            const newLevel = sgSkill.level + 1;
            const overflow = newXp - sgSkill.nextXp;
            const newNextXp = newLevel * 100;
            rpgState.skills = {
              ...rpgState.skills,
              superGather: { level: newLevel, xp: overflow, nextXp: newNextXp },
            } as any;
            spawnEnvFloatingText(
              vfx,
              `🎉 Super-Gather Level ${newLevel}!`,
              0xffaa00,
              playerEntity.position!,
              entityLayer
            );
          } else {
            rpgState.skills = {
              ...rpgState.skills,
              superGather: { ...sgSkill, xp: newXp },
            } as any;
          }
        }
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

      // Backend Sync
      if (res && res.rpgLocationId && res.rpgAction) {
        fetch("/api/rpg/gather", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: res.rpgAction,
            locationId: res.rpgLocationId,
            superGather: isSuper,
          }),
        })
          .then(async (response) => {
            if (response.ok) {
              const data = await response.json();
              setRpgState(data.playerState);

              for (const mat of data.materialsGained) {
                devConsoleLog(`gathered ${mat.id} (+${mat.quantity})`);
              }

              if (data.toolBroken) {
                devConsoleLog(`[Warning] Your equipped tool broke!`);
              }
            } else {
              const err = await response.json().catch(() => ({ error: "unknown error" }));
              devConsoleLog(`[Error] Gathering failed: ${err.error}`);
            }
          })
          .catch((err) => {
            devConsoleLog(`[Error] Gather request failed: ${err}`);
          });
      }
    }
  }
}
