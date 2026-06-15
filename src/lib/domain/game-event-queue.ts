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
      readonly type: "feedback_requested";
      readonly channel: "world_vfx" | "sound" | "ui" | "panel" | "floating_text" | "debug";
      readonly message: string;
      readonly tone: "info" | "success" | "warning" | "error" | "danger" | "good";
      /** Optional sound id to play alongside this feedback message. */
      readonly sound?: string;
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
