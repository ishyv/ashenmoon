import { World } from "miniplex";
import type { InteractionId } from "$lib/domain/interactions";
import type { StationId } from "$lib/domain/stations";
import type { AiState, AnimState, Faction } from "$lib/core/types";
import type { AnimalBehaviorState, AnimalSpeciesId } from "$lib/domain/animals/animal-behavior";
import type { CarcassProcessAction, CarcassState } from "$lib/domain/animals/carcass-processing";
import type { BoarCombatRuntime } from "$lib/domain/combat/enemies/boar-combat";
import type { WolfCombatRuntime } from "$lib/domain/combat/enemies/wolf-combat";
import type { CampfireState, CampStructureType } from "$lib/domain/camp/camp-state";
import type { LandmarkKind } from "$lib/domain/worldgen/landmark-definitions";
import type { EnvironmentEmitter } from "$lib/domain/environment/signals";

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
    /** Per-reaction accumulated exposure seconds (reactionId -> seconds). */
    reactions?: Record<string, number>;
  };

  /** Station marker for generic station/process interactions. */
  station?: {
    stationId: StationId;
  };

  /** Runtime state for a player-built or scenario campfire. */
  campfire?: CampfireState;

  /** Typed camp-structure gameplay metadata; rendering/building ids are not rules. */
  campStructure?: {
    type: CampStructureType;
    protectionRadiusPx?: number;
    coldResistanceBonus?: number;
    rainProtection?: number;
  };

  /** First Camp wildlife marker. Behavior is owned by animal-ecology-system. */
  animal?: {
    speciesId: AnimalSpeciesId;
    behavior: AnimalBehaviorState;
    hunger: number;
    threatened: boolean;
    attackCooldownSec: number;
    home: { x: number; y: number };
    wanderTarget?: { x: number; y: number };
    wanderTimerSec: number;
    scareSec?: number;
    /** Last horizontal movement direction; drives sprite scale-flip. */
    facingX: 1 | -1;
    /** Cached animation state name; prevents redundant texture swaps. */
    animState: string;
    /** Graduated awareness of the player: drives two-ring detection. */
    awarenessLevel: "unaware" | "curious" | "alert" | "fleeing";
    /** Counts down before awareness can drop a tier; prevents instant calm. */
    awarenessDecaySec: number;
    /** Last threat position (player or fire center). */
    threatOrigin?: { x: number; y: number };
    /** Wolf pack: ID of prey currently being hunted; copied to pack members. */
    huntTargetId?: string;
    /** Death-fade timer (seconds). Set on death; ecology system ticks it to 0, then despawns. */
    dyingSec?: number;
    /** Dynamic scaled damage for the animal. */
    damage?: number;
    /** Boar-specific charge/readability runtime. Domain owns transitions; core owns movement and presentation. */
    boarCombat?: BoarCombatRuntime;
    /** Wolf-specific pressure loop runtime. Domain owns commitment; core owns locomotion and hit application. */
    wolfCombat?: WolfCombatRuntime;
    /** Trap slow state. */
    slowTimerSec?: number;
    slowMultiplier?: number;
  };

  /**
   * Physical remains from an animal kill. Carcass rules live in the pure M3
   * hunting domain; runtime systems only age, render, and process this state.
   */
  carcass?: {
    speciesId: AnimalSpeciesId;
    state: CarcassState;
    ageSec: number;
    processedActions: CarcassProcessAction[];
  };

  /**
   * Biological Needs Component
   * Tracks internal parameters governing animal survival and behaviors.
   */
  needs?: {
    hunger: number;
    thirst: number;
    energy: number;
    ageSec: number;
    lifeStage: "juvenile" | "adult" | "elder";
    gestationTimerSec?: number | undefined;
  };

  /**
   * Sensory/Perception Component
   * Caches perceived objects in the vicinity, avoiding redundant distance calculations.
   */
  senses?: {
    lastScanSec: number;
    perceivedEntities: Array<{
      id: string;
      speciesId?: AnimalSpeciesId | undefined;
      type: "threat" | "prey" | "mate" | "water" | "food" | "shelter";
      x: number;
      y: number;
      distPx: number;
    }>;
  };

  /**
   * Animal Home / Nest Component
   * Binds an animal to its birth den or territory origin.
   */
  home?: {
    x: number;
    y: number;
    leashRadiusPx: number;
    nestId?: string;
  };

  /**
   * Nest / Den Landmark Component
   * Placed on burrow/den landmark entities to act as spawning/sleeping anchors.
   */
  nest?: {
    speciesId: AnimalSpeciesId;
    capacity: number;
    occupantIds: string[];
    spawnCooldownSec: number;
  };

  /**
   * Herd / Pack Coordination Component
   * Synchronizes flock/pack movement vectors and target sharing.
   */
  pack?: {
    packId: string;
    isLeader: boolean;
    leaderId?: string;
    membersIds: string[];
    sharedTargetId?: string;
  };

  /**
   * Follower Component
   * Placed on juveniles to keep them tethered to their parent/mother.
   */
  follower?: {
    targetEntityId: string;
    maxSeparationPx: number;
  };

  /**
   * Wallowing Mud Coat Component
   * Tracks protective armor or toxic status gained from mud-bathing.
   */
  mudCoat?: {
    durationSec: number;
    type: "mud" | "toxic_sludge" | "volcanic_ash";
    armorBonus: number;
    fireResistBonus: number;
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
  loot?: { xpReward: number; drops?: readonly { itemId: string; qty: number }[] };

  /** Placed world landmark with examine text and one-time item drops. */
  landmark?: {
    kind: LandmarkKind;
    depleted: boolean;
  };
  
  /** Placed building with type and construction stage. */
  building?: {
    type: string;
    stage: number;
  };

  /** Trap definition + current state */
  trap?: {
    type: "snap" | "caltrops" | "decoy";
    state: "set" | "sprung";
    usesRemaining?: number;
  };

  /**
   * Environmental signal emitters on this entity. The environment-signal system
   * reads these each frame to build the world's signal field. A campfire carries
   * heat + light emitters; a crude_shelter carries a shelter emitter. Cleared
   * automatically when the underlying state (e.g. campfire extinguished) changes.
   *
   * Add emitters here rather than adding per-signal queries in consumers —
   * that is the whole point of the signal architecture.
   */
  emitter?: EnvironmentEmitter[];
}

/** Central miniplex ECS world instance. Shared across all game systems. */
export const world = new World<Entity>();
