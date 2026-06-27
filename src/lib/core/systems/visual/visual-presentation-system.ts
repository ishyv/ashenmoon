import type { World } from "miniplex";
import type { Container } from "pixi.js";
import { Sprite, AnimatedSprite } from "pixi.js";
import type { Entity } from "$lib/core/ecs/ecs-miniplex.js";
import type { WeatherResource } from "$lib/core/systems/weather/weather-system.js";
import type { VFXResource } from "$lib/core/vfx/vfx.js";
import type { CampfireState } from "$lib/domain/camp/camp-state.js";
import { sampleEnvironmentAt } from "$lib/core/systems/environment/environment-signal-system.js";
import {
  resolveVisualState,
  diffLoopSets,
} from "$lib/domain/visual/visual-state-resolver.js";
import {
  CAMPFIRE_VISUAL_DEF,
  type CampfireVisualInput,
  type ResolvedVisualState,
  type VisualSoundId,
  type VfxId,
  type SpriteKey,
} from "$lib/domain/visual/visual-definitions.js";
import { spawnVfxById, VFX_DEFINITIONS } from "$lib/core/vfx/vfx-definitions.js";
import { VISUAL_SOUND } from "./visual-sound-map.js";
import { startLoop, stopLoop, playSound } from "$lib/audio/audio-engine.js";
import { getAshenmoonPropTexture } from "$lib/core/assets/ashenmoon-assets.js";
import { TILE } from "$lib/core/systems/map/map.js";

// Silence unused-import lints for class imports used only in interface positions.
void (Sprite as unknown);
void (AnimatedSprite as unknown);

/** Seconds between visual state evaluations (~8 Hz). */
const STEP = 0.12;

/** Base states that represent an unlit campfire; used for ignition transition detection. */
const IS_UNLIT_STATE = new Set<string>([
  "unlit_empty",
  "unlit_fueled",
  "ash_pile",
  "extinguished_wet",
]);

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CampfireVisualRefs {
  sprite: AnimatedSprite;
  glow: Sprite;
}

/** Module-internal per-entity presentation cache. Not exported. */
interface EntityPresentation {
  baseState: string;
  activeLoops: Set<VisualSoundId>;
  /** VfxId → seconds remaining until next emission. */
  emitterTimers: Map<VfxId, number>;
  /** Bridge-tracked; 0 when a lit transition fires. */
  ignitionElapsedSec: number;
  /** Bridge-tracked; true once fire has been lit this session. */
  everBurned: boolean;
  /** Accumulated radian phase for glow flicker. */
  glowPhase: number;
  /** Latest resolved state; per-frame reads come from here. */
  resolved: ResolvedVisualState;
}

