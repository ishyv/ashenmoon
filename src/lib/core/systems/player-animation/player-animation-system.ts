import type { AnimatedSprite, Texture } from "pixi.js";
import type { RenderResourceCache } from "$lib/core/assets/render-resource-cache";
import type { AnimState } from "$lib/core/types";
import type { GameEventQueue } from "$lib/domain/game-event-queue";
import {
  animationEventsBetween,
  playerAnimationClip,
  selectPlayerAnimation,
  type GatherAnimationTargetKind,
  type PlayerAnimationClipId,
  type PlayerAnimationContext,
  type PlayerAnimationSelection,
} from "$lib/domain/animation/player-animation";

export interface PlayerAnimationMovementFacts {
  readonly velocityPxPerSec: number;
  readonly sprinting: boolean;
}

export interface PlayerAnimationGatheringFacts {
  readonly targetKind: GatherAnimationTargetKind;
  readonly targetId: string;
}

export class PlayerAnimationResource {
  public movement: PlayerAnimationMovementFacts = { velocityPxPerSec: 0, sprinting: false };
  public gathering: PlayerAnimationGatheringFacts | null = null;
  public currentClipId: PlayerAnimationClipId = "idle";
  public selection: PlayerAnimationSelection = selectPlayerAnimation(emptyAnimationContext);
  public normalizedTime = 0;

  public setMovementFacts(facts: PlayerAnimationMovementFacts): void {
    this.movement = facts;
  }

  public startGathering(facts: PlayerAnimationGatheringFacts): void {
    this.gathering = facts;
  }

  public clearGathering(targetId?: string): void {
    if (targetId && this.gathering?.targetId !== targetId) return;
    this.gathering = null;
  }
}

export interface PlayerAnimationSystemInput {
  readonly resource: PlayerAnimationResource;
  readonly sprite: AnimatedSprite;
  readonly renderResources: RenderResourceCache;
  readonly context: PlayerAnimationContext;
  readonly actorId: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly dt: number;
  readonly events?: GameEventQueue;
}

const emptyAnimationContext: PlayerAnimationContext = {
  action: "idle",
  velocityPxPerSec: 0,
  sprinting: false,
  staminaRatio: 1,
  encumbranceRatio: 0,
  wetness: "dry",
  statuses: [],
  equippedToolKind: null,
  gatherTargetKind: null,
  combatActive: false,
  guardActive: false,
};

export function runPlayerAnimationSystem(input: PlayerAnimationSystemInput): PlayerAnimationSelection {
  const selection = selectPlayerAnimation(input.context);
  const clip = playerAnimationClip(selection.clipId) ?? playerAnimationClip("idle")!;
  const resource = input.resource;
  const changedClip = resource.currentClipId !== selection.clipId;
  const previousTime = changedClip ? 0 : resource.normalizedTime;

  resource.currentClipId = selection.clipId;
  resource.selection = selection;

  // Bind the correct texture frames (procedurally driven)
  const frames = input.renderResources.actorFrames("player", selection.clipId);
  if (input.sprite.textures !== frames && frames.length > 0) {
    input.sprite.textures = frames as Texture[];
    input.sprite.gotoAndPlay(0);
  }
  input.sprite.loop = clip.loop;
  input.sprite.animationSpeed = Math.max(0.04, 0.12 * selection.speedMultiplier);
  input.sprite.onComplete = () => {};
  input.sprite.play();

  const durationSec = clip.loop ? 0.72 : 0.5;
  const currentTime = clip.loop
    ? previousTime + (input.dt / durationSec) * selection.speedMultiplier
    : Math.min(1, previousTime + (input.dt / durationSec) * selection.speedMultiplier);

  for (const event of animationEventsBetween({
    clip,
    previousNormalizedTime: previousTime,
    currentNormalizedTime: currentTime,
  })) {
    input.events?.push({
      type: "animation_event",
      actorId: input.actorId,
      clipId: event.clipId,
      event: event.kind,
      normalizedTime: event.atNormalizedTime,
      position: input.position,
      ...(resource.gathering?.targetId ? { targetId: resource.gathering.targetId } : {}),
    });
  }

  resource.normalizedTime = currentTime;
  if (!clip.loop && currentTime >= 1) {
    resource.clearGathering();
  }

  return selection;
}

export function legacyAnimStateForClip(clipId: PlayerAnimationClipId): AnimState {
  if (clipId.startsWith("combat_attack_")) return "attack";
  if (clipId.startsWith("combat_guard_")) return "idle";
  if (clipId.startsWith("gather_")) return "gather";
  if (clipId === "run" || clipId === "strained_run" || clipId === "encumbered_run") return "run";
  if (clipId === "idle") return "idle";
  return "walk";
}
