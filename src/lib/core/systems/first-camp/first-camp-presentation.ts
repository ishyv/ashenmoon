/**
 * First-camp-presentation: owns discovery bark deduplication and proximity
 * checks for the first-loop experience.
 *
 * WHY: GameEngine is already large. Bark sequencing, pond proximity, and
 * omen state are first-loop concerns that should live in a focused module
 * instead of ad-hoc branches scattered through the engine tick.
 */
import type { MapResource } from "$lib/core/systems/map/map";
import type { DiscoveryBarkId } from "$lib/domain/discovery/discovery-barks";
import { shouldTriggerOmen, type OmenTriggerState } from "$lib/domain/events/omen-events";
import { TILE } from "$lib/core/systems/map/map";

export interface FirstCampPresentationState {
  seenBarks: Set<DiscoveryBarkId>;
  omenTriggered: boolean;
  /** Tracks which first-loop objectives are done for omen gating. */
  cleanWaterDrunk: boolean;
  campfireWoken: boolean;
}

export interface FirstCampPresentationContext {
  map: MapResource;
  playerTile: { x: number; y: number };
  emitBark: (id: DiscoveryBarkId) => void;
  emitOmen: () => void;
  state: FirstCampPresentationState;
}

export function createFirstCampPresentationState(): FirstCampPresentationState {
  return {
    seenBarks: new Set(),
    omenTriggered: false,
    cleanWaterDrunk: false,
    campfireWoken: false,
  };
}

/**
 * Emit a bark once per session. Safe to call every frame.
 */
export function emitBarkOnce(
  state: FirstCampPresentationState,
  id: DiscoveryBarkId,
  emitBark: (id: DiscoveryBarkId) => void,
): void {
  if (state.seenBarks.has(id)) return;
  state.seenBarks.add(id);
  emitBark(id);
}

/**
 * Called once after init to show the cold firepit bark.
 */
export function initFirstCampPresentation(ctx: FirstCampPresentationContext): void {
  emitBarkOnce(ctx.state, "cold_firepit", ctx.emitBark);
}

/**
 * Called each frame tick. Checks pond proximity for bark, and omen readiness.
 */
export function updateFirstCampPresentation(ctx: FirstCampPresentationContext): void {
  const pond = ctx.map.forestMetadata?.waterSources?.find((s) => s.kind === "pond");
  if (pond) {
    const playerPx = ctx.playerTile.x * TILE + TILE / 2;
    const playerPy = ctx.playerTile.y * TILE + TILE / 2;
    const pondPx = pond.x * TILE + TILE / 2;
    const pondPy = pond.y * TILE + TILE / 2;
    const dist = Math.hypot(
      (playerPx - pondPx) / TILE,
      (playerPy - pondPy) / TILE,
    );
    if (dist <= 3.5) {
      emitBarkOnce(ctx.state, "first_pond", ctx.emitBark);
    }
  }

  const omenState: OmenTriggerState = {
    cleanWaterDrunk: ctx.state.cleanWaterDrunk,
    campfireWoken: ctx.state.campfireWoken,
    alreadyTriggered: ctx.state.omenTriggered,
  };
  if (shouldTriggerOmen(omenState)) {
    ctx.state.omenTriggered = true;
    ctx.emitOmen();
  }
}
