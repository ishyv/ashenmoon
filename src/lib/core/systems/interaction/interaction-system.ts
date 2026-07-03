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
  spawnSlashArc,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { Cell, type AnimState } from "$lib/core/types";
import { playSound } from "$lib/audio/audio-engine";
import { gatherSoundId } from "$lib/audio/sound-manifest";
import { gameState } from "$lib/state/game-state.svelte";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { applyRpgState, setRpgInventory, equipLocalWeapon } from "$lib/state/rpg-actions.svelte";
import { getItemDef } from "$lib/domain/items";
import { Colors } from "$lib/utils/colors";
import { getActionFeedback } from "$lib/domain/feedback/action-feedback";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { SkillKey, InputAction, EntityId, GameEvent } from "$lib/domain/game-events";
import { getItemQty, getEquippedWeaponId, findBestAutoEquipTool } from "$lib/state/rpg/inventory-api";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { syncGather, syncPickup, syncRefuel } from "$lib/state/persistence/remote-sync";
import { transformStackQty } from "$lib/domain/systems/inventory-system";
import { findProcessableItem, resolveProcessingCompletion } from "$lib/domain/systems/processing-system";
import { getStationDefinition, type StationId } from "$lib/domain/stations";
import { drawBuildingVisuals } from "$lib/core/systems/building/building-system";
import { checkGatherTool, gatherInterval, requiredToolKind } from "$lib/domain/gathering/gather-system";
import { getGatherableDefinition, resolveGatherSkillKey, rollGatherRisk } from "$lib/domain/gathering/gatherables";
import { gatherActivityStats } from "$lib/domain/stats/skill-growth";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { applyStatusEffect, statusState } from "$lib/state/rpg/status-effects.svelte";
import { applyWound } from "$lib/state/rpg/wounds.svelte";
import { StatusId } from "$lib/domain/systems/status-types";
import { stamina } from "$lib/state/rpg/stamina.svelte";
import { emitPlayerHpDelta } from "$lib/ui/player-feedback.svelte";
import {
  createTreeFallHazard,
  fallDirectionAwayFromPlayer,
  isPointInTreeFallZone,
} from "$lib/domain/hazards/tree-fall-hazard";
import { LANDMARK_DEFS } from "$lib/domain/worldgen/landmark-definitions";
import { discoverSource, learnAbout } from "$lib/state/rpg/knowledge.svelte";
import { learnRecipe } from "$lib/state/rpg/crafting.svelte";
import { completeCarcassWorldAction,
  startCarcassWorldAction,
} from "$lib/core/systems/animals/carcass-interactions";
import { tickWorldActionRuntime, type WorldActionRuntime } from "$lib/domain/world-action-runtime";
import {
  findProcessForStation,
  resolveStationProcessCompletion,
  tickStationProcessRuntime,
  type StationProcessRuntime,
  type StationProcessTickContext,
} from "$lib/domain/systems/station-process";
import {
  tickCraftProcessRuntime,
  minigamePerformanceOf,
  hasPlayedMinigame,
  type CraftProcessRuntime,
} from "$lib/domain/crafting/craft-process-runtime";
import { resolveCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { rpgEventQueue, playerRpgEntityId } from "$lib/state/rpg/rpg-feedback-router";
import { InteractionDispatcher } from "$lib/core/runtime/interactions";
import type { RuntimeResourceMap } from "$lib/core/runtime/runtime";
import { INTERACT_RANGE } from "$lib/core/systems/interaction/targeting-system";
import { resolvePickupTarget } from "$lib/core/systems/interaction/pickup-resolution";
import { resolveGatherRiskForInteraction } from "$lib/core/systems/interaction/gather-risk-resolution";
import {
  enqueuePickupInteractionEvents,
  enqueueStationProcessCompletedEvents,
  enqueueWorldActionCompletedEvent,
} from "$lib/core/systems/interaction/interaction-events";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import { handleHitFeedbackSystem as _handleHitFeedback } from "$lib/core/systems/interaction/hit-feedback-system";
import { depleteNodeSystem as _depleteNode } from "$lib/core/systems/interaction/node-depletion-system";
import { gatherTargetKindForDefinition } from "$lib/domain/animation/player-animation";
import type { PlayerAnimationResource } from "$lib/core/systems/player-animation/player-animation-system";

export { setHighlight, updateTargetSystem } from "$lib/core/systems/interaction/targeting-system";

interface DialogueStateRef {
  activeNpc: { id: string; name: string } | null;
}

const CAMPFIRE_STATION = getStationDefinition("campfire");

interface ImmediateInteractionDeps {
  interaction: InteractionResource;
  vfx: VFXResource;
  entityLayer: Container;
  entitySprites: Map<string, Container>;
  playerSprite: AnimatedSprite;
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void;
  dialogueState: DialogueStateRef;
  map?: MapResource | undefined;
  onStationInteract?: ((target: Entity) => void) | undefined;
  onOpenCarcassPanel?: ((targetId: string) => void) | undefined;
  eventQueue?: GameEventQueue | undefined;
}

interface ImmediateInteractionResources extends RuntimeResourceMap {
  deps: ImmediateInteractionDeps;
}

const immediateInteractionDispatcher = new InteractionDispatcher<ImmediateInteractionResources>([
  {
    id: "pickup",
    handle: ({ world, target, resources }) => {
      const {
        map,
        interaction,
        vfx,
        entityLayer,
        entitySprites,
        playerSprite,
        triggerQuestEvent,
        eventQueue,
      } = resources.deps;
      const baseScale = (TILE * 1.1) / 192;
      playerSprite.scale.y = baseScale * 0.75;
      setTimeout(() => {
        playerSprite.scale.y = baseScale;
      }, 150);

      playSound("pickup");

      const pickup = resolvePickupTarget(target);
      const item = pickup.itemId;
      const qty = pickup.qty;

      if (item) {
        void syncPickup(item, target.id, qty).then((r) => {
          if (r.ok) {
            applyRpgState(r.data.playerState);
            if (target.interactable?.name) {
              discoverSource(item, target.interactable.name);
            }
          }
        });

        const itemName = getItemDef(item)?.name ?? item;
        const playerEntity = getPlayerEntity();
        enqueuePickupInteractionEvents({ queue: eventQueue, actorId: playerEntity.id, targetId: target.id, itemId: item, qty });
        spawnEnvFloatingText(vfx, `+${qty} ${itemName}`, Colors.resource.gold, playerEntity.position!, entityLayer);
        triggerQuestEvent(GameEvent.Pickup, item, qty);

        const equippedToolId = getEquippedWeaponId() ?? null;
        const gatherRisk = resolveGatherRiskForInteraction({
          gatherableId: pickup.gatherableId,
          equippedToolId,
        });
        if (gatherRisk) {
          if (gatherRisk.kind === "wound") {
            applyWound({
              severity: gatherRisk.woundSeverity,
              contamination: 0.2,
              toolQuality: gatherRisk.toolQuality,
              source: "hazard:gather",
              maxHp: playerEntity.health?.max,
            });
          } else {
            applyStatusEffect(gatherRisk.status, gatherRisk.durationSec, "hazard:gather");
          }
          if (gatherRisk.knowledgeItemId && gatherRisk.status === StatusId.Cut) {
            learnAbout(gatherRisk.knowledgeItemId, "sharp");
          }
          spawnEnvFloatingText(
            vfx,
            gatherRisk.feedbackText,
            Colors.ui.error,
            getPlayerEntity().position!,
            entityLayer,
          );
        }
      }

      depleteNodeSystem(
        world,
        target,
        (e) => { if (interaction.currentTarget === e) interaction.currentTarget = null; },
        vfx,
        entityLayer,
        entitySprites,
        triggerQuestEvent,
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
      const { onStationInteract, onOpenCarcassPanel } = resources.deps;
      console.log("[DEBUG ENGINE] Immediate Interaction process handler invoked for target:", {
        id: target.id,
        carcass: !!target.carcass,
        hasOnOpenCarcassPanel: !!onOpenCarcassPanel,
        hasOnStationInteract: !!onStationInteract
      });
      if (target.trap && target.trap.type === "snap") {
        const { vfx, entityLayer, entitySprites } = resources.deps;
        if (target.trap.state === "sprung") {
          target.trap.state = "set";
          if (target.interactable) {
            target.interactable.name = "disarm snap trap";
          }
          playSound("craft");
          spawnEnvFloatingText(vfx, "✔ Trap Reset ✔", Colors.resource.gold, getPlayerEntity().position!, entityLayer);
          
          const container = entitySprites.get(target.id);
          if (container && container.children.length >= 2) {
            const interiorContainer = container.children[0] as Container;
            const shellContainer = container.children[1] as Container;
            drawBuildingVisuals("snap_trap", 5, interiorContainer, shellContainer, target);
          }
        } else {
          target.trap.state = "sprung";
          if (target.interactable) {
            target.interactable.name = "reset snap trap";
          }
          playSound("craft");
          spawnEnvFloatingText(vfx, "✔ Trap Disarmed ✔", Colors.resource.gold, getPlayerEntity().position!, entityLayer);
          
          const container = entitySprites.get(target.id);
          if (container && container.children.length >= 2) {
            const interiorContainer = container.children[0] as Container;
            const shellContainer = container.children[1] as Container;
            drawBuildingVisuals("snap_trap", 5, interiorContainer, shellContainer, target);
          }
        }
        return;
      }
      if (target.carcass) {
        // Open the dedicated CarcassPanel so the player can choose which action to run.
        console.log("[DEBUG ENGINE] Calling onOpenCarcassPanel");
        onOpenCarcassPanel?.(target.id);
        return;
      }
      if (onStationInteract) {
        console.log("[DEBUG ENGINE] Calling onStationInteract");
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
  {
    id: "examine",
    handle: ({ target, resources }) => {
      const { vfx, entityLayer } = resources.deps;
      const lm = target.landmark;
      if (!lm) return;

      const def = LANDMARK_DEFS[lm.kind];
      if (!def) return;

      const playerEntity = getPlayerEntity();
      const text = lm.depleted && def.depletedText ? def.depletedText : def.examineText;
      spawnEnvFloatingText(vfx, text, Colors.resource.gold, playerEntity.position!, entityLayer);

      if (!lm.depleted && def.drops.length > 0) {
        lm.depleted = true;
        for (const drop of def.drops) {
          if (typeof drop.chance === "number" && Math.random() > drop.chance) continue;
          void syncPickup(drop.itemId, `${target.id}_drop_${drop.itemId}`, drop.qty).then((r) => {
            if (r.ok) {
              applyRpgState(r.data.playerState);
              if (target.interactable?.name) {
                discoverSource(drop.itemId, target.interactable.name);
              }
            }
          });
          const itemName = getItemDef(drop.itemId)?.name ?? drop.itemId;
          spawnEnvFloatingText(vfx, `+${drop.qty} ${itemName}`, Colors.resource.gold, playerEntity.position!, entityLayer);
        }
        playSound("pickup");
      }
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
  /** Active item processes (boiling, smelting), keyed by station entity id — each station runs independently. */
  public activeProcesses: Map<string, StationProcessRuntime> = new Map();
  /** Active timed world-object action; null when no object action is running. */
  public activeWorldAction: WorldActionRuntime | null = null;
  /** True when a precision tap was registered during the current activeWorldAction cycle. */
  public activeWorldActionPrecision = false;
  /**
   * Active timed, attendable station crafts, keyed by station entity id.
   * Unlike `activeProcesses`/`activeWorldAction`, leaving range never
   * cancels an entry — it only stops the current tick from counting as
   * "attended." A craft also does not auto-resolve into inventory once its
   * timer completes (see `tickActiveCraftProcess`); it stays parked here,
   * `completed: true`, until the player interacts with that station again
   * to collect it (see `engine.collectCraftProcess`).
   */
  public activeCraftProcesses: Map<string, CraftProcessRuntime> = new Map();
}

/**
 * Handles hit visual feedback (squash, shake, hit flash, particles, floating texts).
 */
export function handleHitFeedbackSystem(
  entity: Entity,
  yieldName: string,
  quantity: number,
  _interaction: unknown,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
): void {
  _handleHitFeedback(entity, yieldName, quantity, vfx, entityLayer, entitySprites);
}

export function depleteNodeSystem(
  world: World<Entity>,
  entity: Entity,
  clearCurrentTarget: (entity: Entity) => void,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  triggerQuestEvent: (evt: string, val?: string) => void,
  map?: MapResource,
): void {
  _depleteNode(world, entity, clearCurrentTarget, vfx, entityLayer, entitySprites, triggerQuestEvent, map);
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
  map?: MapResource,
  onStationInteract?: (target: Entity) => void,
  onOpenCarcassPanel?: (targetId: string) => void,
  eventQueue?: GameEventQueue,
): void {
  console.log("[DEBUG ENGINE] triggerImmediateInteraction called:", {
    targetId: target.id,
    action: target.interactable?.action,
    hasOnStationInteract: !!onStationInteract,
    hasOnOpenCarcassPanel: !!onOpenCarcassPanel
  });
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
        map,
        onStationInteract,
        onOpenCarcassPanel,
        eventQueue,
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
        map,
        onStationInteract,
        onOpenCarcassPanel,
        eventQueue,
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
  setPlayerAnim: (state: AnimState) => void,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  onInteract: (target: Entity) => void,
  devConsoleLog: (text: string) => void,
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void,
  dialogueState: DialogueStateRef,
  isPlacementMode: boolean,
  isDashing: boolean,
  onHit: (entity: Entity, yieldName: string, quantity: number) => void,
  map?: MapResource,
  onStationInteract?: (target: Entity) => void,
  stationTickContext: StationProcessTickContext = { raining: false },
  onOpenCarcassPanel?: (targetId: string) => void,
  eventQueue?: GameEventQueue,
  playerAnimation?: PlayerAnimationResource,
): void {
  const tickActiveProcess = (): void => {
    const playerEntity = getPlayerEntity();
    for (const [stationEntityId, proc] of interaction.activeProcesses) {
      const stationEntity = world.with("position").entities.find((e) => e.id === stationEntityId);

      let inRange = true;
      if (stationEntity?.position && playerEntity.position) {
        const dx = (stationEntity.position.x - playerEntity.position.x) / TILE;
        const dy = (stationEntity.position.y - playerEntity.position.y) / TILE;
        const maxDist = proc.stationId === "campfire" ? getCampfireHeatRadiusTiles(stationEntity) : 2.5;
        inRange = devFlags.spectatorEnabled || Math.hypot(dx, dy) <= maxDist;
      }

      if (!inRange) {
        eventQueue?.push({ type: "feedback_requested", channel: "ui", message: "process interrupted.", tone: "info" });
        interaction.activeProcesses.delete(stationEntityId);
        continue;
      }

      let tickedProc = tickStationProcessRuntime(proc, dt, stationTickContext);
      interaction.activeProcesses.set(stationEntityId, tickedProc);

      if (tickedProc.bubbleTimer <= 0 && stationEntity?.position) {
        tickedProc = { ...tickedProc, bubbleTimer: 0.8 };
        interaction.activeProcesses.set(stationEntityId, tickedProc);
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
          const result = resolveStationProcessCompletion({ inventory: gameState.rpg.inventory, process: proc });
          if (result.ok) {
            setRpgInventory(result.inventory);
            const outId = result.outputItemId;
            const resultName = getItemDef(outId)?.name ?? outId;
            enqueueStationProcessCompletedEvents({
              queue: eventQueue,
              actorId: playerEntity.id,
              targetId: proc.targetEntityId,
              processId: proc.processId,
              outputItemId: outId,
              outputQty: result.outputQty,
            });
            const completionFeedback = outId === "clean_water" ? getActionFeedback("water_cleanse") : undefined;
            eventQueue?.push({
              type: "feedback_requested",
              channel: "ui",
              message: completionFeedback?.toast ?? `${resultName.toLowerCase()} ready, added to inventory.`,
              tone: "success",
            });
            // Sound and craft quest handled by FeedbackRouter on interaction_completed.
            for (const knowledge of result.knowledge) learnAbout(knowledge.itemId, knowledge.trait);
            if (result.recipeToLearn) learnRecipe(result.recipeToLearn);
            triggerQuestEvent(GameEvent.Boil, outId);
            triggerQuestEvent("craft", outId);
          } else {
            eventQueue?.push({ type: "feedback_requested", channel: "ui", message: "missing ingredients.", tone: "info" });
          }
        }
        interaction.activeProcesses.delete(stationEntityId);
      }
    }
  };

  /**
   * Ticks every active timed station craft. Unlike `tickActiveProcess` and
   * `tickWorldAction`, leaving range never cancels a craft — range only
   * decides whether this tick counts as "attended" for the optional
   * minigame. A craft ticks to `completed: true` on its own schedule
   * regardless of the player's presence (`tickCraftProcessRuntime` freezes
   * itself once completed), but does NOT auto-resolve into inventory here —
   * it stays parked, completed, until the player physically returns and
   * collects it via `engine.collectCraftProcess` (see
   * `+page.svelte`'s `onStationInteract`).
   */
  const tickActiveCraftProcess = (): void => {
    const playerEntity = getPlayerEntity();
    for (const [stationEntityId, runtime] of interaction.activeCraftProcesses) {
      if (runtime.completed) continue;
      const stationEntity = world.with("position").entities.find((e) => e.id === runtime.targetStationEntityId);

      let inRange = false;
      if (stationEntity?.position && playerEntity.position) {
        const dx = (stationEntity.position.x - playerEntity.position.x) / TILE;
        const dy = (stationEntity.position.y - playerEntity.position.y) / TILE;
        const maxDist = runtime.stationId === "campfire" ? getCampfireHeatRadiusTiles(stationEntity) : 2.5;
        inRange = Math.hypot(dx, dy) <= maxDist;
      }

      const tickedRuntime = tickCraftProcessRuntime(runtime, dt, inRange);
      interaction.activeCraftProcesses.set(stationEntityId, tickedRuntime);
    }
  };

  // Returns true when the caller should return — world actions consume the frame.
  const tickWorldAction = (): boolean => {
    if (!interaction.activeWorldAction) return false;
    const playerEntity = getPlayerEntity();
    const runtime = interaction.activeWorldAction;
    const target = world.with("position").entities.find((e) => e.id === runtime.action.executeIntent.targetId);

    const dx = target?.position && playerEntity.position ? Math.abs(target.position.x - playerEntity.position.x) / TILE : 999;
    const dy = target?.position && playerEntity.position ? Math.abs(target.position.y - playerEntity.position.y) / TILE : 999;
    const inRange = devFlags.spectatorEnabled || (dx <= INTERACT_RANGE && dy <= INTERACT_RANGE);

    if (!target || !inRange) {
      if (playerEntity.position) spawnEnvFloatingText(vfx, "action interrupted.", Colors.ui.muted, playerEntity.position, entityLayer);
      interaction.activeWorldAction = null;
      return true;
    }

    const tickedAction = tickWorldActionRuntime(runtime, dt);
    interaction.activeWorldAction = tickedAction;

    if (tickedAction.action.executeIntent.kind === "carcass.process") {
      setPlayerAnim("gather");
      if (target.position && playerEntity.position) {
        const pdx = target.position.x - playerEntity.position.x;
        if (pdx < 0) playerSprite.scale.x = -Math.abs(playerSprite.scale.x);
        else if (pdx > 0) playerSprite.scale.x = Math.abs(playerSprite.scale.x);
      }
      
      const prevHitIndex = Math.floor(runtime.elapsedSec / 0.4);
      const currentHitIndex = Math.floor(tickedAction.elapsedSec / 0.4);
      if (currentHitIndex > prevHitIndex && !tickedAction.completed) {
        playSound("gather.chop");
        if (target.position) {
          const carcassCenter = {
            x: target.position.x + TILE / 2,
            y: target.position.y + TILE / 2,
          };
          spawnEnvParticles(vfx, 0x8a1a1a, 6, "smoke", carcassCenter, entityLayer);
        }
      }
    }

    if (tickedAction.completed) {
      const precision = interaction.activeWorldActionPrecision;
      interaction.activeWorldAction = null;
      interaction.activeWorldActionPrecision = false;
      if (tickedAction.action.executeIntent.kind === "carcass.process") {
        completeCarcassWorldAction(target, tickedAction, vfx, entityLayer, entitySprites, eventQueue, precision);
      }
      enqueueWorldActionCompletedEvent({
        queue: eventQueue,
        actorId: playerEntity.id,
        targetId: tickedAction.action.executeIntent.targetId,
        actionId: tickedAction.action.id,
      });
    }

    return true;
  };

  const handleRefuelConfirmation = (): void => {
    if (interaction.refuelPendingConfirm) {
      interaction.refuelConfirmTimer -= dt;
      if (interaction.refuelConfirmTimer <= 0) {
        interaction.refuelPendingConfirm = false;
        spawnEnvFloatingText(vfx, "🔥 Refuel cancelled", Colors.ui.muted, getPlayerEntity().position!, entityLayer);
      }
    }
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
  };

  // Returns true when the caller should return (placement mode guard or tool check fail).
  const tickGatherLoop = (): boolean => {
    if (isPlacementMode) {
      interaction.gatheringTarget = null;
      playerAnimation?.clearGathering();
      interaction.gatherCooldownTimer = 0;
      return true;
    }

    if (interaction.gatherCooldownTimer > 0) interaction.gatherCooldownTimer -= dt;

    if (interaction.gatheringTarget !== null) {
      const moving =
        inputs.isActionPressed(InputAction.MoveUp) ||
        inputs.isActionPressed(InputAction.MoveDown) ||
        inputs.isActionPressed(InputAction.MoveLeft) ||
        inputs.isActionPressed(InputAction.MoveRight) ||
        isDashing;
      if (moving || interaction.currentTarget !== interaction.gatheringTarget) {
        playerAnimation?.clearGathering(interaction.gatheringTarget.id);
        interaction.gatheringTarget = null;
      }
    }

    const wantsInteract = inputs.isActionPressed(InputAction.Harvest) || inputs.pendingInteract;
    if (wantsInteract) {
      console.log("[DEBUG ENGINE] Interaction requested:", {
        harvestPressed: inputs.isActionPressed(InputAction.Harvest),
        pendingInteract: inputs.pendingInteract,
        gatheringTarget: interaction.gatheringTarget?.id ?? null,
        currentTarget: interaction.currentTarget?.id ?? null
      });
    }
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
                fontFamily: ["monospace", "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "sans-serif"],
                fontSize: 13,
                fontWeight: "bold",
                fill: Colors.ui.error,
                stroke: { color: Colors.ui.stroke, width: 3 },
              });
              const textObj = new Text({ text: msg, style: textStyle });
              textObj.anchor.set(0.5, 1);
              textObj.x = playerEntity.position!.x + TILE / 2;
              textObj.y = playerEntity.position!.y;
              vfx.floatingTexts.push({ textObj, stackKey: "player", baseX: textObj.x, baseY: textObj.y, life: 0, maxLife: 0.8 });
              entityLayer.addChild(textObj);
            };

            let gate = checkGatherTool(weaponId, expectedKind);
            if (!gate.ok) {
              const autoToolId = findBestAutoEquipTool(expectedKind);
              if (autoToolId) {
                equipLocalWeapon(autoToolId);
                void dispatchRpgCommand({ type: "equipTool", itemId: autoToolId, auto: true });
                const newWeaponId = getEquippedWeaponId();
                gate = checkGatherTool(newWeaponId, expectedKind);
              }
            }

            if (!gate.ok) {
              const detail = gate.reason === "no_tool"
                ? `no tool equipped; equip a ${expectedKind}.`
                : `wrong tool; equip an ${expectedKind}.`;
              devConsoleLog(`[Error] ${detail}`);
              spawnFailText(`need ${expectedKind}`);
              onInteract(target);
              interaction.gatherCooldownTimer = interaction.gatherInterval;
              return true;
            }
          }

          interaction.gatheringTarget = target;
          const skillKey = resolveGatherSkillKey(gatherable);
          const { speed } = gatherActivityStats(skillKey, getPlayerStats());
          const baseDuration = gatherable?.baseDurationSec ?? interaction.gatherInterval;
          interaction.currentGatherInterval = gatherInterval(baseDuration, speed);
          interaction.gatherCooldownTimer = 0;
        } else {
          triggerImmediateInteraction(
            world, target, interaction, vfx, entityLayer, entitySprites, playerSprite,
            triggerQuestEvent, dialogueState, map,
            onStationInteract, onOpenCarcassPanel, eventQueue,
          );
        }
      }
    }

    if (interaction.gatheringTarget !== null && interaction.gatherCooldownTimer <= 0) {
      const target = interaction.gatheringTarget;
      const res = target.resource;

      const gatherable = res?.gatherableId ? getGatherableDefinition(res.gatherableId) : undefined;
      const expectedKind = gatherable?.requiredToolKind ?? (res?.rpgAction ? requiredToolKind(res.rpgAction) : null);
      if (expectedKind) {
        const weaponId = getEquippedWeaponId();
        const gate = checkGatherTool(weaponId, expectedKind);
        if (!gate.ok) {
          interaction.gatheringTarget = null;
          playerAnimation?.clearGathering(target.id);
          if (!playerAnimation) setPlayerAnim("idle");
          return false;
        }
      }

      const playerEntity = getPlayerEntity();
      if (playerEntity.position && target.position) {
        const dx = target.position.x - playerEntity.position.x;
        if (dx < 0) playerSprite.scale.x = -Math.abs(playerSprite.scale.x);
        else if (dx > 0) playerSprite.scale.x = Math.abs(playerSprite.scale.x);
      }

      const currentStamina = stamina.current;
      const isExhausted = statusState.active.some((s) => s.id === StatusId.Exhaustion);
      const isTired = currentStamina < 25 || isExhausted;

      if (gatherable) {
        const targetKind = gatherTargetKindForDefinition(gatherable);
        if (targetKind) playerAnimation?.startGathering({ targetKind, targetId: target.id });
      }
      if (!playerAnimation) setPlayerAnim(isTired ? "gather_tired" : "gather");

      if (playerEntity.position && target.position) {
        const playerCenter = {
          x: playerEntity.position.x + TILE / 2,
          y: playerEntity.position.y + TILE / 2,
        };
        const targetCenter = {
          x: target.position.x + TILE / 2,
          y: target.position.y + TILE / 2,
        };
        spawnSlashArc(
          vfx,
          entityLayer,
          playerCenter.x,
          playerCenter.y,
          Math.atan2(targetCenter.y - playerCenter.y, targetCenter.x - playerCenter.x),
          TILE * (isTired ? 0.55 : 0.78),
          isTired ? 0.2 : 0.36,
          isTired ? 0x555555 : Colors.vfx.focusedGather,
        );
      }

      const isTree = gatherable?.solidKind === "tree";
      const skillKey = resolveGatherSkillKey(gatherable);
      const { speed } = gatherActivityStats(skillKey, getPlayerStats());
      const baseDuration = gatherable?.baseDurationSec ?? interaction.gatherInterval;
      const scaledInterval = gatherInterval(baseDuration, speed);
      interaction.currentGatherInterval = scaledInterval;
      interaction.gatherCooldownTimer = scaledInterval;

      onHit(target, gatherable?.yieldTable[0]?.itemId ?? res?.drop ?? "resource", 1);

      const gatherRisk = resolveGatherRiskForInteraction({
        gatherableId: res?.gatherableId ?? null,
        equippedToolId: getEquippedWeaponId() ?? null,
      });
      if (gatherRisk) {
        if (gatherRisk.kind === "wound") {
          applyWound({ severity: gatherRisk.woundSeverity, contamination: 0.2, toolQuality: gatherRisk.toolQuality, source: "hazard:gather", maxHp: getPlayerEntity().health?.max });
        } else {
          applyStatusEffect(gatherRisk.status, gatherRisk.durationSec, "hazard:gather");
        }
        spawnEnvFloatingText(vfx, gatherRisk.feedbackText, Colors.ui.error, getPlayerEntity().position!, entityLayer);
      }

      awardSkillXp(isTree ? SkillKey.Lumberjacking : SkillKey.Mining, 10, vfx, getPlayerEntity().position!, entityLayer);

      if (res) {
        res.hp -= 1;
        if (res.hp <= 0) {
          devConsoleLog(`${target.interactable?.name ?? target.id} depleted`);
          depleteNodeSystem(
            world, target,
            (e) => { if (interaction.currentTarget === e) interaction.currentTarget = null; },
            vfx, entityLayer, entitySprites, triggerQuestEvent, map,
          );
          playerAnimation?.clearGathering(target.id);
          interaction.gatheringTarget = null;
        }
      }

      if (res && res.rpgLocationId && res.rpgAction) {
        void syncGather(res.rpgAction, res.rpgLocationId).then((r) => {
          if (r.ok) {
            applyRpgState(r.data.playerState);
            for (const mat of r.data.materialsGained) {
              devConsoleLog(`gathered ${mat.id} (+${mat.quantity})`);
              if (target.interactable?.name) {
                discoverSource(mat.id, target.interactable.name);
              }
            }
            if (r.data.toolBroken) {
              devConsoleLog(`[Warning] Your equipped tool broke!`);
              interaction.gatheringTarget = null;
            }
          } else {
            devConsoleLog(`[Error] Gathering failed: ${r.error}`);
          }
        });
      }
    }

    return false;
  };

  tickActiveProcess();
  tickActiveCraftProcess();
  if (tickWorldAction()) return;
  handleRefuelConfirmation();
  tickGatherLoop();
}

/**
 * Resolves a completed, parked craft into inventory — the player-triggered
 * counterpart to `tickActiveCraftProcess` no longer auto-resolving crafts on
 * its own. Called from `engine.collectCraftProcess` when the player
 * interacts with a station whose craft has finished. Returns true if a
 * craft was actually collected (false if there was nothing to collect, or
 * it hasn't finished yet).
 */
export function collectCraftProcess(
  interaction: InteractionResource,
  stationEntityId: string,
  triggerQuestEvent: (evt: string, arg?: string, arg2?: number) => void,
  eventQueue?: GameEventQueue,
): boolean {
  const runtime = interaction.activeCraftProcesses.get(stationEntityId);
  if (!runtime || !runtime.completed) return false;
  interaction.activeCraftProcesses.delete(stationEntityId);
  if (!gameState.rpg.inventory) return false;

  const recipe = runtime.recipe;
  const ctx: CraftContext = {
    isNearCampfire: runtime.isNearCampfire,
    ...(runtime.stationId !== undefined ? { stationId: runtime.stationId } : {}),
    craftsmanshipLevel: runtime.craftsmanshipLevel,
    attended: runtime.attended,
    played: hasPlayedMinigame(runtime),
    minigamePerformance: minigamePerformanceOf(runtime),
  };

  const result = resolveCraft(gameState.rpg.inventory.slots, recipe.id, ctx);
  if (result.ok) {
    setRpgInventory({ slots: result.slots });
    const resultName = getItemDef(recipe.output.itemId)?.name ?? recipe.output.itemId;
    eventQueue?.push({
      type: "feedback_requested",
      channel: "ui",
      message: `${resultName.toLowerCase()} collected.`,
      tone: "success",
    });
    // Craftsmanship XP / sound / eureka feedback all route off this event — see rpg-feedback-router.ts.
    rpgEventQueue.push({
      type: "item_crafted",
      actorId: playerRpgEntityId(),
      recipeId: recipe.id,
      itemId: recipe.output.itemId,
      qty: recipe.output.qty,
    });
    triggerQuestEvent(GameEvent.Craft, recipe.id);
  } else {
    eventQueue?.push({ type: "feedback_requested", channel: "ui", message: "missing ingredients.", tone: "info" });
    rpgEventQueue.push({ type: "craft_failed", actorId: playerRpgEntityId(), recipeId: recipe.id, reason: result.reason });
  }
  return true;
}


