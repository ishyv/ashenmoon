import { AnimatedSprite, Container, Graphics, Sprite, Text, TextStyle } from "pixi.js";
import type { World } from "miniplex";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { InputResource } from "$lib/core/input/input";
import { TILE, type MapResource } from "$lib/core/systems/map/map";
import {
  type VFXResource,
  spawnEnvFloatingText,
  spawnEnvParticles,
} from "$lib/core/vfx/vfx";
import { playSound } from "$lib/audio/audio-engine";
import { Cell } from "$lib/core/types";
import { Colors } from "$lib/utils/colors";
import { coordKey } from "$lib/utils/coord-utils";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { getBuildableBehavior } from "$lib/domain/building-behaviors";
import { createCampfireState, type CampStructureType } from "$lib/domain/camp/camp-state";
import { CollisionFootprints, computeRenderZ, resolveCollisionAabb, type CollisionFootprint } from "$lib/domain/collision";
import {
  isValidBuildingPlacement,
  type BuildingPlacementContext,
} from "$lib/domain/building";
import { getPlayerEntity } from "$lib/core/ecs/entity-queries";
import { GameEvent } from "$lib/domain/game-events";
import { syncBuild } from "$lib/state/persistence/remote-sync";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import {
  getAshenmoonStructureKeyForBuildingType,
  getAshenmoonStructureTexture,
  getAshenmoonPropTexture,
} from "$lib/core/assets/ashenmoon-assets";
import { resolveWorldVisualScale } from "$lib/domain/visual/world-visual-size";
import { generateCampfireGlowTexture } from "$lib/core/assets/assets";
import {
  type VisualPresentationResource,
  registerCampfireVisual,
} from "$lib/core/systems/visual/visual-presentation-system";

import { gameState } from "$lib/state/game-state.svelte";
import { syncShelterEmitter } from "$lib/core/systems/environment/environment-signal-system";

export class BuildingResource {
  public isPlacementMode = false;
  public currentPlacementType: string | null = null;
  public currentPlacementSourceItemId: string | null = null;
  public previewSprite: Sprite | null = null;
  public previewIndicator: Graphics | null = null;
  public onPlacementCancelCb?: (() => void) | undefined;
  public onPlacementCompleteCb?: (() => void) | undefined;
}

const CAMP_STRUCTURE_TYPES = new Set<string>([
  "campfire",
  "primitive_work_surface",
  "drying_rack",
  "crude_shelter",
  "marker_sign",
  "storage_pile",
  "spike_barrier",
  "rain_catcher",
  "meat_smoking_rack",
  "simple_bedroll",
]);

function campStructureFor(type: string): Entity["campStructure"] | undefined {
  if (!CAMP_STRUCTURE_TYPES.has(type)) return undefined;
  const campType = type as CampStructureType;
  const behavior = getBuildableBehavior(type);
  if (behavior?.kind === "shelter") {
    return {
      type: campType,
      protectionRadiusPx: TILE * 2.5,
      coldResistanceBonus: behavior.coldResistanceBonus,
      rainProtection: behavior.rainProtection,
    };
  }
  return { type: campType };
}

function placementContext(map: MapResource, playerPos: { x: number; y: number }): BuildingPlacementContext {
  const waterTiles = new Set<string>();
  for (let y = 0; y < map.mapH; y++) {
    for (let x = 0; x < map.mapW; x++) {
      if (map.cells[y * map.mapW + x] === Cell.Water) {
        waterTiles.add(coordKey(x, y));
      }
    }
  }

  const spawnX = Math.floor(map.mapW / 2);
  const spawnY = Math.floor(map.mapH / 2);

  return {
    mapW: map.mapW,
    mapH: map.mapH,
    blockedTiles: map.solidCoords,
    waterTiles,
    reservedTiles: new Set([coordKey(spawnX + 2, spawnY - 1)]),
    playerTile: {
      x: Math.floor(playerPos.x / TILE),
      y: Math.floor(playerPos.y / TILE),
    },
    maxDistanceTiles: 4.5,
  };
}