export class VisualPresentationResource {
  /** Per-entity visual state cache, keyed by entity id. */
  readonly byEntity = new Map<string, EntityPresentation>();
  /** Registered sprite/glow refs, keyed by entity id. Populated by registerCampfireVisual(). */
  readonly campfireRefs = new Map<string, CampfireVisualRefs>();
  /** Throttle accumulator (seconds). */
  accumulator = 0;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyResolvedToSprite(refs: CampfireVisualRefs, resolved: ResolvedVisualState): void {
  refs.sprite.tint = resolved.tint ?? 0xffffff;
  refs.sprite.alpha = resolved.alpha;

  if (resolved.baseSprite) {
    const tex = getAshenmoonPropTexture(resolved.baseSprite);
    refs.sprite.textures = [tex];
    refs.sprite.scale.set((TILE * 1.45) / tex.width);
    if (resolved.baseSprite === "firepitLit") {
      refs.sprite.gotoAndPlay(0);
    } else {
      refs.sprite.stop();
    }
  }
}

function applyGlow(refs: CampfireVisualRefs, pres: EntityPresentation, dt: number): void {
  const light = pres.resolved.light;
  if (light) {
    refs.glow.visible = true;
    const speedHz = light.flicker?.speedHz ?? 0;
    const amplitude = light.flicker?.amplitude ?? 0;
    pres.glowPhase = (pres.glowPhase + dt * speedHz * Math.PI * 2) % (Math.PI * 2);
    const flicker = 1 + Math.sin(pres.glowPhase) * amplitude;
    refs.glow.scale.set(light.radiusScale * flicker);
    refs.glow.alpha = light.alpha;
    refs.glow.tint = light.tint;
  } else {
    refs.glow.visible = false;
    refs.glow.alpha = 0;
  }
}

function buildInitialPresentation(
  campfireState: CampfireState,
  raining: boolean,
): EntityPresentation {
  const fuelCap = campfireState.fuelCapacityMs ?? 30_000;
  const input: CampfireVisualInput = {
    isLit: campfireState.isLit,
    fuelMs: campfireState.fuelRemainingMs,
    fuelFrac: Math.min(1, campfireState.fuelRemainingMs / fuelCap),
    wetness: campfireState.wetness,
    raining,
    // Skip igniting state on load by setting elapsed past the threshold
    ignitionElapsedSec: campfireState.isLit ? 1.0 : 0,
    everBurned: campfireState.isLit,
  };

  const resolved = resolveVisualState(CAMPFIRE_VISUAL_DEF, input);

  return {
    baseState: resolved.baseState,
    activeLoops: new Set(resolved.soundLoops),
    emitterTimers: new Map(),
    ignitionElapsedSec: campfireState.isLit ? 1.0 : 0,
    everBurned: campfireState.isLit,
    glowPhase: 0,
    resolved,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register campfire sprite/glow refs and seed initial presentation state.
 * Must be called when a campfire entity is spawned.
 * Does NOT play enterSfx or spawn enterOneShots — prevents phantom sounds on load.
 */
export function registerCampfireVisual(
  res: VisualPresentationResource,
  entityId: string,
  sprite: AnimatedSprite,
  glow: Sprite,
  campfireState: CampfireState,
): void {
  const refs: CampfireVisualRefs = { sprite, glow };
  res.campfireRefs.set(entityId, refs);

  const pres = buildInitialPresentation(campfireState, false);
  res.byEntity.set(entityId, pres);

  // Apply initial visual state immediately — no enter effects
  applyResolvedToSprite(refs, pres.resolved);
  applyGlow(refs, pres, 0);
}

/**
 * Tick the visual presentation system for all campfire entities.
 * State resolution is throttled to ~8 Hz; glow flicker and particle emission
 * run every frame.
 */
export function tickVisualPresentation(
  world: World<Entity>,
  weather: WeatherResource,
  vfx: VFXResource,
  entityLayer: Container,
  res: VisualPresentationResource,
  dt: number,
): void {
  res.accumulator += dt;
  const doStep = res.accumulator >= STEP;
  if (doStep) {
    res.accumulator = Math.max(0, res.accumulator - STEP);
  }

  for (const entity of world.with("campfire", "position").entities) {
    const entityId = entity.id;
    const refs = res.campfireRefs.get(entityId);
    if (!refs) continue;

    // Get or create EntityPresentation (registerCampfireVisual should have been called first)
    let pres = res.byEntity.get(entityId);
    if (!pres) {
      pres = buildInitialPresentation(entity.campfire!, weather.state.raining);
      res.byEntity.set(entityId, pres);
    }

    // Bridge-tracked: increment ignitionElapsedSec every frame while lit
    if (entity.campfire!.isLit) {
      pres.ignitionElapsedSec += dt;
    }

    const pos = {
      x: entity.position!.x + TILE / 2,
      y: entity.position!.y + TILE / 2,
    };

    if (doStep) {
      const state = entity.campfire!;
      const fuelCap = state.fuelCapacityMs ?? 30_000;

      // Detect ignition transition: campfire just became lit from an unlit base state
      if (state.isLit && IS_UNLIT_STATE.has(pres.resolved.baseState)) {
        pres.ignitionElapsedSec = 0;
      }

      // Update everBurned
      if (state.isLit) {
        pres.everBurned = true;
      }

      const env = sampleEnvironmentAt(world, weather, pos);
      const input: CampfireVisualInput = {
        isLit: state.isLit,
        fuelMs: state.fuelRemainingMs,
        fuelFrac: Math.min(1, state.fuelRemainingMs / fuelCap),
        wetness: Math.max(state.wetness, env.wetness),
        raining: weather.state.raining,
        ignitionElapsedSec: pres.ignitionElapsedSec,
        everBurned: pres.everBurned,
      };

      const newResolved = resolveVisualState(CAMPFIRE_VISUAL_DEF, input);

      // Handle base-state transition
      if (newResolved.baseState !== pres.baseState) {
        // Play enter SFX (one-shot)
        for (const id of newResolved.enterSfx) {
          playSound(VISUAL_SOUND[id]);
        }
        // Spawn enter one-shot VFX
        for (const id of newResolved.enterOneShots) {
          spawnVfxById(vfx, entityLayer, id, pos);
        }
        // Swap sprite texture if baseSprite changed
        if (newResolved.baseSprite !== pres.resolved.baseSprite && newResolved.baseSprite) {
          const tex = getAshenmoonPropTexture(newResolved.baseSprite);
          refs.sprite.textures = [tex];
          refs.sprite.scale.set((TILE * 1.45) / tex.width);
          if (newResolved.baseSprite === "firepitLit") {
            refs.sprite.gotoAndPlay(0);
          } else {
            refs.sprite.stop();
          }
        }
      }

      // Diff sound loops; only start newly-added loops to avoid re-triggering
      const newLoopSet = new Set<VisualSoundId>(newResolved.soundLoops);
      const { toStart, toStop } = diffLoopSets(pres.activeLoops, newLoopSet);
      for (const id of toStop) {
        stopLoop(`visual:${entityId}:${id}`);
      }
      for (const id of toStart) {
        startLoop(VISUAL_SOUND[id as VisualSoundId], `visual:${entityId}:${id}`, pos);
      }

      pres.activeLoops = newLoopSet;
      pres.baseState = newResolved.baseState;
      pres.resolved = newResolved;

      // Remove emitter timers for particles no longer in the resolved set
      const resolvedParticleSet = new Set<VfxId>(newResolved.particles);
      for (const id of [...pres.emitterTimers.keys()]) {
        if (!resolvedParticleSet.has(id)) {
          pres.emitterTimers.delete(id);
        }
      }
    }

    // EVERY FRAME: apply sprite tint + alpha from latest resolved state
    refs.sprite.tint = pres.resolved.tint ?? 0xffffff;
    refs.sprite.alpha = pres.resolved.alpha;

    // EVERY FRAME: drive glow flicker
    applyGlow(refs, pres, dt);

    // EVERY FRAME: tick continuous particle emitters
    const activeParticles = new Set<VfxId>(pres.resolved.particles);
    for (const id of activeParticles) {
      const def = VFX_DEFINITIONS[id];
      if (!def || def.intervalSec === 0) continue;
      const remaining = (pres.emitterTimers.get(id) ?? 0) - dt;
      if (remaining <= 0) {
        spawnVfxById(vfx, entityLayer, id, pos);
        // Catch up: carry over any overshoot so cadence stays accurate
        pres.emitterTimers.set(id, def.intervalSec + remaining);
      } else {
        pres.emitterTimers.set(id, remaining);
      }
    }
    // Clean up stale timers for no-longer-active particles
    for (const id of [...pres.emitterTimers.keys()]) {
      if (!activeParticles.has(id)) {
        pres.emitterTimers.delete(id);
      }
    }
  }
}

/**
 * Stop all active sound loops and clear all cached state.
 * Call on scene teardown or world reset.
 */
export function clearVisualPresentation(res: VisualPresentationResource): void {
  for (const [entityId, pres] of res.byEntity) {
    for (const soundId of pres.activeLoops) {
      stopLoop(`visual:${entityId}:${soundId}`);
    }
  }
  res.byEntity.clear();
  res.campfireRefs.clear();
  res.accumulator = 0;
}
