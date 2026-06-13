import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import { getCampfireHeatRadiusTiles } from "$lib/core/systems/camp/campfire-runtime-system";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { Cell } from "$lib/core/types";
import { playSound } from "$lib/audio/audio-engine";
import { gatherSoundId } from "$lib/audio/sound-manifest";
import { gameState } from "$lib/state/game-state.svelte";
import { applyRpgState, setRpgInventory } from "$lib/state/rpg-actions.svelte";
import { getItemDef } from "$lib/domain/items";
import { Colors } from "$lib/utils/colors";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { SkillKey, InputAction, EntityId, GameEvent } from "$lib/domain/game-events";
import { getItemQty, getEquippedWeaponId } from "$lib/state/rpg/inventory-api";
import { syncGather, syncPickup, syncRefuel } from "$lib/state/persistence/remote-sync";
import { transformStackQty } from "$lib/domain/systems/inventory-system";
import { findProcessableItem, resolveProcessingCompletion } from "$lib/domain/systems/processing-system";
import { getStationDefinition, type StationId } from "$lib/domain/stations";
import { checkGatherTool, gatherInterval, requiredToolKind } from "$lib/domain/gathering/gather-system";
import { getGatherableDefinition, rollGatherRisk } from "$lib/domain/gathering/gatherables";
import { applyStatusEffect } from "$lib/state/rpg/status-effects.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { emitPlayerHpDelta } from "$lib/ui/player-feedback";
import {
  createTreeFallHazard,
  fallDirectionAwayFromPlayer,
  isPointInTreeFallZone,
} from "$lib/domain/hazards/tree-fall-hazard";
import { learnAbout } from "$lib/state/rpg/knowledge.svelte";
import { learnRecipe } from "$lib/state/rpg/crafting.svelte";
import {
  findProcessForStation,
  resolveStationProcessCompletion,
  tickStationProcessRuntime,
  type StationProcessRuntime,
  type StationProcessTickContext,
} from "$lib/domain/systems/station-process";
import { InteractionDispatcher } from "$lib/core/runtime/interactions";
import type { RuntimeResourceMap } from "$lib/core/runtime/runtime";
import type { ParticleFXKey } from "$lib/core/assets/assets";

interface DialogueStateRef {
  activeNpc: { id: string; name: string } | null;
}

const INTERACT_RANGE = 2;
const CAMPFIRE_STATION = getStationDefinition("campfire");

interface ImmediateInteractionDeps {
  interaction: InteractionResource;
  vfx: VFXResource;
  entityLayer: Container;
  entitySprites: Map<string, Container>;
  playerSprite: AnimatedSprite;
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void;
  dialogueState: DialogueStateRef;
  getTreeFrames: () => Texture[];
  getStumpTexture: () => Texture;
  map?: MapResource | undefined;
  onStationInteract?: ((target: Entity) => void) | undefined;
}

interface ImmediateInteractionResources extends RuntimeResourceMap {
  deps: ImmediateInteractionDeps;
}

const immediateInteractionDispatcher = new InteractionDispatcher<ImmediateInteractionResources>([
  {
    id: "pickup",
    handle: ({ world, target, resources }) => {
      const { map, interaction, vfx, entityLayer, entitySprites, playerSprite, triggerQuestEvent, getTreeFrames, getStumpTexture } = resources.deps;
      const baseScale = (TILE * 1.1) / 192;
      playerSprite.scale.y = baseScale * 0.75;
      setTimeout(() => {
        playerSprite.scale.y = baseScale;
      }, 150);

      playSound("pickup");

      const item = target.pickup?.itemId ?? target.resource?.drop;
      const qty = target.pickup ? target.pickup.qty : 1;

      if (item) {
        void syncPickup(item, target.id, qty).then((r) => {
          if (r.ok) applyRpgState(r.data.playerState);
        });

        const itemName = getItemDef(item)?.name ?? item;
        const playerEntity = getPlayerEntity();
        spawnEnvFloatingText(vfx, `+${qty} ${itemName}`, Colors.resource.gold, playerEntity.position!, entityLayer);
        triggerQuestEvent(GameEvent.Pickup, item, qty);

        const gatherableId = target.pickup?.gatherableId ?? target.resource?.gatherableId;
        const gatherable = gatherableId ? getGatherableDefinition(gatherableId) : undefined;
        const gatherRisk = gatherable
          ? rollGatherRisk(
              gatherable,
              {
                hasTool: !!getEquippedWeaponId(),
              },
              Math.random,
            )
          : null;
        if (gatherRisk) {
          applyStatusEffect(gatherRisk.status, gatherRisk.durationSec, "hazard:gather");
          if (gatherRisk.knowledgeItemId && gatherRisk.status === StatusId.Cut) {
            learnAbout(gatherRisk.knowledgeItemId, "sharp");
          }
          spawnEnvFloatingText(
            vfx,
            gatherRisk.status === StatusId.Cut ? "cut" : gatherRisk.status === StatusId.Poison ? "poison" : "bleeding",
            Colors.ui.error,
            getPlayerEntity().position!,
            entityLayer,
          );
        }
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
        getStumpTexture,
        map
      );
    },
  },
  {
    id: "refuel",
    handle: ({ target, resources }) => {
      const { onStationInteract } = resources.deps;
      if (onStationInteract) {
        onStationInteract(target);
      }
    },
  },
  {
    id: "process",
    handle: ({ target, resources }) => {
      const { onStationInteract } = resources.deps;
      if (onStationInteract) {
        onStationInteract(target);
      }
    },
  },
  {
    id: "talk",
    handle: ({ target, resources }) => {
      const { dialogueState, triggerQuestEvent } = resources.deps;
      dialogueState.activeNpc = {
        id: target.id,
        name: target.interactable?.name ?? "NPC",
      };

      triggerQuestEvent(GameEvent.Talk, target.id);
    },
  },
]);

