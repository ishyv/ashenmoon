import type { GatherableDefinition } from "$lib/domain/gathering/gatherables";
import type { ToolKind } from "$lib/domain/gathering/gather-system";
import { StatusId } from "$lib/domain/systems/status-types";
import type { WetnessLevel } from "$lib/domain/exposure/wetness";
import type { ItemDefinition } from "$lib/domain/items";
import type { RpgInventorySlot } from "$lib/domain/rpg-types";

export type PlayerAnimationClipId =
  | "idle"
  | "walk"
  | "run"
  | "exhausted_walk"
  | "injured_walk"
  | "encumbered_walk"
  | "wet_walk"
  | "strained_run"
  | "encumbered_run"
  | "gather_bush_hands"
  | "gather_tree_hands"
  | "gather_tree_axe"
  | "gather_ore_bad_tool"
  | "gather_ore_pick"
  | "gather_clay_hands"
  | "gather_water_container"
  | "combat_active";

export type PlayerAnimationCategory = "movement" | "gathering" | "combat";

export type AnimationFrameEventKind = "footstep" | "tool_impact" | "gather_pull" | "swing_release";

export interface AnimationFrameEvent {
  readonly atNormalizedTime: number;
  readonly kind: AnimationFrameEventKind;
  readonly payload?: Readonly<Record<string, unknown>>;
}

export interface AnimationDefinition {
  readonly id: PlayerAnimationClipId | string;
  readonly category: PlayerAnimationCategory;
  readonly baseSpeed: number;
  readonly loop: boolean;
  readonly priority: number;
  readonly tags?: readonly string[];
  readonly events?: readonly AnimationFrameEvent[];
}

export type PlayerAnimationAction = "idle" | "moving" | "gathering" | "combat";
export type GatherAnimationTargetKind = "plant" | "tree" | "ore" | "clay" | "water" | "pickup";
export type PlayerAnimationModifier = "wet" | "exhausted" | "strained" | "encumbered" | "injured";

export interface PlayerAnimationContext {
  readonly action: PlayerAnimationAction;
  readonly velocityPxPerSec: number;
  readonly sprinting: boolean;
  readonly staminaRatio: number;
  readonly encumbranceRatio: number;
  readonly wetness: WetnessLevel;
  readonly statuses: readonly StatusId[];
  readonly equippedToolKind: ToolKind | "knife" | "container" | null;
  readonly gatherTargetKind: GatherAnimationTargetKind | null;
  readonly combatActive: boolean;
  readonly guardActive: boolean;
}

export interface AnimationVariantRule {
  readonly clipId: PlayerAnimationClipId;
  readonly priority: number;
  readonly when: {
    readonly action?: PlayerAnimationAction;
    readonly moving?: boolean;
    readonly sprinting?: boolean;
    readonly gatherTargetKind?: GatherAnimationTargetKind;
    readonly equippedToolKind?: PlayerAnimationContext["equippedToolKind"];
    readonly statusAny?: readonly StatusId[];
    readonly staminaMax?: number;
    readonly encumbranceMin?: number;
    readonly wetnessMin?: WetnessLevel;
    readonly combatActive?: boolean;
  };
  readonly speedMultiplier?: number;
}

export interface PlayerAnimationSelection {
  readonly clipId: PlayerAnimationClipId;
  readonly speedMultiplier: number;
  readonly priority: number;
  readonly modifiers: readonly PlayerAnimationModifier[];
}

const WETNESS_RANK: Record<WetnessLevel, number> = {
  dry: 0,
  damp: 1,
  wet: 2,
  soaked: 3,
};

const INJURY_STATUSES = [
  StatusId.Bleeding,
  StatusId.Injured,
  StatusId.Cut,
  StatusId.DeepCut,
  StatusId.BiteWound,
] as const;

