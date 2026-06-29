import type { ReactionKind } from "$lib/domain/systems/item-reactions";
import type { PlacedReactionId } from "$lib/domain/exposure/placed-reactions";
import type { AnimationFrameEventKind } from "$lib/domain/animation/player-animation";

export type DamageEventType = "physical" | "magic" | "true" | string;

export type QueuedGameEvent =
  | {
      readonly type: "damage_applied";
      readonly sourceId?: string;
      readonly targetId: string;
      readonly amount: number;
      readonly damageType: DamageEventType;
      readonly lethal: boolean;
      readonly targetFaction?: string;
      readonly targetPosition?: { readonly x: number; readonly y: number };
    }
  | {
      readonly type: "health_changed";
      readonly entityId: string;
      readonly previous: number;
      readonly current: number;
      readonly max: number;
    }
  | {
      readonly type: "entity_died";
      readonly entityId: string;
      readonly sourceId?: string;
      readonly cause?: string;
      readonly faction?: string;
      readonly position?: { readonly x: number; readonly y: number };
      readonly xpReward?: number;
    }
  | {
      readonly type: "status_added";
      readonly entityId: string;
      readonly statusId: string;
      readonly source?: string;
    }
  | {
      readonly type: "status_pulsed";
      readonly entityId: string;
      readonly statusId: string;
    }
  | {
      readonly type: "status_expired";
      readonly entityId: string;
      readonly statusId: string;
    }
  | {
      readonly type: "status_cleared";
      readonly entityId: string;
      readonly statusId: string;
    }
  | {
      readonly type: "status_all_cleared";
      readonly entityId: string;
    }
  | {
      readonly type: "wound_added";
      readonly entityId: string;
      readonly woundId: string;
      readonly severity: string;
      readonly source?: string;
    }
  | {
      readonly type: "wound_progressed";
      readonly entityId: string;
      readonly woundId: string;
      readonly progression: "infected";
    }
  | {
      readonly type: "item_gained";
      readonly actorId?: string;
      readonly itemId: string;
      readonly qty: number;
      readonly source?: string;
    }
  | {
      readonly type: "item_crafted";
      readonly actorId: string;
      readonly recipeId: string;
      readonly itemId: string;
      readonly qty: number;
    }
  | {
      readonly type: "craft_failed";
      readonly actorId: string;
      readonly recipeId?: string;
      readonly reason: string;
    }
  | {
      readonly type: "recipe_discovered";
      readonly actorId: string;
      readonly recipeId: string;
    }
  | {
      readonly type: "interaction_completed";
      readonly actorId: string;
      readonly targetId: string;
      readonly actionId: string;
    }
  | {
      readonly type: "world_action_completed";
      readonly actorId: string;
      readonly targetId: string;
      readonly actionId: string;
    }
  | {
      readonly type: "animation_event";
      readonly actorId: string;
      readonly clipId: string;
      readonly event: AnimationFrameEventKind;
      readonly normalizedTime: number;
      readonly position: { readonly x: number; readonly y: number };
      readonly targetId?: string;
    }
  | {
      readonly type: "feedback_requested";
      readonly channel: "world_vfx" | "sound" | "ui" | "panel" | "floating_text" | "debug";
      readonly message: string;
      readonly tone: "info" | "success" | "warning" | "error" | "danger" | "good";
      /** Optional sound id to play alongside this feedback message. */
      readonly sound?: string;
    }
  | {
      /**
       * An item in the player's inventory just underwent an environmental reaction
       * (temperature transform, ignition, or decay). The feedback router teaches
       * the matching KnowledgeProperty via `learnAbout(itemId, propertyFromReaction(reactionKind))`.
       */
      readonly type: "item_reacted";
      readonly actorId: string;
      readonly itemId: string;
      readonly reactionKind: ReactionKind;
    }
  | {
      /**
       * An item placed/dropped in the world underwent an environmental reaction
       * at its tile (cooked, dampened, dried, ignited, decayed, ...). Carries the
       * world position so the feedback router can spawn floating text + particles
       * at the item, and a pre-built lowercase bark. Distinct from `item_reacted`,
       * which is for inventory items and only drives knowledge.
       */
      readonly type: "placed_item_reacted";
      readonly entityId: string;
      readonly position: { readonly x: number; readonly y: number };
      readonly outcome: "warned" | "transformed" | "destroyed";
      readonly reactionId: PlacedReactionId;
      readonly itemId: string;
      readonly intoItemId?: string;
      readonly message: string;
    }
  | {
      /**
       * The player harvested or picked up an item from a world node. Carries the
       * node's display name so the feedback router can call `discoverSource` without
       * coupling to gatherable definitions. Kept separate from `item_gained` to
       * avoid ambiguity (item_gained is also emitted for crafting output).
       */
      readonly type: "item_gathered";
      readonly actorId: string;
      readonly itemId: string;
      /** Human-readable name of the source (gatherable displayName, "carcass", etc.). */
      readonly sourceName: string;
      readonly qty: number;
    }
  // --- weapon-driven combat lifecycle (see domain/combat/weapons) ---
  | {
      readonly type: "attack_started";
      readonly attackerId: string;
      readonly weaponDefId: string;
      readonly attackId: string;
      readonly animationProfile: string;
      readonly soundProfile: string;
      readonly direction: { readonly x: number; readonly y: number };
      /** Attacker centre, for drawing the swing arc. */
      readonly origin: { readonly x: number; readonly y: number };
      readonly aimAngle: number;
      readonly reachPx: number;
      readonly arcDegrees: number;
      readonly hitShapeKind: "arc" | "capsule" | "circle" | "point";
      readonly trail: "arc" | "thrust" | "heavy";
      readonly windupMs: number;
      readonly activeMs: number;
      readonly recoveryMs: number;
    }
  | {
      readonly type: "attack_active";
      readonly attackerId: string;
      readonly weaponDefId: string;
      readonly attackId: string;
    }
  | {
      readonly type: "attack_hit";
      readonly attackerId: string;
      readonly targetId: string;
      readonly weaponDefId: string;
      readonly attackId: string;
      readonly damageType: string;
      readonly amount: number;
      readonly soundProfile: string;
      readonly position: { readonly x: number; readonly y: number };
    }
  | {
      readonly type: "attack_missed";
      readonly attackerId: string;
      readonly weaponDefId: string;
      readonly attackId: string;
      readonly soundProfile: string;
    }
  | {
      readonly type: "attack_recovered";
      readonly attackerId: string;
      readonly weaponDefId: string;
      readonly attackId: string;
    }
  | {
      readonly type: "guard_started";
      readonly actorId: string;
      readonly weaponDefId: string;
    }
  | {
      readonly type: "guard_released";
      readonly actorId: string;
      readonly weaponDefId: string;
    }
  | {
      readonly type: "guard_blocked";
      readonly actorId: string;
      readonly absorbedDamage: number;
      readonly staminaCost: number;
    }
  | {
      readonly type: "guard_broken";
      readonly actorId: string;
      readonly staminaCost: number;
    };

export interface GameEventQueue {
  push(event: QueuedGameEvent): void;
  peek(): readonly QueuedGameEvent[];
  drain(): QueuedGameEvent[];
}

export function createGameEventQueue(): GameEventQueue {
  let events: QueuedGameEvent[] = [];

  return {
    push(event) {
      events.push(event);
    },
    peek() {
      return [...events];
    },
    drain() {
      const drained = events;
      events = [];
      return drained;
    },
  };
}
