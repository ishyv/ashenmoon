import {
  AnimatedSprite,
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  TextStyle,
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
} from "./assets";
import { devConsole } from "./dev-console";
import { type Entity, world } from "./ecs-miniplex";
import {
  Cell,
  type HudState,
  type GameEngineConfig,
  type AnimState,
  type AABB,
} from "./types";
export type { HudState };
import {
  playChopSound,
  playClinkSound,
  playFallSound,
  playDepleteSound,
  setSoundEnabled,
} from "./audio-synthesis";
import { InputResource } from "./input";
import {
  MapResource,
  buildMapSystem,
  drawTerrainSystem,
  cullViewportSystem,
  getAmbientEnvironment,
  TILE,
} from "./map";
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
} from "./vfx";
import {
  MovementConfig,
  MovementResource,
  playerMovementSystem,
} from "./movement";
import {
  CombatConfig,
  CombatResource,
  playerAttackSystem,
  knockbackSystem,
  despawnEntity,
} from "./combat";
import { enemyAiSystem, makeEnemyEntity, GRUNT, type EnemyArchetype } from "./enemy-ai";
import {
  InteractionResource,
  updateTargetSystem,
  runInteractionSystem,
  handleHitFeedbackSystem,
  depleteNodeSystem,
  setHighlight,
} from "./interaction-system";
import {
  BuildingResource,
  updatePlacementPreviewSystem,
  placeBuildingSystem,
  spawnBuildingSystem,
  isValidPlacement,
} from "./building";
import {
  rpgState,
  setRpgState,
  cooldownsState,
  debugConfig,
  ITEM_METADATA,
} from "./rpg-state.svelte";
import { tickStamina, stamina } from "./stamina.svelte";
import { triggerQuestEvent, dialogueState } from "./quests.svelte";