export const PLAYER_ANIMATION_CLIPS: readonly AnimationDefinition[] = [
  { id: "idle", category: "movement", baseSpeed: 0.65, loop: true, priority: 0 },
  { id: "walk", category: "movement", baseSpeed: 1, loop: true, priority: 10, events: [{ atNormalizedTime: 0.22, kind: "footstep" }, { atNormalizedTime: 0.72, kind: "footstep" }] },
  { id: "run", category: "movement", baseSpeed: 1.25, loop: true, priority: 20, events: [{ atNormalizedTime: 0.18, kind: "footstep" }, { atNormalizedTime: 0.62, kind: "footstep" }] },
  { id: "exhausted_walk", category: "movement", baseSpeed: 0.72, loop: true, priority: 35, events: [{ atNormalizedTime: 0.3, kind: "footstep" }, { atNormalizedTime: 0.82, kind: "footstep" }] },
  { id: "injured_walk", category: "movement", baseSpeed: 0.68, loop: true, priority: 60, events: [{ atNormalizedTime: 0.34, kind: "footstep" }, { atNormalizedTime: 0.88, kind: "footstep" }] },
  { id: "encumbered_walk", category: "movement", baseSpeed: 0.78, loop: true, priority: 50, events: [{ atNormalizedTime: 0.28, kind: "footstep" }, { atNormalizedTime: 0.78, kind: "footstep" }] },
  { id: "wet_walk", category: "movement", baseSpeed: 0.82, loop: true, priority: 32, events: [{ atNormalizedTime: 0.28, kind: "footstep" }, { atNormalizedTime: 0.78, kind: "footstep" }] },
  { id: "strained_run", category: "movement", baseSpeed: 1.02, loop: true, priority: 38, events: [{ atNormalizedTime: 0.2, kind: "footstep" }, { atNormalizedTime: 0.66, kind: "footstep" }] },
  { id: "encumbered_run", category: "movement", baseSpeed: 0.95, loop: true, priority: 52, events: [{ atNormalizedTime: 0.24, kind: "footstep" }, { atNormalizedTime: 0.72, kind: "footstep" }] },
  { id: "gather_bush_hands", category: "gathering", baseSpeed: 1, loop: false, priority: 80, events: [{ atNormalizedTime: 0.48, kind: "gather_pull" }] },
  { id: "gather_tree_hands", category: "gathering", baseSpeed: 0.82, loop: false, priority: 80, events: [{ atNormalizedTime: 0.58, kind: "gather_pull" }] },
  { id: "gather_tree_axe", category: "gathering", baseSpeed: 1, loop: false, priority: 88, events: [{ atNormalizedTime: 0.42, kind: "swing_release" }, { atNormalizedTime: 0.56, kind: "tool_impact" }] },
  { id: "gather_ore_bad_tool", category: "gathering", baseSpeed: 0.75, loop: false, priority: 80, events: [{ atNormalizedTime: 0.6, kind: "tool_impact" }] },
  { id: "gather_ore_pick", category: "gathering", baseSpeed: 0.96, loop: false, priority: 88, events: [{ atNormalizedTime: 0.4, kind: "swing_release" }, { atNormalizedTime: 0.58, kind: "tool_impact" }] },
  { id: "gather_clay_hands", category: "gathering", baseSpeed: 0.85, loop: false, priority: 82, events: [{ atNormalizedTime: 0.52, kind: "gather_pull" }] },
  { id: "gather_water_container", category: "gathering", baseSpeed: 0.78, loop: false, priority: 82, events: [{ atNormalizedTime: 0.54, kind: "gather_pull" }] },
  { id: "combat_active", category: "combat", baseSpeed: 1, loop: false, priority: 100 },
] as const;

