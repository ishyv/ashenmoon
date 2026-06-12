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
  getStumpTexture,
  getTreeFrames,
  getWarriorFrames,
  loadGameAssets,
  getBiomeTileTexture,
  getShadowTexture,
  getParticleFXFrames,
  loadAssets,
  pawnBundleForColor,
  getPawnFrames,
  type PawnTool,
  type PawnAnim,
  getWoodItemTexture,
  BUNDLE_BUILDINGS,
  getBuildingTexture,
  getBushTexture,
  getCloudTexture,
  BUNDLE_TERRAIN_DECO,
  BUNDLE_PARTICLES,
  BUNDLE_RESOURCES,
  BUNDLE_WARRIORS,
  type UnitColor,
} from "$lib/core/assets/assets";
import { devConsole } from "$lib/ui/debug/dev-console";
import { type Entity, world } from "$lib/core/ecs/ecs-miniplex";
import {
  Cell,
  type HudState,
  type GameEngineConfig,
  type AnimState,
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
  TILE,
} from "$lib/core/systems/map/map";
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
  gatherRingUpdateSystem,
  selectionRingUpdateSystem,
  cloudDriftSystem,
  footstepParticleSystem,
  spawnEnvFloatingText,
  spawnEnvParticles,
  spawnDeathBurst,
  spawnLevelUpBurst,
  triggerCameraShake,
  updateFourfoldSlashVFX,
} from "$lib/core/vfx/vfx";
import {
  MovementConfig,
  MovementResource,
  playerMovementSystem,
} from "$lib/core/systems/movement/movement";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
  renderFellSweepChargeFeedback,
  trackMovementCombo,
  fellSweepSystem,
  tickEnemyBleedSystem,
  knockbackSystem,
  despawnEntity,
  updateFellSweepChargeSystem,
} from "$lib/core/systems/combat/combat";
import {
  drivingThrustSystem,
  renderDrivingThrustPreview,
} from "$lib/core/systems/combat/driving-thrust";
import { enemyAiSystem, makeEnemyEntity, GRUNT, type EnemyArchetype } from "$lib/core/systems/enemy-ai/enemy-ai";
import {
  InteractionResource,
  updateTargetSystem,
  runInteractionSystem,
  handleHitFeedbackSystem,
  depleteNodeSystem,
  setHighlight,
} from "$lib/core/systems/interaction/interaction-system";
import { FocusedGatherResource, runFocusedGatherSystem } from "$lib/core/systems/focused-gather/focused-gather-system";
import { renderFocusedGatherSystem } from "$lib/core/systems/focused-gather/focused-gather-renderer";
import {
  BuildingResource,
  updatePlacementPreviewSystem,
  placeBuildingSystem,
  spawnBuildingSystem,
  isValidPlacement,
} from "$lib/core/systems/building/building-system";
import {
  CraftingResource,
  openCraftingOverlay,
  closeCraftingOverlay,
  updateCraftingOverlaySystem,
  handleCraftingClick,
} from "$lib/core/systems/crafting/crafting-overlay-system";
import { trayReading } from "$lib/state/crafting-session.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgProfile, equipLocalWeapon } from "$lib/state/rpg-actions.svelte";
import { cooldownsState, debugConfig } from "$lib/state/runtime-ui-state.svelte";
import { tickStamina, stamina, staminaConfig } from "$lib/domain/stamina.svelte";
import { tickThirst, loadSurvival } from "$lib/domain/survival.svelte";
import {
  tickStatusEffects,
  getStatusModifiers,
  loadStatuses,
  applyStatusEffect,
} from "$lib/domain/status-effects.svelte";
import { registerPlayerFeedback, registerPlayerHp, emitPlayerFeedback } from "$lib/ui/player-feedback";
import { setEnvironment } from "$lib/state/environment-state.svelte";
import { tickExposureSystem } from "$lib/core/systems/exposure/exposure-system";
import { createGatherableRenderSprite } from "$lib/core/systems/gatherable-render-adapter";
import {
  ItemPlacementResource,
  updateItemPlacementPreviewSystem,
  placeItemSystem,
  getItemTexture,
  isValidItemPlacementGrid,
} from "$lib/core/systems/item-placement/item-placement-system";
import { StatusId } from "$lib/domain/systems/status-types";
import { loadKnowledge } from "$lib/domain/knowledge.svelte";
import { loadRecipes } from "$lib/domain/crafting.svelte";
import { triggerQuestEvent, dialogueState } from "$lib/domain/quests.svelte";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { EntityId, SkillKey, InputAction } from "$lib/domain/game-events";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { awardSkillXp } from "$lib/domain/skill-xp";
import { awardCharacterXp, getPlayerStats } from "$lib/domain/stats.svelte";
import { BASE_COMBAT_STATS } from "$lib/domain/stats/player-stat-growth";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";
import { getPrefabDefinition } from "$lib/domain/definition-registry";
import { executeGameCommand } from "$lib/core/command-runtime/command-runtime";
import { createEngineCommandContext } from "$lib/core/command-runtime/engine-command-context";
import type { CommandSource, GameCommand, GameCommandResult } from "$lib/domain/game-command";
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
import {
  CollisionFootprints,
  PLAYER_BODY,
  computeRenderZ,
  isValidCollisionFootprint,
  resolveCollisionAabb,
  type CollisionFootprint,
} from "$lib/domain/collision";

export class GameEngine {
  private app!: Application;
  private onInteract: (target: Entity) => void;
  private onHudUpdate: (state: HudState) => void;
  private onContextMenu: GameEngineConfig["onContextMenu"];
  private containerEl: HTMLDivElement;

