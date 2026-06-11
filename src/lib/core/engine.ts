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
  getRockTexture,
  getStumpTexture,
  getTreeFrames,
  getTreeTexture,
  getWarriorFrames,
  loadGameAssets,
  getBiomeTileTexture,
  getShadowTexture,
  getTreeVariantTexture,
  getRockVariantTexture,
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
} from "$lib/core/assets";
import { devConsole } from "$lib/ui/debug/dev-console";
import { type Entity, world } from "$lib/core/ecs/ecs-miniplex";
import {
  Cell,
  type HudState,
  type GameEngineConfig,
  type AnimState,
  type AABB,
} from "$lib/core/types";
export type { HudState };
import {
  playChopSound,
  playClinkSound,
  playFallSound,
  playDepleteSound,
  setSoundEnabled,
} from "$lib/core/audio-synthesis";
import { InputResource } from "$lib/core/input";
import {
  MapResource,
  buildMapSystem,
  drawTerrainSystem,
  cullViewportSystem,
  getAmbientEnvironment,
  TILE,
} from "$lib/core/systems/map";
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
  ambientSoundSystem,
  spawnEnvFloatingText,
  spawnEnvParticles,
  spawnDeathBurst,
  triggerCameraShake,
} from "$lib/core/vfx";
import {
  MovementConfig,
  MovementResource,
  playerMovementSystem,
} from "$lib/core/systems/movement";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
  knockbackSystem,
  despawnEntity,
} from "$lib/core/systems/combat";
import { enemyAiSystem, makeEnemyEntity, GRUNT, type EnemyArchetype } from "$lib/core/systems/enemy-ai";
import {
  InteractionResource,
  updateTargetSystem,
  runInteractionSystem,
  handleHitFeedbackSystem,
  depleteNodeSystem,
  setHighlight,
} from "$lib/core/systems/interaction-system";
import {
  BuildingResource,
  updatePlacementPreviewSystem,
  placeBuildingSystem,
  spawnBuildingSystem,
  isValidPlacement,
} from "$lib/core/systems/building-system";
import { gameState } from "$lib/state/game-state.svelte";
import { setRpgProfile } from "$lib/state/rpg-actions.svelte";
import { cooldownsState, debugConfig } from "$lib/state/runtime-ui-state.svelte";
import { tickStamina, stamina } from "$lib/domain/stamina.svelte";
import { superGatherCooldown } from "$lib/domain/gathering/gather-system";
import { tickThirst, loadSurvival } from "$lib/domain/survival.svelte";
import {
  tickStatusEffects,
  getStatusModifiers,
  loadStatuses,
} from "$lib/domain/status-effects.svelte";
import { registerPlayerFeedback, registerPlayerHp } from "$lib/ui/player-feedback";
import { loadKnowledge } from "$lib/domain/knowledge.svelte";
import { loadRecipes } from "$lib/domain/crafting.svelte";
import { triggerQuestEvent, dialogueState } from "$lib/domain/quests.svelte";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { EntityId, SkillKey, InputAction } from "$lib/domain/game-events";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { awardSkillXp } from "$lib/domain/skill-xp";
import { getGatherableDefinition } from "$lib/domain/gathering/gatherables";

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
  public buildingResource = new BuildingResource();
  public combatConfig = new CombatConfig();
  public combatResource = new CombatResource();

  // Scene Graphs
  private worldContainer = new Container();
  private tileLayer = new Container();
  private entityLayer = new Container();

  // Entity Sprite registry
  private entitySprites = new Map<string, Container>();

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

  // Enemy sprite colour registry — lets the AI system fetch the right warrior
  // frames per enemy without baking presentation into the ai component.
  private enemyColors = new Map<string, UnitColor>();
  private enemySeq = 0;

  // Dev unique spawns counter
  private devSpawnSeq = 0;

  constructor(config: GameEngineConfig) {
    this.containerEl = config.container;
    this.onInteract = config.onInteract;
    this.onHudUpdate = config.onHudUpdate;
    this.onContextMenu = config.onContextMenu;
  }

  public async init(): Promise<void> {
    try {
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
        () => this.buildingResource.isPlacementMode,
        () => this.cancelBuildingPlacement(),
        this.onContextMenu,
        () => this.interactionResource.currentTarget
      );

      // Save cleanup references
      this.cleanupInputListeners = cleanInputListeners;

      window.addEventListener("wheel", this.onWheel, { passive: false });

      // Procedural map generation system
      buildMapSystem(this.mapResource);

      // Attach layers to stage
      this.worldContainer.addChild(this.tileLayer);
      this.worldContainer.addChild(this.entityLayer);
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
    window.removeEventListener("wheel", this.onWheel);
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
        this.entityLayer
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

      // Arbitrate the left-click between interacting and attacking. A click on a
      // hovered interactable in range (tree, ore, pickup, campfire, NPC) routes
      // to the interaction system; a click on anything else is a melee swing.
      // This preserves click-to-gather/talk while still allowing click-to-attack.
      if (
        this.inputResource.pendingAttack &&
        !this.buildingResource.isPlacementMode &&
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
      } else {
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
          (entity, yieldName, quantity) => this.handleHit(entity, yieldName, quantity)
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
        this.movementResource.isDashing,
        this.buildingResource.isPlacementMode,
        (enemy) => this.handleEnemyDeath(enemy)
      );

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

      knockbackSystem(world, this.mapResource, this.entitySprites, dt);

      // Pin the player sprite after any knockback displacement.
      this.playerSprite.x = this.playerEntity.position!.x + TILE / 2;
      this.playerSprite.y = this.playerEntity.position!.y + TILE;

      // --- Survival ---
      // Thirst drains with activity; statuses tick once per accumulated second
      // and hand back any pulse damage (bleeding, sickness fever).
      tickThirst(dt, {
        moving: this.playerAnimState === "run",
        laboring: this.interactionResource.gatheringTarget !== null,
      });
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
      // slower still while sick/exhausted).
      if (!wasSprinting) {
        tickStamina(
          dt,
          this.combatResource.inCombatTimer > 0,
          getStatusModifiers().staminaRegenMult
        );
      }

      // Update Svelte cooldown progress bars
      const evadeLevel = gameState.rpg.skills?.evade?.level ?? 1;
      const maxEvadeCd = Math.max(0.5, this.movementConfig.dashCooldown - (evadeLevel - 1) * 0.05);
      cooldownsState.evade = Math.max(0, this.movementResource.dashCooldownTimer);
      cooldownsState.evadeMax = maxEvadeCd;

      const sgLevel = gameState.rpg.skills?.superGather?.level ?? 1;
      const maxSgCd = superGatherCooldown(this.interactionResource.superGatherCooldown, sgLevel);
      cooldownsState.superGather = Math.max(0, this.interactionResource.superGatherCooldownTimer);
      cooldownsState.superGatherMax = maxSgCd;

      // Pin shadow to player feet
      const shadowPos = this.playerEntity.position!;
      this.playerShadow.x = shadowPos.x + TILE / 2;
      this.playerShadow.y = shadowPos.y + TILE;

      // Zoom Lerp update
      const rate = Math.min(1.0, this.zoomSmoothing * 60 * dt);
      this.zoom += (this.targetZoom - this.zoom) * rate;
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));

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

      // Audio tickers
      ambientSoundSystem(
        this.vfxResource,
        dt,
        this.playerEntity.position!,
        this.mapResource.cells,
        this.mapResource.mapW
      );

      // Render targeting circles
      gatherRingUpdateSystem(
        this.vfxResource,
        this.playerEntity.position!,
        this.interactionResource.gatheringTarget,
        this.interactionResource.currentGatherInterval,
        this.interactionResource.gatherCooldownTimer
      );

      selectionRingUpdateSystem(
        this.vfxResource,
        dt,
        this.interactionResource.currentTarget,
        this.entitySprites
      );

      // Sync camera matrices
      cameraShakeSystem(
        this.vfxResource,
        dt,
        this.app.screen,
        this.playerEntity.position!,
        this.zoom,
        this.worldContainer
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
    const startX = Math.floor(this.mapResource.mapW / 2) * TILE;
    const startY = Math.floor(this.mapResource.mapH / 2) * TILE;
    const spawnX = Math.floor(this.mapResource.mapW / 2);
    const spawnY = Math.floor(this.mapResource.mapH / 2);

    // Spawn player entity in ECS. Health lives here (faction "player") so the
    // same damage path handles the player and enemies; the HUD mirrors it.
    this.playerSpawn = { x: startX, y: startY + TILE };
    this.playerEntity = {
      id: EntityId.Player,
      position: { x: startX, y: startY + TILE, targetX: startX, targetY: startY + TILE },
      playerControlled: { speed: TILE * 6 },
      health: {
        current: gameState.rpg.profile?.hpCurrent ?? 100,
        max: 100,
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
    this.entityLayer.addChild(this.playerSprite);
    this.entitySprites.set(EntityId.Player, this.playerSprite);

    // Campfire entity
    const campfireContainer = new Container();
    campfireContainer.x = startX + TILE / 2;
    campfireContainer.y = startY + TILE / 2;

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

    world.add({
      id: EntityId.Campfire,
      position: { x: startX, y: startY, targetX: startX, targetY: startY },
      interactable: { name: "Campfire", action: "refuel" },
      collider: { isSolid: true },
    });
    this.mapResource.solidCoords.add(coordKey(spawnX, spawnY));
    this.mapResource.customSolids.set(coordKey(spawnX, spawnY), {
      minX: startX + TILE * 0.25,
      maxX: startX + TILE * 0.75,
      minY: startY + TILE * 0.25,
      maxY: startY + TILE * 0.75,
    });

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
    this.mapResource.solidCoords.add(coordKey(npcGx, npcGy));
    this.mapResource.customSolids.set(coordKey(npcGx, npcGy), {
      minX: npcEx + TILE * 0.3,
      maxX: npcEx + TILE * 0.7,
      minY: npcEy + TILE * 0.7,
      maxY: npcEy + TILE,
    });

    const vaneFrames = getWarriorFrames("idle", "yellow");
    const vaneSprite = new AnimatedSprite(vaneFrames);
    vaneSprite.animationSpeed = 0.12;
    vaneSprite.play();
    vaneSprite.anchor.set(0.5, 1);
    vaneSprite.x = npcEx + TILE / 2;
    vaneSprite.y = npcEy + TILE;
    vaneSprite.scale.set((TILE * 1.1) / 192);
    this.entityLayer.addChild(vaneSprite);
    this.entitySprites.set(EntityId.NpcVane, vaneSprite);

    // Scatter resource nodes
    const gatheredPickups = gameState.rpg.profile?.gatheredPickups ?? [];
    for (const spawn of this.mapResource.mapData.spawns) {
      if (gatheredPickups.includes(spawn.id)) continue;
      this.spawnResource(spawn.id, spawn.x, spawn.y, spawn.gatherableId);
    }

    // Restore constructed buildings
    if (gameState.rpg.profile && Array.isArray(gameState.rpg.profile.buildings)) {
      for (const b of gameState.rpg.profile.buildings) {
        this.spawnBuilding(b.id, b.type, b.x, b.y);
      }
    }

    // Scatter decorations
    this.spawnDecorations();

    // Seed a few hostiles around camp so combat is testable on load.
    this.spawnInitialEnemies(spawnX, spawnY);

    // Setup indicators overlay rings
    this.vfxResource.gatherRing = new Graphics();
    this.vfxResource.gatherRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.gatherRing);

    this.vfxResource.selectionRing = new Graphics();
    this.vfxResource.selectionRing.visible = false;
    this.entityLayer.addChild(this.vfxResource.selectionRing);
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

  private spawnResource(id: string, gx: number, gy: number, gatherableId: string): void {
    const ex = gx * TILE;
    const ey = gy * TILE;

    const gatherable = getGatherableDefinition(gatherableId);
    if (!gatherable) return;

    const nodeName = gatherable.displayName;
    const drop = gatherable.yieldTable[0];
    const dropName = drop?.itemId ?? "stick";
    const dropQty = drop?.quantity ?? 1;
    const rpgLocationId = gatherable.syncLocationId;
    const rpgAction = gatherable.syncAction;
    const isPickup = gatherable.interactionKind !== "repeated_action";
    const isTree = gatherable.solidKind === "tree";
    const spriteTex =
      gatherable.renderKind === "wood_pickup"
        ? getWoodItemTexture()
        : gatherable.renderKind === "stone_pickup"
          ? getRockVariantTexture(1)
          : gatherable.renderKind === "flint_pickup"
            ? getRockVariantTexture(2)
            : gatherable.renderKind === "forage"
              ? getBushTexture(1)
              : gatherable.renderKind === "moss"
                ? getBushTexture(2)
                : gatherable.renderKind === "tree_crimson"
                  ? getTreeVariantTexture(2)
                  : gatherable.renderKind === "tree_frost"
                    ? getTreeVariantTexture(3)
                    : gatherable.renderKind === "tree_fungal"
                      ? getTreeVariantTexture(4)
                      : gatherable.renderKind === "rock_copper"
                        ? getRockVariantTexture(2)
                        : gatherable.renderKind === "rock_iron"
                          ? getRockVariantTexture(3)
                          : gatherable.renderKind === "rock_toxic"
                            ? getRockVariantTexture(4)
                            : gatherable.renderKind === "rock"
                              ? getRockTexture()
                              : getTreeTexture();

    if (isPickup) {
      world.add({
        id,
        position: { x: ex, y: ey, targetX: ex, targetY: ey },
        collider: { isSolid: false },
        interactable: { name: nodeName, action: "pickup" },
        pickup: { itemId: dropName, qty: dropQty, gatherableId },
      });

      const sprite = new Sprite(spriteTex);
      sprite.anchor.set(0.5, 1);
      sprite.x = ex + TILE / 2;
      sprite.y = ey + TILE;
      if (gatherable.renderKind === "wood_pickup") {
        sprite.scale.set((TILE * 0.45) / 64);
      } else if (gatherable.renderKind === "stone_pickup" || gatherable.renderKind === "flint_pickup") {
        sprite.scale.set((TILE * 0.35) / 64);
      } else {
        sprite.scale.set((TILE * 0.4) / 64);
      }
      this.entityLayer.addChild(sprite);
      this.entitySprites.set(id, sprite);
    } else {
      world.add({
        id,
        position: { x: ex, y: ey, targetX: ex, targetY: ey },
        collider: { isSolid: true },
        interactable: { name: nodeName, action: "gather" },
        resource: {
          hp: gatherable?.depletion?.hp ?? 15,
          maxHp: gatherable?.depletion?.hp ?? 15,
          drop: dropName,
          gatherableId,
          rpgAction,
          rpgLocationId,
        },
      });
      this.mapResource.solidCoords.add(coordKey(gx, gy));
      if (gatherable.solidKind === "tree") {
        this.mapResource.customSolids.set(coordKey(gx, gy), {
          minX: ex + TILE * 0.35,
          maxX: ex + TILE * 0.65,
          minY: ey + TILE * 0.7,
          maxY: ey + TILE,
        });
      } else {
        this.mapResource.customSolids.set(coordKey(gx, gy), {
          minX: ex + TILE * 0.2,
          maxX: ex + TILE * 0.8,
          minY: ey + TILE * 0.2,
          maxY: ey + TILE * 0.8,
        });
      }

      if (isTree) {
        const tree = new Sprite(spriteTex);
        tree.anchor.set(0.5, 1);
        tree.x = ex + TILE / 2;
        tree.y = ey + TILE;
        tree.scale.set((TILE * 1.5) / 256);
        this.entityLayer.addChild(tree);
        this.entitySprites.set(id, tree);
      } else {
        const rock = new Sprite(spriteTex);
        rock.anchor.set(0.5, 1);
        rock.x = ex + TILE / 2;
        rock.y = ey + TILE;
        rock.width = TILE * 0.9;
        rock.height = TILE * 0.9;
        this.entityLayer.addChild(rock);
        this.entitySprites.set(id, rock);
      }
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
      }
    }
    playDepleteSound();
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
    this.syncPlayerHp();
  }

  /** Mirror the player health component into the HUD-observed rpg state. */
  private syncPlayerHp(): void {
    const profile = gameState.rpg.profile;
    const hp = this.playerEntity.health?.current ?? 100;
    if (profile && profile.hpCurrent !== hp) {
      setRpgProfile({ ...profile, hpCurrent: hp });
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

    if (this.playerAnimState === state && this.lastEquippedWeapon === currentWeaponId) return;
    this.playerAnimState = state;
    this.lastEquippedWeapon = currentWeaponId;

    const config = this.getPlayerSpriteConfig();
    let frames: Texture[];
    if (config.isWarrior) {
      frames = getWarriorFrames(state === "attack" ? "attack" : (state as any));
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

  public devSpawn(gatherableId: string, gx: number, gy: number): string {
    if (!getGatherableDefinition(gatherableId)) return `unknown gatherable: ${gatherableId}`;
    if (!this.mapResource.inBounds(gx, gy)) return `out of bounds: ${gx},${gy}`;
    if (this.mapResource.solidCoords.has(coordKey(gx, gy))) return `cell occupied: ${gx},${gy}`;
    this.spawnResource(`dev_${gatherableId}_${this.devSpawnSeq++}`, gx, gy, gatherableId);
    return `spawned ${gatherableId} at ${gx},${gy}`;
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
    this.interactionResource.superGatherCooldownTimer = 0;
    this.interactionResource.gatherCooldownTimer = 0;
    cooldownsState.evade = 0;
    cooldownsState.superGather = 0;
    return "cooldowns reset";
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
        playChopSound();
        return "playing chop sound";
      case "clink":
        playClinkSound();
        return "playing clink sound";
      case "fall":
        playFallSound();
        return "playing fall sound";
      case "deplete":
        playDepleteSound();
        return "playing deplete sound";
      default:
        return "usage: playsound <chop|clink|fall|deplete>";
    }
  }

  public devToggleSound(on: boolean): string {
    setSoundEnabled(on);
    return `sound synthesis ${on ? "enabled" : "disabled"}`;
  }
}