export function isValidPlacement(
  mx: number,
  my: number,
  type: string,
  map: MapResource,
  playerPos: { x: number; y: number },
): boolean {
  return isValidBuildingPlacement(mx, my, type, placementContext(map, playerPos));
}

function setupCampfireInShell(
  shellContainer: Container,
): { sprite: AnimatedSprite; glow: Sprite } {
  shellContainer.removeChildren().forEach((c) => c.destroy());
  const glow = new Sprite(generateCampfireGlowTexture());
  glow.anchor.set(0.5);
  glow.blendMode = "add";
  glow.alpha = 0.5;
  glow.scale.set(1.5);
  shellContainer.addChild(glow);
  const tex = getAshenmoonPropTexture("firepitCold"); // bridge sets correct texture on first step
  const fireSprite = new AnimatedSprite([tex]);
  fireSprite.anchor.set(0.5, 0.72);
  const fireScale = resolveWorldVisualScale({
    spec: { widthTiles: 1.45 },
    texture: tex,
    tilePx: TILE,
  });
  fireSprite.scale.set(fireScale.x, fireScale.y);
  fireSprite.stop();
  shellContainer.addChild(fireSprite);
  return { sprite: fireSprite, glow };
}

export function drawBuildingVisuals(
  type: string,
  stage: number,
  interiorContainer: Container,
  shellContainer: Container,
): void {
  // Clear previous children
  interiorContainer.removeChildren().forEach((c) => c.destroy());
  shellContainer.removeChildren().forEach((c) => c.destroy());

  const spec = getBuildingSpec(type);
  const { w, h } = spec.footprint;
  const tileW = w * TILE;
  const tileH = h * TILE;

  // Draw interior wood floors for stages 1 to 5
  if (stage >= 1) {
    const floorG = new Graphics();
    floorG.rect(-tileW / 2, -tileH, tileW, tileH);
    floorG.fill({ color: 0x4a3424 }); // Dark warm wood floor
    floorG.stroke({ color: 0x2e1f14, width: 2 });
    
    // Draw floor plank lines
    for (let offset = -tileH + TILE; offset < 0; offset += TILE) {
      floorG.moveTo(-tileW / 2, offset);
      floorG.lineTo(tileW / 2, offset);
    }
    floorG.stroke({ color: 0x2e1f14, width: 1.5 });
    interiorContainer.addChild(floorG);

    // Draw door threshold indicator for house1
    if (type === "house1") {
      const stepG = new Graphics();
      // Draw charcoal stone step mat/slab at bottom center
      stepG.roundRect(-32, -16, 64, 20, 4);
      stepG.fill({ color: 0x2c2d2e });
      stepG.stroke({ color: 0x5a5c5e, width: 1.5 });
      
      // Brass insert line
      stepG.moveTo(-16, -6);
      stepG.lineTo(16, -6);
      stepG.stroke({ color: 0x8a704a, width: 1 });
      
      // Wooden door posts on the left and right
      stepG.circle(-34, -8, 6);
      stepG.circle(34, -8, 6);
      stepG.fill({ color: 0x48321e });
      stepG.stroke({ color: 0x2e1f14, width: 1.5 });
      
      interiorContainer.addChild(stepG);
    }
  }

  if (stage < 5) {
    const g = new Graphics();
    shellContainer.addChild(g);

    if (stage === 0) {
      // Blueprint wireframe: dashed-style cyan outline
      g.rect(-tileW / 2, -tileH, tileW, tileH);
      g.stroke({ color: 0x00ffff, width: 2, alpha: 0.65 });

      const height = spec.sprite.h * TILE;
      // Corner upright pillars
      g.moveTo(-tileW / 2, 0).lineTo(-tileW / 2, -height);
      g.moveTo(tileW / 2, 0).lineTo(tileW / 2, -height);
      g.moveTo(-tileW / 2, -tileH).lineTo(-tileW / 2, -tileH - height * 0.4);
      g.moveTo(tileW / 2, -tileH).lineTo(tileW / 2, -tileH - height * 0.4);

      // Connect top rafters
      g.moveTo(-tileW / 2, -height).lineTo(tileW / 2, -height);
      g.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.45 });

      // Draw doorway frame & orientation arrow in blueprint for house1
      if (type === "house1") {
        g.moveTo(-32, 0).lineTo(-32, -48);
        g.lineTo(32, -48);
        g.lineTo(32, 0);
        g.stroke({ color: 0x00ffff, width: 1.5, alpha: 0.8 });
        
        g.moveTo(0, 16);
        g.lineTo(0, -16);
        g.moveTo(-8, -8);
        g.lineTo(0, -16);
        g.lineTo(8, -8);
        g.stroke({ color: 0x00ffff, width: 2, alpha: 0.8 });
      }
    } else if (stage === 1) {
      // Slab Foundation: stone block
      g.rect(-tileW / 2, -tileH, tileW, tileH);
      g.fill({ color: 0x6e7072 });
      g.stroke({ color: 0x3d3e40, width: 3 });
    } else if (stage === 2) {
      // Foundation + Columns
      g.rect(-tileW / 2, -tileH, tileW, tileH);
      g.fill({ color: 0x6e7072 });
      g.stroke({ color: 0x3d3e40, width: 3 });

      const pillarHeight = spec.sprite.h * TILE * 0.65;
      // Front Pillars
      g.rect(-tileW / 2, -pillarHeight, 10, pillarHeight);
      g.rect(tileW / 2 - 10, -pillarHeight, 10, pillarHeight);
      // Back Pillars
      g.rect(-tileW / 2, -tileH - pillarHeight * 0.4, 10, pillarHeight * 0.4);
      g.rect(tileW / 2 - 10, -tileH - pillarHeight * 0.4, 10, pillarHeight * 0.4);
      g.fill({ color: 0x7c5a3b });
      g.stroke({ color: 0x48321e, width: 1.5 });
    } else if (stage === 3) {
      // Foundation + Columns + Frame Rafters
      g.rect(-tileW / 2, -tileH, tileW, tileH);
      g.fill({ color: 0x6e7072 });
      g.stroke({ color: 0x3d3e40, width: 3 });

      const pillarHeight = spec.sprite.h * TILE * 0.65;
      g.rect(-tileW / 2, -pillarHeight, 10, pillarHeight);
      g.rect(tileW / 2 - 10, -pillarHeight, 10, pillarHeight);
      g.rect(-tileW / 2, -tileH - pillarHeight * 0.4, 10, pillarHeight * 0.4);
      g.rect(tileW / 2 - 10, -tileH - pillarHeight * 0.4, 10, pillarHeight * 0.4);
      g.fill({ color: 0x7c5a3b });

      // Horizontal beams
      g.moveTo(-tileW / 2, -pillarHeight).lineTo(tileW / 2, -pillarHeight);
      // Simple triangular roof truss
      const peakY = -pillarHeight - 24;
      g.lineTo(0, peakY).lineTo(-tileW / 2, -pillarHeight);
      g.stroke({ color: 0x7c5a3b, width: 4.5 });
    } else if (stage === 4) {
      // Foundation + Columns + Frame + Wall sections (leaving doorway open)
      g.rect(-tileW / 2, -tileH, tileW, tileH);
      g.fill({ color: 0x6e7072 });
      g.stroke({ color: 0x3d3e40, width: 3 });

      const pillarHeight = spec.sprite.h * TILE * 0.65;
      // Wattle-and-daub wall segments
      const wallWidth = Math.max(16, tileW / 2 - TILE / 2);
      g.rect(-tileW / 2, -pillarHeight, wallWidth, pillarHeight); // Left front wall
      g.rect(tileW / 2 - wallWidth, -pillarHeight, wallWidth, pillarHeight); // Right front wall
      g.rect(-tileW / 2, -tileH - pillarHeight * 0.4, tileW, pillarHeight * 0.4); // Back wall
      
      // Side walls
      g.rect(-tileW / 2, -tileH, 12, tileH); // Left side wall
      g.rect(tileW / 2 - 12, -tileH, 12, tileH); // Right side wall
      
      g.fill({ color: 0xded8c9 });
      g.stroke({ color: 0x48321e, width: 2.5 });

      // Pillars
      g.rect(-tileW / 2, -pillarHeight, 10, pillarHeight);
      g.rect(tileW / 2 - 10, -pillarHeight, 10, pillarHeight);
      g.fill({ color: 0x7c5a3b });
    }

    // Render visual status label inside the construction site/blueprint
    const maxStages = spec.constructionStages?.length ?? 5;
    const labelText = stage === 0 ? "BLUEPRINT\n(INTERACT)" : `CONSTRUCT\nSTAGE ${stage}/${maxStages}`;
    const labelColor = stage === 0 ? 0x00ffff : 0xffdc78;
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 8,
      fill: labelColor,
      stroke: { color: 0x000000, width: 2.5 },
      align: "center",
    });
    const txt = new Text({ text: labelText, style });
    txt.anchor.set(0.5, 0.5);
    txt.x = 0;
    txt.y = -tileH / 2;
    txt.alpha = stage === 0 ? 0.85 : 0.75;
    shellContainer.addChild(txt);
  } else {
    // Stage 5: Completed
    const structureKey = getAshenmoonStructureKeyForBuildingType(type);
    const tex = getAshenmoonStructureTexture(structureKey ?? "legacyHouse");

    const sprite = new Sprite(tex);
    sprite.anchor.set(0.5, 1);
    sprite.x = 0;
    sprite.y = 0;
    const scale = resolveWorldVisualScale({
      spec: { widthTiles: spec.sprite.w, heightTiles: spec.sprite.h },
      texture: tex,
      tilePx: TILE,
    });
    sprite.scale.set(scale.x, scale.y);

    shellContainer.addChild(sprite);
  }
}