export const PLAYER_ANIMATION_VARIANTS: readonly AnimationVariantRule[] = [
  { clipId: "combat_active", priority: 100, when: { combatActive: true } },
  { clipId: "gather_tree_axe", priority: 88, when: { action: "gathering", gatherTargetKind: "tree", equippedToolKind: "axe" } },
  { clipId: "gather_ore_pick", priority: 88, when: { action: "gathering", gatherTargetKind: "ore", equippedToolKind: "pickaxe" } },
  { clipId: "gather_clay_hands", priority: 82, when: { action: "gathering", gatherTargetKind: "clay" } },
  { clipId: "gather_water_container", priority: 82, when: { action: "gathering", gatherTargetKind: "water" } },
  { clipId: "gather_bush_hands", priority: 80, when: { action: "gathering", gatherTargetKind: "plant" } },
  { clipId: "gather_tree_hands", priority: 80, when: { action: "gathering", gatherTargetKind: "tree" } },
  { clipId: "gather_ore_bad_tool", priority: 80, when: { action: "gathering", gatherTargetKind: "ore" } },
  { clipId: "injured_walk", priority: 60, when: { action: "moving", moving: true, statusAny: INJURY_STATUSES } },
  { clipId: "encumbered_run", priority: 52, when: { action: "moving", moving: true, sprinting: true, encumbranceMin: 0.75 } },
  { clipId: "encumbered_walk", priority: 50, when: { action: "moving", moving: true, encumbranceMin: 0.75 } },
  { clipId: "strained_run", priority: 38, when: { action: "moving", moving: true, sprinting: true, staminaMax: 0.3 } },
  { clipId: "exhausted_walk", priority: 35, when: { action: "moving", moving: true, staminaMax: 0.18 } },
  { clipId: "wet_walk", priority: 32, when: { action: "moving", moving: true, wetnessMin: "wet" } },
  { clipId: "run", priority: 20, when: { action: "moving", moving: true, sprinting: true } },
  { clipId: "walk", priority: 10, when: { action: "moving", moving: true } },
  { clipId: "idle", priority: 0, when: { action: "idle" } },
] as const;

export function playerAnimationClip(id: PlayerAnimationClipId | string): AnimationDefinition | undefined {
  return PLAYER_ANIMATION_CLIPS.find((clip) => clip.id === id);
}

export function gatherTargetKindForDefinition(def: GatherableDefinition): GatherAnimationTargetKind | null {
  if (def.interactionKind === "liquid") return "water";
  if (def.id.includes("clay") || def.gatherSound === "dig") return "clay";
  if (def.solidKind === "tree") return "tree";
  if (def.solidKind === "rock") return "ore";
  if (def.interactionKind === "pickup") return "pickup";
  if (def.renderKind === "berry_bush" || def.renderKind === "forage" || def.renderKind === "grass_patch" || def.renderKind === "mushroom_patch" || def.renderKind === "moss" || def.renderKind === "reeds") {
    return "plant";
  }
  return null;
}

export function selectPlayerAnimation(context: PlayerAnimationContext): PlayerAnimationSelection {
  const selected = PLAYER_ANIMATION_VARIANTS
    .filter((variant) => matchesVariant(context, variant))
    .sort((a, b) => b.priority - a.priority)[0] ?? PLAYER_ANIMATION_VARIANTS[PLAYER_ANIMATION_VARIANTS.length - 1]!;
  const clip = playerAnimationClip(selected.clipId);
  return {
    clipId: selected.clipId,
    priority: selected.priority,
    speedMultiplier: (clip?.baseSpeed ?? 1) * (selected.speedMultiplier ?? 1) * adaptiveSpeedMultiplier(context),
    modifiers: adaptiveModifiers(context),
  };
}

function matchesVariant(context: PlayerAnimationContext, variant: AnimationVariantRule): boolean {
  const when = variant.when;
  if (when.combatActive !== undefined && context.combatActive !== when.combatActive) return false;
  if (when.action !== undefined && context.action !== when.action) return false;
  if (when.moving !== undefined && (context.velocityPxPerSec > 1) !== when.moving) return false;
  if (when.sprinting !== undefined && context.sprinting !== when.sprinting) return false;
  if (when.gatherTargetKind !== undefined && context.gatherTargetKind !== when.gatherTargetKind) return false;
  if (when.equippedToolKind !== undefined && context.equippedToolKind !== when.equippedToolKind) return false;
  if (when.statusAny !== undefined && !when.statusAny.some((status) => context.statuses.includes(status))) return false;
  if (when.staminaMax !== undefined && context.staminaRatio > when.staminaMax) return false;
  if (when.encumbranceMin !== undefined && context.encumbranceRatio < when.encumbranceMin) return false;
  if (when.wetnessMin !== undefined && WETNESS_RANK[context.wetness] < WETNESS_RANK[when.wetnessMin]) return false;
  return true;
}

