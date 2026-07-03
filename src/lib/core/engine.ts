import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  TilingSprite,
} from "pixi.js";
import {
  type UnitColor,
} from "$lib/core/assets/assets";
import {
  createRenderResourceCache,
  type RenderResourceCache,
} from "$lib/core/assets/render-resource-cache";
import {
  createStandeeShadow,
  getAshenmoonStructureKeyForBuildingType,
  getAshenmoonStructureTexture,
  getAshenmoonTextureByKey,
} from "$lib/core/assets/ashenmoon-assets";
import { devConsole } from "$lib/ui/debug/dev-console";
import { type Entity, world } from "$lib/core/ecs/ecs-miniplex";
import { devFlags } from "$lib/state/dev-flags.svelte";
import {
  Cell,
  type HudState,
  type GameEngineConfig,
  type AnimState,
  type WorldContextMenuTarget,
  type ActiveStationCraftStatus,
} from "$lib/core/types";
export type { HudState };
import { playSound, setListener, setMuted, tickAmbient, unlock as unlockAudio } from "$lib/audio/audio-engine";
import { loadAudioSettings } from "$lib/audio/audio-settings.svelte";
import type { AmbientBiome } from "$lib/audio/sound-manifest";
import { InputResource } from "$lib/core/input/input";
import {
  MapResource,
  buildMapSystem,
  drawTerrainSystem,
  cullViewportSystem,
  getAmbientEnvironment,
  spawnDecorationsSystem,
  TILE,
  type ForestAnimalZoneKind,
} from "$lib/core/systems/map/map";
import { catchUpRegeneration, tickRegenerationSystem } from "$lib/core/systems/map/regeneration-system";
import {
  VFXResource,
  particleUpdateSystem,
  spriteParticleUpdateSystem,
  hitFlashUpdateSystem,
  floatingTextUpdateSystem,
  shakeAndSquashUpdateSystem,
  shockwaveUpdateSystem,
  slashArcUpdateSystem,
  cameraShakeSystem,
  selectionRingUpdateSystem,
  cloudDriftSystem,
  footstepParticleSystem,
  spawnEnvFloatingText,
  spawnEnvParticles,
  spawnDeathBurst,
  spawnLevelUpBurst,
  triggerCameraShake,
} from "$lib/core/vfx/vfx";
import { updateStrikeRing, ringColorForSolidKind } from "$lib/core/vfx/action-timers/gathering-strike-ring";
import { updateTremorLine } from "$lib/core/vfx/action-timers/butcher-tremor-line";
import { updatePlacementCompass } from "$lib/core/vfx/action-timers/building-placement-compass";
import { updateSequenceMarks } from "$lib/core/vfx/action-timers/craft-sequence-marks";
import { updateProcessProgressRing } from "$lib/core/vfx/action-timers/process-progress-ring";
import { updateCampfireFuelRing } from "$lib/core/vfx/action-timers/campfire-fuel-ring";
import {
  MovementConfig,
  MovementResource,
  playerMovementSystem,
} from "$lib/core/systems/movement/movement";
import {
  PlayerAnimationResource,
  legacyAnimStateForClip,
  runPlayerAnimationSystem,
} from "$lib/core/systems/player-animation/player-animation-system";
import {
  CombatConfig,
  CombatResource,
  tickEnemyBleedSystem,
  knockbackSystem,
  despawnEntity,
} from "$lib/core/systems/combat/combat";
import { tickTrapSystem } from "$lib/core/systems/combat/trap-system";
import { updateWeaponGuardSystem, weaponAttackSystem } from "$lib/core/systems/combat/weapon-attack-system";
import { applyPlayerWeaponPresentation } from "$lib/core/systems/combat/player-weapon-presentation";
import { enemyAiSystem, makeEnemyEntity, GRUNT, type EnemyArchetype } from "$lib/core/systems/enemy-ai/enemy-ai";
import { animalEcologySystem, spawnInitialAnimalsSystem } from "$lib/core/systems/animals/animal-ecology-system";
import { createAnimalSprite } from "$lib/core/systems/animals/animal-rendering";
import {
  createLitCampfireState,
  findLitCampfires,
  getCampfireHeatRadiusTiles,
  refuelCampfireEntity,
  tickCampfireEntities,
} from "$lib/core/systems/camp/campfire-runtime-system";
import { sampleEnvironmentAt, syncCampfireEmitters, syncShelterEmitter } from "$lib/core/systems/environment/environment-signal-system";
import { EnvironmentInspector } from "$lib/core/systems/environment/environment-inspector";
import {
  InteractionResource,
  runInteractionSystem,
  handleHitFeedbackSystem,
  depleteNodeSystem,
  collectCraftProcess,
} from "$lib/core/systems/interaction/interaction-system";
import { updateTargetSystem } from "$lib/core/systems/interaction/targeting-system";
import { FocusedGatherResource, runFocusedGatherSystem } from "$lib/core/systems/focused-gather/focused-gather-system";
import { renderFocusedGatherSystem } from "$lib/core/systems/focused-gather/focused-gather-renderer";
import {
  BuildingResource,
  drawBuildingVisuals,
  updatePlacementPreviewSystem,
  placeBuildingSystem,
  spawnBuildingSystem,
  upgradeBuildingSystem,
  isValidPlacement,
} from "$lib/core/systems/building/building-system";
import { runBuildingInteriorSystem } from "$lib/core/systems/building/building-interior-system";
import { createStationProcessRuntime, stationProcessVerb, STATION_PROCESSES } from "$lib/domain/systems/station-process";
import {
  actionsForCarcass,
  actionsForPlacedStructure,
  type WorldActionOption,
} from "$lib/domain/world-actions";
import { createWorldActionRuntime } from "$lib/domain/world-action-runtime";
import { chooseFuelOption } from "$lib/domain/camp/fuel";
import { shelterExposureMitigation } from "$lib/domain/camp/camp-state";
import type { StationId } from "$lib/domain/stations";
import { getRecipe } from "$lib/domain/crafting/recipes";
import { checkCraft, type CraftContext } from "$lib/domain/crafting/crafting-system";
import { createCraftProcessRuntime, recordMinigameWindow, type CraftProcessRuntime } from "$lib/domain/crafting/craft-process-runtime";
import { ANIMAL_DEFINITIONS, isCalmNearby, type AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import { collectCursedEquipped, tickCurseEffects } from "$lib/core/systems/curse/curse-effect-system";
import { animalCenterRuntime } from "$lib/core/systems/animals/animal-runtime";
import {
  effectivePlayerTemperature,
  nightEnvironmentModifiers,
  isNight,
} from "$lib/domain/weather/weather-events";
import { syncRefuel } from "$lib/state/persistence/remote-sync";
import { getEquippedWeaponId, getItemQty } from "$lib/state/rpg/inventory-api";
import { getItemDef } from "$lib/domain/items";
import { inventoryEncumbranceRatio } from "$lib/domain/animation/player-animation";
import { toolKindOf } from "$lib/domain/gathering/gather-system";
import { OPEN_FLAME_BONUS } from "$lib/domain/exposure/exposure-context";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgProfile, equipLocalWeapon, applyRpgState } from "$lib/state/rpg-actions.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { cooldownsState, debugConfig } from "$lib/state/runtime-ui-state.svelte";
import { tickStamina, stamina, staminaConfig } from "$lib/state/rpg/stamina.svelte";
import { tickCritSetupDecay } from "$lib/state/rpg/crit-setup.svelte";
import { tickThirst, tickHunger, loadSurvival } from "$lib/state/rpg/survival.svelte";
import {
  tickStatusEffects,
  getStatusModifiers,
  loadStatuses,
  applyStatusEffect,
  statusState,
} from "$lib/state/rpg/status-effects.svelte";
import { loadWounds, tickWounds } from "$lib/state/rpg/wounds.svelte";
import { registerPlayerFeedback, registerPlayerHp, emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { setEnvironment } from "$lib/state/environment-state.svelte";
import { tickWetnessState, wetnessState } from "$lib/state/rpg/wetness.svelte";
import { setColdAccumulator } from "$lib/state/rpg/cold-exposure.svelte";
import { tickPlacedReactionSystem } from "$lib/core/systems/exposure/exposure-system";
import { ExposureResource } from "$lib/core/systems/exposure/exposure-resource";
import {
  VisualPresentationResource,
  registerCampfireVisual,
  tickVisualPresentation,
  clearVisualPresentation,
} from "$lib/core/systems/visual/visual-presentation-system.js";
import { buildCarcassSprite } from "$lib/core/systems/animals/carcass-runtime";
import { createGatherableRenderSprite } from "$lib/core/systems/gatherable-render-adapter";
import { Category, ITEM_DEFINITIONS, resolveItemVisuals, traitOf } from "$lib/domain/items";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";
import {
  ItemPlacementResource,
  updateItemPlacementPreviewSystem,
  placeItemSystem,
  spawnPlacedItemSystem,
  getItemTexture,
  applyGroundItemVisualScale,
  isValidItemPlacementGrid,
} from "$lib/core/systems/item-placement/item-placement-system";
import { StatusId } from "$lib/domain/systems/status-types";
import { getPlayerJointAnchors } from "$lib/core/systems/player-animation/player-joint-anchors";
import { loadKnowledge } from "$lib/state/rpg/knowledge.svelte";
import { loadRecipes } from "$lib/state/rpg/crafting.svelte";
import { flushRpgFeedbackEvents } from "$lib/state/rpg/rpg-feedback-router";
import { triggerQuestEvent, dialogueState } from "$lib/state/rpg/quests.svelte";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { EntityId, SkillKey, InputAction, GameEvent } from "$lib/domain/game-events";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { awardSkillXp } from "$lib/state/rpg/skill-xp";
import { awardCharacterXp, getPlayerStats, getCharacterLevel, levelUpEvent } from "$lib/state/rpg/stats.svelte";
import { BASE_COMBAT_STATS, BASE_SURVIVAL_STATS } from "$lib/domain/stats/player-stat-growth";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { getPrefabDefinition } from "$lib/domain/definition-registry";
import {
  createRuntimeContext,
  createRuntimeRegistry,
  RuntimeScheduler,
  validateRuntimeRegistry,
} from "$lib/core/runtime/runtime";
import { defaultRuntimeFeature } from "$lib/core/runtime/default-feature";
import { composeEntityFromPrefab } from "$lib/core/runtime/prefabs";
import { loadScenarioIntoMap } from "$lib/core/systems/scenario/scenario-loader";
import { getScenario } from "$lib/domain/scenarios";
import { ENGINE_CONFIG } from "$lib/core/engine-config";
import {
  WeatherResource,
  weatherTickSystem,
  weatherOverlaySystem,
} from "$lib/core/systems/weather/weather-system";
import { syncHudCooldownsSystem } from "$lib/core/systems/hud-sync-system";
import { spawnResourceEntity, spawnCampSystem, spawnEnemy, spawnLandmark } from "$lib/core/systems/map/spawn-system";
import {
  hydrateEntitySnapshot,
  loadWorldSnapshot,
  PERSISTED_ENTITY_COMPONENT_KEYS,
  saveWorldSnapshot,
  serializeWorld,
  type ConstructionRuntimeSnapshot,
  type PersistedEntitySnapshot,
  type WorldResourcesSnapshot,
  type WorldSnapshot,
} from "$lib/core/persistence/world-snapshot";
import { FogSystem } from "$lib/core/systems/atmosphere/fog-system";
import { VisionSystem } from "$lib/core/systems/atmosphere/vision-system";
import { RainEffectSystem } from "$lib/core/systems/weather/rain-effect-system";
import { handleEnemyDeathSystem } from "$lib/core/systems/combat/enemy-death-system";
import {
  CollisionFootprints,
  PLAYER_BODY,
  computeRenderZ,
  isValidCollisionFootprint,
  resolveCollisionAabb,
  type CollisionFootprint,
} from "$lib/domain/collision";
import { createGameEventQueue, type QueuedGameEvent } from "$lib/domain/game-event-queue";
import { routeGameEventsToFeedback } from "$lib/core/systems/feedback/feedback-router";
import { getDiscoveryBark, type DiscoveryBarkId } from "$lib/domain/discovery/discovery-barks";
import { getActionFeedback } from "$lib/domain/feedback/action-feedback";
import {
  createFirstCampPresentationState,
  initFirstCampPresentation,
  updateFirstCampPresentation,
  type FirstCampPresentationState,
} from "$lib/core/systems/first-camp/first-camp-presentation";
import { FIRST_NIGHT_OMENS } from "$lib/domain/events/omen-events";
import { firstLoopProgress } from "$lib/state/rpg/quests.svelte";

export class GameEngine {
  private app!: Application;
  private onInteract: (target: Entity) => void;
  private onHudUpdate: (state: HudState) => void;
  private onContextMenu: GameEngineConfig["onContextMenu"];
  private onStationInteract?: GameEngineConfig["onStationInteract"];
  private onOpenCarcassPanel?: GameEngineConfig["onOpenCarcassPanel"];
  private onActiveCraftUpdate?: GameEngineConfig["onActiveCraftUpdate"];
  private containerEl: HTMLDivElement;

  // Bevy-aligned Resources / Singletons
  public inputResource = new InputResource();
  public mapResource = new MapResource();
  public vfxResource = new VFXResource();
  public movementConfig = new MovementConfig();
  public movementResource = new MovementResource();
  public playerAnimationResource = new PlayerAnimationResource();
  public interactionResource = new InteractionResource();
  public focusedGatherResource = new FocusedGatherResource();
  public buildingResource = new BuildingResource();
  public itemPlacementResource = new ItemPlacementResource();
  public exposureResource = new ExposureResource();
  public visualPresentationResource = new VisualPresentationResource();
  public combatConfig = new CombatConfig();
  public combatResource = new CombatResource();
  public eventQueue = createGameEventQueue();
  public lastFrameEvents: readonly QueuedGameEvent[] = [];
  public weatherResource = new WeatherResource();
  public fogSystem = new FogSystem();
  public rainEffectSystem = new RainEffectSystem();
  public renderResources: RenderResourceCache = createRenderResourceCache();
  private visionSystem = new VisionSystem();

  // Facing vector
  private playerFacing: { x: number; y: number } = { x: 0, y: 1 };
  private playerAnimState: AnimState = "idle";
  private lastEquippedWeapon: string | null = null;
  private lastObservedLevelUpSeq = 0;

  private enemySeq = 1;
  private animalSeq = 1;
  private devSpawnSeq = 1;
  private regenTimer = 0;
  /** Seconds of continuous cold exposure, for granting Vigilance XP in 10s ticks. */
  private coldXpTimer = 0;
  /** Seconds of continuous proximity to calm wildlife, for granting Woodcraft XP. */
  private woodcraftXpTimer = 0;
  /** Per-`${instanceId}:${effectId}` accumulators for equipped Possessed items — see curse-effect-system.ts. */
  private curseEffectTimers = new Map<string, number>();
  /** Bookkeeping for the current attended-crafting minigame window — reset in startCraftProcess(). */
  private craftMinigameWindowElapsed = 0;
  private craftMinigameWindowHit = false;
  private buildingChannel: ConstructionRuntimeSnapshot | null = null;
  private worldSaveAccumulator = 0;
  private lastWorldSnapshotJson = "";
  private readonly worldSaveStepSec = 1;

  private runtimeRegistry = createRuntimeRegistry([defaultRuntimeFeature]);
  private scheduler = new RuntimeScheduler([
    {
      id: "legacy.frame",
      phase: "simulation",
      run: (_ctx, dt) => this.tickFrame(dt),
    },
  ]);

  // Scene Graphs
  private worldContainer = new Container();
  private tileLayer = new Container();
  private entityLayer = new Container();
  private collisionOverlay = new Graphics();

  // Entity Sprite registry
  private entitySprites = new Map<string, Container>();
  private runtimeResources = {
    input: this.inputResource,
    map: this.mapResource,
    vfx: this.vfxResource,
    movementConfig: this.movementConfig,
    movement: this.movementResource,
    playerAnimation: this.playerAnimationResource,
    interaction: this.interactionResource,
    focusedGather: this.focusedGatherResource,
    building: this.buildingResource,
    combatConfig: this.combatConfig,
    combat: this.combatResource,
    weather: this.weatherResource,
    sprites: this.entitySprites,
  };
  private runtimeContext = createRuntimeContext(world, this.runtimeResources);

  // Player Entity & Sprite
  private playerEntity!: Entity;
  private cameraCenter = { x: 0, y: 0 };
  private playerSprite!: AnimatedSprite;
  private playerShadow!: Sprite;
  private attachmentSprites = new Map<string, Sprite>();
  private attachmentBasePoses = new Map<string, { x: number; y: number; rotation: number }>();
  private lastEquippedLoadout: Record<string, string | null> = {};

  // Night/weather overlays â€” screen-space, above worldContainer, below DOM HUD
  private nightOverlay!: Graphics;

  // Zoom parameters
  private zoom = 1.0;
  private targetZoom = 1.0;
  private minZoom = 0.5;
  private maxZoom = 3.0;
  private zoomIncrement = 0.1;
  private zoomSmoothing = 0.12;

  // Last HUD update cache
  private lastHud: HudState = { gx: -1, gy: -1, lookAt: null };

  // Facing vector
  private facing = { x: 0, y: 1 };

  // Player respawn anchor (camp centre), set in spawnEntities.
  private playerSpawn = { x: 0, y: 0 };

  // Enemy sprite colour registry â€” lets the AI system fetch the right warrior
  // frames per enemy without baking presentation into the ai component.
  private enemyColors = new Map<string, UnitColor>();

  private scenarioId: string | null = null;
  private collisionOverrides = new Map<string, CollisionFootprint>();

  // First-camp experience presentation state.
  private firstCampState: FirstCampPresentationState = createFirstCampPresentationState();

  // Debug environment-signal inspector (toggled with F8)
  private environmentInspector!: EnvironmentInspector;

  constructor(config: GameEngineConfig) {
    this.containerEl = config.container;
    this.onInteract = config.onInteract;
    this.onHudUpdate = config.onHudUpdate;
    this.onContextMenu = config.onContextMenu;
    this.onStationInteract = config.onStationInteract;
    this.onOpenCarcassPanel = config.onOpenCarcassPanel;
    this.onActiveCraftUpdate = config.onActiveCraftUpdate;
    this.scenarioId = config.scenarioId ?? null;
    this.lastObservedLevelUpSeq = levelUpEvent.seq;
  }

  public async init(): Promise<void> {
    try {
      const registryProblems = validateRuntimeRegistry(this.runtimeRegistry);
      if (registryProblems.length > 0) {
        throw new Error(`runtime registry invalid:\n- ${registryProblems.join("\n- ")}`);
      }

      this.app = new Application();
      await this.app.init({
        resizeTo: this.containerEl,
        background: Colors.world.dirt,
        antialias: false,
      });
      this.containerEl.appendChild(this.app.canvas);

      // Intercept div sits above the canvas so contextmenu target is a <div>.
      // Chrome bypasses contextmenu.preventDefault() on <canvas> for Shift+RMB;
      // routing events through a div avoids this browser-level override entirely.
      this.containerEl.style.position = 'relative';
      const inputIntercept = document.createElement('div');
      inputIntercept.style.cssText = 'position:absolute;inset:0;z-index:1;cursor:crosshair;';
      (this.app.canvas as HTMLElement).style.pointerEvents = 'none';
      this.containerEl.appendChild(inputIntercept);
      this.inputIntercept = inputIntercept;

      // Load first-party Ashenmoon bundle only; old sprite-pack bundles must not be eagerly preloaded.
      await this.renderResources.preloadAll();

      // Setup listeners via input resource
      const cleanInputListeners = this.inputResource.setupListeners(
        inputIntercept,
        this.worldContainer,
        () => this.buildingResource.isPlacementMode || this.itemPlacementResource.isPlacementMode,
        () => { this.cancelBuildingPlacement(); this.cancelItemPlacement(); },
        (screenX, screenY) => this.handleRightClickHold(screenX, screenY),
        () => this.interactionResource.currentTarget
      );

      // Save cleanup references
      this.cleanupInputListeners = cleanInputListeners;

      inputIntercept.addEventListener("wheel", this.onWheel, { passive: false });

      // Map generation: use scenario if active, otherwise procedural.
      if (this.scenarioId) {
        const sc = getScenario(this.scenarioId);
        if (sc) {
          if (sc.firstCampLayout) {
            buildMapSystem(this.mapResource, gameState.rpg.profile?.worldSeed ?? 12345, { carveCamp: sc.camp });
          } else {
            loadScenarioIntoMap(this.mapResource, sc);
          }
        } else {
          console.warn(`[scenario] unknown id "${this.scenarioId}", falling back to procedural`);
          buildMapSystem(this.mapResource, gameState.rpg.profile?.worldSeed ?? 12345);
        }
      } else {
        buildMapSystem(this.mapResource, gameState.rpg.profile?.worldSeed ?? 12345);
      }

      // Attach layers to stage
      this.entityLayer.sortableChildren = true;
      this.collisionOverlay.zIndex = 120_000;
      this.collisionOverlay.visible = debugConfig.showCollision;
      this.worldContainer.addChild(this.tileLayer);
      this.worldContainer.addChild(this.entityLayer);
      this.entityLayer.addChild(this.collisionOverlay);
      this.app.stage.addChild(this.worldContainer);

      // Atmospheric fog layer — above world, below night overlay.
      this.fogSystem.init();
      this.app.stage.addChild(this.fogSystem.layer);

      // Rain screen-space effect — above fog, below night overlay
      this.app.stage.addChild(this.rainEffectSystem.layer);

      // Night/weather overlay: covers the full screen in a dark rectangle.
      // Alpha is driven per-frame by visibilityMultiplier so day = transparent,
      // night = ~0.58 dark, night-near-fire = ~0.28.
      this.nightOverlay = new Graphics();
      this.nightOverlay.rect(0, 0, 4096, 4096).fill({ color: 0x000000 });
      this.nightOverlay.alpha = 0;
      this.app.stage.addChild(this.nightOverlay);

      this.visionSystem.init();
      this.app.stage.addChild(this.visionSystem.layer);

      // Debug environment inspector — top of stage so it's never occluded
      this.environmentInspector = new EnvironmentInspector(this.app.stage);

      // Draw map tiles
      drawTerrainSystem(this.mapResource, this.tileLayer);

      // Populate entities
      this.spawnEntities();

      // Trigger the cold-firepit discovery bark once on init.
      initFirstCampPresentation({
        map: this.mapResource,
        playerTile: { x: Math.floor(this.mapResource.mapW / 2), y: Math.floor(this.mapResource.mapH / 2) },
        emitBark: (id) => this.emitDiscoveryBark(id),
        emitOmen: () => this.emitFirstNightOmen(),
        state: this.firstCampState,
      });

      // Survival state: restore persisted thirst/statuses and hook the
      // feedback + hp sinks so state modules can reach the canvas/player.
      loadSurvival();
      loadStatuses();
      loadWounds();
      loadKnowledge();
      loadRecipes();
      loadAudioSettings();

      // Browsers block audio until a gesture; resume the context on the first one.
      const unlockOnFirstInput = (): void => {
        unlockAudio();
        window.removeEventListener("keydown", unlockOnFirstInput);
        window.removeEventListener("pointerdown", unlockOnFirstInput);
      };
      window.addEventListener("keydown", unlockOnFirstInput);
      window.addEventListener("pointerdown", unlockOnFirstInput);
      registerPlayerFeedback((text, tone) => {
        const color =
          tone === "danger"
            ? Colors.ui.error
            : tone === "warning"
              ? Colors.ui.warning
              : tone === "good"
                ? Colors.ui.success
                : Colors.ui.info;
        spawnEnvFloatingText(this.vfxResource, text, color, this.playerEntity.position!, this.entityLayer);
      });
      registerPlayerHp((delta) => {
        const h = this.playerEntity.health;
        if (!h) return;
        h.current = Math.max(0, Math.min(h.max, h.current + delta));
        this.syncPlayerHp();
      });

      // Main ticking loop schedule runner
      window.addEventListener("beforeunload", this.flushWorldSnapshotBeforeUnload);
      this.app.ticker.add((ticker) => this.tick(ticker.deltaTime / 60));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      devConsole.log("Engine initialization failed: " + msg, "error");
      if (stack) devConsole.log(stack, "error");
      console.error("GameEngine init crash:", err);
    }
  }

  private cleanupInputListeners?: () => void;
  private inputIntercept: HTMLDivElement | null = null;
  private flushWorldSnapshotBeforeUnload = (): void => {
    this.flushWorldSnapshot(true);
  };

  public destroy(): void {
    this.flushWorldSnapshot(true);
    window.removeEventListener("beforeunload", this.flushWorldSnapshotBeforeUnload);
    if (this.cleanupInputListeners) {
      this.cleanupInputListeners();
    }
    if (this.inputIntercept) {
      this.inputIntercept.removeEventListener("wheel", this.onWheel);
    }
    registerPlayerFeedback(null);
    registerPlayerHp(null);

    this.app.destroy(true, { children: true });
    clearVisualPresentation(this.visualPresentationResource);
    world.clear();
    this.entitySprites.clear();

    // Clear active effects pools
    for (const p of this.vfxResource.particles) p.graphic.destroy();
    for (const ft of this.vfxResource.floatingTexts) ft.textObj.destroy();
    for (const r of this.vfxResource.shockwaveRings) r.graphic.destroy();
    for (const a of this.vfxResource.slashArcs) a.graphic.destroy();

    this.vfxResource.particles = [];
    this.vfxResource.spriteParticles = [];
    this.vfxResource.floatingTexts = [];
    this.vfxResource.shockwaveRings = [];
    this.vfxResource.slashArcs = [];
    this.enemyColors.clear();
    this.animalSeq = 0;
    this.vfxResource.activeShakes.clear();
    this.vfxResource.baseScales.clear();

    this.vfxResource.strikeRing?.destroy();
    this.vfxResource.tremorLine?.destroy();
    this.vfxResource.placementCompass?.destroy();
    for (const ring of this.vfxResource.processProgressRings.values()) ring.destroy();
    this.vfxResource.processProgressRings.clear();
    for (const ring of this.vfxResource.campfireFuelRings.values()) ring.destroy();
    this.vfxResource.campfireFuelRings.clear();
    this.vfxResource.selectionRing?.destroy();
    this.vfxResource.comboRing?.destroy();
    this.vfxResource.fourfoldRing?.destroy();
  }

  private onWheel = (e: WheelEvent): void => {
    if (devConsole.open) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    this.targetZoom = Math.max(
      this.minZoom,
      Math.min(this.maxZoom, this.targetZoom + direction * this.zoomIncrement)
    );
  };

  private tick(dt: number): void {
    this.scheduler.tick(this.runtimeContext, dt);
  }

  private tickFrame(dt: number): void {
    try {
      // Tick resource regeneration system
      this.regenTimer += dt;
      if (this.regenTimer >= 10) {
        this.regenTimer = 0;
        tickRegenerationSystem(this, Date.now());
      }

      this.checkLoadoutChanged();

      // Check if player cancels building channeling by trying to move
      if (this.buildingChannel) {
        const isMovingInput =
          this.inputResource.isActionPressed(InputAction.MoveUp) ||
          this.inputResource.isActionPressed(InputAction.MoveDown) ||
          this.inputResource.isActionPressed(InputAction.MoveLeft) ||
          this.inputResource.isActionPressed(InputAction.MoveRight) ||
          this.movementResource.isDashing;

        if (isMovingInput) {
          spawnEnvFloatingText(this.vfxResource, "building cancelled", Colors.ui.error, this.playerEntity.position!, this.entityLayer);
          this.buildingChannel = null;
          this.setPlayerAnim("idle");
        }
      }

      // Run player movement system
      let wasSprinting = false;
      if (devFlags.spectatorEnabled) {
        // Move the spectator camera center instead of player
        let inputX = 0;
        let inputY = 0;
        if (this.inputResource.isActionPressed(InputAction.MoveUp)) inputY = -1;
        if (this.inputResource.isActionPressed(InputAction.MoveDown)) inputY = 1;
        if (this.inputResource.isActionPressed(InputAction.MoveLeft)) inputX = -1;
        if (this.inputResource.isActionPressed(InputAction.MoveRight)) inputX = 1;

        if (inputX !== 0 || inputY !== 0) {
          const len = Math.sqrt(inputX * inputX + inputY * inputY);
          const dirX = inputX / len;
          const dirY = inputY / len;
          const isSprinting = this.inputResource.isActionPressed(InputAction.Sprint);
          const baseSpeed = TILE * 6; // Match player base speed (TILE * 6)
          const speed = baseSpeed * (isSprinting ? 3.0 : 1.5) * 2;
          
          this.cameraCenter.x += dirX * speed * dt;
          this.cameraCenter.y += dirY * speed * dt;

          const maxW = (this.mapResource.mapW - 1) * TILE;
          const maxH = (this.mapResource.mapH - 1) * TILE;
          this.cameraCenter.x = Math.max(0, Math.min(maxW, this.cameraCenter.x));
          this.cameraCenter.y = Math.max(0, Math.min(maxH, this.cameraCenter.y));
        }

        // Keep player stationary
        this.setPlayerAnim("idle");
      } else {
        // Run player movement system normally
        wasSprinting = playerMovementSystem(
          world,
          this.movementResource,
          this.inputResource,
          this.movementConfig,
          this.vfxResource,
          this.mapResource,
          dt,
          this.playerSprite,
          (state) => this.setPlayerAnim(state),
          this.entityLayer,
          this.combatResource,
          this.playerAnimationResource,
        );
        // Sync camera center to player
        this.cameraCenter.x = this.playerEntity.position!.x;
        this.cameraCenter.y = this.playerEntity.position!.y;
      }

      // Zoom Lerp update
      const rate = Math.min(1.0, this.zoomSmoothing * 60 * dt);
      this.zoom += (this.targetZoom - this.zoom) * rate;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

      // Sync camera matrices
      cameraShakeSystem(
        this.vfxResource,
        dt,
        this.app.screen,
        this.cameraCenter,
        this.zoom,
        this.worldContainer
      );

      // Recalculate mouse world position based on current screen coordinates and updated camera transform
      const localMouse = this.worldContainer.toLocal(this.inputResource.mouseScreen);
      this.inputResource.mouseWorld = { x: localMouse.x, y: localMouse.y };

      // Update targeting selections based on mouse coordinates
      updateTargetSystem(
        world,
        this.inputResource,
        this.mapResource,
        this.interactionResource,
        this.playerEntity,
        this.entitySprites,
        this.buildingResource.isPlacementMode,
        (f) => { this.facing = f; }
      );

      // Focused Gathering runs first so it can claim the node and swallow clicks
      // before interaction/combat see them. While a session is live, the player's
      // own interaction and attacks pause (enemies still act).
      runFocusedGatherSystem(
        world,
        this.inputResource,
        this.interactionResource,
        this.focusedGatherResource,
        this.vfxResource,
        this.entityLayer,
        this.entitySprites,
        dt,
        {
          triggerQuestEvent,
          setPlayerAnim: (state) => this.setPlayerAnim(state),
          onHit: (entity, yieldName, quantity) => this.handleHit(entity, yieldName, quantity),
          zeroCooldowns: gameState.rpg.profile === null,
          map: this.mapResource,
        }
      );
      renderFocusedGatherSystem(this.focusedGatherResource, this.entityLayer);
      const focusedGatherActive = this.focusedGatherResource.session !== null;

      // Right-click (short press < 300ms) directly triggers interaction on the hovered target.
      if (
        this.inputResource.pendingRightInteract &&
        !this.buildingResource.isPlacementMode &&
        !this.itemPlacementResource.isPlacementMode
      ) {
        this.inputResource.pendingRightInteract = false;
        if (this.interactionResource.currentTarget !== null) {
          this.inputResource.pendingInteract = true;
        }
      }

      // Update building placements preview position
      updatePlacementPreviewSystem(
        this.inputResource,
        this.buildingResource,
        this.mapResource,
        this.playerEntity.position!
      );

      // Update item placement preview position
      updateItemPlacementPreviewSystem(
        this.inputResource,
        this.itemPlacementResource,
        this.mapResource,
        this.playerEntity.position!
      );

      // Run building placement triggers
      if (
        this.buildingResource.isPlacementMode &&
        this.buildingResource.currentPlacementType &&
        this.buildingResource.previewSprite
      ) {
        const wantsPlacement =
          this.inputResource.isActionPressed(InputAction.Harvest) ||
          this.inputResource.pendingInteract ||
          this.inputResource.pendingAttack;
        this.inputResource.pendingInteract = false;
        this.inputResource.pendingAttack = false;
        if (wantsPlacement) {
          const type = this.buildingResource.currentPlacementType;
          const mx = Math.floor(this.inputResource.mouseWorld.x / TILE);
          const my = Math.floor(this.inputResource.mouseWorld.y / TILE);
          if (isValidPlacement(mx, my, type, this.mapResource, this.playerEntity.position!)) {
            placeBuildingSystem(
              type,
              this.buildingResource.currentPlacementSourceItemId,
              mx,
              my,
              world,
              this.mapResource,
              this.vfxResource,
              this.entityLayer,
              this.entitySprites,
              triggerQuestEvent,
              () => this.cancelBuildingPlacement(),
              this.buildingResource.onPlacementCompleteCb,
              this.visualPresentationResource,
            );
          } else {
            spawnEnvFloatingText(
              this.vfxResource,
              "❌ Invalid Position!",
              Colors.ui.error,
              this.playerEntity.position!,
              this.entityLayer
            );
          }
        }
      } else if (
        this.itemPlacementResource.isPlacementMode &&
        this.itemPlacementResource.currentItemId &&
        this.itemPlacementResource.previewSprite
      ) {
        const wantsPlacement =
          this.inputResource.isActionPressed(InputAction.Harvest) ||
          this.inputResource.pendingInteract ||
          this.inputResource.pendingAttack;
        this.inputResource.pendingInteract = false;
        this.inputResource.pendingAttack = false;
        if (wantsPlacement) {
          const itemId = this.itemPlacementResource.currentItemId;
          const mx = Math.floor(this.inputResource.mouseWorld.x / TILE);
          const my = Math.floor(this.inputResource.mouseWorld.y / TILE);
          if (isValidItemPlacementGrid(mx, my, this.mapResource, this.playerEntity.position!)) {
            placeItemSystem(
              itemId,
              mx,
              my,
              world,
              this.mapResource,
              this.vfxResource,
              this.entityLayer,
              this.entitySprites,
              () => this.cancelItemPlacement(),
              this.itemPlacementResource.onPlacementCompleteCb
            );
          } else {
            spawnEnvFloatingText(
              this.vfxResource,
              "❌ Invalid Position!",
              Colors.ui.error,
              this.playerEntity.position!,
              this.entityLayer
            );
          }
        }
      } else if (!focusedGatherActive) {
        // Run interactions updates
        runInteractionSystem(
          world,
          this.inputResource,
          this.interactionResource,
          this.vfxResource,
          dt,
          this.playerSprite,
          (state) => this.setPlayerAnim(state),
          this.entityLayer,
          this.entitySprites,
          this.onInteract,
          (txt) => devConsole.log(txt),
          triggerQuestEvent,
          dialogueState,
          this.buildingResource.isPlacementMode,
          this.movementResource.isDashing,
          (entity, yieldName, quantity) => this.handleHit(entity, yieldName, quantity),
          this.mapResource,
          this.onStationInteract,
          { raining: this.weatherResource.state.raining },
          this.onOpenCarcassPanel,
          this.eventQueue,
          this.playerAnimationResource,
        );
      }

      // Run building interior fading system
      runBuildingInteriorSystem(world, this.entitySprites, dt);

      // --- Combat ---
      // Evade (neutral dash) also dodges enemy strikes: mirror the movement
      // invulnerability into the damageable component so the shared damage path
      // honours it, then decay the player's own i-frame timer.
      const playerHealth = this.playerEntity.health!;
      if (this.movementResource.isInvulnerable) {
        playerHealth.invulnTimer = Math.max(
          playerHealth.invulnTimer,
          this.movementResource.invulnTimer
        );
      }
      if (playerHealth.invulnTimer > 0) playerHealth.invulnTimer -= dt;
      if (this.attackAnimLockTimer > 0) this.attackAnimLockTimer -= dt;

      // The player's own swings pause during a focused-gathering session; clicks
      // belong to the minigame.
      if (!focusedGatherActive) {
        // Weapon-driven combat owns all normal player attacks. Legacy combo
        // systems remain in source for isolated tests/dev comparison, but are not
        // reachable from normal play.
        updateWeaponGuardSystem({
          inputs: this.inputResource,
          combat: this.combatResource,
          player: this.playerEntity,
          isPlacementMode: this.buildingResource.isPlacementMode,
          isDashing: this.movementResource.isDashing,
          events: this.eventQueue,
        });
        weaponAttackSystem({
          world,
          inputs: this.inputResource,
          combat: this.combatResource,
          config: this.combatConfig,
          vfx: this.vfxResource,
          entityLayer: this.entityLayer,
          map: this.mapResource,
          dt,
          player: this.playerEntity,
          setPlayerAnim: (state) => this.setPlayerAnim(state),
          isPlacementMode: this.buildingResource.isPlacementMode,
          isDashing: this.movementResource.isDashing,
          onEnemyKilled: (enemy) => handleEnemyDeathSystem(
            enemy,
            this.vfxResource,
            this.entityLayer,
            this.entitySprites,
            this.enemyColors,
            this.playerEntity.position!
          ),
          events: this.eventQueue,
        });

      } else {
        this.inputResource.pendingDrivingThrust = null;
      }

      enemyAiSystem(
        world,
        this.mapResource,
        this.combatConfig,
        this.combatResource,
        dt,
        this.playerEntity,
        this.vfxResource,
        this.entityLayer,
        this.entitySprites,
        (_entity, state) => this.renderResources.actorFrames("wolf", state as AnimState) as Texture[],
        this.eventQueue
      );

      this.animalSeq = animalEcologySystem(
        world,
        this.mapResource,
        dt,
        this.playerEntity,
        this.combatConfig,
        this.combatResource,
        this.vfxResource,
        this.entityLayer,
        this.entitySprites,
        findLitCampfires(world),
        this.worldEventTimeOfDay(),
        this.weatherResource.state.raining,
        this.animalSeq,
        this.eventQueue,
      );

      // Woodcraft XP: reward stalking — time near calm wildlife, in 4s ticks.
      if (this.playerEntity.position) {
        const pc = { x: this.playerEntity.position.x + TILE / 2, y: this.playerEntity.position.y + TILE / 2 };
        const nearCalm = world
          .with("animal", "position")
          .entities.some((e) => e.animal && isCalmNearby(animalCenterRuntime(e), pc));
        if (nearCalm) {
          this.woodcraftXpTimer += dt;
          if (this.woodcraftXpTimer >= 4) {
            this.woodcraftXpTimer -= 4;
            awardSkillXp(SkillKey.Woodcraft, 3, this.vfxResource, this.playerEntity.position, this.entityLayer);
          }
        } else {
          this.woodcraftXpTimer = 0;
        }
      }

      tickCurseEffects(
        collectCursedEquipped(gameState.rpg.profile?.loadout),
        this.curseEffectTimers,
        dt,
        this.playerEntity,
      );

      tickEnemyBleedSystem(
        world,
        this.combatResource,
        this.combatConfig,
        this.vfxResource,
        this.entityLayer,
        dt,
        (enemy) => handleEnemyDeathSystem(
          enemy,
          this.vfxResource,
          this.entityLayer,
          this.entitySprites,
          this.enemyColors,
          this.playerEntity.position!
        ),
        this.eventQueue
      );

      knockbackSystem(world, this.mapResource, this.entitySprites, dt);
      tickTrapSystem(
        world,
        dt,
        this.vfxResource,
        this.entityLayer,
        this.entitySprites,
        this.combatConfig,
        (trapEnt) => {
          const container = this.entitySprites.get(trapEnt.id);
          if (container && container.children.length >= 2) {
            const interiorContainer = container.children[0] as Container;
            const shellContainer = container.children[1] as Container;
            drawBuildingVisuals(trapEnt.building?.type ?? "snap_trap", 5, interiorContainer, shellContainer, trapEnt);
          }
        }
      );

      // Pin the player sprite after any knockback displacement.
      this.playerSprite.x = this.playerEntity.position!.x + TILE / 2;
      this.playerSprite.y = this.playerEntity.position!.y + TILE;
      this.updateAdaptivePlayerAnimation(dt);
      this.updatePlayerVisualFeedback(dt);
      this.playerSprite.alpha = devFlags.spectatorEnabled ? 0.55 : 1.0;

      // --- Survival ---
      // Thirst drains with activity; statuses tick once per accumulated second
      // and hand back any pulse damage (bleeding, sickness fever). Vigilance slows
      // decay: the multiplier is the effective decay stat over its base.
      const survivalStats = getPlayerStats().survival;
      const moving = this.playerAnimState === "run" || this.playerAnimState === "walk";
      const laboring = this.interactionResource.gatheringTarget !== null;
      tickThirst(
        dt,
        { moving, laboring, raining: this.weatherResource.state.raining },
        survivalStats.thirstDecayPerMinute / BASE_SURVIVAL_STATS.thirstDecayPerMinute,
      );
      tickHunger(
        dt,
        { moving, laboring },
        survivalStats.hungerDecayPerMinute / BASE_SURVIVAL_STATS.hungerDecayPerMinute,
      );

      weatherTickSystem(
        world,
        this.weatherResource,
        this.vfxResource,
        this.mapResource,
        this.playerEntity,
        this.entityLayer,
        dt,
        (k, r) => this.isPlayerNearForestAnimalZone(k, r),
        () => this.hasPredatorAndPreyAnimals(),
        () => this.worldEventTimeOfDay(),
        this.eventQueue,
      );

      tickCampfireEntities(world, dt, { raining: this.weatherResource.state.raining });
      tickVisualPresentation(world, this.weatherResource, this.vfxResource, this.entityLayer, this.visualPresentationResource, dt);

      // Wetness system — must run before weatherOverlaySystem so its multiplier is fresh
      if (this.playerEntity.position) {
        const playerCenter = {
          x: this.playerEntity.position.x + TILE / 2,
          y: this.playerEntity.position.y + TILE / 2,
        };
        const playerSignals = sampleEnvironmentAt(world, this.weatherResource, playerCenter);
        const isSheltered = playerSignals.shelter > 0;
        const nearFire = playerSignals.heat > 0;
        tickWetnessState(dt, this.weatherResource.state.raining, isSheltered, nearFire);
      }

      if (this.playerEntity.position) {
        const pgx = Math.round(this.playerEntity.position.x / TILE);
        const pgy = Math.round(this.playerEntity.position.y / TILE);
        const env = this.getAmbientEnvironment(pgx, pgy);
        setEnvironment(env);

        if (env.temperature <= 0) {
          applyStatusEffect(StatusId.Hypothermia, 5, "environment");
          // Vigilance hardens against the cold: +5 XP per 10s of continuous exposure.
          this.coldXpTimer += dt;
          if (this.coldXpTimer >= 10) {
            this.coldXpTimer -= 10;
            awardSkillXp(SkillKey.Vigilance, 5, this.vfxResource, this.playerEntity.position!, this.entityLayer);
          }
        } else {
          this.coldXpTimer = 0;
        }
      }

      tickPlacedReactionSystem(world, this.mapResource, this.exposureResource, dt, this.weatherResource, this.eventQueue);
      tickWounds(dt);

      const statusTick = tickStatusEffects(dt);
      if (statusTick.hpDelta !== 0) {
        playerHealth.current = Math.max(
          0,
          Math.min(playerHealth.max, playerHealth.current + statusTick.hpDelta)
        );
      }
      if (statusTick.nonLethalHpDelta !== 0) {
        playerHealth.current = Math.max(1, playerHealth.current + statusTick.nonLethalHpDelta);
      }

      if (playerHealth.current <= 0) this.respawnPlayer();
      this.syncPlayerHp();
      flushRpgFeedbackEvents({
        vfx: this.vfxResource,
        playerPos: this.playerEntity.position!,
        entityLayer: this.entityLayer,
      });

      // Regenerate stamina when not sprinting (slower while in combat,
      // slower still while sick/exhausted). Pool size and the status regen
      // multiplier both come from the stat layer.
      const combatStats = getPlayerStats().combat;
      if (staminaConfig.max !== combatStats.maxStamina) {
        staminaConfig.max = combatStats.maxStamina;
      }
      tickCritSetupDecay(dt);
      if (!wasSprinting) {
        // Status mult is already folded into the stat layer; the ratio against
        // the level-1 base scales the pool's own regen rates by level growth.
        tickStamina(
          dt,
          this.combatResource.inCombatTimer > 0,
          combatStats.staminaRegenPerSecond / BASE_COMBAT_STATS.staminaRegenPerSecond
        );
      }

      // Update Svelte cooldown progress bars
      syncHudCooldownsSystem(
        this.movementResource,
        this.movementConfig,
        this.focusedGatherResource,
        this.combatResource
      );

      const frameEvents = this.eventQueue.drain();
      routeGameEventsToFeedback(frameEvents, {
        world,
        vfx: this.vfxResource,
        entityLayer: this.entityLayer,
      });
      this.lastFrameEvents = frameEvents;

      if (levelUpEvent.seq > this.lastObservedLevelUpSeq) {
        this.lastObservedLevelUpSeq = levelUpEvent.seq;
        if (this.playerEntity.position) {
          const pcx = this.playerEntity.position.x + TILE / 2;
          const pcy = this.playerEntity.position.y + TILE / 2;
          spawnLevelUpBurst(this.vfxResource, this.entityLayer, pcx, pcy);
          playSound("player.levelup");
        }
      }

      // Pin shadow to player feet
      const shadowPos = this.playerEntity.position!;
      this.playerShadow.x = shadowPos.x + TILE / 2;
      this.playerShadow.y = shadowPos.y + TILE;

      // Run VFX particle movements
      particleUpdateSystem(this.vfxResource, dt, this.entityLayer);
      spriteParticleUpdateSystem(this.vfxResource, dt, this.entityLayer);
      hitFlashUpdateSystem(this.vfxResource, dt, this.entityLayer);
      floatingTextUpdateSystem(this.vfxResource, dt, this.entityLayer);
      shockwaveUpdateSystem(this.vfxResource, dt, this.entityLayer);
      slashArcUpdateSystem(this.vfxResource, dt, this.entityLayer);
      cloudDriftSystem(this.vfxResource, dt, this.mapResource.mapW);

      // Footsteps smoke trail updates
      const isMoving = this.playerAnimState === "run";
      const isSprinting = this.inputResource.isActionPressed(InputAction.Sprint);
      footstepParticleSystem(
        this.vfxResource,
        dt,
        this.playerEntity.position!,
        isMoving,
        this.movementResource.isDashing,
        isSprinting,
        this.entityLayer,
        (speed) => {
          const terrain = this.currentFootstepTerrain();
          playSound("player.footstep", {
            conditions: { terrain, speed }
          });
        }
      );

      // Node shakes and squash recoveries updates
      shakeAndSquashUpdateSystem(
        this.vfxResource,
        dt,
        this.entitySprites,
        world,
        this.devShakeIntensityVal
      );

      // Audio: keep the listener on the player and tick biome ambience.
      const listenerPos = this.playerEntity.position!;
      setListener(listenerPos.x + TILE / 2, listenerPos.y + TILE / 2);
      tickAmbient(dt, this.currentAmbientBiome());

      // Render targeting circles
      // Process building channeling tick
      if (this.buildingChannel) {
        // Face the player towards the building site
        const building = world.entities.find((e) => e.id === this.buildingChannel!.buildingId);
        if (building && building.position && this.playerEntity.position) {
          const dx = building.position.x - this.playerEntity.position.x;
          if (dx < 0) this.playerSprite.scale.x = -Math.abs(this.playerSprite.scale.x);
          else if (dx > 0) this.playerSprite.scale.x = Math.abs(this.playerSprite.scale.x);
        }

        this.buildingChannel.timer += dt;

        // Every 0.4 seconds, play a hit animation/sound/VFX
        const prevHitIndex = Math.floor((this.buildingChannel.timer - dt) / 0.4);
        const currentHitIndex = Math.floor(this.buildingChannel.timer / 0.4);
        if (currentHitIndex > prevHitIndex && this.buildingChannel.timer < this.buildingChannel.duration) {
          // Play hit animation
          this.setPlayerAnim("gather");
          
          if (building && building.position) {
            const spec = getBuildingSpec(building.building?.type ?? "");
            const buildingCenter = {
              x: building.position.x + (spec.footprint.w * TILE) / 2,
              y: building.position.y + (spec.footprint.h * TILE) / 2,
            };
            
            // Sound: stone clink for foundation/slab, wood chop/strike for others
            const stageName = spec.constructionStages?.[this.buildingChannel.nextStage - 1]?.name ?? "";
            const soundId = (stageName.includes("foundation") || stageName.includes("slab")) ? "gather.strike" : "gather.chop";
            playSound(soundId);

            // Particles & Shake
            spawnEnvParticles(this.vfxResource, Colors.building.particle, 6, "smoke", buildingCenter, this.entityLayer);
            this.vfxResource.cameraShake = {
              intensity: 1.5,
              duration: 0.15,
              time: 0,
            };
          }
        }

        if (this.buildingChannel.timer >= this.buildingChannel.duration) {
          const channel = this.buildingChannel;
          this.buildingChannel = null;
          this.setPlayerAnim("idle");

          this.completeBuildingChannel(channel).then((success) => {
            if (success) {
              playSound("build.place");
              if (building && building.position) {
                const spec = getBuildingSpec(building.building?.type ?? "");
                const buildingCenter = {
                  x: building.position.x + (spec.footprint.w * TILE) / 2,
                  y: building.position.y + (spec.footprint.h * TILE) / 2,
                };
                spawnEnvParticles(this.vfxResource, 0xffdc78, 25, "smoke", buildingCenter, this.entityLayer);
                spawnEnvFloatingText(this.vfxResource, "stage complete!", 0xffdc78, building.position, this.entityLayer);
              }
            } else {
              playSound("player.fellsweep.denied");
            }
          });
        }
      }

      // Render action timer displays
      const anyActionActive = !!(
        this.buildingChannel ||
        this.interactionResource.activeWorldAction ||
        this.interactionResource.activeCraftProcesses.size > 0 ||
        this.interactionResource.gatheringTarget
      );
      const precisionTap = anyActionActive && this.inputResource.focusedGatherTriggered;
      if (precisionTap) this.inputResource.focusedGatherTriggered = false;
      const CRAFT_MINIGAME_WINDOW_SEC = 1.5;

      // A player can only physically attend one station's minigame at a
      // time — pick whichever active, not-yet-completed craft they're
      // currently closest to and within minigame range of (or none). Other
      // simultaneously-running crafts still tick, just unattended, exactly
      // matching pre-per-station semantics scoped down to one entry.
      let attendedCraft: { runtime: CraftProcessRuntime; center: { x: number; y: number } } | null = null;
      {
        let nearestDist = Infinity;
        for (const runtime of this.interactionResource.activeCraftProcesses.values()) {
          if (runtime.completed) continue;
          const stationEnt = world.entities.find((e) => e.id === runtime.targetStationEntityId);
          if (!stationEnt?.position || !this.playerEntity.position) continue;
          const dx = (stationEnt.position.x - this.playerEntity.position.x) / TILE;
          const dy = (stationEnt.position.y - this.playerEntity.position.y) / TILE;
          const maxDist = runtime.stationId === "campfire" ? getCampfireHeatRadiusTiles(stationEnt) : 2.5;
          const dist = Math.hypot(dx, dy);
          if (dist <= maxDist && dist < nearestDist) {
            nearestDist = dist;
            attendedCraft = {
              runtime,
              center: { x: stationEnt.position.x + TILE / 2, y: stationEnt.position.y + TILE * 0.6 },
            };
          }
        }
      }

      if (this.buildingChannel) {
        const buildingEnt = world.entities.find((e) => e.id === this.buildingChannel!.buildingId);
        const buildCenter = (buildingEnt?.position && buildingEnt.building)
          ? (() => {
              const spec = getBuildingSpec(buildingEnt.building!.type ?? "");
              return {
                x: buildingEnt.position!.x + (spec.footprint.w * TILE) / 2,
                y: buildingEnt.position!.y + (spec.footprint.h * TILE) / 2,
              };
            })()
          : null;
        this.vfxResource.tremorLine.visible = false;
        this.vfxResource.strikeRing.visible = false;
        this.vfxResource.craftSequenceMarks.visible = false;
        if (buildCenter) {
          const progress = this.buildingChannel.timer / this.buildingChannel.duration;
          const snap = updatePlacementCompass(
            this.vfxResource.placementCompass, buildCenter, progress, precisionTap,
          );
          if (snap) this.buildingChannel.timer = this.buildingChannel.duration;
        } else {
          this.vfxResource.placementCompass.visible = false;
        }
      } else if (this.interactionResource.activeWorldAction) {
        const runtime = this.interactionResource.activeWorldAction;
        const carcassEnt = world.entities.find(
          (e) => e.id === runtime.action.executeIntent.targetId,
        );
        const carcassCenter = carcassEnt?.position
          ? { x: carcassEnt.position.x + TILE / 2, y: carcassEnt.position.y + TILE * 0.72 }
          : null;
        this.vfxResource.placementCompass.visible = false;
        this.vfxResource.strikeRing.visible = false;
        this.vfxResource.craftSequenceMarks.visible = false;
        if (carcassCenter) {
          const actionProgress = runtime.elapsedSec / runtime.durationSec;
          const hit = updateTremorLine(
            this.vfxResource.tremorLine,
            carcassCenter,
            runtime.elapsedSec,
            actionProgress,
            precisionTap,
          );
          if (hit) this.interactionResource.activeWorldActionPrecision = true;
        } else {
          this.vfxResource.tremorLine.visible = false;
        }
      } else if (attendedCraft) {
        const { runtime, center: craftCenter } = attendedCraft;
        this.vfxResource.placementCompass.visible = false;

        {
          const actionProgress = runtime.durationSec > 0 ? Math.min(0.999, runtime.elapsedSec / runtime.durationSec) : 0;
          let hit = false;
          if (runtime.minigameKind === "strike") {
            this.vfxResource.tremorLine.visible = false;
            this.vfxResource.craftSequenceMarks.visible = false;
            const cycleProgress = (runtime.elapsedSec % CRAFT_MINIGAME_WINDOW_SEC) / CRAFT_MINIGAME_WINDOW_SEC;
            hit = updateStrikeRing(this.vfxResource.strikeRing, craftCenter, cycleProgress, "none", precisionTap);
          } else if (runtime.minigameKind === "tension") {
            this.vfxResource.strikeRing.visible = false;
            this.vfxResource.craftSequenceMarks.visible = false;
            hit = updateTremorLine(this.vfxResource.tremorLine, craftCenter, runtime.elapsedSec, actionProgress, precisionTap);
          } else {
            this.vfxResource.strikeRing.visible = false;
            this.vfxResource.tremorLine.visible = false;
            hit = updateSequenceMarks(this.vfxResource.craftSequenceMarks, craftCenter, runtime.elapsedSec, actionProgress, precisionTap);
          }

          if (hit) this.craftMinigameWindowHit = true;
          this.craftMinigameWindowElapsed += dt;
          if (this.craftMinigameWindowElapsed >= CRAFT_MINIGAME_WINDOW_SEC) {
            this.interactionResource.activeCraftProcesses.set(
              runtime.targetStationEntityId,
              recordMinigameWindow(runtime, this.craftMinigameWindowHit),
            );
            this.craftMinigameWindowElapsed = 0;
            this.craftMinigameWindowHit = false;
          }
        }
      } else {
        this.vfxResource.placementCompass.visible = false;
        this.vfxResource.tremorLine.visible = false;
        this.vfxResource.craftSequenceMarks.visible = false;
        this.interactionResource.activeWorldActionPrecision = false;
        const target = this.interactionResource.gatheringTarget;
        if (target?.position) {
          const solidKind = target.resource?.gatherableId
            ? (getGatherableDefinition(target.resource.gatherableId)?.solidKind ?? "none")
            : "none";
          const progress =
            1 - Math.max(0, this.interactionResource.gatherCooldownTimer) /
            this.interactionResource.currentGatherInterval;
          const hit = updateStrikeRing(
            this.vfxResource.strikeRing,
            {
              x: target.position.x + TILE / 2,
              y: target.position.y + (solidKind === "tree" ? TILE * 0.82 : solidKind === "rock" ? TILE * 0.60 : TILE * 0.55),
            },
            progress,
            solidKind,
            precisionTap,
          );
          if (hit) {
            this.interactionResource.gatherCooldownTimer *= 0.7;
            const burstColor = ringColorForSolidKind(solidKind);
            const bx = target.position.x + TILE / 2;
            const by = target.position.y + TILE / 2;
            for (let i = 0; i < 7; i++) {
              const g = new Graphics();
              g.circle(0, 0, 2.5).fill({ color: burstColor, alpha: 0.9 });
              const angle = (i / 7) * Math.PI * 2;
              const speed = 60 + Math.random() * 50;
              g.x = bx + Math.cos(angle) * 14;
              g.y = by + Math.sin(angle) * 14;
              this.vfxResource.particles.push({
                graphic: g,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20,
                gravity: 80,
                life: 0,
                maxLife: 0.3 + Math.random() * 0.2,
              });
              this.entityLayer.addChild(g);
            }
          }
        } else {
          this.vfxResource.strikeRing.visible = false;
        }
      }

      // Overall process/craft progress rings — independent of the minigame
      // VFX above (which times button-presses, not overall duration).
      // One ring per busy station, always visible regardless of range;
      // color signals walk-away safety, and a pulse signals ready-for-pickup.
      {
        const statuses = this.getActiveStationCraftStatuses();
        this.onActiveCraftUpdate?.(statuses);

        const seenStationIds = new Set<string>();
        for (const status of statuses) {
          seenStationIds.add(status.stationEntityId);
          let ring = this.vfxResource.processProgressRings.get(status.stationEntityId);
          if (!ring) {
            ring = new Graphics();
            ring.visible = false;
            this.entityLayer.addChild(ring);
            this.vfxResource.processProgressRings.set(status.stationEntityId, ring);
          }
          const busyEnt = world.entities.find((e) => e.id === status.stationEntityId);
          const busyCenter = busyEnt?.position
            ? { x: busyEnt.position.x + TILE / 2, y: busyEnt.position.y + TILE * 0.3 }
            : null;
          if (busyCenter) {
            updateProcessProgressRing(ring, busyCenter, status.progress, status.walkAwaySafe, status.readyForPickup);
          } else {
            ring.visible = false;
          }
        }

        // Destroy pooled rings for stations that are no longer busy.
        for (const [stationEntityId, ring] of this.vfxResource.processProgressRings) {
          if (seenStationIds.has(stationEntityId)) continue;
          this.entityLayer.removeChild(ring);
          ring.destroy();
          this.vfxResource.processProgressRings.delete(stationEntityId);
        }
      }

      // Always-on campfire fuel rings — independent of busy state, since fuel
      // matters even when nothing is cooking. One per lit campfire.
      {
        const seenCampfireIds = new Set<string>();
        for (const entity of world.with("campfire", "position").entities) {
          const campfire = entity.campfire;
          if (!campfire.isLit || campfire.fuelRemainingMs <= 0) continue;
          seenCampfireIds.add(entity.id);
          let ring = this.vfxResource.campfireFuelRings.get(entity.id);
          if (!ring) {
            ring = new Graphics();
            ring.visible = false;
            this.entityLayer.addChild(ring);
            this.vfxResource.campfireFuelRings.set(entity.id, ring);
          }
          const fuelFrac = campfire.fuelRemainingMs / (campfire.fuelCapacityMs ?? campfire.fuelRemainingMs);
          const ringPos = { x: entity.position.x + TILE / 2, y: entity.position.y + TILE * 0.85 };
          updateCampfireFuelRing(ring, ringPos, fuelFrac);
        }

        for (const [entityId, ring] of this.vfxResource.campfireFuelRings) {
          if (seenCampfireIds.has(entityId)) continue;
          this.entityLayer.removeChild(ring);
          ring.destroy();
          this.vfxResource.campfireFuelRings.delete(entityId);
        }
      }

      selectionRingUpdateSystem(
        this.vfxResource,
        dt,
        this.interactionResource.currentTarget,
        this.entitySprites
      );

      // Cull offscreen viewport entities/tiles
      cullViewportSystem(
        this.mapResource,
        this.cameraCenter,
        this.zoom,
        this.app.screen,
        this.entitySprites
      );

      weatherOverlaySystem(
        world,
        this.weatherResource,
        this.playerEntity,
        this.nightOverlay,
        this.worldContainer,
        (gx, gy) => this.shelterColdMultiplierAt(gx, gy),
        dt,
        wetnessState.penalties.coldBuildRateMult
      );

      this.rainEffectSystem.tick(dt, this.weatherResource.state.raining, {
        width: this.app.screen.width,
        height: this.app.screen.height,
      });

      // Atmospheric fog — collect lit campfire positions for local clearance
      const campfirePositions: { x: number; y: number; heatRadius: number }[] = [];
      for (const e of world.with("campfire", "position").entities) {
        if (e.campfire?.isLit && e.position) {
          campfirePositions.push({ x: e.position.x + 32, y: e.position.y + 32, heatRadius: getCampfireHeatRadiusTiles(e) });
        }
      }
      this.fogSystem.tick(dt, this.weatherResource.state.timeOfDay, this.weatherResource.state.raining, campfirePositions);
      this.visionSystem.layer.visible = !devFlags.spectatorEnabled;
      if (this.playerEntity.position && !devFlags.spectatorEnabled) {
        this.visionSystem.tick(
          dt,
          { width: this.app.screen.width, height: this.app.screen.height },
          this.playerEntity.position,
          this.weatherResource.state.timeOfDay,
          this.zoom,
        );
      }
      setColdAccumulator(this.weatherResource.coldAccumulator);

      this.updateRenderOrder();
      this.drawCollisionOverlay();

      // Debug signal inspector
      if (this.environmentInspector?.enabled) {
        this.environmentInspector.tick(
          world,
          this.weatherResource,
          this.inputResource.mouseWorld,
          this.inputResource.mouseScreen,
        );
      }

      // First-camp presentation: pond proximity barks + omen.
      if (this.playerEntity.position) {
        const gx = Math.floor(this.playerEntity.position.x / TILE);
        const gy = Math.floor(this.playerEntity.position.y / TILE);
        this.firstCampState.cleanWaterDrunk = firstLoopProgress.cleanWaterDrunk;
        this.firstCampState.campfireWoken = firstLoopProgress.campfireWoken;
        updateFirstCampPresentation({
          map: this.mapResource,
          playerTile: { x: gx, y: gy },
          emitBark: (id) => this.emitDiscoveryBark(id),
          emitOmen: () => this.emitFirstNightOmen(),
          state: this.firstCampState,
        });
      }

      // Push coordinates and lookAt entity HUD update
      this.saveWorldSnapshotIfChanged(dt);
      this.pushHudUpdate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      devConsole.log("Engine tick loop failed: " + msg, "error");
      if (stack) devConsole.log(stack, "error");
      console.error("GameEngine tick crash:", err);
      // Stop the ticker on error to prevent cascading crash logs
      this.app.ticker.stop();
    }
  }

  private spawnEntities(): void {
    const scenario = this.scenarioId ? getScenario(this.scenarioId) : null;
    const worldSnapshot = !scenario ? loadWorldSnapshot() : null;
    // Scenarios are clean rooms by default: the base-world furniture (camp,
    // decorations, seeded enemies) is opt-in per scenario. The base world (no
    // scenario) keeps all of it, so this branch is invisible to normal play.
    const wantCamp = scenario?.camp === true;
    const wantDecorations = !scenario || scenario.decorations === true;
    const spawnX = scenario?.spawnPoint.gx ?? Math.floor(this.mapResource.mapW / 2);
    const spawnY = scenario?.spawnPoint.gy ?? Math.floor(this.mapResource.mapH / 2);
    const startX = spawnX * TILE;
    const startY = spawnY * TILE;

    // Equip the scenario's starter tool so tool-gated gatherables are reachable
    // on load. The scenario panel can switch tools at runtime afterwards.
    if (scenario?.startTool) {
      equipLocalWeapon(scenario.startTool);
    }

    // Spawn player entity in ECS. Health lives here (faction "player") so the
    // same damage path handles the player and enemies; the HUD mirrors it.
    this.playerSpawn = { x: startX, y: startY + TILE };
    this.playerEntity = {
      id: EntityId.Player,
      position: { x: startX, y: startY + TILE, targetX: startX, targetY: startY + TILE },
      playerControlled: { speed: TILE * 6 },
      health: {
        current: gameState.rpg.profile?.hpCurrent ?? getPlayerStats().combat.maxHealth,
        max: getPlayerStats().combat.maxHealth,
        faction: "player",
        invulnTimer: 0,
      },
      knockback: { vx: 0, vy: 0, timer: 0 },
    };
    this.cameraCenter.x = startX;
    this.cameraCenter.y = startY + TILE;
    world.add(this.playerEntity);

    // Spawn shadow under player
    this.playerShadow = createStandeeShadow(ENGINE_CONFIG.ACTOR_VISUALS.HUMANOID_SHADOW_SCALE);
    this.playerShadow.x = startX + TILE / 2;
    this.playerShadow.y = startY + 2 * TILE;
    this.playerShadow.zIndex = computeRenderZ(this.playerShadow.y, -5);
    this.entityLayer.addChild(this.playerShadow);

    // Save starting loadout weapon
    const startW = gameState.rpg.profile?.loadout?.weapon;
    this.lastEquippedWeapon = startW ? (typeof startW === "string" ? startW : startW.itemId) : null;

    this.playerSprite = new AnimatedSprite(this.renderResources.actorFrames("player") as Texture[]);
    this.playerSprite.animationSpeed = 0.12;
    this.playerSprite.play();
    const scale = (TILE * ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_HEIGHT_TILES) / this.playerSprite.texture.height;
    this.playerBaseScale = scale;
    this.playerSprite.scale.set(scale);
    this.playerSprite.anchor.set(0.5, 1);
    this.playerSprite.x = startX + TILE / 2;
    this.playerSprite.y = startY + 2 * TILE;
    this.playerSprite.zIndex = computeRenderZ(this.playerSprite.y);
    this.entityLayer.addChild(this.playerSprite);
    this.entitySprites.set(EntityId.Player, this.playerSprite);

    if (worldSnapshot) {
      this.restoreWorldSnapshot(worldSnapshot);
    } else {
      // Campfire + Commander Vane. Scenarios only when opted in.
      if (wantCamp) {
        const { campfireGlow, campfireSprite } = spawnCampSystem(
          spawnX,
          spawnY,
          startX,
          startY,
          this.entityLayer,
          this.entitySprites,
          this.interactionResource,
          this.mapResource,
          this.renderResources.generatedTexture("campfireGlow"),
          (gx, gy, fp) => this.setTileFootprint(gx, gy, fp)
        );
        const campfireEntity = world.with("campfire").entities.find((e) => e.id === EntityId.Campfire);
        if (campfireEntity?.campfire) {
          registerCampfireVisual(
            this.visualPresentationResource,
            EntityId.Campfire,
            campfireSprite,
            campfireGlow,
            campfireEntity.campfire,
          );
        }
      }

      // Scatter resource nodes.
      catchUpRegeneration(this.mapResource.mapData.spawns, this.mapResource.forestMetadata.landmarks);
      const gatheredPickups = gameState.rpg.profile?.gatheredPickups ?? [];
      for (const spawn of this.mapResource.mapData.spawns) {
        if (gatheredPickups.includes(spawn.id)) continue;
        spawnResourceEntity(
          spawn.id,
          spawn.x,
          spawn.y,
          spawn.gatherableId,
          this.entityLayer,
          this.entitySprites,
          this.mapResource,
          this.runtimeRegistry,
          this.collisionOverrides
        );
      }

      // Restore legacy constructed buildings - real world only. A scenario is a clean
      // room and must not inherit the player's built structures.
      if (!scenario && gameState.rpg.profile && Array.isArray(gameState.rpg.profile.buildings)) {
        for (const b of gameState.rpg.profile.buildings) {
          spawnBuildingSystem(
            b.id,
            b.type,
            b.x,
            b.y,
            world,
            this.mapResource,
            this.entityLayer,
            this.entitySprites,
            b.stage,
            this.visualPresentationResource,
          );
        }
      }

      if (!scenario && gameState.rpg.profile && Array.isArray(gameState.rpg.profile.worldEntities)) {
        const gatheredLegacyPickups = new Set(gameState.rpg.profile.gatheredPickups ?? []);
        for (const entity of gameState.rpg.profile.worldEntities) {
          if (gatheredLegacyPickups.has(entity.id)) continue;
          if (entity.kind === "placed_item") {
            spawnPlacedItemSystem(
              entity.id,
              entity.itemId,
              entity.x,
              entity.y,
              world,
              this.entityLayer,
              this.entitySprites,
              entity.quantity,
            );
          }
        }
      }
    }

    // Scatter decorations. Base world always; scenarios only when opted in.
    if (wantDecorations) {
      spawnDecorationsSystem(this.mapResource, this.vfxResource, this.entityLayer);
    }

    // Spawn forest landmarks — procedural metadata for base world, explicit list for scenarios.
    if (!scenario && !worldSnapshot) {
      for (const lm of this.mapResource.forestMetadata.landmarks) {
        spawnLandmark(lm.kind, lm.x, lm.y, this.entityLayer, this.entitySprites, this.mapResource);
      }
    } else if (scenario?.landmarks) {
      for (const lm of scenario.landmarks) {
        spawnLandmark(lm.kind, lm.gx, lm.gy, this.entityLayer, this.entitySprites, this.mapResource);
      }
    }

    // Wildlife: the base world uses First Camp animal zones; scenarios only get
    // their explicitly listed combat enemies.
    if (!scenario && !worldSnapshot) {
      this.animalSeq = spawnInitialAnimalsSystem(this.mapResource, this.entityLayer, this.entitySprites, this.animalSeq);
    } else if (scenario?.enemies) {
      for (const e of scenario.enemies) {
        this.spawnEnemy(e.gx, e.gy);
      }
    }

    // Setup indicators overlay rings
    this.vfxResource.strikeRing = new Graphics();
    this.vfxResource.strikeRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.strikeRing);

    this.vfxResource.tremorLine = new Graphics();
    this.vfxResource.tremorLine.visible = false;
    this.entityLayer.addChild(this.vfxResource.tremorLine);

    this.vfxResource.placementCompass = new Graphics();
    this.vfxResource.placementCompass.visible = false;
    this.entityLayer.addChild(this.vfxResource.placementCompass);

    this.vfxResource.craftSequenceMarks = new Graphics();
    this.vfxResource.craftSequenceMarks.visible = false;
    this.entityLayer.addChild(this.vfxResource.craftSequenceMarks);

    // processProgressRings is a pool, created lazily per busy station (see the per-frame VFX block).

    this.vfxResource.selectionRing = new Graphics();
    this.vfxResource.selectionRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.selectionRing);

    this.vfxResource.comboRing = new Graphics();
    this.vfxResource.comboRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.comboRing);

    this.vfxResource.fourfoldRing = new Graphics();
    this.vfxResource.fourfoldRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.fourfoldRing);
  }

  private worldResourcesSnapshot(): WorldResourcesSnapshot {
    return {
      interaction: {
        activeProcesses: Array.from(this.interactionResource.activeProcesses.entries()).map(
          ([stationEntityId, runtime]) => ({ stationEntityId, runtime: structuredClone(runtime) }),
        ),
        activeWorldAction: structuredClone(this.interactionResource.activeWorldAction),
        activeWorldActionPrecision: this.interactionResource.activeWorldActionPrecision,
      },
      construction: this.buildingChannel ? structuredClone(this.buildingChannel) : null,
    };
  }

  private createWorldSnapshot(): WorldSnapshot {
    return serializeWorld(world, {
      worldSeed: gameState.rpg.profile?.worldSeed ?? null,
      scenarioId: this.scenarioId,
      resources: this.worldResourcesSnapshot(),
    });
  }

  private saveWorldSnapshotIfChanged(dt: number): void {
    if (this.scenarioId) return;
    this.worldSaveAccumulator += dt;
    if (this.worldSaveAccumulator < this.worldSaveStepSec) return;
    this.worldSaveAccumulator = 0;
    this.flushWorldSnapshot(false);
  }

  private flushWorldSnapshot(force: boolean): void {
    if (this.scenarioId) return;
    const snapshot = this.createWorldSnapshot();
    const nextJson = JSON.stringify(snapshot);
    if (!force && nextJson === this.lastWorldSnapshotJson) return;
    saveWorldSnapshot(snapshot);
    this.lastWorldSnapshotJson = nextJson;
  }

  private restoreWorldSnapshot(snapshot: WorldSnapshot): void {
    for (const entitySnapshot of snapshot.entities) {
      this.restoreSnapshotEntity(entitySnapshot);
    }

    this.interactionResource.activeProcesses = new Map(
      snapshot.resources.interaction.activeProcesses.map((entry) => [entry.stationEntityId, structuredClone(entry.runtime)]),
    );
    this.interactionResource.activeWorldAction = structuredClone(snapshot.resources.interaction.activeWorldAction);
    this.interactionResource.activeWorldActionPrecision = snapshot.resources.interaction.activeWorldActionPrecision;
    this.buildingChannel = snapshot.resources.construction ? structuredClone(snapshot.resources.construction) : null;
    this.drawCollisionOverlay();
    this.lastWorldSnapshotJson = JSON.stringify(this.createWorldSnapshot());
  }

  private applyPersistedEntity(target: Entity, snapshot: PersistedEntitySnapshot): void {
    const hydrated = hydrateEntitySnapshot(snapshot);
    for (const key of PERSISTED_ENTITY_COMPONENT_KEYS) {
      delete (target as unknown as Record<string, unknown>)[key];
    }
    Object.assign(target, hydrated);
    this.syncRestoredDerivedComponents(target);
  }

  private syncRestoredDerivedComponents(entity: Entity): void {
    if (entity.campfire) {
      entity.emitter = [];
      syncCampfireEmitters(entity);
      return;
    }
    if (entity.campStructure) {
      entity.emitter = [];
      syncShelterEmitter(entity);
      return;
    }
    delete entity.emitter;
  }

  private restoreSnapshotEntity(snapshot: PersistedEntitySnapshot): void {
    const restored = hydrateEntitySnapshot(snapshot);
    const existing = world.entities.find((entity) => entity.id === restored.id);
    if (existing) {
      this.applyPersistedEntity(existing, snapshot);
      if (existing.id === EntityId.Player) this.syncPlayerVisualToEntity();
      if (existing.building) this.refreshRestoredBuildingVisual(existing);
      return;
    }

    if (restored.building && restored.position) {
      const gx = Math.round(restored.position.x / TILE);
      const gy = Math.round(restored.position.y / TILE);
      spawnBuildingSystem(
        restored.id,
        restored.building.type,
        gx,
        gy,
        world,
        this.mapResource,
        this.entityLayer,
        this.entitySprites,
        restored.building.stage,
        this.visualPresentationResource,
      );
      const spawned = world.entities.find((entity) => entity.id === restored.id);
      if (spawned) {
        this.applyPersistedEntity(spawned, snapshot);
        this.refreshRestoredBuildingVisual(spawned);
      }
      return;
    }

    if (restored.resource?.gatherableId && restored.position) {
      const gx = Math.round(restored.position.x / TILE);
      const gy = Math.round(restored.position.y / TILE);
      spawnResourceEntity(
        restored.id,
        gx,
        gy,
        restored.resource.gatherableId,
        this.entityLayer,
        this.entitySprites,
        this.mapResource,
        this.runtimeRegistry,
        this.collisionOverrides,
      );
      const spawned = world.entities.find((entity) => entity.id === restored.id);
      if (spawned) this.applyPersistedEntity(spawned, snapshot);
      return;
    }

    if (restored.pickup && restored.position) {
      const gx = Math.round(restored.position.x / TILE);
      const gy = Math.round(restored.position.y / TILE);
      spawnPlacedItemSystem(restored.id, restored.pickup.itemId, gx, gy, world, this.entityLayer, this.entitySprites, restored.pickup.qty);
      const spawned = world.entities.find((entity) => entity.id === restored.id);
      if (spawned) this.applyPersistedEntity(spawned, snapshot);
      return;
    }

    if (restored.carcass && restored.position) {
      world.add(restored);
      this.syncRestoredDerivedComponents(restored);
      const cx = restored.position.x + TILE / 2;
      const cy = restored.position.y + TILE * 0.72;
      const sprite = buildCarcassSprite(restored.carcass.speciesId, restored.carcass.state, cx, cy);
      sprite.zIndex = computeRenderZ(cy);
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(restored.id, sprite);
      return;
    }

    if (restored.landmark && restored.position) {
      const gx = Math.round(restored.position.x / TILE);
      const gy = Math.round(restored.position.y / TILE);
      spawnLandmark(restored.landmark.kind, gx, gy, this.entityLayer, this.entitySprites, this.mapResource, restored.id);
      const spawned = world.entities.find((entity) => entity.id === restored.id);
      if (spawned) this.applyPersistedEntity(spawned, snapshot);
      return;
    }

    if (restored.animal && restored.position) {
      world.add(restored);
      const sprite = createAnimalSprite(restored.animal.speciesId, restored.position.x, restored.position.y);
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(restored.id, sprite);
      return;
    }

    if (restored.ai && restored.position) {
      world.add(restored);
      this.enemyColors.set(restored.id, "red");
      const sprite = new AnimatedSprite(this.renderResources.actorFrames("wolf", (restored.ai.animState ?? "idle") as AnimState) as Texture[]);
      sprite.animationSpeed = ENGINE_CONFIG.NPC_VISUALS.ANIM_SPEED;
      sprite.play();
      sprite.anchor.set(0.5, 1);
      sprite.x = restored.position.x + TILE / 2;
      sprite.y = restored.position.y + TILE;
      sprite.zIndex = computeRenderZ(sprite.y);
      sprite.scale.set((TILE * 1.3) / sprite.texture.height);
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(restored.id, sprite);
      return;
    }

    world.add(restored);
    this.syncRestoredDerivedComponents(restored);
  }

  private syncPlayerVisualToEntity(): void {
    const pos = this.playerEntity.position;
    if (!pos) return;
    this.playerSprite.x = pos.x + TILE / 2;
    this.playerSprite.y = pos.y + TILE;
    this.playerShadow.x = pos.x + TILE / 2;
    this.playerShadow.y = pos.y + TILE;
  }

  private refreshRestoredBuildingVisual(entity: Entity): void {
    if (!entity.building) return;
    const container = this.entitySprites.get(entity.id);
    if (!container || container.children.length < 2) return;
    const interiorContainer = container.children[0] as Container;
    const shellContainer = container.children[1] as Container;

    if (entity.building.type === "campfire" && entity.campfire) {
      const glow = shellContainer.children[0] as Sprite | undefined;
      const fireSprite = shellContainer.children[1] as AnimatedSprite | undefined;
      if (glow && fireSprite) {
        registerCampfireVisual(this.visualPresentationResource, entity.id, fireSprite, glow, entity.campfire);
      }
      syncCampfireEmitters(entity);
      return;
    }

    drawBuildingVisuals(entity.building.type, entity.building.stage, interiorContainer, shellContainer, entity);
    this.syncRestoredDerivedComponents(entity);
  }

  private authoredFootprintFor(gatherableId: string): CollisionFootprint | null {
    const override = this.collisionOverrides.get(gatherableId);
    if (override) return override;
    const gatherable = getGatherableDefinition(gatherableId);
    return gatherable?.collision?.footprint ?? null;
  }

  private setTileFootprint(gx: number, gy: number, footprint: CollisionFootprint): void {
    this.mapResource.solidCoords.add(coordKey(gx, gy));
    this.mapResource.customSolids.set(
      coordKey(gx, gy),
      resolveCollisionAabb({ x: gx * TILE, y: gy * TILE }, footprint, TILE),
    );
  }

  private refreshCollisionForGatherable(gatherableId: string): void {
    const footprint = this.authoredFootprintFor(gatherableId);
    for (const entity of world.with("resource", "position").entities) {
      if (entity.resource?.gatherableId !== gatherableId) continue;
      const gx = Math.round(entity.position!.x / TILE);
      const gy = Math.round(entity.position!.y / TILE);
      const key = coordKey(gx, gy);
      if (footprint) {
        this.setTileFootprint(gx, gy, footprint);
      } else {
        this.mapResource.customSolids.delete(key);
      }
    }
    this.drawCollisionOverlay();
  }

  // ---------------------------------------------------------------------------
  // Combat: enemy spawn/death, player respawn, HP mirror
  // ---------------------------------------------------------------------------

  /** Frames provider passed to the AI system so each enemy renders in its colour. */

  /** Player death: feedback, then respawn at camp with brief invulnerability. */
  private respawnPlayer(): void {
    const h = this.playerEntity.health!;
    const pos = this.playerEntity.position!;
    spawnDeathBurst(this.vfxResource, this.entityLayer, pos.x + TILE / 2, pos.y + TILE * 0.6, Colors.combat.playerDeath);
    spawnEnvFloatingText(this.vfxResource, "you fell...", Colors.combat.playerDeath, pos, this.entityLayer);
    triggerCameraShake(this.vfxResource, 8, 0.35);

    pos.x = pos.targetX = this.playerSpawn.x;
    pos.y = pos.targetY = this.playerSpawn.y;
    h.current = h.max;
    h.invulnTimer = this.combatConfig.respawnIFrames;
    this.playerEntity.knockback = { vx: 0, vy: 0, timer: 0 };
    this.playerSprite.x = pos.x + TILE / 2;
    this.playerSprite.y = pos.y + TILE;

    // Reset combo states on player death
    this.combatResource.kiteStacks = 0;
    this.combatResource.kiteStacksDecayTimer = 0;

    const dmState = this.combatResource.directionalMomentumState;
    dmState.isActive = false;
    dmState.lockedDirection = null;
    dmState.currentStacks = 0;
    dmState.validStepCount = 0;

    this.syncPlayerHp();
  }

  /** Mirror the player health component into the HUD-observed rpg state. */
  private syncPlayerHp(): void {
    const health = this.playerEntity.health;
    // Level-ups raise max live; current is never reduced by a max change.
    const statMax = getPlayerStats().combat.maxHealth;
    if (health && health.max !== statMax) {
      health.max = statMax;
      health.current = Math.min(health.current, health.max);
    }
    const profile = gameState.rpg.profile;
    const hp = health?.current ?? 100;
    if (profile && profile.hpCurrent !== hp) {
      setRpgProfile({ ...profile, hpCurrent: hp });
    }
  }

  private updateRenderOrder(): void {
    for (const entity of world.with("position").entities) {
      const sprite = this.entitySprites.get(entity.id);
      if (!sprite) continue;
      sprite.zIndex = computeRenderZ(entity.position!.y + TILE);
    }
    this.playerShadow.zIndex = computeRenderZ(this.playerEntity.position!.y + TILE, -5);
    this.collisionOverlay.zIndex = 120_000;

    for (const p of this.vfxResource.particles) p.graphic.zIndex = 90_000;
    for (const p of this.vfxResource.spriteParticles) p.sprite.zIndex = 90_000;
    for (const ft of this.vfxResource.floatingTexts) ft.textObj.zIndex = 100_000;
    for (const ring of this.vfxResource.shockwaveRings) ring.graphic.zIndex = 88_000;
    for (const arc of this.vfxResource.slashArcs) arc.graphic.zIndex = 89_000;
    if (this.vfxResource.strikeRing) this.vfxResource.strikeRing.zIndex = 85_000;
    if (this.vfxResource.tremorLine) this.vfxResource.tremorLine.zIndex = 85_000;
    if (this.vfxResource.placementCompass) this.vfxResource.placementCompass.zIndex = 85_000;
    if (this.vfxResource.selectionRing) this.vfxResource.selectionRing.zIndex = 85_000;
    for (const ring of this.vfxResource.processProgressRings.values()) ring.zIndex = 85_000;
    for (const ring of this.vfxResource.campfireFuelRings.values()) ring.zIndex = 85_000;
  }

  private drawCollisionOverlay(): void {
    this.collisionOverlay.clear();
    this.collisionOverlay.visible = debugConfig.showCollision;
    if (!debugConfig.showCollision) return;

    for (const key of this.mapResource.solidCoords) {
      const [gxRaw, gyRaw] = key.split(",");
      const gx = Number(gxRaw);
      const gy = Number(gyRaw);
      if (!Number.isFinite(gx) || !Number.isFinite(gy)) continue;
      const aabb = this.mapResource.customSolids.get(key) ?? {
        minX: gx * TILE,
        maxX: (gx + 1) * TILE,
        minY: gy * TILE,
        maxY: (gy + 1) * TILE,
      };
      this.collisionOverlay
        .rect(aabb.minX, aabb.minY, aabb.maxX - aabb.minX, aabb.maxY - aabb.minY)
        .fill({ color: this.mapResource.customSolids.has(key) ? 0x55aaff : 0xff5555, alpha: 0.12 })
        .stroke({ color: this.mapResource.customSolids.has(key) ? 0x55aaff : 0xff5555, width: 2, alpha: 0.75 });
    }

    const pos = this.playerEntity.position;
    if (pos) {
      const cx = pos.x + TILE / 2;
      const cy = pos.y + PLAYER_BODY.cy;
      this.collisionOverlay
        .rect(cx - PLAYER_BODY.hx, cy - PLAYER_BODY.hy, PLAYER_BODY.hx * 2, PLAYER_BODY.hy * 2)
        .fill({ color: 0xffdd55, alpha: 0.16 })
        .stroke({ color: 0xffdd55, width: 2, alpha: 0.9 });
    }
  }

  private handleHit(entity: Entity, yieldName: string, quantity = 1): void {
    handleHitFeedbackSystem(
      entity,
      yieldName,
      quantity,
      this.interactionResource,
      this.vfxResource,
      this.entityLayer,
      this.entitySprites
    );
  }

  private spawnBuilding(id: string, type: string, gx: number, gy: number, stage?: number): void {
    spawnBuildingSystem(
      id,
      type,
      gx,
      gy,
      world,
      this.mapResource,
      this.entityLayer,
      this.entitySprites,
      stage,
      this.visualPresentationResource,
    );
  }

  // Holds the attack pose briefly so a swing reads even while the movement
  // system is requesting "run"/"idle" every frame.
  private attackAnimLockTimer = 0;
  private playerBaseScale = 1;
  private playerVisualClock = 0;

  private updateAdaptivePlayerAnimation(dt: number): void {
    const pos = this.playerEntity.position;
    if (!pos) return;

    const equippedItemId = getEquippedWeaponId();
    const equippedDef = equippedItemId ? ITEM_DEFINITIONS[equippedItemId] : undefined;
    const toolKind = equippedItemId ? toolKindOf(equippedItemId) : null;
    const weaponTrait = equippedDef ? traitOf(equippedDef, "weapon") : undefined;
    const equippedToolKind =
      toolKind ??
      (weaponTrait?.weaponKind === "knife" || equippedItemId?.includes("knife") || equippedItemId?.includes("dagger") ? "knife" :
       weaponTrait?.weaponKind === "axe" ? "axe" :
       weaponTrait?.weaponKind === "spear" ? "spear" :
       equippedDef?.category === Category.Container ? "container" : null);

    const combatActive = this.combatResource.guard.active || this.combatResource.weaponAttack.active || (this.attackAnimLockTimer > 0 && this.playerAnimState === "attack");
    const isGatheringState = this.attackAnimLockTimer > 0 && (this.playerAnimState === "gather" || this.playerAnimState === "gather_tired");
    const gathering = this.playerAnimationResource.gathering;
    
    const action = combatActive
      ? "combat"
      : (gathering || isGatheringState)
        ? "gathering"
        : this.playerAnimationResource.movement.velocityPxPerSec > 1
          ? "moving"
          : "idle";

    const selection = runPlayerAnimationSystem({
      resource: this.playerAnimationResource,
      sprite: this.playerSprite,
      renderResources: this.renderResources,
      context: {
        action,
        velocityPxPerSec: this.playerAnimationResource.movement.velocityPxPerSec,
        sprinting: this.playerAnimationResource.movement.sprinting,
        staminaRatio: staminaConfig.max > 0 ? stamina.current / staminaConfig.max : 1,
        encumbranceRatio: inventoryEncumbranceRatio(gameState.rpg.inventory?.slots, ITEM_DEFINITIONS, 45),
        wetness: wetnessState.level,
        statuses: statusState.active.map((status) => status.id),
        equippedToolKind,
        gatherTargetKind: gathering?.targetKind ?? null,
        combatActive,
        guardActive: this.combatResource.guard.active,
      },
      actorId: this.playerEntity.id,
      position: { x: pos.x + TILE / 2, y: pos.y + TILE / 2 },
      dt,
      events: this.eventQueue,
    });
    this.playerAnimState = legacyAnimStateForClip(selection.clipId);
  }

  private setPlayerAnim(state: AnimState): void {
    const currentWeapon = gameState.rpg.profile?.loadout?.weapon;
    const currentWeaponId = currentWeapon ? (typeof currentWeapon === "string" ? currentWeapon : currentWeapon.itemId) : null;
    const weaponDef = currentWeaponId ? ITEM_DEFINITIONS[currentWeaponId] : undefined;
    const weaponVisual = weaponDef ? traitOf(weaponDef, "equippable_visuals") : undefined;

    let lockDuration = state === "gather_tired" ? 0.65 : (state === "gather" ? 0.35 : 0.28);
    if (state === "attack") {
      const activeAttack = this.combatResource.weaponAttack;
      if (activeAttack.active && activeAttack.plan) {
        const totalMs = activeAttack.plan.windupMs + activeAttack.plan.activeMs + activeAttack.plan.recoveryMs;
        lockDuration = totalMs / 1000;
      }
    }

    const animOverride = weaponVisual?.animationOverrides?.[state as "attack" | "gather" | "gather_tired"];
    if (animOverride?.lockDuration !== undefined) {
      lockDuration = animOverride.lockDuration;
    }

    // While the swing pose is locked, ignore idle/run requests from movement.
    if (state !== "attack" && state !== "gather" && state !== "gather_tired" && this.attackAnimLockTimer > 0) return;
    if (state === "attack") this.attackAnimLockTimer = lockDuration;
    if (state === "gather") this.attackAnimLockTimer = lockDuration;
    if (state === "gather_tired") this.attackAnimLockTimer = lockDuration;

    if (this.playerAnimState === state && this.lastEquippedWeapon === currentWeaponId) {
      return;
    }
    this.playerAnimState = state;
    this.lastEquippedWeapon = currentWeaponId;
  }

  private updatePlayerVisualFeedback(dt: number): void {
    this.playerVisualClock += dt;

    const facing = this.playerSprite.scale.x < 0 ? -1 : 1;
    let scaleX = 1;
    let scaleY = 1;
    let yOffset = 0;
    let xOffset = 0;
    let rotation = 0;

    const weaponId = this.lastEquippedWeapon;
    const def = weaponId ? ITEM_DEFINITIONS[weaponId] : undefined;
    const visual = def ? traitOf(def, "equippable_visuals") : undefined;
    const animationModifiers = new Set(this.playerAnimationResource.selection.modifiers);
    const gaitDrag = animationModifiers.has("injured")
      ? 0.58
      : animationModifiers.has("encumbered")
        ? 0.72
        : animationModifiers.has("exhausted") || animationModifiers.has("wet")
          ? 0.82
          : 1;

    if (this.playerAnimState === "run") {
      const stride = Math.sin(this.playerVisualClock * 16 * gaitDrag);
      yOffset = -Math.abs(stride) * ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_RUN_BOB_PX;
      scaleX = 1 + Math.abs(stride) * 0.035;
      scaleY = 1 - Math.abs(stride) * 0.045;
      rotation = facing * Math.sin(this.playerVisualClock * 8 * gaitDrag) * 0.045;
      if (animationModifiers.has("encumbered")) yOffset += 1.5;
      if (animationModifiers.has("strained")) rotation *= 1.25;

      // Spawn extra dust puff when running at random intervals
      if (Math.random() < 0.22 && this.playerEntity.position) {
        const dust = new Graphics();
        const size = 2 + Math.random() * 2;
        dust.circle(0, 0, size).fill({ color: 0xcccccc, alpha: 0.6 });
        dust.x = this.playerEntity.position.x + TILE / 2 + (Math.random() - 0.5) * 8;
        dust.y = this.playerEntity.position.y + TILE - 2;

        this.vfxResource.particles.push({
          graphic: dust,
          vx: -facing * (15 + Math.random() * 20),
          vy: -10 - Math.random() * 15,
          gravity: -10,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.2,
        });
        this.entityLayer.addChild(dust);
      }
    } else if (this.playerAnimState === "walk") {
      const stride = Math.sin(this.playerVisualClock * 10 * gaitDrag);
      yOffset = -Math.abs(stride) * (ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_RUN_BOB_PX * 0.5);
      scaleX = 1 + Math.abs(stride) * 0.02;
      scaleY = 1 - Math.abs(stride) * 0.025;
      rotation = facing * Math.sin(this.playerVisualClock * 5 * gaitDrag) * 0.025;
      if (animationModifiers.has("injured")) {
        yOffset += Math.max(0, Math.sin(this.playerVisualClock * 5)) * 2.5;
        rotation += facing * 0.04;
      } else if (animationModifiers.has("encumbered")) {
        yOffset += 2;
        scaleY *= 0.98;
      } else if (animationModifiers.has("wet")) {
        yOffset += 1;
      }
    } else if (this.playerAnimState === "attack" || (this.attackAnimLockTimer > 0 && this.playerAnimState !== "gather" && this.playerAnimState !== "gather_tired")) {
      const level = getCharacterLevel();
      const powerFactor = 1 + (level - 1) * 0.05; // scales lunge and stretch by level
      const override = visual?.animationOverrides?.attack;
      const lockDuration = override?.lockDuration ?? 0.28;
      const t = 1 - Math.max(0, Math.min(1, this.attackAnimLockTimer / lockDuration));
      const strike = Math.sin(t * Math.PI);
      xOffset = facing * strike * 6 * powerFactor;
      yOffset = -strike * 2 * powerFactor;
      scaleX = 1 + strike * 0.08 * powerFactor;
      scaleY = 1 - strike * 0.055 * powerFactor;
      rotation = facing * ENGINE_CONFIG.ACTOR_VISUALS.PLAYER_ATTACK_LEAN_RAD * (0.35 + strike) * (0.8 + (level - 1) * 0.03);
    } else if (this.playerAnimState === "gather") {
      const override = visual?.animationOverrides?.gather;
      const lockDuration = override?.lockDuration ?? 0.35;
      const t = 1 - Math.max(0, Math.min(1, this.attackAnimLockTimer / lockDuration));
      const strike = Math.sin(t * Math.PI);
      xOffset = facing * strike * 6; // lunges forward slightly
      yOffset = strike * 2; // strikes downward
      scaleX = 1 + strike * 0.05;
      scaleY = 1 - strike * 0.07;
      rotation = facing * 0.28 * strike;
    } else if (this.playerAnimState === "gather_tired") {
      const override = visual?.animationOverrides?.gather_tired;
      const lockDuration = override?.lockDuration ?? 0.65;
      const t = 1 - Math.max(0, Math.min(1, this.attackAnimLockTimer / lockDuration));
      // Sluggish heavy swing: lift, crash, long tired recovery
      if (t < 0.4) {
        const liftT = t / 0.4;
        yOffset = -liftT * 4;
        rotation = -facing * 0.12 * liftT;
        scaleY = 1 + liftT * 0.04;
      } else if (t < 0.6) {
        const fallT = (t - 0.4) / 0.2;
        yOffset = -4 + fallT * 10;
        rotation = facing * 0.35 * fallT;
        scaleX = 1 + fallT * 0.08;
        scaleY = 1 - fallT * 0.14;
        xOffset = facing * fallT * 3;
      } else {
        const recoverT = (t - 0.6) / 0.4;
        yOffset = 6 - recoverT * 6;
        rotation = facing * 0.35 * (1 - recoverT);
        scaleX = 1.08 - recoverT * 0.08;
        scaleY = 0.86 + recoverT * 0.14;
        xOffset = facing * 3 * (1 - recoverT);
      }
    } else {
      const breath = Math.sin(this.playerVisualClock * 2.2);
      yOffset = breath * 0.55;
      scaleX = 1 - breath * 0.006;
      scaleY = 1 + breath * 0.01;
      rotation = breath * 0.008;
    }

    // --- Procedural Joint Anchor Positioning ---
    const clipId = this.playerAnimationResource.currentClipId;
    const anchors = getPlayerJointAnchors(
      clipId,
      this.playerAnimationResource.normalizedTime,
      Array.from(animationModifiers),
      this.playerAnimationResource.movement.sprinting
    );

    const helmetSprite = this.attachmentSprites.get("helmet");
    if (helmetSprite) {
      const helmetDef = gameState.rpg.profile?.loadout?.helmet ? ITEM_DEFINITIONS[typeof gameState.rpg.profile.loadout.helmet === "string" ? gameState.rpg.profile.loadout.helmet : gameState.rpg.profile.loadout.helmet.itemId] : undefined;
      const helmetVisual = helmetDef ? traitOf(helmetDef, "equippable_visuals") : undefined;
      const helmetCustomX = helmetVisual?.visualAsset?.offsetX ?? 0;
      const helmetCustomY = helmetVisual?.visualAsset?.offsetY ?? 0;
      helmetSprite.x = anchors.head.x - 80 + helmetCustomX;
      helmetSprite.y = anchors.head.y - 220 + helmetCustomY;
    }

    const chestSprite = this.attachmentSprites.get("chest");
    if (chestSprite) {
      const chestDef = gameState.rpg.profile?.loadout?.chest ? ITEM_DEFINITIONS[typeof gameState.rpg.profile.loadout.chest === "string" ? gameState.rpg.profile.loadout.chest : gameState.rpg.profile.loadout.chest.itemId] : undefined;
      const chestVisual = chestDef ? traitOf(chestDef, "equippable_visuals") : undefined;
      const chestCustomX = chestVisual?.visualAsset?.offsetX ?? 0;
      const chestCustomY = chestVisual?.visualAsset?.offsetY ?? 0;
      const shiftX = (anchors.head.x - 80) * 0.7;
      const shiftY = anchors.head.y - 48;
      chestSprite.x = chestCustomX + shiftX;
      chestSprite.y = -90 + chestCustomY + shiftY;
    }

    const pantsSprite = this.attachmentSprites.get("pants");
    if (pantsSprite) {
      const pantsDef = gameState.rpg.profile?.loadout?.pants ? ITEM_DEFINITIONS[typeof gameState.rpg.profile.loadout.pants === "string" ? gameState.rpg.profile.loadout.pants : gameState.rpg.profile.loadout.pants.itemId] : undefined;
      const pantsVisual = pantsDef ? traitOf(pantsDef, "equippable_visuals") : undefined;
      const pantsCustomX = pantsVisual?.visualAsset?.offsetX ?? 0;
      const pantsCustomY = pantsVisual?.visualAsset?.offsetY ?? 0;
      const shiftX = (anchors.head.x - 80) * 0.25;
      const shiftY = anchors.head.y - 48;
      pantsSprite.x = pantsCustomX + shiftX;
      pantsSprite.y = -45 + pantsCustomY + shiftY;
    }

    const bootsSprite = this.attachmentSprites.get("boots");
    if (bootsSprite) {
      const bootsDef = gameState.rpg.profile?.loadout?.boots ? ITEM_DEFINITIONS[typeof gameState.rpg.profile.loadout.boots === "string" ? gameState.rpg.profile.loadout.boots : gameState.rpg.profile.loadout.boots.itemId] : undefined;
      const bootsVisual = bootsDef ? traitOf(bootsDef, "equippable_visuals") : undefined;
      const bootsCustomX = bootsVisual?.visualAsset?.offsetX ?? 0;
      const bootsCustomY = bootsVisual?.visualAsset?.offsetY ?? 0;
      const shiftX = (anchors.head.x - 80) * 0.1;
      const shiftY = anchors.head.y - 48;
      bootsSprite.x = bootsCustomX + shiftX;
      bootsSprite.y = -10 + bootsCustomY + shiftY;
    }

    const shieldSprite = this.attachmentSprites.get("shield");
    if (shieldSprite) {
      const shieldDef = gameState.rpg.profile?.loadout?.shield ? ITEM_DEFINITIONS[typeof gameState.rpg.profile.loadout.shield === "string" ? gameState.rpg.profile.loadout.shield : gameState.rpg.profile.loadout.shield.itemId] : undefined;
      const shieldVisual = shieldDef ? traitOf(shieldDef, "equippable_visuals") : undefined;
      const shieldCustomX = shieldVisual?.visualAsset?.offsetX ?? 0;
      const shieldCustomY = shieldVisual?.visualAsset?.offsetY ?? 0;
      shieldSprite.x = anchors.handLeft.x - 80 + shieldCustomX;
      shieldSprite.y = anchors.handLeft.y - 220 + shieldCustomY;
    }

    // --- Weapon rotation & lunge override animation ---
    const weaponSprite = this.attachmentSprites.get("weapon");
    if (weaponSprite) {
      const weaponCustomX = visual?.visualAsset?.offsetX ?? 0;
      const weaponCustomY = visual?.visualAsset?.offsetY ?? 0;
      const weaponBaseX = anchors.handRight.x - 80 + weaponCustomX;
      const weaponBaseY = anchors.handRight.y - 220 + weaponCustomY;
      const weaponBaseRotation = visual?.visualAsset?.rotation ?? 0.2;

      if (this.playerAnimState === "attack" || this.playerAnimState === "gather" || this.playerAnimState === "gather_tired") {
        const override = visual?.animationOverrides?.[this.playerAnimState as "attack" | "gather" | "gather_tired"];
        const lockDuration = override?.lockDuration ?? (this.playerAnimState === "gather_tired" ? 0.65 : (this.playerAnimState === "gather" ? 0.35 : 0.28));
        const t = 1 - Math.max(0, Math.min(1, this.attackAnimLockTimer / lockDuration));

        const startArc = override?.swingArcStart ?? -1.0;
        const endArc = override?.swingArcEnd ?? 1.2;
        const lunge = override?.lungeFactor ?? 1.0;

        const swing = Math.sin(t * Math.PI);
        weaponSprite.rotation = startArc + swing * (endArc - startArc);
        xOffset *= lunge;
      } else {
        weaponSprite.rotation = weaponBaseRotation; // resting angle
      }
      applyPlayerWeaponPresentation({
        combat: this.combatResource,
        playerSprite: this.playerSprite,
        weaponSprite,
        facing: facing > 0 ? 1 : -1,
        basePose: { x: weaponBaseX, y: weaponBaseY, rotation: weaponBaseRotation },
      });
    } else {
      applyPlayerWeaponPresentation({
        combat: this.combatResource,
        playerSprite: this.playerSprite,
        weaponSprite: undefined,
        facing: facing > 0 ? 1 : -1,
        basePose: { x: 0, y: 0, rotation: 0.2 },
      });
    }

    this.playerSprite.scale.set(facing * this.playerBaseScale * scaleX, this.playerBaseScale * scaleY);
    this.playerSprite.x += xOffset;
    this.playerSprite.y += yOffset;
    this.playerSprite.rotation = rotation;
    this.renderGuardIndicator();
  }

  private renderGuardIndicator(): void {
    const ring = this.vfxResource.comboRing;
    const pos = this.playerEntity.position;
    if (!ring || !pos || !this.combatResource.guard.active) {
      if (ring) {
        ring.visible = false;
        ring.clear();
      }
      return;
    }

    const guard = this.combatResource.guard;
    const radius = TILE * 0.82;
    const inner = TILE * 0.42;
    const halfArc = (guard.frontalArcDegrees * Math.PI) / 360;
    const a0 = guard.angleRad - halfArc;
    const a1 = guard.angleRad + halfArc;

    ring.visible = true;
    ring.clear();
    ring.x = pos.x + TILE / 2;
    ring.y = pos.y + TILE * 0.58;
    ring.moveTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    ring.arc(0, 0, radius, a0, a1);
    ring.arc(0, 0, inner, a1, a0, true);
    ring.fill({ color: 0x9bd7ff, alpha: 0.12 });
    ring.arc(0, 0, radius, a0, a1).stroke({ color: 0xbfe8ff, width: 2, alpha: 0.55 });
  }

  private checkLoadoutChanged(): void {
    const loadout = gameState.rpg.profile?.loadout;
    if (!loadout) return;
    let changed = false;
    for (const key of Object.keys(loadout) as (keyof typeof loadout)[]) {
      const val = loadout[key];
      const itemId = val ? (typeof val === "string" ? val : val.itemId) : null;
      if (this.lastEquippedLoadout[key] !== itemId) {
        this.lastEquippedLoadout[key] = itemId;
        changed = true;
      }
    }
    if (changed) {
      this.rebuildPlayerAttachments();
    }
  }

  private rebuildPlayerAttachments(): void {
    for (const sprite of this.attachmentSprites.values()) {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      sprite.destroy();
    }
    this.attachmentSprites.clear();
    this.attachmentBasePoses.clear();

    const loadout = gameState.rpg.profile?.loadout;
    if (!loadout) return;

    this.playerSprite.sortableChildren = true;

    const SLOT_Z_INDEX: Record<string, number> = {
      cloak: 1,
      boots: 2,
      pants: 3,
      chest: 4,
      helmet: 5,
      shield: 6,
      weapon: 7,
    };

    const SLOT_Y_OFFSETS: Record<string, number> = {
      helmet: -135,
      chest: -90,
      pants: -45,
      boots: -10,
      shield: -65,
      weapon: -65,
    };

    const SLOT_X_OFFSETS: Record<string, number> = {
      helmet: 0,
      chest: 0,
      pants: 0,
      boots: 0,
      shield: -25,
      weapon: 25,
    };

    for (const key of Object.keys(loadout) as (keyof typeof loadout)[]) {
      const val = loadout[key];
      if (!val) continue;
      const itemId = typeof val === "string" ? val : val.itemId;
      const def = ITEM_DEFINITIONS[itemId];
      if (!def) continue;

      const visual = traitOf(def, "equippable_visuals");
      if (!visual || !visual.visualAsset) continue;

      const texture = getAshenmoonTextureByKey(visual.visualAsset.textureKey);
      if (!texture) continue;

      const sprite = new Sprite(texture);
      sprite.anchor.set(visual.visualAsset.anchorX ?? 0.5, visual.visualAsset.anchorY ?? 0.5);
      if (visual.visualAsset.rotation !== undefined) {
        sprite.rotation = visual.visualAsset.rotation;
      }

      const zIndex = SLOT_Z_INDEX[key] ?? 10;
      sprite.zIndex = zIndex;

      const baseX = SLOT_X_OFFSETS[key] ?? 0;
      const baseY = SLOT_Y_OFFSETS[key] ?? 0;

      const customX = visual.visualAsset.offsetX ?? 0;
      const customY = visual.visualAsset.offsetY ?? 0;

      sprite.x = baseX + customX;
      sprite.y = baseY + customY;
      this.attachmentBasePoses.set(key, { x: sprite.x, y: sprite.y, rotation: sprite.rotation });

      const fallbackHeightTiles = key === "helmet"
        ? 0.38
        : key === "chest"
          ? 0.75
          : key === "pants"
            ? 0.56
            : key === "boots"
              ? 0.25
              : 0.62;
      const visualSize = key === "weapon" || key === "shield"
        ? resolveItemVisuals(def).equipped
        : { heightTiles: fallbackHeightTiles };
      const visualScale = resolveWorldVisualScale({ spec: visualSize, texture, tilePx: TILE });
      sprite.scale.set(visualScale.x, visualScale.y);

      this.playerSprite.addChild(sprite);
      this.attachmentSprites.set(key, sprite);
    }
  }


  private pushHudUpdate(): void {
    const pos = this.playerEntity.position!;
    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const lookAt = this.interactionResource.currentTarget?.interactable?.name ?? null;

    if (gx !== this.lastHud.gx || gy !== this.lastHud.gy || lookAt !== this.lastHud.lookAt) {
      this.lastHud = { gx, gy, lookAt };
      this.onHudUpdate(this.lastHud);
    }
  }

  // ---------------------------------------------------------------------------
  // Svelte / External Interfaces (Public APIs)
  // ---------------------------------------------------------------------------

  public toggleEnvironmentInspector(): void {
    this.environmentInspector?.toggle();
  }

  public getAmbientEnvironment(gx: number, gy: number): { temperature: number; humidity: number; toxins: number } {
    const base = getAmbientEnvironment(
      this.mapResource,
      gx,
      gy,
      0
    );
    const point = { x: gx * TILE + TILE / 2, y: gy * TILE + TILE / 2 };
    const signals = sampleEnvironmentAt(world, this.weatherResource, point);
    const night = nightEnvironmentModifiers({
      timeOfDay: this.weatherResource.state.timeOfDay,
      nearLitCampfire: false,
      shelterColdMultiplier: this.shelterColdMultiplierAt(gx, gy),
    });

    return {
      temperature: effectivePlayerTemperature({
        ambientTemperature: base.temperature,
        nightTemperatureDelta: night.temperatureDelta,
        radiantHeat: signals.heat,
      }),
      humidity: Math.min(100, base.humidity + (this.weatherResource.state.raining ? 25 : 0)),
      toxins: base.toxins,
    };
  }

  public updateBindings(newBindings: Record<string, string[]>): void {
    this.inputResource.updateBindings(newBindings);
  }

  public triggerInteract(): void {
    this.inputResource.pendingInteract = true;
  }

  public getWorldActionOptions(targetId: string): WorldActionOption[] {
    const entity = world.entities.find((e) => e.id === targetId);
    if (entity?.carcass) {
      return actionsForCarcass({ targetId: entity.id, carcass: entity.carcass });
    }

    const building = gameState.rpg.profile?.buildings?.find((b: { id: string }) => b.id === targetId);
    if (building) {
      return actionsForPlacedStructure({ buildingId: building.id, buildableId: building.type });
    }

    return [];
  }

  public executeWorldAction(action: WorldActionOption): void {
    const target = world.entities.find((e) => e.id === action.executeIntent.targetId);
    const playerPos = this.playerEntity?.position;

    if (action.executeIntent.kind === "open_station" && target) {
      this.onStationInteract?.(target);
      return;
    }

    if (action.executeIntent.kind === "carcass.process") {
      if (!target?.carcass || !playerPos) return;
      this.interactionResource.activeWorldAction = createWorldActionRuntime(action);
      spawnEnvFloatingText(this.vfxResource, action.feedback.start, Colors.ui.muted, playerPos, this.entityLayer);
      return;
    }

    if (playerPos) {
      const text = action.executeIntent.kind === "carcass.inspect" ? action.feedback.success : action.feedback.start;
      spawnEnvFloatingText(this.vfxResource, text, Colors.ui.muted, playerPos, this.entityLayer);
    }
  }


  public setCollisionOverlayVisible(enabled: boolean): string {
    debugConfig.showCollision = enabled;
    this.drawCollisionOverlay();
    return `collision overlay ${enabled ? "shown" : "hidden"}`;
  }

  public setCollisionFootprintOverride(id: string, footprint: CollisionFootprint): string {
    if (!isValidCollisionFootprint(footprint)) return `invalid collision footprint for ${id}`;
    this.collisionOverrides.set(id, footprint);
    this.refreshCollisionForGatherable(id);
    return `collision footprint set for ${id}`;
  }

  public clearCollisionFootprintOverride(id: string): string {
    this.collisionOverrides.delete(id);
    this.refreshCollisionForGatherable(id);
    return `collision footprint reset for ${id}`;
  }

  public getCollisionDebugSnapshot(): {
    overlayVisible: boolean;
    overrides: { id: string; footprint: CollisionFootprint }[];
    solids: { key: string; aabb: { minX: number; maxX: number; minY: number; maxY: number }; custom: boolean }[];
  } {
    return {
      overlayVisible: debugConfig.showCollision,
      overrides: [...this.collisionOverrides.entries()].map(([id, footprint]) => ({ id, footprint })),
      solids: [...this.mapResource.solidCoords].map((key) => {
        const custom = this.mapResource.customSolids.get(key);
        if (custom) return { key, aabb: custom, custom: true };
        const [gxRaw, gyRaw] = key.split(",");
        const gx = Number(gxRaw);
        const gy = Number(gyRaw);
        return {
          key,
          aabb: { minX: gx * TILE, maxX: (gx + 1) * TILE, minY: gy * TILE, maxY: (gy + 1) * TILE },
          custom: false,
        };
      }),
    };
  }

  public isInPlacementMode(): boolean {
    return this.itemPlacementResource.isPlacementMode || this.buildingResource.isPlacementMode;
  }

  private getBuildingAtCursor(): { entityId: string; type: string; gx: number; gy: number } | null {
    const mx = Math.floor(this.inputResource.mouseWorld.x / TILE);
    const my = Math.floor(this.inputResource.mouseWorld.y / TILE);
    for (const b of gameState.rpg.profile?.buildings ?? []) {
      const spec = getBuildingSpec(b.type);
      const { w, h } = spec.footprint;
      if (mx >= b.x && mx < b.x + w && my >= b.y && my < b.y + h) {
        return { entityId: b.id, type: b.type, gx: b.x, gy: b.y };
      }
    }
    return null;
  }

  private handleRightClickHold(screenX: number, screenY: number): void {
    const target = this.interactionResource.currentTarget;

    // Stations/campfires converge right-click and E onto the same entry point
    // (onStationInteract) so both open the medallion ring in one hop, instead
    // of routing through the plain text context menu.
    if (target?.station?.stationId && this.onStationInteract) {
      this.onStationInteract(target);
      return;
    }

    const building = this.getBuildingAtCursor();
    const name = target?.interactable?.name ?? building?.type ?? "";
    const action = target?.interactable?.action ?? (building ? "destroy" : "");
    if (!name && !building) return;
    const targetPos = target?.position;
    const menuTarget: WorldContextMenuTarget = {
      id: target?.id ?? building?.entityId ?? "",
      name,
      action,
      screenX,
      screenY,
      gx: targetPos ? Math.floor(targetPos.x / TILE) : (building?.gx ?? Math.floor(this.inputResource.mouseWorld.x / TILE)),
      gy: targetPos ? Math.floor(targetPos.y / TILE) : (building?.gy ?? Math.floor(this.inputResource.mouseWorld.y / TILE)),
      ...(building?.entityId ? { buildingId: building.entityId } : {}),
    };
    this.onContextMenu?.(menuTarget);
  }

  public destroyBuilding(entityId: string): void {
    const building = gameState.rpg.profile?.buildings?.find((b: { id: string }) => b.id === entityId);
    if (!building) return;

    const spec = getBuildingSpec(building.type);
    const { w, h } = spec.footprint;

    if (spec.solidCells) {
      for (const cell of spec.solidCells) {
        this.mapResource.solidCoords.delete(coordKey(building.x + cell.x, building.y + cell.y));
        this.mapResource.customSolids.delete(coordKey(building.x + cell.x, building.y + cell.y));
      }
    } else {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          this.mapResource.solidCoords.delete(coordKey(building.x + dx, building.y + dy));
          this.mapResource.customSolids.delete(coordKey(building.x + dx, building.y + dy));
        }
      }
    }

    const entity = world.entities.find((e) => e.id === entityId);
    if (entity) world.remove(entity);

    const sprite = this.entitySprites.get(entityId);
    if (sprite) {
      this.entityLayer.removeChild(sprite);
      sprite.destroy();
      this.entitySprites.delete(entityId);
    }

    void dispatchRpgCommand({ type: "destroyBuilding", buildingId: entityId }).then((result) => {
      if (result.ok) applyRpgState(result.data.playerState);
    });
    playSound("build.place");
  }

  public startBuildingChannel(
    buildingId: string,
    nextStage: number,
    cost: Record<string, number>,
  ): void {
    // Cancel gathering if any
    this.interactionResource.gatheringTarget = null;

    this.buildingChannel = {
      buildingId,
      nextStage,
      timer: 0,
      duration: 1.8,
      cost,
    };

    playSound("ui.inventory.equip");
  }

  private async completeBuildingChannel(channel: ConstructionRuntimeSnapshot): Promise<boolean> {
    try {
      const result = await dispatchRpgCommand({
        type: "upgradeBuilding",
        buildingId: channel.buildingId,
      });

      if (!result.ok) {
        console.error("Upgrade failed:", result.error);
        return false;
      }

      applyRpgState(result.data.playerState);
      this.upgradeBuilding(channel.buildingId, channel.nextStage);
      this.flushWorldSnapshot(true);
      return true;
    } catch (err) {
      console.error("Upgrade error:", err);
      return false;
    }
  }

  public upgradeBuilding(buildingId: string, stage: number): void {
    upgradeBuildingSystem(buildingId, stage, world, this.mapResource, this.entitySprites, this.visualPresentationResource);
  }

  public isNearCampfire(): boolean {
    const pos = this.playerEntity?.position;
    if (!pos) return false;
    const signals = sampleEnvironmentAt(world, this.weatherResource, { x: pos.x + TILE / 2, y: pos.y + TILE / 2 });
    return signals.heat >= OPEN_FLAME_BONUS * 0.3;
  }

  public isNearStation(stationId: StationId, maxDistanceTiles = 4.5): boolean {
    const pos = this.playerEntity?.position;
    if (!pos) return false;
    const px = pos.x + TILE / 2;
    const py = pos.y + TILE / 2;
    if (stationId === "campfire") {
      return sampleEnvironmentAt(world, this.weatherResource, { x: px, y: py }).heat > 0;
    }
    return world.with("station", "position").entities.some((entity) => {
      if (entity.station?.stationId !== stationId) return false;
      const ex = entity.position!.x + TILE / 2;
      const ey = entity.position!.y + TILE / 2;
      return Math.hypot(px - ex, py - ey) <= maxDistanceTiles * TILE;
    });
  }

  /** Projects a world-space point (e.g. a station entity's position) to screen pixels, for anchoring DOM UI to it. */
  public worldToScreen(x: number, y: number): { x: number; y: number } {
    const global = this.worldContainer.toGlobal({ x, y });
    return { x: global.x, y: global.y };
  }

  public nearbyStationIds(maxDistanceTiles = 4.5): StationId[] {
    const pos = this.playerEntity?.position;
    if (!pos) return [];
    const px = pos.x + TILE / 2;
    const py = pos.y + TILE / 2;
    const ids = new Set<StationId>();
    for (const entity of world.with("station", "position").entities) {
      const ex = entity.position!.x + TILE / 2;
      const ey = entity.position!.y + TILE / 2;
      if (Math.hypot(px - ex, py - ey) <= maxDistanceTiles * TILE) {
        if (entity.station!.stationId === "campfire" && !entity.campfire?.isLit) continue;
        ids.add(entity.station!.stationId);
      }
    }
    return [...ids];
  }

  private shelterColdMultiplierAt(gx: number, gy: number): number {
    const px = gx * TILE + TILE / 2;
    const py = gy * TILE + TILE / 2;
    const shelter = world
      .with("position", "campStructure")
      .entities
      .find((entity) => entity.campStructure!.type === "crude_shelter");
    if (!shelter?.position || !shelter.campStructure) return 1;

    const structure = shelter.campStructure;
    return shelterExposureMitigation(
      {
        id: shelter.id,
        type: structure.type,
        x: shelter.position.x + TILE / 2,
        y: shelter.position.y + TILE / 2,
        ...(structure.protectionRadiusPx !== undefined ? { protectionRadiusPx: structure.protectionRadiusPx } : {}),
        ...(structure.coldResistanceBonus !== undefined ? { coldResistanceBonus: structure.coldResistanceBonus } : {}),
        ...(structure.rainProtection !== undefined ? { rainProtection: structure.rainProtection } : {}),
      },
      { x: px, y: py },
    ).coldMultiplier;
  }

  public startBuildingPlacement(
    type: string,
    onCancel?: () => void,
    onComplete?: () => void,
    sourceItemId?: string
  ): void {
    this.buildingResource.currentPlacementType = type;
    this.buildingResource.currentPlacementSourceItemId = sourceItemId ?? null;
    this.buildingResource.isPlacementMode = true;
    this.buildingResource.onPlacementCancelCb = onCancel ?? undefined;
    this.buildingResource.onPlacementCompleteCb = onComplete ?? undefined;

    if (this.buildingResource.previewSprite) {
      this.buildingResource.previewSprite.destroy();
    }

    const spec = getBuildingSpec(type);
    const structureKey = getAshenmoonStructureKeyForBuildingType(type);
    const tex = getAshenmoonStructureTexture(structureKey ?? "legacyHouse");

    const { w, h } = spec.footprint;
    const indicator = new Graphics();
    indicator.rect(0, 0, w * TILE, h * TILE);
    indicator.stroke({ width: 2, color: 0xffffff });
    indicator.fill({ color: 0xffffff, alpha: 0.08 });
    this.buildingResource.previewIndicator = indicator;
    this.entityLayer.addChild(indicator);

    this.buildingResource.previewSprite = new Sprite(tex);
    this.buildingResource.previewSprite.anchor.set(0.5, 1);
    this.buildingResource.previewSprite.alpha = 0.6;
    this.buildingResource.previewSprite.width = spec.sprite.w * TILE;
    this.buildingResource.previewSprite.height = spec.sprite.h * TILE;
    this.entityLayer.addChild(this.buildingResource.previewSprite);
  }

  public cancelBuildingPlacement(): void {
    this.buildingResource.isPlacementMode = false;
    this.buildingResource.currentPlacementType = null;
    this.buildingResource.currentPlacementSourceItemId = null;
    if (this.buildingResource.previewIndicator) {
      this.entityLayer.removeChild(this.buildingResource.previewIndicator);
      this.buildingResource.previewIndicator.destroy();
      this.buildingResource.previewIndicator = null;
    }
    if (this.buildingResource.previewSprite) {
      this.entityLayer.removeChild(this.buildingResource.previewSprite);
      this.buildingResource.previewSprite.destroy();
      this.buildingResource.previewSprite = null;
    }
    this.buildingResource.onPlacementCancelCb?.();
    this.buildingResource.onPlacementCancelCb = undefined;
    this.buildingResource.onPlacementCompleteCb = undefined;
  }

  public startItemPlacement(
    itemId: string,
    onCancel?: () => void,
    onComplete?: () => void
  ): void {
    this.itemPlacementResource.currentItemId = itemId;
    this.itemPlacementResource.isPlacementMode = true;
    this.itemPlacementResource.onPlacementCancelCb = onCancel ?? undefined;
    this.itemPlacementResource.onPlacementCompleteCb = onComplete ?? undefined;

    if (this.itemPlacementResource.previewSprite) {
      this.itemPlacementResource.previewSprite.destroy();
    }
    if (this.itemPlacementResource.previewIndicator) {
      this.itemPlacementResource.previewIndicator.destroy();
    }

    const tex = getItemTexture(itemId);

    this.itemPlacementResource.previewSprite = new Sprite(tex);
    this.itemPlacementResource.previewSprite.anchor.set(0.5, 1);
    this.itemPlacementResource.previewSprite.alpha = 0.6;
    applyGroundItemVisualScale(this.itemPlacementResource.previewSprite, itemId);

    this.itemPlacementResource.previewIndicator = new Graphics();
    this.itemPlacementResource.previewIndicator.rect(0, 0, TILE, TILE);
    this.itemPlacementResource.previewIndicator.stroke({ width: 2, color: 0xffffff });
    this.itemPlacementResource.previewIndicator.fill({ color: 0xffffff, alpha: 0.15 });

    this.entityLayer.addChild(this.itemPlacementResource.previewIndicator);
    this.entityLayer.addChild(this.itemPlacementResource.previewSprite);
  }

  public cancelItemPlacement(): void {
    this.itemPlacementResource.isPlacementMode = false;
    this.itemPlacementResource.currentItemId = null;
    if (this.itemPlacementResource.previewSprite) {
      this.entityLayer.removeChild(this.itemPlacementResource.previewSprite);
      this.itemPlacementResource.previewSprite.destroy();
      this.itemPlacementResource.previewSprite = null;
    }
    if (this.itemPlacementResource.previewIndicator) {
      this.entityLayer.removeChild(this.itemPlacementResource.previewIndicator);
      this.itemPlacementResource.previewIndicator.destroy();
      this.itemPlacementResource.previewIndicator = null;
    }
    this.itemPlacementResource.onPlacementCancelCb?.();
    this.itemPlacementResource.onPlacementCancelCb = undefined;
    this.itemPlacementResource.onPlacementCompleteCb = undefined;
  }

  public startStationProcess(entityId: string, processId: string): void {
    if (this.interactionResource.activeProcesses.has(entityId) || this.interactionResource.activeCraftProcesses.has(entityId)) {
      spawnEnvFloatingText(
        this.vfxResource,
        "this station is already busy...",
        Colors.ui.error,
        this.playerEntity.position!,
        this.entityLayer
      );
      return;
    }
    const target = world.entities.find((e) => e.id === entityId);
    if (!target) return;
    const proc = STATION_PROCESSES.find((p) => p.id === processId);
    if (!proc) return;

    // Check ingredients
    const inv = gameState.rpg.inventory;
    if (!inv) return;
    let hasIngredients = true;
    for (const [inId, reqQty] of Object.entries(proc.inputs)) {
      const slot = inv.slots[inId];
      const qty = slot && "qty" in slot ? slot.qty : 0;
      if (qty < reqQty) {
        hasIngredients = false;
        break;
      }
    }
    if (!hasIngredients) return;

    // Start process
    this.interactionResource.activeProcesses.set(target.id, createStationProcessRuntime(proc, target.id));

    playSound("station.boil");
    const procName = stationProcessVerb(proc.processType);
    const resultName = getItemDef(proc.outputItemId)?.name ?? proc.outputItemId;
    
    spawnEnvFloatingText(
      this.vfxResource,
      `${procName} ${resultName.toLowerCase()}... (stay close, walking away cancels this)`,
      Colors.vfx.campfireMsg,
      this.playerEntity.position!,
      this.entityLayer
    );
  }

  public async refuelCampfire(entityId: string): Promise<boolean> {
    const fuel = chooseFuelOption({
      firewood_bundle: getItemQty("firewood_bundle"),
      wood: getItemQty("wood"),
      branch: getItemQty("branch"),
      stick: getItemQty("stick"),
    });
    if (!fuel) return false;

    try {
      const r = await syncRefuel();
      if (r.ok) {
        applyRpgState(r.data.playerState);
      } else {
        spawnEnvFloatingText(
          this.vfxResource,
          `refuel failed: ${r.error}`,
          Colors.ui.error,
          this.playerEntity.position!,
          this.entityLayer
        );
        return false;
      }
      
      playSound("station.boil");
      const campfireWakeFeedback = getActionFeedback("campfire_wake");
      spawnEnvFloatingText(
        this.vfxResource,
        campfireWakeFeedback?.floatingText ?? "campfire refueled",
        campfireWakeFeedback?.color ?? Colors.vfx.campfireMsg,
        this.playerEntity.position!,
        this.entityLayer
      );
      if (campfireWakeFeedback) {
        emitPlayerFeedback(campfireWakeFeedback.toast, "good");
        spawnEnvParticles(this.vfxResource, campfireWakeFeedback.color, 10, "smoke", this.playerEntity.position!, this.entityLayer);
      }
      const campfire = world.with("position").entities.find((entity) => entity.id === entityId);
      if (campfire) refuelCampfireEntity(campfire, fuel.fuelMs);
      triggerQuestEvent(GameEvent.Refuel);
      return true;
    } catch (err) {
      console.error("Refuel error:", err);
      return false;
    }
  }

  public cancelStationProcess(stationEntityId: string): void {
    if (this.interactionResource.activeProcesses.has(stationEntityId)) {
      this.interactionResource.activeProcesses.delete(stationEntityId);
      spawnEnvFloatingText(
        this.vfxResource,
        "process cancelled",
        Colors.ui.muted,
        this.playerEntity.position!,
        this.entityLayer
      );
    }
  }

  /**
   * Starts a timed, attendable craft for a `tiered` recipe (see
   * craft-process-runtime.ts / CraftingPanel's craftItem). Unlike
   * `startStationProcess`, this never cancels on the player leaving range —
   * it ticks to completion unattended; standing nearby only unlocks the
   * optional quality-boosting minigame. Returns false if the craft can't
   * legally start right now (mirrors checkCraft's own gating).
   */
  public startCraftProcess(recipeId: string): boolean {
    const recipe = getRecipe(recipeId);
    if (!recipe) return false;

    const isNearCampfire = this.isNearCampfire();
    const availableStations = this.nearbyStationIds();
    const ctx: CraftContext = { isNearCampfire, availableStations };
    const check = checkCraft(gameState.rpg.inventory?.slots ?? {}, recipeId, ctx);
    if (!check.ok) {
      spawnEnvFloatingText(this.vfxResource, "cannot craft that here.", Colors.ui.error, this.playerEntity.position!, this.entityLayer);
      return false;
    }

    const requiredContext = recipe.requiredContext;
    let targetStationEntityId: string | undefined;
    let stationId: StationId | undefined;
    if (requiredContext === "campfire") {
      targetStationEntityId = EntityId.Campfire;
    } else if (requiredContext && requiredContext !== "hand" && requiredContext !== "placement") {
      stationId = requiredContext;
      const pos = this.playerEntity.position;
      if (pos) {
        const px = pos.x + TILE / 2;
        const py = pos.y + TILE / 2;
        let nearestDist = Infinity;
        for (const entity of world.with("station", "position").entities) {
          if (entity.station?.stationId !== stationId) continue;
          const ex = entity.position!.x + TILE / 2;
          const ey = entity.position!.y + TILE / 2;
          const dist = Math.hypot(px - ex, py - ey);
          if (dist < nearestDist) {
            nearestDist = dist;
            targetStationEntityId = entity.id;
          }
        }
      }
    }
    // checkCraft already confirmed a matching station/campfire is nearby, so this should
    // always resolve — but stay defensive rather than crash on a stale/edge-case scan.
    if (!targetStationEntityId) return false;

    if (
      this.interactionResource.activeProcesses.has(targetStationEntityId) ||
      this.interactionResource.activeCraftProcesses.has(targetStationEntityId)
    ) {
      spawnEnvFloatingText(
        this.vfxResource,
        "this station is already busy...",
        Colors.ui.error,
        this.playerEntity.position!,
        this.entityLayer
      );
      return false;
    }

    const craftsmanshipLevel = gameState.rpg.skills?.craftsmanship?.level ?? 1;
    this.craftMinigameWindowElapsed = 0;
    this.craftMinigameWindowHit = false;
    this.interactionResource.activeCraftProcesses.set(targetStationEntityId, createCraftProcessRuntime(
      recipe,
      craftsmanshipLevel,
      targetStationEntityId,
      { isNearCampfire, ...(stationId !== undefined ? { stationId } : {}) },
    ));

    spawnEnvFloatingText(
      this.vfxResource,
      `crafting ${recipe.name.toLowerCase()}... (safe to walk away)`,
      Colors.vfx.campfireMsg,
      this.playerEntity.position!,
      this.entityLayer,
    );
    return true;
  }

  public cancelCraftProcess(stationEntityId: string): void {
    if (this.interactionResource.activeCraftProcesses.has(stationEntityId)) {
      this.interactionResource.activeCraftProcesses.delete(stationEntityId);
      spawnEnvFloatingText(
        this.vfxResource,
        "craft cancelled",
        Colors.ui.muted,
        this.playerEntity.position!,
        this.entityLayer
      );
    }
  }

  /**
   * Resolves a completed, parked craft at `stationEntityId` into inventory.
   * No-op (returns false) if that station has nothing collectible right now.
   */
  public collectCraftProcess(stationEntityId: string): boolean {
    return collectCraftProcess(this.interactionResource, stationEntityId, triggerQuestEvent, this.eventQueue);
  }

  /** Every currently-active station process/craft, one entry per busy station — stations run fully independently. */
  public getActiveStationCraftStatuses(): ActiveStationCraftStatus[] {
    const statuses: ActiveStationCraftStatus[] = [];

    for (const activeProc of this.interactionResource.activeProcesses.values()) {
      const progress = activeProc.durationSec > 0 ? Math.min(1, activeProc.elapsedSec / activeProc.durationSec) : 0;
      statuses.push({
        stationEntityId: activeProc.targetEntityId,
        label: getItemDef(activeProc.outputItemId)?.name ?? activeProc.outputItemId,
        iconItemId: activeProc.outputItemId,
        progress,
        walkAwaySafe: false,
        readyForPickup: false,
      });
    }

    for (const activeCraft of this.interactionResource.activeCraftProcesses.values()) {
      const progress = activeCraft.durationSec > 0 ? Math.min(1, activeCraft.elapsedSec / activeCraft.durationSec) : 0;
      statuses.push({
        stationEntityId: activeCraft.targetStationEntityId,
        label: activeCraft.recipe.name,
        iconItemId: activeCraft.recipe.output.itemId,
        progress,
        walkAwaySafe: true,
        readyForPickup: activeCraft.completed,
      });
    }

    return statuses;
  }

  public spawnEnvFloatingText(text: string, color: number = Colors.ui.info): void {
    spawnEnvFloatingText(
      this.vfxResource,
      text,
      color,
      this.playerEntity.position!,
      this.entityLayer
    );
  }

  public spawnEnvParticles(
    color: number,
    count = 10,
    type: "smoke" | "bubble" | "sizzle" = "smoke"
  ): void {
    spawnEnvParticles(
      this.vfxResource,
      color,
      count,
      type,
      this.playerEntity.position!,
      this.entityLayer
    );
  }

  // ---------------------------------------------------------------------------
  // First-camp presentation helpers
  // ---------------------------------------------------------------------------

  private emitDiscoveryBark(id: DiscoveryBarkId): void {
    const bark = getDiscoveryBark(id);
    if (!bark) return;
    const toneMap = { warning: "warning", relief: "good", unease: "info" } as const;
    emitPlayerFeedback(bark.text, toneMap[bark.tone]);
  }

  private emitFirstNightOmen(): void {
    const omen = FIRST_NIGHT_OMENS.wolf_howl;
    emitPlayerFeedback(omen.text, "warning");
    playSound("wolf.howl.distant");
    triggerCameraShake(this.vfxResource, 1.5, 0.25);
  }

  // ---------------------------------------------------------------------------
  // Dev Commands API / Cheats
  // ---------------------------------------------------------------------------

  private devShakeIntensityVal = 1.0;
  private devParticleCountVal = 12;

  public devPlayerGrid(): { gx: number; gy: number } {
    const pos = this.playerEntity.position!;
    return { gx: Math.round(pos.x / TILE), gy: Math.round(pos.y / TILE) };
  }

  public devTeleport(gx: number, gy: number): string {
    if (!this.mapResource.inBounds(gx, gy)) return `out of bounds: ${gx},${gy}`;
    const pos = this.playerEntity.position!;
    pos.x = pos.targetX = gx * TILE;
    pos.y = pos.targetY = gy * TILE;
    this.playerSprite.x = pos.x + TILE / 2;
    this.playerSprite.y = pos.y + TILE;
    return `teleported to ${gx},${gy}`;
  }

  public devSetSpeed(tilesPerSec: number): string {
    this.playerEntity.playerControlled!.speed = TILE * tilesPerSec;
    return `speed set to ${tilesPerSec} tiles/s`;
  }

  public spawnPrefab(prefabId: string, gx: number, gy: number): string {
    const prefab = getPrefabDefinition(prefabId);
    if (!prefab) return `unknown prefab: ${prefabId}`;
    if (!this.mapResource.inBounds(gx, gy)) return `out of bounds: ${gx},${gy}`;
    if (this.mapResource.solidCoords.has(coordKey(gx, gy))) return `cell occupied: ${gx},${gy}`;

    const resource = prefab.components.find((component) => component.type === "resource");
    if (resource?.type === "resource") {
      spawnResourceEntity(
        `dev_${prefabId}_${this.devSpawnSeq++}`,
        gx,
        gy,
        resource.gatherableId,
        this.entityLayer,
        this.entitySprites,
        this.mapResource,
        this.runtimeRegistry,
        this.collisionOverrides
      );
      return `spawned ${prefabId} at ${gx},${gy}`;
    }

    const building = prefab.components.find((component) => component.type === "building");
    if (building?.type === "building") {
      this.spawnBuilding(`dev_${building.buildingType}_${this.devSpawnSeq++}`, building.buildingType, gx, gy);
      return `spawned ${prefabId} at ${gx},${gy}`;
    }

    return `prefab ${prefabId} has no supported runtime spawn component`;
  }

  public devSpawn(gatherableId: string, gx: number, gy: number): string {
    return this.spawnPrefab(gatherableId, gx, gy);
  }

  public devSpawnEnemy(gx?: number, gy?: number): string {
    const grid = this.devPlayerGrid();
    const tx = gx ?? grid.gx + 3;
    const ty = gy ?? grid.gy;
    const id = this.spawnEnemy(tx, ty);
    return id ? `spawned ${id} at ${tx},${ty}` : `cannot spawn at ${tx},${ty}`;
  }

  public devClearEnemies(): string {
    let n = 0;
    for (const e of world.with("ai", "health").entities.slice()) {
      this.enemyColors.delete(e.id);
      despawnEntity(world, e, this.entityLayer, this.entitySprites, this.vfxResource);
      n++;
    }
    return `cleared ${n} enemies`;
  }

  /** Despawns a single entity by id. Backs `world.enemies[i].kill()` in the dev facade. */
  public devDespawnEntity(id: string): string {
    const e = world.entities.find((entity) => entity.id === id);
    if (!e) return `no entity ${id}`;
    this.enemyColors.delete(id);
    despawnEntity(world, e, this.entityLayer, this.entitySprites, this.vfxResource);
    return `despawned ${id}`;
  }

  /**
   * Despawns all resource and pickup entities, resets gathered state, then
   * re-spawns every node from the current map's spawn list. Intended for the
   * scenario panel's "respawn all nodes" button so test scenarios can be reset
   * without a full page reload.
   */
  public respawnAllNodes(): void {
    this.interactionResource.gatheringTarget = null;
    this.interactionResource.currentTarget = null;

    for (const e of world.with("resource").entities.slice()) {
      despawnEntity(world, e, this.entityLayer, this.entitySprites, this.vfxResource);
    }
    for (const e of world.with("pickup").entities.slice()) {
      despawnEntity(world, e, this.entityLayer, this.entitySprites, this.vfxResource);
    }

    // Rebuild solidCoords and spawn list from the scenario definition so that
    // previously gathered tree/rock coords are restored before re-spawning.
    const sc = this.scenarioId ? getScenario(this.scenarioId) : null;
    if (sc) {
      if (sc.firstCampLayout) {
        buildMapSystem(this.mapResource, gameState.rpg.profile?.worldSeed ?? 12345, { carveCamp: sc.camp });
      } else {
        loadScenarioIntoMap(this.mapResource, sc);
      }
      // Re-add the campfire and NPC Vane solids that spawnCamp set up — but only
      // for scenarios that actually have a camp, matching spawnEntities.
      if (sc.camp) {
        const spawnX = sc.spawnPoint.gx;
        const spawnY = sc.spawnPoint.gy;
        this.setTileFootprint(spawnX, spawnY, CollisionFootprints.campfire);
        this.setTileFootprint(spawnX + 2, spawnY - 1, CollisionFootprints.npc);
      }
    }

    const profile = gameState.rpg.profile;
    if (profile) setRpgProfile({ ...profile, gatheredPickups: [] });

    for (const spawn of this.mapResource.mapData.spawns) {
      spawnResourceEntity(
        spawn.id,
        spawn.x,
        spawn.y,
        spawn.gatherableId,
        this.entityLayer,
        this.entitySprites,
        this.mapResource,
        this.runtimeRegistry,
        this.collisionOverrides
      );
    }
  }

  public devSetPlayerHp(hp: number): string {
    const h = this.playerEntity.health!;
    h.current = Math.max(0, Math.min(h.max, hp));
    this.syncPlayerHp();
    return `player hp set to ${h.current}/${h.max}`;
  }

  public devToggleNoclip(): string {
    this.movementResource.noclip = !this.movementResource.noclip;
    return `noclip ${this.movementResource.noclip ? "on" : "off"}`;
  }

  public devSetSpectator(on: boolean): void {
    devFlags.spectatorEnabled = on;
    if (on) {
      this.cameraCenter.x = this.playerEntity.position!.x;
      this.cameraCenter.y = this.playerEntity.position!.y;
      
      const h = this.playerEntity.health!;
      h.current = h.max;
      this.syncPlayerHp();
    }
  }

  public devResetCooldowns(): string {
    this.movementResource.dashCooldownTimer = 0;
    this.focusedGatherResource.cooldownSec = 0;
    this.interactionResource.gatherCooldownTimer = 0;
    cooldownsState.evade = 0;
    cooldownsState.focusedGather = 0;
    cooldownsState.drivingThrust = 0;
    return "cooldowns reset";
  }

  /** Dev: queue a focused-gathering session on the hovered/targeted node. */
  public devStartFocusedGather(): string {
    this.focusedGatherResource.cooldownSec = 0;
    this.inputResource.focusedGatherTriggered = true;
    const target = this.interactionResource.gatheringTarget ?? this.interactionResource.currentTarget;
    if (!target?.resource) return "no gatherable under cursor; hover a node first";
    return `focused gathering queued on ${target.interactable?.name ?? target.id}`;
  }

  public devSetGatherSpeed(seconds: number): string {
    this.interactionResource.gatherInterval = Math.max(0.1, seconds);
    return `gather swing interval set to ${this.interactionResource.gatherInterval.toFixed(2)}s`;
  }

  public devSetShakeScale(intensity: number): string {
    this.devShakeIntensityVal = Math.max(0, intensity);
    return `shake intensity set to ${this.devShakeIntensityVal.toFixed(2)}`;
  }

  public devSetParticleCount(count: number): string {
    this.devParticleCountVal = Math.max(0, Math.floor(count));
    return `hit particle count set to ${this.devParticleCountVal}`;
  }

  public devPlaySound(name: string): string {
    switch (name) {
      case "chop":
        playSound("player.swing");
        return "playing chop sound";
      case "clink":
        playSound("gather.strike");
        return "playing clink sound";
      case "fall":
        playSound("node.treefall");
        return "playing fall sound";
      case "deplete":
        playSound("node.deplete");
        return "playing deplete sound";
      default:
        return "usage: playsound <chop|clink|fall|deplete>";
    }
  }

  public devToggleSound(on: boolean): string {
    setMuted(!on);
    return `audio ${on ? "unmuted" : "muted"}`;
  }

  private isPlayerNearForestAnimalZone(kind: string, radius: number): boolean {
    const pos = this.playerEntity.position;
    if (!pos) return false;
    const pgx = pos.x / TILE;
    const pgy = pos.y / TILE;
    return this.mapResource.forestMetadata.animalZones.some(
      (z) => z.kind === kind && Math.hypot(pgx - z.x, pgy - z.y) <= radius
    );
  }

  private hasPredatorAndPreyAnimals(): boolean {
    let hasPredator = false;
    let hasPrey = false;
    for (const e of world.with("animal").entities) {
      const def = ANIMAL_DEFINITIONS[e.animal!.speciesId];
      if (def.temperament === "predator") hasPredator = true;
      else if (def.temperament === "fearful" || def.temperament === "timid") hasPrey = true;
      if (hasPredator && hasPrey) return true;
    }
    return false;
  }

  private worldEventTimeOfDay(): "day" | "dusk" | "night" {
    const t = this.weatherResource.state.timeOfDay;
    if (isNight(t)) return "night";
    if (t >= 0.65) return "dusk";
    return "day";
  }

  private spawnEnemy(gx: number, gy: number, arch: EnemyArchetype = GRUNT): string | null {
    return spawnEnemy(gx, gy, this.entityLayer, this.entitySprites, this.enemyColors, this.mapResource, this.enemySeq++, arch);
  }

  /** The terrain type the player is standing on, for footsteps SFX. */
  private currentFootstepTerrain(): string {
    const pos = this.playerEntity.position;
    if (!pos) return "none";
    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const cells = this.mapResource.cells;
    const mapW = this.mapResource.mapW;
    if (gx < 0 || gy < 0 || gx >= mapW || gy >= cells.length / mapW) return "none";
    switch (cells[gy * mapW + gx]) {
      case Cell.Meadows:
      case Cell.CrimsonGrove:
      case Cell.Camp:
        return "grass";
      case Cell.Frostbane:
      case Cell.ScorchedWastes:
        return "snow";
      case Cell.Water:
      case Cell.FungalMire:
        return "mud";
      default:
        return "none";
    }
  }

  /** The biome the player currently stands in, for the ambient scheduler. */
  private currentAmbientBiome(): AmbientBiome {
    const pos = this.playerEntity.position;
    if (!pos) return "none";
    const gx = Math.round(pos.x / TILE);
    const gy = Math.round(pos.y / TILE);
    const cells = this.mapResource.cells;
    const mapW = this.mapResource.mapW;
    if (gx < 0 || gy < 0 || gx >= mapW || gy >= cells.length / mapW) return "none";
    switch (cells[gy * mapW + gx]) {
      case Cell.Meadows:
      case Cell.CrimsonGrove:
      case Cell.Camp:
        return "forest";
      case Cell.Frostbane:
      case Cell.ScorchedWastes:
        return "frost";
      case Cell.Water:
      case Cell.FungalMire:
        return "water";
      default:
        return "none";
    }
  }
}