function getBuildingCellFootprint(
  type: string,
  cell: { x: number; y: number },
  spec: any
): CollisionFootprint {
  if (type === "house1") {
    const { w, h } = spec.footprint;
    // Left wall (excluding corners)
    if (cell.x === 0 && cell.y > 0 && cell.y < h - 1) {
      return { minX: 0, maxX: 0.25, minY: 0, maxY: 1 };
    }
    // Right wall (excluding corners)
    if (cell.x === w - 1 && cell.y > 0 && cell.y < h - 1) {
      return { minX: 0.75, maxX: 1, minY: 0, maxY: 1 };
    }
    // Top wall (excluding corners)
    if (cell.y === 0 && cell.x > 0 && cell.x < w - 1) {
      return { minX: 0, maxX: 1, minY: 0, maxY: 0.25 };
    }
    // Bottom wall (excluding corners)
    if (cell.y === h - 1 && cell.x > 0 && cell.x < w - 1) {
      return { minX: 0, maxX: 1, minY: 0.75, maxY: 1 };
    }
  }
  return CollisionFootprints.building;
}

export function spawnBuildingSystem(
  id: string,
  type: string,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  stage?: number,
  visualPresentationResource?: VisualPresentationResource,
): void {
  const ex = gx * TILE;
  const ey = gy * TILE;

  const spec = getBuildingSpec(type);
  const { w, h } = spec.footprint;
  const isMultiStage = !!spec.isMultiStage;

  let currentStage = stage;
  if (currentStage === undefined) {
    if (isMultiStage && gameState.rpg?.profile?.buildings) {
      const bData = gameState.rpg.profile.buildings.find((b) => b.id === id);
      currentStage = bData?.stage ?? 0;
    } else {
      currentStage = 5;
    }
  }

  // Add structural RPG components on completion (stage 5)
  const station = spec.stationId && currentStage === 5 ? { stationId: spec.stationId } : undefined;
  const campfire = spec.stationId === "campfire" && currentStage === 5 ? createCampfireState({ isLit: false }) : undefined;
  const campStructure = currentStage === 5 ? campStructureFor(type) : undefined;
  const maxStages = spec.constructionStages?.length ?? 5;
  const interactable = isMultiStage && currentStage < 5
    ? { name: `build ${spec.displayName} (stage ${currentStage}/${maxStages})`, action: "process" as const }
    : spec.stationId
      ? { name: spec.displayName, action: "process" as const }
      : getBuildableBehavior(type)
        ? { name: spec.displayName, action: "process" as const }
        : undefined;

  const entity = world.add({
    id,
    position: { x: ex, y: ey, targetX: ex, targetY: ey },
    collider: { isSolid: currentStage >= 2 },
    ...(station ? { station } : {}),
    ...(campfire ? { campfire } : {}),
    ...(campStructure ? { campStructure } : {}),
    ...(interactable ? { interactable } : {}),
    building: { type, stage: currentStage },
    ...((campfire || campStructure) ? { emitter: [] } : {}),
  });

  if (campStructure) syncShelterEmitter(entity);

  // Only block movement if building stage is at least 2 (Columns)
  if (currentStage >= 2) {
    if (spec.solidCells) {
      for (const cell of spec.solidCells) {
        const cx = gx + cell.x;
        const cy = gy + cell.y;
        map.solidCoords.add(coordKey(cx, cy));
        map.customSolids.set(
          coordKey(cx, cy),
          resolveCollisionAabb({ x: cx * TILE, y: cy * TILE }, getBuildingCellFootprint(type, cell, spec), TILE),
        );
      }
    } else {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          map.solidCoords.add(coordKey(gx + dx, gy + dy));
          map.customSolids.set(
            coordKey(gx + dx, gy + dy),
            resolveCollisionAabb({ x: (gx + dx) * TILE, y: (gy + dy) * TILE }, CollisionFootprints.building, TILE),
          );
        }
      }
    }
  }

  const container = new Container();
  container.x = (gx + w / 2) * TILE;
  container.y = (gy + h) * TILE;
  container.zIndex = computeRenderZ(container.y);

  const interiorContainer = new Container();
  const shellContainer = new Container();
  container.addChild(interiorContainer);
  container.addChild(shellContainer);

  if (type === "campfire" && currentStage === 5) {
    const refs = setupCampfireInShell(shellContainer);
    if (visualPresentationResource && entity.campfire) {
      registerCampfireVisual(visualPresentationResource, id, refs.sprite, refs.glow, entity.campfire);
    }
  } else {
    drawBuildingVisuals(type, currentStage, interiorContainer, shellContainer);
  }

  entityLayer.addChild(container);
  entitySprites.set(id, container);
}