export class InteractionResource {
  public gatherInterval = 0.6;
  public gatherCooldownTimer = 0;
  public currentGatherInterval = 0.6;
  public gatheringTarget: Entity | null = null;
  public currentTarget: Entity | null = null;
  public campfireSprite: AnimatedSprite | null = null;
  public refuelPendingConfirm = false;
  public refuelConfirmTimer = 0;
  /** Set by campfire handler to open the crafting overlay; consumed by engine. */
  public requestCrafting = false;
  /** Active item process (boiling, smelting); null when nothing is processing. */
  public activeProcess: StationProcessRuntime | null = null;
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
  getParticleFXFrames: (key: ParticleFXKey) => Texture[],
  getWoodItemTexture: () => Texture
): void {
  const gatherable = entity.resource?.gatherableId ? getGatherableDefinition(entity.resource.gatherableId) : undefined;
  const isTree = gatherable?.solidKind === "tree";

  const hitPos = entity.position
    ? { x: entity.position.x + TILE / 2, y: entity.position.y + TILE / 2 }
    : undefined;
  playSound(gatherSoundId(gatherable?.gatherSound), hitPos ? { position: hitPos } : {});

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
      stackKey: `node:${entity.id}`,
      baseX: textObj.x,
      baseY: textObj.y,
      life: 0,
      maxLife: isSuper ? 1.1 : 0.9,
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
  triggerQuestEvent: (evt: string, val?: string) => void,
  getTreeFrames: () => Texture[],
  getStumpTexture: () => Texture,
  map?: MapResource
): void {
  const pos = entity.position!;
  const gx = Math.round(pos.x / TILE);
  const gy = Math.round(pos.y / TILE);
  if (map) {
    const key = `${gx},${gy}`;
    map.solidCoords.delete(key);
    map.customSolids.delete(key);
  }
  const gatherable = entity.resource?.gatherableId ? getGatherableDefinition(entity.resource.gatherableId) : undefined;
  const wasTree = gatherable?.solidKind === "tree";
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
    const player = getPlayerEntity();
    const treeCenter = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE };
    const playerCenter = player.position
      ? { x: player.position.x + TILE / 2, y: player.position.y + TILE / 2 }
      : treeCenter;
    const hazard = createTreeFallHazard(
      treeCenter,
      fallDirectionAwayFromPlayer(treeCenter, playerCenter),
    );

    spawnEnvFloatingText(vfx, "tree cracking", Colors.ui.warning, player.position ?? pos, entityLayer);
    triggerCameraShake(vfx, 2, hazard.dodgeWindowSec);

    const fallFrames = getTreeFrames().slice(1);
    const fallingSprite = new AnimatedSprite(fallFrames);
    fallingSprite.anchor.set(0.5, 1);
    fallingSprite.x = gx * TILE + TILE / 2;
    fallingSprite.y = gy * TILE + TILE;
    fallingSprite.scale.set((TILE * 1.5) / 256);
    fallingSprite.loop = false;
    fallingSprite.animationSpeed = 0.16;

    const angles = {
      north: Math.PI,
      south: 0,
      east: Math.PI / 2,
      west: -Math.PI / 2,
    };
    fallingSprite.rotation = angles[hazard.direction];

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

    setTimeout(() => {
      playSound("node.treefall", { position: { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 } });
      const latestPlayer = getPlayerEntity();
      if (latestPlayer.position) {
        const latestCenter = {
          x: latestPlayer.position.x + TILE / 2,
          y: latestPlayer.position.y + TILE / 2,
        };
        if (isPointInTreeFallZone(latestCenter, hazard)) {
          emitPlayerHpDelta(-hazard.damage);
          applyStatusEffect(StatusId.Cut, 25, "hazard:tree_fall");
          spawnEnvFloatingText(vfx, "tree hit", Colors.ui.error, latestPlayer.position, entityLayer);
        }
      }
      entityLayer.addChild(fallingSprite);
      fallingSprite.play();
    }, hazard.dodgeWindowSec * 1000);
  } else {
    playSound("node.deplete", { position: { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 } });
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
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void,
  dialogueState: DialogueStateRef,
  getTreeFrames: () => Texture[],
  getStumpTexture: () => Texture,
  map?: MapResource,
  onStationInteract?: (target: Entity) => void
): void {
  immediateInteractionDispatcher.dispatch({
    world,
    target,
    resources: {
      deps: {
        interaction,
        vfx,
        entityLayer,
        entitySprites,
        playerSprite,
        triggerQuestEvent,
        dialogueState,
        getTreeFrames,
        getStumpTexture,
        map,
        onStationInteract,
      },
    },
    events: [],
    emit: () => undefined,
    getResource: <T>(key: string) => {
      if (key !== "deps") throw new Error(`missing runtime resource: ${key}`);
      return {
        interaction,
        vfx,
        entityLayer,
        entitySprites,
        playerSprite,
        triggerQuestEvent,
        dialogueState,
        getTreeFrames,
        getStumpTexture,
        map,
        onStationInteract,
      } as T;
    },
  });
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
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void,
  dialogueState: DialogueStateRef,
  getParticleFXFrames: (key: ParticleFXKey) => Texture[],
  getWoodItemTexture: () => Texture,
  getTreeFrames: () => Texture[],
  getStumpTexture: () => Texture,
  isPlacementMode: boolean,
  isDashing: boolean,
  onHit: (entity: Entity, yieldName: string, quantity: number) => void,
  map?: MapResource,
  onStationInteract?: (target: Entity) => void,
  stationTickContext: StationProcessTickContext = { raining: false },
): void {
  // Advance an active process; walking out of the heat cancels it.
  if (interaction.activeProcess) {
    const playerEntity = getPlayerEntity();
    const proc = interaction.activeProcess;
    const stationEntity = world.with("position").entities.find((e) => e.id === (proc.targetEntityId || EntityId.Campfire));

    let inRange = true;
    if (stationEntity?.position && playerEntity.position) {
      const dx = (stationEntity.position.x - playerEntity.position.x) / TILE;
      const dy = (stationEntity.position.y - playerEntity.position.y) / TILE;
      const maxDist = proc.stationId === "campfire" ? getCampfireHeatRadiusTiles(stationEntity) : 2.5;
      inRange = Math.hypot(dx, dy) <= maxDist;
    }

    if (!inRange) {
      spawnEnvFloatingText(
        vfx,
        "process interrupted.",
        Colors.ui.muted,
        playerEntity.position!,
        entityLayer
      );
      interaction.activeProcess = null;
    } else {
      const tickedProc = tickStationProcessRuntime(proc, dt, stationTickContext);
      interaction.activeProcess = tickedProc;

      if (tickedProc.bubbleTimer <= 0 && stationEntity?.position) {
        interaction.activeProcess = { ...tickedProc, bubbleTimer: 0.8 };
        if (proc.stationId === "campfire") {
          spawnEnvParticles(vfx, Colors.vfx.smoke, 4, "smoke", stationEntity.position, entityLayer);
          playSound("station.boil");
        } else if (proc.stationId === "primitive_work_surface") {
          playSound("craft");
        } else {
          playSound("pickup");
        }
      }
      if (tickedProc.remainingSec <= 0) {
        if (gameState.rpg.inventory) {
          const result = resolveStationProcessCompletion({
            inventory: gameState.rpg.inventory,
            process: proc,
          });

          if (result.ok) {
            setRpgInventory(result.inventory);
            const outId = result.outputItemId;
            const resultName = getItemDef(outId)?.name ?? outId;
            spawnEnvFloatingText(
              vfx,
              `process complete: ${resultName.toLowerCase()}`,
              Colors.ui.success,
              playerEntity.position!,
              entityLayer
            );
            playSound("craft");

            for (const knowledge of result.knowledge) {
              learnAbout(knowledge.itemId, knowledge.trait);
            }
            if (result.recipeToLearn) learnRecipe(result.recipeToLearn);

            triggerQuestEvent(GameEvent.Boil, outId);
            triggerQuestEvent("craft", outId);
          } else {
            spawnEnvFloatingText(
              vfx,
              "missing ingredients.",
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
        "ðŸ”¥ Refuel cancelled",
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
      const res = target.resource;
      const gatherable = res?.gatherableId ? getGatherableDefinition(res.gatherableId) : undefined;
      const isBareHanded = gatherable && !gatherable.requiredToolKind && gatherable.solidKind === "none";

      if (res && !isBareHanded) {
        const expectedKind = gatherable?.requiredToolKind ?? (res.rpgAction ? requiredToolKind(res.rpgAction) : null);
        if (expectedKind) {
          const weaponId = getEquippedWeaponId();

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
            vfx.floatingTexts.push({
              textObj,
              stackKey: "player",
              baseX: textObj.x,
              baseY: textObj.y,
              life: 0,
              maxLife: 0.8,
            });
            entityLayer.addChild(textObj);
          };

          const gate = checkGatherTool(weaponId, expectedKind);
          if (!gate.ok) {
            const detail =
              gate.reason === "no_tool"
                ? `no tool equipped; equip a ${expectedKind}.`
                : `wrong tool; equip an ${expectedKind}.`;
            devConsoleLog(`[Error] ${detail}`);
            spawnFailText(`need ${expectedKind}`);
            onInteract(target);
            interaction.gatherCooldownTimer = interaction.gatherInterval;
            return;
          }
        }

        interaction.gatheringTarget = target;
        const skillKey = gatherable?.skillKey ?? SkillKey.Mining;
        const skillLevel = gameState.rpg.skills?.[skillKey]?.level ?? 1;
        const baseDuration = gatherable?.baseDurationSec ?? interaction.gatherInterval;
        interaction.currentGatherInterval = gatherInterval(baseDuration, skillLevel);
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
          getStumpTexture,
          map,
          onStationInteract
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

      const gatherable = res?.gatherableId ? getGatherableDefinition(res.gatherableId) : undefined;
      const isTree = gatherable?.solidKind === "tree";
      const skillKey = gatherable?.skillKey ?? SkillKey.Mining;
      const skillLevel = gameState.rpg.skills?.[skillKey]?.level ?? 1;
      const baseDuration = gatherable?.baseDurationSec ?? interaction.gatherInterval;
      const scaledInterval = gatherInterval(baseDuration, skillLevel);
      interaction.currentGatherInterval = scaledInterval;
      interaction.gatherCooldownTimer = scaledInterval;

      const dropName = gatherable?.yieldTable[0]?.itemId ?? res?.drop ?? "resource";

      onHit(target, dropName, 1);

      // Bare-hand gathering (forage nodes with no tool requirement) can wound.
      // Tool-gated nodes always have a tool here, so they never trigger this.
      const gatherRisk = gatherable
        ? rollGatherRisk(
            gatherable,
            {
              hasTool: !!getEquippedWeaponId(),
            },
            Math.random,
          )
        : null;
      const wound = gatherRisk
        ? {
            status: gatherRisk.status,
            durationSec: gatherRisk.durationSec,
          }
        : null;
      if (wound) {
        applyStatusEffect(wound.status, wound.durationSec, "hazard:gather");
        spawnEnvFloatingText(
          vfx,
          wound.status === StatusId.Cut ? "cut" : "bleeding",
          Colors.ui.error,
          getPlayerEntity().position!,
          entityLayer,
        );
      }

      // Award XP. awardSkillXp no-ops if a skill isn't loaded, so no guard needed.
      const xpPos = getPlayerEntity().position!;
      awardSkillXp(isTree ? SkillKey.Lumberjacking : SkillKey.Mining, 10, vfx, xpPos, entityLayer);

      if (res) {
        res.hp -= 1;
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
            getStumpTexture,
            map
          );
          interaction.gatheringTarget = null;
        }
      }

      // Backend sync (persists yields + tool durability).
      if (res && res.rpgLocationId && res.rpgAction) {
        void syncGather(res.rpgAction, res.rpgLocationId).then((r) => {
          if (r.ok) {
            applyRpgState(r.data.playerState);
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


