/**
 * Canonical string identifiers shared across game systems: quest/feedback
 * events, singleton entity ids, skill keys, input action names, and storage
 * keys.
 *
 * WHY: these strings are matched in many places (quests, engine spawns, skill
 * XP, input bindings); centralizing them stops a typo from silently breaking a
 * match. Building type ids are intentionally NOT here — `BuildingType` already
 * owns that union in assets.ts, and duplicating it would create two sources of
 * truth.
 */

/** Events fed to `triggerQuestEvent`; drive quest progress + feedback hooks. */
export enum GameEvent {
  Pickup = "pickup",
  Harvest = "harvest",
  Refuel = "refuel",
  Craft = "craft",
  Build = "build",
  Talk = "talk",
  Consume = "consume",
  Boil = "boil",
  StatusApplied = "status_applied",
  StatusExpired = "status_expired",
}

/** Singleton entity ids that systems look up by name. */
export enum EntityId {
  Player = "player",
  Campfire = "campfire",
  NpcVane = "npc_vane",
}

/**
 * Keys into `gameState.rpg.skills`. `Combat` is optional — the backend may not define
 * it yet, so writers must treat its absence as a safe no-op (see the engine's
 * `awardCombatXp`).
 */
export enum SkillKey {
  Lumberjacking = "lumberjacking",
  Mining = "mining",
  Evade = "evade",
  Combat = "combat",
  FellSweep = "fellSweep",
  KiteCombo = "kiteCombo",
}

/** Logical input actions resolved through `InputResource.bindings`. */
export enum InputAction {
  MoveUp = "MOVE_UP",
  MoveDown = "MOVE_DOWN",
  MoveLeft = "MOVE_LEFT",
  MoveRight = "MOVE_RIGHT",
  Harvest = "HARVEST",
  FocusedGather = "FOCUSED_GATHER",
  Console = "CONSOLE",
  Sprint = "SPRINT",
}

/** localStorage keys (note: the persisted prefix is "ashenmoor", not -moon). */
export const StorageKeys = {
  inputBindings: "ashenmoor_input_bindings",
  uiPreferences: "ashenmoor_ui_preferences",
  survival: "ashenmoor_survival",
  rpg: "ashenmoor_rpg",
  statuses: "ashenmoor_statuses",
  knowledge: "ashenmoor_knowledge",
  recipes: "ashenmoor_recipes",
  audio: "ashenmoor_audio",
  panelPositions: "ashenmoor_panel_positions",
} as const;
