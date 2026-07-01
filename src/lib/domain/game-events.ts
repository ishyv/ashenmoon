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

/** UI-layer keyboard actions dispatched through `UIInputController`. */
export type UIAction =
  | 'toggle_inventory'
  | 'toggle_crafting'
  | 'toggle_skills'
  | 'toggle_equipment'
  | 'toggle_quests'
  | 'close_panel'
  | 'menu_up'
  | 'menu_down'
  | 'menu_select'
  | 'menu_back'
  | 'menu_danger'
  | 'toggle_env_inspector'
  | 'toggle_fullscreen'
  | 'hotbar_1' | 'hotbar_2' | 'hotbar_3' | 'hotbar_4' | 'hotbar_5'
  | 'hotbar_6' | 'hotbar_7' | 'hotbar_8' | 'hotbar_9';

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
  /** Held weapon-stance modifier (Ctrl by default); unlocks stance attacks. */
  StanceModifier = "STANCE_MODIFIER",
}

/** localStorage keys (note: the persisted prefix is "ashenmoor", not -moon). */
export const StorageKeys = {
  inputBindings: "ashenmoor_input_bindings",
  uiPreferences: "ashenmoor_ui_preferences",
  survival: "ashenmoor_survival",
  rpg: "ashenmoor_rpg",
  statuses: "ashenmoor_statuses",
  wounds: "ashenmoor_wounds",
  knowledge: "ashenmoor_knowledge",
  recipes: "ashenmoor_recipes",
  audio: "ashenmoor_audio",
  panelPositions: "ashenmoor_panel_positions",
  itemSources: "ashenmoor_item_sources",
} as const;