export function upgradeBuildingSystem(
  id: string,
  stage: number,
  world: World<Entity>,
  map: MapResource,
  entitySprites: Map<string, Container>,
  visualPresentationResource?: VisualPresentationResource,
): void {
  const container = entitySprites.get(id);
  if (!container) return;

  const entity = world.entities.find((e) => e.id === id);
  if (!entity) return;

  const type = entity.building?.type ?? "";
  const spec = getBuildingSpec(type);

  if (entity.building) {
    entity.building.stage = stage;
  }

  const interiorContainer = container.children[0] as Container;
  const shellContainer = container.children[1] as Container;
  if (interiorContainer && shellContainer) {
    if (type === "campfire" && stage === 5) {
      const refs = setupCampfireInShell(shellContainer);
      if (visualPresentationResource && entity.campfire) {
        registerCampfireVisual(visualPresentationResource, id, refs.sprite, refs.glow, entity.campfire);
      }
    } else {
      drawBuildingVisuals(type, stage, interiorContainer, shellContainer);
    }
  }

  // Upgrade collision if transitioning to stage 2 (Columns) or above
  if (stage >= 2) {
    entity.collider = { isSolid: true };
    
    // Resolve building coordinates
    const gx = Math.floor((container.x - (spec.footprint.w / 2) * TILE) / TILE);
    const gy = Math.floor((container.y - spec.footprint.h * TILE) / TILE);

    if (spec.solidCells) {
      for (const cell of spec.solidCells) {
        const cx = gx + cell.x;
        const cy = gy + cell.y;
        map.solidCoords.add(coordKey(cx, cy));
        map.customSolids.set(
          coordKey(cx, cy),
          resolveCollisionAabb({ x: cx * TILE, y: cy * TILE }, getBuildingCellFootprint(type, cell, spec), TILE),
        );
      }
    } else {
      for (let dy = 0; dy < spec.footprint.h; dy++) {
        for (let dx = 0; dx < spec.footprint.w; dx++) {
          map.solidCoords.add(coordKey(gx + dx, gy + dy));
          map.customSolids.set(
            coordKey(gx + dx, gy + dy),
            resolveCollisionAabb({ x: (gx + dx) * TILE, y: (gy + dy) * TILE }, CollisionFootprints.building, TILE),
          );
        }
      }
    }
  }

  // Update gameplay components on completion
  if (stage === 5) {
    const station = spec.stationId ? { stationId: spec.stationId } : undefined;
    const campfire = spec.stationId === "campfire" ? createCampfireState({ isLit: false }) : undefined;
    const campStructure = campStructureFor(type);
    const interactable = spec.stationId
      ? { name: spec.displayName, action: "process" as const }
      : getBuildableBehavior(type)
        ? { name: spec.displayName, action: "process" as const }
        : undefined;

    if (station) entity.station = station;
    if (campfire) entity.campfire = campfire;
    if (campStructure) {
      entity.campStructure = campStructure;
      syncShelterEmitter(entity);
    }
    if (interactable) {
      entity.interactable = interactable;
    } else {
      delete entity.interactable;
    }
  } else {
    const maxStages = spec.constructionStages?.length ?? 5;
    entity.interactable = { name: `build ${spec.displayName} (stage ${stage}/${maxStages})`, action: "process" as const };
  }
}