function adaptiveModifiers(context: PlayerAnimationContext): readonly PlayerAnimationModifier[] {
  const modifiers: PlayerAnimationModifier[] = [];
  if (WETNESS_RANK[context.wetness] >= WETNESS_RANK.wet) modifiers.push("wet");
  if (context.staminaRatio <= 0.18 || context.statuses.includes(StatusId.Exhaustion)) modifiers.push("exhausted");
  else if (context.sprinting && context.staminaRatio <= 0.3) modifiers.push("strained");
  if (context.encumbranceRatio >= 0.75) modifiers.push("encumbered");
  if (INJURY_STATUSES.some((status) => context.statuses.includes(status))) modifiers.push("injured");
  return modifiers;
}

function adaptiveSpeedMultiplier(context: PlayerAnimationContext): number {
  let multiplier = 1;
  if (WETNESS_RANK[context.wetness] >= WETNESS_RANK.wet) multiplier *= 0.9;
  if (context.staminaRatio <= 0.18 || context.statuses.includes(StatusId.Exhaustion)) multiplier *= 0.82;
  if (context.encumbranceRatio >= 0.75) multiplier *= 0.88;
  return multiplier;
}

export interface AnimationEventRangeInput {
  readonly clip: AnimationDefinition;
  readonly previousNormalizedTime: number;
  readonly currentNormalizedTime: number;
}

export interface FiredAnimationEvent extends AnimationFrameEvent {
  readonly clipId: string;
}

interface FiredAnimationEventWithOrder extends FiredAnimationEvent {
  readonly absoluteTime: number;
}

export function animationEventsBetween(input: AnimationEventRangeInput): readonly FiredAnimationEvent[] {
  const events = input.clip.events ?? [];
  if (events.length === 0) return [];

  const fired: FiredAnimationEventWithOrder[] = [];
  if (!input.clip.loop) {
    for (const event of events) {
      if (event.atNormalizedTime > input.previousNormalizedTime && event.atNormalizedTime <= input.currentNormalizedTime) {
        fired.push({ ...event, clipId: input.clip.id, absoluteTime: event.atNormalizedTime });
      }
    }
    return fired.map(({ absoluteTime: _absoluteTime, ...event }) => event);
  }

  const previousLoop = Math.floor(input.previousNormalizedTime);
  const currentLoop = Math.floor(input.currentNormalizedTime);
  for (let loop = previousLoop; loop <= currentLoop; loop++) {
    for (const event of events) {
      const absoluteTime = loop + event.atNormalizedTime;
      if (absoluteTime > input.previousNormalizedTime && absoluteTime <= input.currentNormalizedTime) {
        fired.push({ ...event, clipId: input.clip.id, absoluteTime });
      }
    }
  }
  return fired
    .sort((a, b) => a.absoluteTime - b.absoluteTime)
    .map(({ absoluteTime: _absoluteTime, ...event }) => event);
}

export function inventoryEncumbranceRatio(
  slots: Readonly<Record<string, RpgInventorySlot>> | null | undefined,
  itemDefs: Readonly<Record<string, ItemDefinition>>,
  capacityWeight: number,
): number {
  if (!slots || capacityWeight <= 0) return 0;
  let carriedWeight = 0;
  for (const [itemId, slot] of Object.entries(slots)) {
    const def = itemDefs[itemId];
    if (!def) continue;
    const qty = "qty" in slot ? slot.qty : slot.instances.length;
    carriedWeight += def.physical.weight * Math.max(0, qty);
  }
  return Math.max(0, carriedWeight / capacityWeight);
}
