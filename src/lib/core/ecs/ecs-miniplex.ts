import { World } from "miniplex";
import type { InteractionId } from "$lib/domain/interactions";
import type { StationId } from "$lib/domain/stations";
import type { AiState, AnimState, Faction } from "$lib/core/types";
import type { AnimalBehaviorState, AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import type { CampfireState } from "$lib/domain/camp/camp-state";

/**
 * Game entity component structure.
 *
 * Every component is optional. The engine picks entities by which components
 * they carry — miniplex queries with `.with()` narrow at runtime. New
 * components should be added here before being referenced in engine systems.
 */
export interface Entity {
  id: string;
  position?: { x: number; y: number; targetX: number; targetY: number };
  collider?: { isSolid: boolean };
  playerControlled?: { speed: number };
  /**
   * Marks an entity as interactable (press E while facing it). `name` is the
   * HUD label; `action` selects the registered handler that runs on E — the
   * handler reads whatever other components it needs (e.g. `resource`) off the
   * entity, so this stays decoupled from any one interaction's data.
   */
  interactable?: { name: string; action: InteractionId };
  /**
   * Present on entities that can be gathered and depleted. The `gather` action
   * decrements `hp` and yields `drop`; at 0 the engine removes the node.
   */
  resource?: {
    hp: number;
    maxHp: number;
    drop: string;
    gatherableId?: string;
    rpgAction?: "mine" | "forest";
    rpgLocationId?: string;
  };
  /**
   * Present on entities that are ground pickups. Exposure fields are runtime
   * state for dropped/placed items reacting to world conditions; they are kept
   * explicit so pickup authors do not hide rules in item definitions.
   */
  pickup?: {
    itemId: string;
    qty: number;
    gatherableId?: string;
    exposureTimeSec?: number;
    hasWarned?: boolean;
  };

  /** Station marker for generic station/process interactions. */
  station?: {
    stationId: StationId;
  };

  /** Runtime state for a player-built or scenario campfire. */
  campfire?: CampfireState;

  /** First Camp wildlife marker. Behavior is owned by animal-ecology-system. */
  animal?: {
    speciesId: AnimalSpeciesId;
    behavior: AnimalBehaviorState;
    hunger: number;
    threatened: boolean;
    attackCooldownSec: number;
    home: { x: number; y: number };
  };

  // --- Combat components -----------------------------------------------------
  // These compose to make any entity a combat participant. The player carries
  // `health` + `knockback`; a hostile additionally carries `mover` + `ai` +
  // `melee` + `loot`. A new enemy "type" is a new configuration of these, not a
  // new system. See combat.ts (damage/attack) and enemy-ai.ts (behaviour).

  /**
   * Makes an entity damageable. `faction` gates who may harm it (see Faction).
   * `invulnTimer` counts down post-hit i-frames during which damage is ignored
   * (also raised by the player's neutral-dash evade). OWNER: the damage system
   * in combat.ts is the only writer of `current`/`invulnTimer`.
   */
  health?: { current: number; max: number; faction: Faction; invulnTimer: number };

  /**
   * Active knockback impulse. While `timer > 0` the knockback system slides the
   * entity by (vx, vy) using the same solid collision as movement, so impulses
   * respect walls. Cleared when the timer elapses.
   */
  knockback?: { vx: number; vy: number; timer: number };

  /**
   * Minimal hostile bleed state. This is intentionally separate from the
   * player status system; enemies only need ticking combat damage in this slice.
   */
  bleed?: {
    remainingSec: number;
    tickEverySec: number;
    tickTimer: number;
    damagePerTick: number;
    sourceId?: string;
  };

  /** Generic locomotion speed (world px/sec) for AI-driven movers. */
  mover?: { speed: number };

  /**
   * Hostile behaviour state + perception ranges. `home` is the leash anchor and
   * `animState`/`facingX` carry presentation state so the AI system can drive the
   * entity's AnimatedSprite the same way the player sprite is driven.
   */
  ai?: {
    state: AiState;
    aggroRadius: number;
    leashRadius: number;
    home: { x: number; y: number };
    animState: AnimState;
    facingX: 1 | -1;
  };

  /**
   * Melee attack definition + live timers. `windup` is the telegraph window
   * before a strike lands (the player's reaction window); `cooldown` gates the
   * next attack after one resolves.
   */
  melee?: {
    range: number;
    damage: number;
    knockback: number;
    cooldown: number;
    cooldownTimer: number;
    windup: number;
    windupTimer: number;
  };

  /** Reward granted to the player when this entity dies. */
  loot?: { xpReward: number };
}

/** Central miniplex ECS world instance. Shared across all game systems. */
export const world = new World<Entity>();