// Ground dirt color
const COLOR_DIRT = 0x5a4232;

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
        background: COLOR_DIRT,
        antialias: false,
      });
      this.containerEl.appendChild(this.app.canvas);

      // Load static bundles
      await loadGameAssets();
      await loadAssets(BUNDLE_WARRIORS);
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
          this.inputResource.isActionPressed("HARVEST") ||
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
              0xff5555,
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

      if (playerHealth.current <= 0) this.respawnPlayer();
      this.syncPlayerHp();

      // Regenerate stamina when not sprinting (slower while in combat).
      if (!wasSprinting) {
        tickStamina(dt, this.combatResource.inCombatTimer > 0);
      }

      // Update Svelte cooldown progress bars
      const evadeLevel = rpgState.skills?.evade?.level ?? 1;
      const maxEvadeCd = Math.max(0.5, this.movementConfig.dashCooldown - (evadeLevel - 1) * 0.05);
      cooldownsState.evade = Math.max(0, this.movementResource.dashCooldownTimer);
      cooldownsState.evadeMax = maxEvadeCd;

      const sgLevel = rpgState.skills?.superGather?.level ?? 1;
      const maxSgCd = Math.max(0.5, this.interactionResource.superGatherCooldown - (sgLevel - 1) * 0.15);
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
      const isSprinting = this.inputResource.isActionPressed("SPRINT");
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
        this.interactionResource.nodeKinds,
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
      id: "player",
      position: { x: startX, y: startY + TILE, targetX: startX, targetY: startY + TILE },
      playerControlled: { speed: TILE * 6 },
      health: {
        current: rpgState.profile?.hpCurrent ?? 100,
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

    // Load Warrior frames
    this.playerSprite = new AnimatedSprite(getWarriorFrames("idle"));
    this.playerSprite.animationSpeed = 0.12;
    this.playerSprite.play();
    const scale = (TILE * 1.1) / 192;
    this.playerSprite.scale.set(scale);
    this.playerSprite.anchor.set(0.5, 1);
    this.playerSprite.x = startX + TILE / 2;
    this.playerSprite.y = startY + 2 * TILE;
    this.entityLayer.addChild(this.playerSprite);
    this.entitySprites.set("player", this.playerSprite);

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
    this.entitySprites.set("campfire", campfireContainer);

    world.add({
      id: "campfire",
      position: { x: startX, y: startY, targetX: startX, targetY: startY },
      interactable: { name: "Campfire", action: "refuel" },
      collider: { isSolid: true },
    });
    this.mapResource.solidCoords.add(`${spawnX},${spawnY}`);
    this.mapResource.customSolids.set(`${spawnX},${spawnY}`, {
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
      id: "npc_vane",
      position: { x: npcEx, y: npcEy, targetX: npcEx, targetY: npcEy },
      interactable: { name: "Commander Vane", action: "talk" },
      collider: { isSolid: true },
    });
    this.mapResource.solidCoords.add(`${npcGx},${npcGy}`);
    this.mapResource.customSolids.set(`${npcGx},${npcGy}`, {
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
    this.entitySprites.set("npc_vane", vaneSprite);

    // Scatter resource nodes
    const gatheredPickups = rpgState.profile?.gatheredPickups ?? [];
    for (const spawn of this.mapResource.mapData.spawns) {
      if (gatheredPickups.includes(spawn.id)) continue;
      this.spawnResource(spawn.id, spawn.x, spawn.y, spawn.type);
    }

    // Restore constructed buildings
    if (rpgState.profile && Array.isArray(rpgState.profile.buildings)) {
      for (const b of rpgState.profile.buildings) {
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
        if (this.mapResource.solidCoords.has(`${gx},${gy}`)) continue;

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

  private spawnResource(id: string, gx: number, gy: number, kind: "tree" | "ore" | "twig" | "stone"): void {
    const ex = gx * TILE;
    const ey = gy * TILE;

    const cellIdx = gy * this.mapResource.mapW + gx;
    const cellType = this.mapResource.cells[cellIdx] ?? Cell.Meadows;

    const isTree = kind === "tree";
    const isTwig = kind === "twig";
    const isStone = kind === "stone";

    let nodeName = "";
    let dropName = "";
    let rpgLocationId = "";
    let rpgAction: "forest" | "mine" | undefined;
    let spriteTex;

    if (isTwig) {
      nodeName = "Loose Twigs";
      dropName = "oak_wood";
      spriteTex = getWoodItemTexture();
    } else if (isStone) {
      nodeName = "Loose Stones";
      dropName = "stone";
      spriteTex = getRockVariantTexture(1);
    } else {
      nodeName = isTree ? "Oak Tree" : "Stone Node";
      dropName = isTree ? "oak_wood" : "stone";
      rpgLocationId = isTree ? "oak_forest" : "stone_mine";
      rpgAction = isTree ? "forest" : "mine";
      spriteTex = isTree ? getTreeTexture() : getRockTexture();

      if (cellType === Cell.ScorchedWastes) {
        nodeName = "Copper Ore Vein";
        dropName = "copper_ore";
        rpgLocationId = "copper_mine";
        spriteTex = getRockVariantTexture(2);
      } else if (cellType === Cell.CrimsonGrove) {
        if (isTree) {
          nodeName = "Crimson Ash Tree";
          dropName = "spruce_wood";
          rpgLocationId = "crimson_grove";
          spriteTex = getTreeVariantTexture(2);
        } else {
          nodeName = "Iron Ore Vein";
          dropName = "iron_ore";
          rpgLocationId = "iron_mine";
          spriteTex = getRockVariantTexture(3);
        }
      } else if (cellType === Cell.FungalMire) {
        if (isTree) {
          nodeName = "Spore Mangrove Tree";
          dropName = "palm_wood";
          rpgLocationId = "fungal_mire";
          spriteTex = getTreeVariantTexture(4);
        } else {
          nodeName = "Toxic Copper Node";
          dropName = "copper_ore";
          rpgLocationId = "copper_mine";
          spriteTex = getRockVariantTexture(4);
        }
      } else if (cellType === Cell.Frostbane) {
        if (isTree) {
          nodeName = "Frost Pine Tree";
          dropName = "pine_wood";
          rpgLocationId = "frostbane_peak";
          spriteTex = getTreeVariantTexture(3);
        } else {
          nodeName = "Glacial Silver Vein";
          dropName = "silver_ore";
          rpgLocationId = "silver_mine";
          spriteTex = getRockVariantTexture(1);
        }
      }
    }

    if (isTwig || isStone) {
      world.add({
        id,
        position: { x: ex, y: ey, targetX: ex, targetY: ey },
        collider: { isSolid: false },
        interactable: { name: nodeName, action: "pickup" },
        pickup: { itemId: dropName, qty: 1 },
      });
      this.interactionResource.nodeKinds.set(id, kind);

      const sprite = new Sprite(spriteTex);
      sprite.anchor.set(0.5, 1);
      sprite.x = ex + TILE / 2;
      sprite.y = ey + TILE;
      if (isTwig) {
        sprite.scale.set((TILE * 0.45) / 64);
      } else {
        sprite.scale.set((TILE * 0.35) / 64);
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
          hp: 15,
          maxHp: 15,
          drop: dropName,
          rpgAction,
          rpgLocationId,
        },
      });
      this.mapResource.solidCoords.add(`${gx},${gy}`);
      if (kind === "tree") {
        this.mapResource.customSolids.set(`${gx},${gy}`, {
          minX: ex + TILE * 0.35,
          maxX: ex + TILE * 0.65,
          minY: ey + TILE * 0.7,
          maxY: ey + TILE,
        });
      } else {
        this.mapResource.customSolids.set(`${gx},${gy}`, {
          minX: ex + TILE * 0.2,
          maxX: ex + TILE * 0.8,
          minY: ey + TILE * 0.2,
          maxY: ey + TILE * 0.8,
        });
      }
      this.interactionResource.nodeKinds.set(id, kind);

      if (kind === "tree") {
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
    if (this.mapResource.solidCoords.has(`${gx},${gy}`)) return null;

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
        0xc0392b
      );
      const xp = enemy.loot?.xpReward ?? 0;
      if (xp > 0) {
        spawnEnvFloatingText(this.vfxResource, `+${xp} xp`, 0xffd86b, pos, this.entityLayer);
        this.awardCombatXp(xp);
      }
    }
    playDepleteSound();
    this.enemyColors.delete(enemy.id);
    despawnEntity(world, enemy, this.entityLayer, this.entitySprites, this.vfxResource);
  }

  /**
   * Awards combat XP if a `combat` skill exists in the loaded profile. Kept
   * defensive: the backend may not define one yet, so absence is a safe no-op
   * beyond the floating-text reward already shown.
   */
  private awardCombatXp(amount: number): void {
    const skills = rpgState.skills as any;
    const skill = skills?.combat;
    if (!skill) return;
    const newXp = skill.xp + amount;
    if (newXp >= skill.nextXp) {
      const newLevel = skill.level + 1;
      rpgState.skills = {
        ...skills,
        combat: { level: newLevel, xp: newXp - skill.nextXp, nextXp: newLevel * 100 },
      };
      spawnEnvFloatingText(
        this.vfxResource,
        `🎉 Combat Level ${newLevel}!`,
        0xff8855,
        this.playerEntity.position!,
        this.entityLayer
      );
    } else {
      rpgState.skills = { ...skills, combat: { ...skill, xp: newXp } };
    }
  }

  /** Player death: feedback, then respawn at camp with brief invulnerability. */
  private respawnPlayer(): void {
    const h = this.playerEntity.health!;
    const pos = this.playerEntity.position!;
    spawnDeathBurst(this.vfxResource, this.entityLayer, pos.x + TILE / 2, pos.y + TILE * 0.6, 0xff5555);
    spawnEnvFloatingText(this.vfxResource, "you fell...", 0xff5555, pos, this.entityLayer);
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
    const profile = rpgState.profile;
    const hp = this.playerEntity.health?.current ?? 100;
    if (profile && profile.hpCurrent !== hp) {
      rpgState.profile = { ...profile, hpCurrent: hp };
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

  private setPlayerAnim(state: AnimState): void {
    // While the swing pose is locked, ignore idle/run requests from movement.
    if (state !== "attack" && this.attackAnimLockTimer > 0) return;
    if (state === "attack") this.attackAnimLockTimer = 0.28;
    if (this.playerAnimState === state) return;
    this.playerAnimState = state;
    this.playerSprite.textures = getWarriorFrames(state);

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

    let tex;
    if (type === "wall") {
      tex = getBuildingTexture("yellow", "house3");
    } else if (type === "house1") {
      tex = getBuildingTexture("yellow", "house1");
    } else if (type === "tower") {
      tex = getBuildingTexture("yellow", "tower");
    } else if (type === "barracks") {
      tex = getBuildingTexture("yellow", "barracks");
    } else {
      tex = getBuildingTexture("yellow", "house1");
    }

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

  public spawnEnvFloatingText(text: string, color = 0xffe0a0): void {
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

  public devSpawn(kind: "tree" | "ore", gx: number, gy: number): string {
    if (!this.mapResource.inBounds(gx, gy)) return `out of bounds: ${gx},${gy}`;
    if (this.mapResource.solidCoords.has(`${gx},${gy}`)) return `cell occupied: ${gx},${gy}`;
    this.spawnResource(`dev_${kind}_${this.devSpawnSeq++}`, gx, gy, kind);
    return `spawned ${kind} at ${gx},${gy}`;
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