  // Bevy-aligned Resources / Singletons
  public inputResource = new InputResource();
  public mapResource = new MapResource();
  public vfxResource = new VFXResource();
  public movementConfig = new MovementConfig();
  public movementResource = new MovementResource();
  public interactionResource = new InteractionResource();
  public focusedGatherResource = new FocusedGatherResource();
  public buildingResource = new BuildingResource();
  public itemPlacementResource = new ItemPlacementResource();
  public craftingResource = new CraftingResource();
  public combatConfig = new CombatConfig();
  public combatResource = new CombatResource();

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
    interaction: this.interactionResource,
    focusedGather: this.focusedGatherResource,
    building: this.buildingResource,
    combatConfig: this.combatConfig,
    combat: this.combatResource,
    sprites: this.entitySprites,
  };
  private runtimeContext = createRuntimeContext(world, this.runtimeResources);

  // Player Entity & Sprite
  private playerEntity!: Entity;
  private playerSprite!: AnimatedSprite;
  private playerAnimState: AnimState = "idle";
  private playerShadow!: Sprite;
  private lastEquippedWeapon: string | null = null;

  // Campfire glow
  private campfireGlow!: Sprite;
  private lightTexture!: Texture;

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
  private forestEventTimer = 0;

  // Enemy sprite colour registry — lets the AI system fetch the right warrior
  // frames per enemy without baking presentation into the ai component.
  private enemyColors = new Map<string, UnitColor>();
  private enemySeq = 0;

  // Dev unique spawns counter
  private devSpawnSeq = 0;

  private scenarioId: string | null = null;
  private collisionOverrides = new Map<string, CollisionFootprint>();

  constructor(config: GameEngineConfig) {
    this.containerEl = config.container;
    this.onInteract = config.onInteract;
    this.onHudUpdate = config.onHudUpdate;
    this.onContextMenu = config.onContextMenu;
    this.scenarioId = config.scenarioId ?? null;
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

      // Load static bundles
      await loadGameAssets();
      await loadAssets(BUNDLE_WARRIORS);
      await loadAssets(pawnBundleForColor("blue"));
      await loadAssets(pawnBundleForColor("yellow"));
      await loadAssets(BUNDLE_BUILDINGS);
      await loadAssets(BUNDLE_TERRAIN_DECO);
      await loadAssets(BUNDLE_PARTICLES);
      await loadAssets(BUNDLE_RESOURCES);

      // Setup listeners via input resource
      const canvas = this.app.canvas as HTMLCanvasElement;
      canvas.style.cursor = "crosshair";

      const cleanInputListeners = this.inputResource.setupListeners(
        canvas,
        this.worldContainer,
        () => this.buildingResource.isPlacementMode || this.itemPlacementResource.isPlacementMode,
        () => { this.cancelBuildingPlacement(); this.cancelItemPlacement(); },
        this.onContextMenu,
        () => this.interactionResource.currentTarget
      );

      // Save cleanup references
      this.cleanupInputListeners = cleanInputListeners;

      canvas.addEventListener("wheel", this.onWheel, { passive: false });

      // Map generation: use scenario if active, otherwise procedural.
      if (this.scenarioId) {
        const sc = getScenario(this.scenarioId);
        if (sc) {
          loadScenarioIntoMap(this.mapResource, sc);
        } else {
          console.warn(`[scenario] unknown id "${this.scenarioId}", falling back to procedural`);
          buildMapSystem(this.mapResource);
        }
      } else {
        buildMapSystem(this.mapResource);
      }

      // Attach layers to stage
      this.entityLayer.sortableChildren = true;
      this.collisionOverlay.zIndex = 120_000;
      this.collisionOverlay.visible = debugConfig.showCollision;
      this.worldContainer.addChild(this.tileLayer);
      this.worldContainer.addChild(this.entityLayer);
      this.entityLayer.addChild(this.collisionOverlay);
      this.app.stage.addChild(this.worldContainer);

      // Draw map tiles
      drawTerrainSystem(this.mapResource, this.tileLayer);

      // Populate entities
      this.spawnEntities();

      // Pre-generate lighting textures
      this.initLightingTextures();

      // Survival state: restore persisted thirst/statuses and hook the
      // feedback + hp sinks so state modules can reach the canvas/player.
      loadSurvival();
      loadStatuses();
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
      this.app.ticker.add((ticker) => this.tick(ticker.deltaTime / 60));
    } catch (err: any) {
      devConsole.log("Engine initialization failed: " + err.message, "error");
      if (err.stack) {
        devConsole.log(err.stack, "error");
      }
      console.error("GameEngine init crash:", err);
    }
  }

  private cleanupInputListeners?: () => void;

  public destroy(): void {
    if (this.cleanupInputListeners) {
      this.cleanupInputListeners();
    }
    if (this.app?.canvas) {
      this.app.canvas.removeEventListener("wheel", this.onWheel);
    }
    registerPlayerFeedback(null);
    registerPlayerHp(null);

    this.app.destroy(true, { children: true });
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
    this.vfxResource.activeShakes.clear();
    this.vfxResource.baseScales.clear();

    this.vfxResource.gatherRing?.destroy();
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
      // Run player movement system
      const wasSprinting = playerMovementSystem(
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
        this.combatResource
      );

      // Zoom Lerp update
      const rate = Math.min(1.0, this.zoomSmoothing * 60 * dt);
      this.zoom += (this.targetZoom - this.zoom) * rate;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

      // Sync camera matrices
      cameraShakeSystem(
        this.vfxResource,
        dt,
        this.app.screen,
        this.playerEntity.position!,
        this.zoom,
        this.worldContainer
      );

      // Recalculate mouse world position based on current screen coordinates and updated camera transform
      const localMouse = this.worldContainer.toLocal(this.inputResource.mouseScreen);
      this.inputResource.mouseWorld = { x: localMouse.x, y: localMouse.y };

      updateFellSweepChargeSystem(
        this.inputResource,
        this.combatResource,
        this.vfxResource,
        dt,
        this.playerEntity,
        this.entityLayer,
        this.movementResource.isDashing,
        this.buildingResource.isPlacementMode
      );

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
          getTreeFrames,
          getStumpTexture,
          setPlayerAnim: (state) => this.setPlayerAnim(state),
          onHit: (entity, yieldName, quantity) => this.handleHit(entity, yieldName, quantity),
          zeroCooldowns: gameState.rpg.profile === null,
          map: this.mapResource,
        }
      );
      renderFocusedGatherSystem(this.focusedGatherResource, this.entityLayer);
      const focusedGatherActive = this.focusedGatherResource.session !== null;

      // Arbitrate the left-click between interacting and attacking. A click on a
      // hovered interactable in range (tree, ore, pickup, campfire, NPC) routes
      // to the interaction system; a click on anything else is a melee swing.
      // This preserves click-to-gather/talk while still allowing click-to-attack.
      if (
        !focusedGatherActive &&
        this.inputResource.pendingAttack &&
        !this.buildingResource.isPlacementMode &&
        !this.itemPlacementResource.isPlacementMode &&
        this.interactionResource.currentTarget !== null
      ) {
        this.inputResource.pendingAttack = false;
        this.inputResource.pendingInteract = true;
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
              mx,
              my,
              world,
              this.mapResource,
              this.vfxResource,
              this.entityLayer,
              this.entitySprites,
              getBuildingTexture,
              triggerQuestEvent,
              () => this.cancelBuildingPlacement(),
              this.buildingResource.onPlacementCompleteCb
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
      } else if (this.craftingResource.isOpen) {
        // Crafting overlay is open — swallow all action inputs, run overlay update
        const reading = trayReading();
        if (this.inputResource.pendingAttack) {
          handleCraftingClick(
            this.craftingResource,
            this.inputResource.mouseWorld.x,
            this.inputResource.mouseWorld.y,
          );
          this.inputResource.pendingAttack = false;
        }
        this.inputResource.pendingInteract = false;
        this.inputResource.pendingFellSweep = false;
        updateCraftingOverlaySystem(
          this.craftingResource,
          this.vfxResource,
          this.entityLayer,
          dt,
          reading,
          this.playerEntity.position!,
        );
        // Walk-away auto-close
        const dx = this.playerEntity.position!.x - this.craftingResource.campfireWorldPos.x;
        const dy = this.playerEntity.position!.y - this.craftingResource.campfireWorldPos.y;
        const distTiles = Math.hypot(dx, dy) / TILE;
        if (distTiles > this.interactionResource.campfireHeatRadius) {
          this.cancelCrafting();
        }
      } else if (!focusedGatherActive) {
        // Consume requestCrafting from campfire handler
        if (this.interactionResource.requestCrafting) {
          this.interactionResource.requestCrafting = false;
          openCraftingOverlay(this.craftingResource, this.entityLayer);
        }

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
          getParticleFXFrames,
          getWoodItemTexture,
          getTreeFrames,
          getStumpTexture,
          this.buildingResource.isPlacementMode,
          this.movementResource.isDashing,
          (entity, yieldName, quantity) => this.handleHit(entity, yieldName, quantity),
          this.mapResource
        );
      }

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

      trackMovementCombo(this.combatResource, this.inputResource);
      // The player's own swings pause during a focused-gathering session; clicks
      // belong to the minigame.
      if (!focusedGatherActive) {
        drivingThrustSystem(
          world,
          this.inputResource,
          this.combatResource,
          this.combatConfig,
          this.vfxResource,
          dt,
          this.playerEntity,
          this.playerSprite,
          (state) => this.setPlayerAnim(state),
          this.entityLayer,
          this.movementResource,
          this.mapResource,
          this.buildingResource.isPlacementMode,
          (enemy) => this.handleEnemyDeath(enemy)
        );

        playerAttackSystem(
          world,
          this.inputResource,
          this.combatResource,
          this.combatConfig,
          this.vfxResource,
          dt,
          this.playerEntity,
          this.playerSprite,
          (state) => this.setPlayerAnim(state),
          this.entityLayer,
          this.movementResource,
          this.buildingResource.isPlacementMode,
          (enemy) => this.handleEnemyDeath(enemy)
        );

        fellSweepSystem(
          world,
          this.inputResource,
          this.combatResource,
          this.combatConfig,
          this.vfxResource,
          dt,
          this.playerEntity,
          this.playerSprite,
          (state) => this.setPlayerAnim(state),
          this.entityLayer,
          this.movementResource.isDashing,
          this.buildingResource.isPlacementMode,
          gameState.rpg.skills?.fellSweep?.level ?? 1,
          (enemy) => this.handleEnemyDeath(enemy)
        );
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
        this.getEnemyFrames
      );

      tickEnemyBleedSystem(
        world,
        this.combatResource,
        this.combatConfig,
        this.vfxResource,
        this.entityLayer,
        dt,
        (enemy) => this.handleEnemyDeath(enemy)
      );

      knockbackSystem(world, this.mapResource, this.entitySprites, dt);

      // Pin the player sprite after any knockback displacement.
      this.playerSprite.x = this.playerEntity.position!.x + TILE / 2;
      this.playerSprite.y = this.playerEntity.position!.y + TILE;

      const chargeProgress = this.combatResource.fellSweepChargeState.chargeProgress;

      // --- Survival ---
      // Thirst drains with activity; statuses tick once per accumulated second
      // and hand back any pulse damage (bleeding, sickness fever).
      tickThirst(dt, {
        moving: this.playerAnimState === "run",
        laboring: this.interactionResource.gatheringTarget !== null,
      });

      if (this.playerEntity.position) {
        const pgx = Math.round(this.playerEntity.position.x / TILE);
        const pgy = Math.round(this.playerEntity.position.y / TILE);
        const env = this.getAmbientEnvironment(pgx, pgy);
        setEnvironment(env);

        if (env.temperature <= 0) {
          applyStatusEffect(StatusId.Hypothermia, 5, "environment");
        }
      }

      tickExposureSystem(world, this.mapResource, dt, this.vfxResource, this.entityLayer);

      // --- Random Forest Events ---
      this.forestEventTimer -= dt;
      if (this.forestEventTimer <= 0) {
        this.forestEventTimer = 45 + Math.random() * 45;
        const events = [
          { msg: "You hear a distant howl echoing through the trees.", sound: "ambient.wind" },
          { msg: "A strange rustling comes from the nearby brush.", sound: "node.deplete" },
          { msg: "A cold wind sweeps across the forest, biting at your skin.", sound: "ambient.wind" },
          { msg: "A snap of a branch sounds in the shadows.", sound: "node.deplete" }
        ];
        const event = events[Math.floor(Math.random() * events.length)];
        emitPlayerFeedback(event.msg, "warning");
        if (event.sound) {
          playSound(event.sound as any);
        }
      }

      const statusTick = tickStatusEffects(dt);
      if (statusTick.hpDelta !== 0) {
        playerHealth.current = Math.max(
          0,
          Math.min(playerHealth.max, playerHealth.current + statusTick.hpDelta)
        );
      }

      if (playerHealth.current <= 0) this.respawnPlayer();
      this.syncPlayerHp();

      // Regenerate stamina when not sprinting (slower while in combat,
      // slower still while sick/exhausted). Pool size and the status regen
      // multiplier both come from the stat layer.
      const combatStats = getPlayerStats().combat;
      if (staminaConfig.max !== combatStats.maxStamina) {
        staminaConfig.max = combatStats.maxStamina;
      }
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
      const evadeLevel = gameState.rpg.skills?.evade?.level ?? 1;
      const maxEvadeCd = Math.max(0.5, this.movementConfig.dashCooldown - (evadeLevel - 1) * 0.05);
      cooldownsState.evade = Math.max(0, this.movementResource.dashCooldownTimer);
      cooldownsState.evadeMax = maxEvadeCd;

      cooldownsState.focusedGather = Math.max(0, this.focusedGatherResource.cooldownSec);
      cooldownsState.focusedGatherMax = this.focusedGatherResource.cooldownMaxSec;

      const fsLevel = gameState.rpg.skills?.fellSweep?.level ?? 1;
      const maxFsCd = Math.max(4.0, 8.0 - (fsLevel - 1) * 0.4);
      cooldownsState.fellSweep = Math.max(0, this.combatResource.fellSweepCooldownTimer);
      cooldownsState.fellSweepMax = maxFsCd;
      cooldownsState.fellSweepCharge = chargeProgress;
      cooldownsState.drivingThrust = Math.max(0, this.combatResource.drivingThrustCooldownTimer);
      cooldownsState.drivingThrustMax = this.combatResource.drivingThrustConfig.cooldownMs / 1000;

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
        this.entityLayer
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
      gatherRingUpdateSystem(
        this.vfxResource,
        this.playerEntity.position!,
        this.interactionResource.gatheringTarget,
        this.interactionResource.currentGatherInterval,
        this.interactionResource.gatherCooldownTimer
      );

      renderFellSweepChargeFeedback(
        this.combatResource,
        this.vfxResource,
        dt,
        this.playerEntity,
        this.playerSprite,
        this.entityLayer
      );

      renderDrivingThrustPreview(
        this.vfxResource,
        this.entityLayer,
        this.playerEntity.position,
        this.inputResource,
        this.combatResource.drivingThrustConfig
      );

      selectionRingUpdateSystem(
        this.vfxResource,
        dt,
        this.interactionResource.currentTarget,
        this.entitySprites
      );

      updateFourfoldSlashVFX(
        this.vfxResource,
        this.playerEntity.position,
        this.combatResource.fourfoldState,
        this.combatResource.fourfoldConfig,
        this.combatResource.currentTimeMs,
        this.combatConfig.reach
      );

      // Cull offscreen viewport entities/tiles
      cullViewportSystem(
        this.mapResource,
        this.playerEntity.position!,
        this.zoom,
        this.app.screen,
        this.entitySprites
      );

      // Update campfire glow flicker
      if (this.campfireGlow) {
        const baseRadius = this.interactionResource.campfireHeatRadius;
        const flicker = 1.0 + Math.sin(performance.now() * 0.007) * 0.04;
        this.campfireGlow.scale.set(((baseRadius * TILE * 1.8) / 384) * flicker);
      }

      this.updateRenderOrder();
      this.drawCollisionOverlay();

      // Push coordinates and lookAt entity HUD update
      this.pushHudUpdate();
    } catch (err: any) {
      devConsole.log("Engine tick loop failed: " + err.message, "error");
      if (err.stack) {
        devConsole.log(err.stack, "error");
      }
      console.error("GameEngine tick crash:", err);
      // Stop the ticker on error to prevent cascading crash logs
      this.app.ticker.stop();
    }
  }

  private spawnEntities(): void {
    const scenario = this.scenarioId ? getScenario(this.scenarioId) : null;
    // Scenarios are clean rooms by default: the base-world furniture (camp,
    // decorations, seeded enemies) is opt-in per scenario. The base world (no
    // scenario) keeps all of it, so this branch is invisible to normal play.
    const wantCamp = !scenario || scenario.camp === true;
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
    world.add(this.playerEntity);

    // Spawn shadow under player
    this.playerShadow = new Sprite(getShadowTexture());
    this.playerShadow.anchor.set(0.5, 0.5);
    this.playerShadow.scale.set(0.55);
    this.playerShadow.alpha = 0.35;
    this.playerShadow.x = startX + TILE / 2;
    this.playerShadow.y = startY + 2 * TILE;
    this.playerShadow.zIndex = computeRenderZ(this.playerShadow.y, -5);
    this.entityLayer.addChild(this.playerShadow);

    // Save starting loadout weapon
    const startW = gameState.rpg.profile?.loadout?.weapon;
    this.lastEquippedWeapon = startW ? (typeof startW === "string" ? startW : startW.itemId) : null;

    // Load matching player frames depending on starting loadout
    const pConfig = this.getPlayerSpriteConfig();
    let initialFrames;
    if (pConfig.isWarrior) {
      initialFrames = getWarriorFrames("idle");
    } else {
      initialFrames = getPawnFrames("idle", "blue", pConfig.tool);
    }

    this.playerSprite = new AnimatedSprite(initialFrames);
    this.playerSprite.animationSpeed = 0.12;
    this.playerSprite.play();
    const scale = (TILE * 1.1) / 192;
    this.playerSprite.scale.set(scale);
    this.playerSprite.anchor.set(0.5, 1);
    this.playerSprite.x = startX + TILE / 2;
    this.playerSprite.y = startY + 2 * TILE;
    this.playerSprite.zIndex = computeRenderZ(this.playerSprite.y);
    this.entityLayer.addChild(this.playerSprite);
    this.entitySprites.set(EntityId.Player, this.playerSprite);

    // Campfire + Commander Vane. Base world always; scenarios only when opted in.
    if (wantCamp) {
      this.spawnCamp(spawnX, spawnY, startX, startY);
    }

    // Scatter resource nodes
    const gatheredPickups = gameState.rpg.profile?.gatheredPickups ?? [];
    for (const spawn of this.mapResource.mapData.spawns) {
      if (gatheredPickups.includes(spawn.id)) continue;
      this.spawnResource(spawn.id, spawn.x, spawn.y, spawn.gatherableId);
    }

    // Restore constructed buildings — real world only. A scenario is a clean
    // room and must not inherit the player's built structures.
    if (!scenario && gameState.rpg.profile && Array.isArray(gameState.rpg.profile.buildings)) {
      for (const b of gameState.rpg.profile.buildings) {
        this.spawnBuilding(b.id, b.type, b.x, b.y);
      }
    }

    // Scatter decorations. Base world always; scenarios only when opted in.
    if (wantDecorations) {
      this.spawnDecorations();
    }

    // Enemies: the base world seeds a few hostiles around camp so combat is
    // testable on load; a scenario only gets the hostiles it explicitly lists.
    if (!scenario) {
      this.spawnInitialEnemies(spawnX, spawnY);
    } else if (scenario.enemies) {
      for (const e of scenario.enemies) {
        this.spawnEnemy(e.gx, e.gy);
      }
    }

    // Setup indicators overlay rings
    this.vfxResource.gatherRing = new Graphics();
    this.vfxResource.gatherRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.gatherRing);

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

  private spawnDecorations(): void {
    const W = this.mapResource.mapW;
    const H = this.mapResource.mapH;

    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const cell = this.mapResource.cells[gy * W + gx];
        if (cell !== Cell.Meadows && cell !== Cell.CrimsonGrove) continue;
        if (this.mapResource.solidCoords.has(coordKey(gx, gy))) continue;

        const hash = (gx * 1031 + gy * 2053) & 0xffff;
        if (hash > 0xffff * 0.06) continue;
        const variant = ((hash % 4) + 1) as 1 | 2 | 3 | 4;
        const bush = new Sprite(getBushTexture(variant));
        bush.anchor.set(0.5, 1);
        bush.x = gx * TILE + TILE / 2 + ((hash >> 8) % 10) - 5;
        bush.y = gy * TILE + TILE + ((hash >> 4) % 10) - 5;
        bush.scale.set(TILE / 80);
        bush.alpha = 0.7 + (hash & 0x0f) / 60;
        this.entityLayer.addChild(bush);
      }
    }

    // Ambient cloud drift
    for (let i = 0; i < 12; i++) {
      const variant = ((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
      const cloud = new Sprite(getCloudTexture(variant));
      cloud.anchor.set(0.5, 0.5);
      cloud.x = (i / 12) * W * TILE + Math.random() * TILE * 10;
      cloud.y = Math.random() * H * TILE;
      cloud.scale.set(0.7 + Math.random() * 0.7);
      cloud.alpha = 0.28 + Math.random() * 0.2;
      this.entityLayer.addChild(cloud);
      this.vfxResource.clouds.push({ sprite: cloud, vx: 8 + Math.random() * 14 });
    }
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

  private spawnResource(id: string, gx: number, gy: number, gatherableId: string): void {
    const ex = gx * TILE;
    const ey = gy * TILE;

    const gatherable = getGatherableDefinition(gatherableId);
    if (!gatherable) return;

    const nodeName = gatherable.displayName;
    const drop = gatherable.yieldTable[0];
    const dropName = drop?.itemId ?? "stick";
    const dropQty = drop?.quantity ?? 1;
    const isPickup = gatherable.interactionKind !== "repeated_action";
    const prefab = getPrefabDefinition(gatherableId);
    const entity = prefab
      ? composeEntityFromPrefab(prefab, this.runtimeRegistry.components, { id: gatherableId, gx, gy, entityId: id })
      : null;
    if (isPickup) {
      world.add(entity ?? {
        id,
        position: { x: ex, y: ey, targetX: ex, targetY: ey },
        collider: { isSolid: false },
        interactable: { name: nodeName, action: "pickup" },
        pickup: { itemId: dropName, qty: dropQty, gatherableId },
      });

      const sprite = createGatherableRenderSprite(gatherable, ex, ey);
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(id, sprite);
    } else {
      world.add(entity ?? {
        id,
        position: { x: ex, y: ey, targetX: ex, targetY: ey },
        collider: { isSolid: true },
        interactable: { name: nodeName, action: "gather" },
        resource: {
          hp: gatherable?.depletion?.hp ?? 15,
          maxHp: gatherable?.depletion?.hp ?? 15,
          drop: dropName,
          gatherableId,
          rpgAction: gatherable.syncAction,
          rpgLocationId: gatherable.syncLocationId,
        },
      });
      const footprint = this.authoredFootprintFor(gatherableId);
      if (gatherable.collision?.solid !== false && footprint) {
        this.setTileFootprint(gx, gy, footprint);
      }

      const sprite = createGatherableRenderSprite(gatherable, ex, ey);
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(id, sprite);
    }
  }

  // ---------------------------------------------------------------------------
  // Combat: enemy spawn/death, player respawn, HP mirror
  // ---------------------------------------------------------------------------

  /** Frames provider passed to the AI system so each enemy renders in its colour. */
  private getEnemyFrames = (entity: Entity, state: AnimState) => {
    return getWarriorFrames(state, this.enemyColors.get(entity.id) ?? "red");
  };

  /**
   * Spawns one hostile (ECS entity + animated sprite + shadow) at a grid cell.
   * Skips out-of-bounds or solid cells. Returns the entity id, or null if skipped.
   */
  public spawnEnemy(gx: number, gy: number, arch: EnemyArchetype = GRUNT): string | null {
    if (!this.mapResource.inBounds(gx, gy)) return null;
    if (this.mapResource.solidCoords.has(coordKey(gx, gy))) return null;

    const id = `enemy_${this.enemySeq++}`;
    const ex = gx * TILE;
    const ey = gy * TILE;
    world.add(makeEnemyEntity(id, ex, ey, arch));
    this.enemyColors.set(id, arch.color);

    const sprite = new AnimatedSprite(getWarriorFrames("idle", arch.color));
    sprite.animationSpeed = 0.12;
    sprite.play();
    sprite.anchor.set(0.5, 1);
    sprite.scale.set((TILE * 1.1) / 192);
    sprite.x = ex + TILE / 2;
    sprite.y = ey + TILE;
    sprite.zIndex = computeRenderZ(sprite.y);
    this.entityLayer.addChild(sprite);
    this.entitySprites.set(id, sprite);
    return id;
  }

  private spawnInitialEnemies(spawnX: number, spawnY: number): void {
    const offsets: [number, number][] = [
      [6, 0],
      [-6, 3],
      [5, -5],
      [-5, -4],
    ];
    for (const [dx, dy] of offsets) {
      this.spawnEnemy(spawnX + dx, spawnY + dy);
    }
  }

  /**
   * Spawns the camp furniture: the campfire (refuel + light + respawn anchor)
   * and Commander Vane (quest giver), plus their solids. The base world always
   * has this; a scenario only gets it when it sets `camp: true`.
   */
  private spawnCamp(spawnX: number, spawnY: number, startX: number, startY: number): void {
    // Campfire entity
    const campfireContainer = new Container();
    campfireContainer.x = startX + TILE / 2;
    campfireContainer.y = startY + TILE / 2;
    campfireContainer.zIndex = computeRenderZ(startY + TILE * 0.82);

    const log1 = new Sprite(getWoodItemTexture());
    log1.anchor.set(0.5, 0.5);
    log1.rotation = -0.3;
    log1.scale.set((TILE * 0.6) / 64);

    const log2 = new Sprite(getWoodItemTexture());
    log2.anchor.set(0.5, 0.5);
    log2.rotation = 0.3;
    log2.scale.set((TILE * 0.6) / 64);

    // Add warm campfire light glow behind logs
    this.campfireGlow = new Sprite(this.lightTexture);
    this.campfireGlow.anchor.set(0.5);
    this.campfireGlow.blendMode = "add";
    this.campfireGlow.alpha = 0.5;
    this.campfireGlow.scale.set(1.5);
    campfireContainer.addChild(this.campfireGlow);

    campfireContainer.addChild(log1);
    campfireContainer.addChild(log2);

    const fireFrames = getParticleFXFrames("fire1");
    const campfire = new AnimatedSprite(fireFrames);
    campfire.animationSpeed = 0.15;
    campfire.play();
    campfire.anchor.set(0.5, 0.75);
    campfire.scale.set((TILE * 0.8) / 48);
    campfireContainer.addChild(campfire);

    this.entityLayer.addChild(campfireContainer);
    this.interactionResource.campfireSprite = campfire;
    this.entitySprites.set(EntityId.Campfire, campfireContainer);
    this.craftingResource.campfireWorldPos = { x: startX + TILE / 2, y: startY + TILE / 2 };

    world.add({
      id: EntityId.Campfire,
      position: { x: startX, y: startY, targetX: startX, targetY: startY },
      interactable: { name: "Campfire", action: "refuel" },
      collider: { isSolid: true },
    });
    this.setTileFootprint(spawnX, spawnY, CollisionFootprints.campfire);

    // NPC Vane
    const npcGx = spawnX + 2;
    const npcGy = spawnY - 1;
    const npcEx = npcGx * TILE;
    const npcEy = npcGy * TILE;

    world.add({
      id: EntityId.NpcVane,
      position: { x: npcEx, y: npcEy, targetX: npcEx, targetY: npcEy },
      interactable: { name: "Commander Vane", action: "talk" },
      collider: { isSolid: true },
    });
    this.setTileFootprint(npcGx, npcGy, CollisionFootprints.npc);

    const vaneFrames = getWarriorFrames("idle", "yellow");
    const vaneSprite = new AnimatedSprite(vaneFrames);
    vaneSprite.animationSpeed = 0.12;
    vaneSprite.play();
    vaneSprite.anchor.set(0.5, 1);
    vaneSprite.x = npcEx + TILE / 2;
    vaneSprite.y = npcEy + TILE;
    vaneSprite.zIndex = computeRenderZ(vaneSprite.y);
    vaneSprite.scale.set((TILE * 1.1) / 192);
    this.entityLayer.addChild(vaneSprite);
    this.entitySprites.set(EntityId.NpcVane, vaneSprite);
  }

  /** Enemy death: reward, loot feedback, death burst, despawn. */
  private handleEnemyDeath(enemy: Entity): void {
    const pos = enemy.position;
    if (pos) {
      spawnDeathBurst(
        this.vfxResource,
        this.entityLayer,
        pos.x + TILE / 2,
        pos.y + TILE * 0.6,
        Colors.combat.enemyDeath
      );
      const xp = enemy.loot?.xpReward ?? 0;
      if (xp > 0) {
        spawnEnvFloatingText(this.vfxResource, `+${xp} xp`, Colors.resource.xp, pos, this.entityLayer);
        awardSkillXp(SkillKey.Combat, xp, this.vfxResource, this.playerEntity.position!, this.entityLayer);
        const levelsGained = awardCharacterXp(xp);
        if (levelsGained > 0) {
          const ppos = this.playerEntity.position!;
          spawnLevelUpBurst(this.vfxResource, this.entityLayer, ppos.x + TILE / 2, ppos.y + TILE / 2);
          playSound("player.levelup");
        }
      }
    }
    playSound("enemy.death", {
      position: pos ? { x: pos.x + TILE / 2, y: pos.y + TILE / 2 } : undefined,
    });
    this.enemyColors.delete(enemy.id);
    despawnEntity(world, enemy, this.entityLayer, this.entitySprites, this.vfxResource);
  }

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
    if (this.vfxResource.gatherRing) this.vfxResource.gatherRing.zIndex = 85_000;
    if (this.vfxResource.selectionRing) this.vfxResource.selectionRing.zIndex = 85_000;
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
      this.entitySprites,
      getParticleFXFrames,
      getWoodItemTexture
    );
  }

  private spawnBuilding(id: string, type: string, gx: number, gy: number): void {
    spawnBuildingSystem(
      id,
      type,
      gx,
      gy,
      world,
      this.mapResource,
      this.entityLayer,
      this.entitySprites,
      getBuildingTexture
    );
  }

  // Holds the attack pose briefly so a swing reads even while the movement
  // system is requesting "run"/"idle" every frame.
  private attackAnimLockTimer = 0;

  private getPlayerSpriteConfig(): { isWarrior: boolean; tool: PawnTool } {
    const w = gameState.rpg.profile?.loadout?.weapon;
    const itemId = w ? (typeof w === "string" ? w : w.itemId) : null;
    if (!itemId) {
      return { isWarrior: false, tool: null };
    }
    if (itemId.includes("pickaxe")) {
      return { isWarrior: false, tool: "pickaxe" };
    }
    if (itemId.includes("axe")) {
      return { isWarrior: false, tool: "axe" };
    }
    if (itemId.includes("hammer")) {
      return { isWarrior: false, tool: "hammer" };
    }
    return { isWarrior: true, tool: null };
  }

  private initLightingTextures(): void {
    const radius = 384;

    // Create a light texture fading from warm white/orange to transparent
    const canvas = document.createElement("canvas");
    canvas.width = radius * 2;
    canvas.height = radius * 2;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    grad.addColorStop(0, "rgba(255, 235, 205, 0.45)"); // Warm orange/white center
    grad.addColorStop(0.35, "rgba(255, 190, 130, 0.25)"); // Mid glow
    grad.addColorStop(0.7, "rgba(255, 150, 90, 0.1)"); // Fading glow
    grad.addColorStop(1, "rgba(255, 150, 90, 0)"); // Fades out completely
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, radius * 2, radius * 2);
    this.lightTexture = Texture.from(canvas);
  }

  private setPlayerAnim(state: AnimState): void {
    // While the swing pose is locked, ignore idle/run requests from movement.
    if (state !== "attack" && this.attackAnimLockTimer > 0) return;
    if (state === "attack") this.attackAnimLockTimer = 0.28;

    const currentWeapon = gameState.rpg.profile?.loadout?.weapon;
    const currentWeaponId = currentWeapon ? (typeof currentWeapon === "string" ? currentWeapon : currentWeapon.itemId) : null;

    if (this.playerAnimState === state && this.lastEquippedWeapon === currentWeaponId) {
      if (state === "attack") {
        this.playerSprite.gotoAndPlay(0);
      }
      return;
    }
    this.playerAnimState = state;
    this.lastEquippedWeapon = currentWeaponId;

    const config = this.getPlayerSpriteConfig();
    let frames: Texture[];
    if (config.isWarrior) {
      frames = getWarriorFrames(state);
    } else {
      let pawnAnim: PawnAnim = "idle";
      if (state === "run") {
        pawnAnim = "run";
      } else if (state === "attack") {
        const interactTools = new Set<PawnTool>(["axe", "hammer", "knife", "pickaxe"]);
        if (interactTools.has(config.tool)) {
          pawnAnim = "interact";
        } else {
          pawnAnim = "idle";
        }
      }
      frames = getPawnFrames(pawnAnim, "blue", config.tool);
    }
    this.playerSprite.textures = frames;

    if (state === "attack") {
      this.playerSprite.loop = false;
      this.playerSprite.animationSpeed = 0.18;
      this.playerSprite.onComplete = () => {
        if (this.playerAnimState === "attack") {
          this.setPlayerAnim("idle");
        }
      };
    } else {
      this.playerSprite.loop = true;
      this.playerSprite.animationSpeed = 0.12;
      this.playerSprite.onComplete = undefined;
    }

    this.playerSprite.play();
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

  public getAmbientEnvironment(gx: number, gy: number): { temperature: number; humidity: number; toxins: number } {
    return getAmbientEnvironment(
      this.mapResource,
      gx,
      gy,
      this.interactionResource.campfireHeatRadius
    );
  }

  public updateBindings(newBindings: Record<string, string[]>): void {
    this.inputResource.updateBindings(newBindings);
  }

  public triggerInteract(): void {
    this.inputResource.pendingInteract = true;
  }

  public async execute(command: GameCommand, source: CommandSource = "player"): Promise<GameCommandResult> {
    return executeGameCommand(createEngineCommandContext(this, source), command);
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

  public isNearCampfire(): boolean {
    const pos = this.playerEntity?.position;
    if (!pos) return false;
    const px = Math.floor((pos.x + TILE / 2) / TILE);
    const py = Math.floor((pos.y + TILE / 2) / TILE);
    const spawnX = Math.floor(this.mapResource.mapW / 2);
    const spawnY = Math.floor(this.mapResource.mapH / 2);

    const dist = Math.sqrt((px - spawnX) * (px - spawnX) + (py - spawnY) * (py - spawnY));
    return dist <= 4.5;
  }

  public startBuildingPlacement(
    type: string,
    onCancel?: () => void,
    onComplete?: () => void
  ): void {
    this.buildingResource.currentPlacementType = type;
    this.buildingResource.isPlacementMode = true;
    this.buildingResource.onPlacementCancelCb = onCancel;
    this.buildingResource.onPlacementCompleteCb = onComplete;

    if (this.buildingResource.previewSprite) {
      this.buildingResource.previewSprite.destroy();
    }

    const tex = getBuildingTexture("yellow", getBuildingSpec(type).textureType);

    this.buildingResource.previewSprite = new Sprite(tex);
    this.buildingResource.previewSprite.anchor.set(0.5, 1);
    this.buildingResource.previewSprite.alpha = 0.6;
    this.entityLayer.addChild(this.buildingResource.previewSprite);
  }

  public cancelBuildingPlacement(): void {
    this.buildingResource.isPlacementMode = false;
    this.buildingResource.currentPlacementType = null;
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
    this.itemPlacementResource.onPlacementCancelCb = onCancel;
    this.itemPlacementResource.onPlacementCompleteCb = onComplete;

    if (this.itemPlacementResource.previewSprite) {
      this.itemPlacementResource.previewSprite.destroy();
    }

    const tex = getItemTexture(itemId);

    this.itemPlacementResource.previewSprite = new Sprite(tex);
    this.itemPlacementResource.previewSprite.anchor.set(0.5, 1);
    this.itemPlacementResource.previewSprite.alpha = 0.6;
    this.itemPlacementResource.previewSprite.scale.set((TILE * 0.4) / 64);
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
    this.itemPlacementResource.onPlacementCancelCb?.();
    this.itemPlacementResource.onPlacementCancelCb = undefined;
    this.itemPlacementResource.onPlacementCompleteCb = undefined;
  }

  public startCrafting(): void {
    this.craftingResource.requestOpen = true;
  }

  public cancelCrafting(): void {
    closeCraftingOverlay(this.craftingResource, this.entityLayer);
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
      this.spawnResource(`dev_${prefabId}_${this.devSpawnSeq++}`, gx, gy, resource.gatherableId);
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
      loadScenarioIntoMap(this.mapResource, sc);
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
      this.spawnResource(spawn.id, spawn.x, spawn.y, spawn.gatherableId);
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