export async function placeBuildingSystem(
  type: string,
  sourceItemId: string | null,
  gx: number,
  gy: number,
  world: World<Entity>,
  map: MapResource,
  vfx: VFXResource,
  entityLayer: Container,
  entitySprites: Map<string, Container>,
  triggerQuestEvent: (evt: string, val?: any) => void,
  cancelPlacement: () => void,
  onCompleteCb: (() => void) | undefined,
  visualPresentationResource?: VisualPresentationResource,
): Promise<void> {
  const result = await syncBuild(type, gx, gy, sourceItemId ?? undefined);
  const player = getPlayerEntity();

  if (!result.ok) {
    spawnEnvFloatingText(
      vfx,
      `build failed: ${result.error || "unknown error"}`,
      Colors.ui.error,
      player.position!,
      entityLayer,
    );
    return;
  }

  applyRpgState(result.data);

  const id = result.data.profile.buildings?.at(-1)?.id ?? `building_${type}_${Date.now()}`;
  const newBuilding = result.data.profile.buildings?.find((b) => b.id === id);
  spawnBuildingSystem(id, type, gx, gy, world, map, entityLayer, entitySprites, newBuilding?.stage, visualPresentationResource);

  playSound("build.place");
  const isMultiStage = !!getBuildingSpec(type).isMultiStage;
  const msg = isMultiStage ? "blueprint laid" : "constructed";
  spawnEnvFloatingText(vfx, msg, Colors.building.success, player.position!, entityLayer);
  spawnEnvParticles(vfx, Colors.building.particle, 15, "smoke", player.position!, entityLayer);

  if (isMultiStage) {
    setTimeout(() => {
      const playerPos = getPlayerEntity().position;
      if (playerPos) {
        spawnEnvFloatingText(vfx, "interact (e) to build", Colors.ui.info, playerPos, entityLayer);
      }
    }, 750);
  }

  triggerQuestEvent(GameEvent.Build, type);

  cancelPlacement();
  onCompleteCb?.();
}

export function updatePlacementPreviewSystem(
  inputs: InputResource,
  building: BuildingResource,
  map: MapResource,
  playerPos: { x: number; y: number },
): void {
  if (!building.isPlacementMode || !building.currentPlacementType || !building.previewSprite) {
    return;
  }

  const type = building.currentPlacementType;
  const mx = Math.floor(inputs.mouseWorld.x / TILE);
  const my = Math.floor(inputs.mouseWorld.y / TILE);

  const { w, h } = getBuildingSpec(type).footprint;

  building.previewSprite.x = (mx + w / 2) * TILE;
  building.previewSprite.y = (my + h) * TILE;

  if (building.previewIndicator) {
    building.previewIndicator.x = mx * TILE;
    building.previewIndicator.y = my * TILE;
  }

  const valid = isValidPlacement(mx, my, type, map, playerPos);
  building.previewSprite.tint = valid ? Colors.building.validPlace : Colors.building.invalidPlace;
}
