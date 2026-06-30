/**
 * The event vocabulary. Gameplay code names *what happened* ("gather.chop"),
 * never how it sounds — this table owns the routing, throttle, spatial flag,
 * and which recipe (or, once a file exists, which sample) voices it. Adding a
 * sound is one entry here; promoting it to a real sample is one `sample` field.
 */

import type { GatherSoundKey } from "$lib/domain/gathering/gatherables";
import type { RecipeId } from "./recipes";

export type Bus = "music" | "sfx" | "ui" | "ambient" | "entities";
export type AudioBusId = "master" | Bus;
export const AUDIO_BUS_IDS: readonly AudioBusId[] = ["master", "music", "sfx", "ui", "ambient", "entities"];

/** Coarse biome for the ambient scheduler (engine maps Cell -> this). */
export type AmbientBiome = "forest" | "frost" | "water" | "none";

export interface SoundVariation {
  /** The conditions required for this variation to match. All specified keys must match. */
  conditions: Record<string, string | number | boolean>;
  /** Recipe override. */
  recipe?: RecipeId;
  /** Sample file(s) override. */
  sample?: string | string[];
  /** Volume gain override. */
  gain?: number;
  /** Pitch jitter in cents (detune) override. */
  pitchJitter?: number;
  /** Gain jitter multiplier scale override. */
  gainJitter?: number;
}

export interface SoundLayerDefinition {
  /** Child sound to trigger as part of a layered parent. */
  soundId: SoundId;
  /** Delay relative to the parent play request. */
  delayMs?: number;
  /** Gain multiplier applied only to this layer. */
  gain?: number;
  /** Detune in cents applied only to this layer. */
  pitch?: number;
  /** Conditional override forwarded to the child sound. */
  conditions?: Record<string, string | number | boolean>;
}

export interface SoundDef {
  bus: Bus;
  recipe: RecipeId;
  /** Attenuate + pan by world position relative to the player listener. */
  spatial?: boolean;
  /** Minimum ms between retriggers of this sound (drops spam). */
  throttleMs?: number;
  /** Base gain multiplier (before spatial/opts gain). */
  gain?: number;
  /** Pitch jitter in cents (detune), e.g. 100 detunes randomly within [-100, 100] cents. */
  pitchJitter?: number;
  /** Gain jitter multiplier scale, e.g. 0.1 jitters randomly within [0.9, 1.1] scale. */
  gainJitter?: number;
  /** Sample file under static/audio/; when loaded it wins over the recipe. */
  sample?: string | string[];
  /** Conditional variations. Evaluated in order; first match wins. */
  variations?: SoundVariation[];
  /** Ordered child sounds used to build a physical event from multiple textures. */
  layers?: readonly SoundLayerDefinition[];
  /** Suggested cadence for generated loop fallbacks. Samples loop natively. */
  loopIntervalMs?: number;
  /** Stable grouping for validation, tooling, and future mix passes. */
  tags?: readonly string[];
}

export type SoundId =
  | "gather.chop"
  | "gather.strike"
  | "gather.dig"
  | "node.deplete"
  | "node.treefall"
  | "combat.hit.player"
  | "combat.hit.enemy"
  | "enemy.death"
  | "pickup"
  | "craft"
  | "craft.success"
  | "craft.failure"
  | "craft.bind"
  | "craft.cut"
  | "craft.crush"
  | "craft.cook.meat"
  | "craft.cook.sizzle"
  | "recipe.discovered"
  | "consume"
  | "station.boil"
  | "station.rack.place"
  | "player.swing"
  | "player.swing.light"
  | "player.swing.heavy"
  | "combat.miss.air"
  | "combat.glancing"
  | "impact.wood.light"
  | "impact.wood.heavy"
  | "impact.stone"
  | "impact.flesh"
  | "impact.hide"
  | "impact.bone"
  | "gather.leaves"
  | "gather.branch.snap"
  | "gather.stone.pickup"
  | "gather.clay.pull"
  | "gather.water.collect"
  | "gather.fiber.pull"
  | "gather.bark.peel"
  | "player.footstep"
  | "ui.button.click"
  | "ui.tab.switch"
  | "ui.invalid"
  | "ui.panel.open"
  | "ui.panel.close"
  | "ui.inventory.click"
  | "ui.inventory.equip"
  | "player.fellsweep"
  | "player.fellsweep.charge.brace"
  | "player.fellsweep.charge.pulse"
  | "player.fellsweep.charge.full"
  | "player.fellsweep.release.low"
  | "player.fellsweep.release.mid"
  | "player.fellsweep.release.high"
  | "player.fellsweep.denied"
  | "player.fellsweep.cancel"
  | "focused.activate"
  | "build.place"
  | "campfire.ignite"
  | "campfire.loop"
  | "campfire.low"
  | "campfire.extinguish"
  | "rain.loop"
  | "wind.loop"
  | "river.loop"
  | "night.ambience"
  | "ambient.bird"
  | "ambient.wind"
  | "ambient.water"
  | "player.levelup"
  | "combo.kite"
  | "combo.momentum.activate"
  | "combo.momentum.stack"
  | "combo.momentum.break"
  | "combo.momentum.overload"
  | "combo.crosscut"
  | "combo.crosscut.excellent"
  | "combo.crosscut.bleed"
  | "combo.driving_thrust"
  | "combo.driving_thrust.hit"
  | "combo.driving_thrust.denied"
  | "wolf.howl.distant"
  | "wolf.growl.close"
  | "boar.snort"
  | "boar.charge"
  | "rabbit.flee"
  | "deer.alert"
  | "skill.ready"
  | "hotbar.bind"
  | "hotbar.reorder"
  | "hotbar.unbind"
  | "hotbar.activate.empty";

export const SOUNDS: Record<SoundId, SoundDef> = {
  "gather.chop": {
    bus: "sfx",
    recipe: "chop",
    spatial: true,
    throttleMs: 60,
    pitchJitter: 120,
    gainJitter: 0.1,
    layers: [
      { soundId: "impact.wood.light", gain: 0.9 },
      { soundId: "gather.leaves", delayMs: 35, gain: 0.45 },
    ],
    tags: ["gather", "wood", "legacy"],
  },
  "gather.strike": {
    bus: "sfx",
    recipe: "clink",
    spatial: true,
    throttleMs: 60,
    pitchJitter: 100,
    gainJitter: 0.1,
    layers: [
      { soundId: "impact.stone", gain: 0.9 },
      { soundId: "gather.stone.pickup", delayMs: 45, gain: 0.35 },
    ],
    tags: ["gather", "stone", "legacy"],
  },
  "gather.dig": {
    bus: "sfx",
    recipe: "pickup",
    spatial: true,
    throttleMs: 60,
    pitchJitter: 80,
    gainJitter: 0.1,
    layers: [{ soundId: "gather.clay.pull", gain: 0.9 }],
    tags: ["gather", "earth", "legacy"],
  },
  "node.deplete": { bus: "sfx", recipe: "deplete", spatial: true, pitchJitter: 80, tags: ["gather", "depletion"] },
  "node.treefall": { bus: "sfx", recipe: "fall", spatial: true, pitchJitter: 150 },
  "combat.hit.player": {
    bus: "sfx",
    recipe: "fall",
    spatial: true,
    throttleMs: 80,
    pitchJitter: 120,
    gainJitter: 0.12,
    layers: [{ soundId: "impact.flesh", gain: 0.9 }],
  },
  "combat.hit.enemy": {
    bus: "entities",
    recipe: "clink",
    spatial: true,
    throttleMs: 50,
    pitchJitter: 140,
    gainJitter: 0.12,
    variations: [
      { conditions: { targetSpecies: "wolf" }, recipe: "chop", gain: 1.1 },
      { conditions: { targetSpecies: "boar" }, recipe: "fall", gain: 1.2 },
      { conditions: { targetSpecies: "deer" }, recipe: "pickup", gain: 0.9 },
      { conditions: { targetSpecies: "rabbit" }, recipe: "pickup", gain: 0.7 },
    ],
  },
  "enemy.death": { bus: "entities", recipe: "deplete", spatial: true, pitchJitter: 100 },
  pickup: { bus: "sfx", recipe: "pickup", pitchJitter: 80, gainJitter: 0.08 },
  craft: { bus: "ui", recipe: "craft", pitchJitter: 50, layers: [{ soundId: "craft.success", gain: 0.85 }], tags: ["craft", "legacy"] },
  "craft.success": {
    bus: "sfx",
    recipe: "craft",
    pitchJitter: 70,
    gainJitter: 0.08,
    layers: [
      { soundId: "craft.bind", gain: 0.55 },
      { soundId: "gather.bark.peel", delayMs: 45, gain: 0.35 },
      { soundId: "ui.tab.switch", delayMs: 90, gain: 0.35 },
    ],
    tags: ["craft", "success", "layered"],
  },
  "craft.failure": { bus: "sfx", recipe: "craftFail", pitchJitter: 90, gainJitter: 0.08, tags: ["craft", "failure"] },
  "craft.bind": { bus: "sfx", recipe: "fiberPull", pitchJitter: 110, gainJitter: 0.1, tags: ["craft", "fiber"] },
  "craft.cut": { bus: "sfx", recipe: "missAir", pitchJitter: 130, gainJitter: 0.08, tags: ["craft", "cut"] },
  "craft.crush": {
    bus: "sfx",
    recipe: "gritScatter",
    pitchJitter: 90,
    gainJitter: 0.1,
    layers: [{ soundId: "impact.stone", gain: 0.35 }],
    tags: ["craft", "stone", "herb"],
  },
  "craft.cook.meat": { bus: "sfx", recipe: "campfireCrackle", pitchJitter: 60, gainJitter: 0.08, tags: ["craft", "meat", "fire"] },
  "craft.cook.sizzle": { bus: "sfx", recipe: "campfireCrackle", gain: 0.45, loopIntervalMs: 500, tags: ["craft", "fire", "loop"] },
  "recipe.discovered": { bus: "ui", recipe: "discovery", throttleMs: 120, pitchJitter: 45, gain: 0.75, tags: ["ui", "recipe"] },
  consume: { bus: "sfx", recipe: "pickup", pitchJitter: 100, gainJitter: 0.1 },
  "station.boil": { bus: "sfx", recipe: "waterCollect", throttleMs: 200, pitchJitter: 80, tags: ["station", "water"] },
  "station.rack.place": { bus: "sfx", recipe: "fiberPull", throttleMs: 120, pitchJitter: 80, gain: 0.65, tags: ["station", "rack"] },
  "player.swing": {
    bus: "sfx",
    recipe: "chop",
    throttleMs: 60,
    pitchJitter: 120,
    gainJitter: 0.08,
    variations: [
      { conditions: { sourceProfileId: "knife" },   recipe: "crosscut", gain: 1.0, pitchJitter: 100 },
      { conditions: { sourceProfileId: "spear" },   recipe: "crosscut", gain: 0.9, pitchJitter: 140 },
      { conditions: { sourceProfileId: "axe" },     recipe: "chop",     gain: 1.3, pitchJitter: 80  },
      { conditions: { sourceProfileId: "weapon" },  recipe: "crosscut", gain: 1.1 },
      { conditions: { sourceProfileId: "tool" },    recipe: "chop",     gain: 1.0 },
      { conditions: { sourceProfileId: "unarmed" }, recipe: "pickup",   gain: 0.6 },
    ],
  },
  "player.swing.light": { bus: "sfx", recipe: "missAir", throttleMs: 55, pitchJitter: 140, gainJitter: 0.08, tags: ["combat", "swing"] },
  "player.swing.heavy": {
    bus: "sfx",
    recipe: "chop",
    throttleMs: 75,
    pitchJitter: 90,
    gainJitter: 0.08,
    layers: [
      { soundId: "combat.miss.air", gain: 0.85 },
      { soundId: "impact.wood.light", delayMs: 45, gain: 0.2 },
    ],
    tags: ["combat", "swing", "heavy"],
  },
  "combat.miss.air": { bus: "sfx", recipe: "missAir", spatial: true, throttleMs: 70, pitchJitter: 150, gainJitter: 0.1, tags: ["combat", "miss"] },
  "combat.glancing": {
    bus: "sfx",
    recipe: "toolRebound",
    spatial: true,
    throttleMs: 90,
    pitchJitter: 120,
    gainJitter: 0.08,
    layers: [{ soundId: "gather.stone.pickup", delayMs: 30, gain: 0.35 }],
    tags: ["combat", "glancing"],
  },
  "impact.wood.light": {
    bus: "sfx",
    recipe: "woodBody",
    spatial: true,
    throttleMs: 45,
    pitchJitter: 115,
    gainJitter: 0.1,
    layers: [
      { soundId: "gather.bark.peel", delayMs: 24, gain: 0.55 },
      { soundId: "gather.leaves", delayMs: 58, gain: 0.32 },
    ],
    tags: ["impact", "wood"],
  },
  "impact.wood.heavy": {
    bus: "sfx",
    recipe: "woodBody",
    spatial: true,
    throttleMs: 65,
    pitchJitter: 85,
    gainJitter: 0.1,
    layers: [
      { soundId: "impact.wood.light", gain: 1.2 },
      { soundId: "gather.branch.snap", delayMs: 42, gain: 0.7 },
    ],
    tags: ["impact", "wood", "heavy"],
  },
  "impact.stone": {
    bus: "sfx",
    recipe: "stoneCrack",
    spatial: true,
    throttleMs: 55,
    pitchJitter: 95,
    gainJitter: 0.1,
    layers: [
      { soundId: "gather.stone.pickup", delayMs: 38, gain: 0.45 },
      { soundId: "combat.glancing", delayMs: 12, gain: 0.18 },
    ],
    tags: ["impact", "stone"],
  },
  "impact.flesh": {
    bus: "entities",
    recipe: "fleshWetHit",
    spatial: true,
    throttleMs: 60,
    pitchJitter: 110,
    gainJitter: 0.1,
    layers: [{ soundId: "impact.hide", delayMs: 22, gain: 0.35 }],
    tags: ["impact", "flesh"],
  },
  "impact.hide": { bus: "entities", recipe: "hideTension", spatial: true, throttleMs: 70, pitchJitter: 120, gainJitter: 0.08, tags: ["impact", "hide"] },
  "impact.bone": {
    bus: "entities",
    recipe: "boneDryCrack",
    spatial: true,
    throttleMs: 90,
    pitchJitter: 130,
    gainJitter: 0.08,
    tags: ["impact", "bone"],
  },
  "gather.leaves": { bus: "sfx", recipe: "leafRustle", spatial: true, throttleMs: 70, pitchJitter: 150, gainJitter: 0.12, tags: ["gather", "leaves"] },
  "gather.branch.snap": { bus: "sfx", recipe: "branchSnap", spatial: true, throttleMs: 80, pitchJitter: 130, gainJitter: 0.1, tags: ["gather", "wood"] },
  "gather.stone.pickup": { bus: "sfx", recipe: "gritScatter", spatial: true, throttleMs: 80, pitchJitter: 110, gainJitter: 0.1, tags: ["gather", "stone"] },
  "gather.clay.pull": { bus: "sfx", recipe: "clayPull", spatial: true, throttleMs: 90, pitchJitter: 90, gainJitter: 0.1, tags: ["gather", "clay"] },
  "gather.water.collect": { bus: "sfx", recipe: "waterCollect", spatial: true, throttleMs: 100, pitchJitter: 80, gainJitter: 0.08, tags: ["gather", "water"] },
  "gather.fiber.pull": { bus: "sfx", recipe: "fiberPull", spatial: true, throttleMs: 85, pitchJitter: 120, gainJitter: 0.1, tags: ["gather", "fiber"] },
  "gather.bark.peel": { bus: "sfx", recipe: "barkCrack", spatial: true, throttleMs: 80, pitchJitter: 135, gainJitter: 0.1, tags: ["gather", "bark"] },
  "player.footstep": {
    bus: "sfx",
    recipe: "pickup",
    throttleMs: 100,
    pitchJitter: 150,
    gainJitter: 0.12,
    variations: [
      { conditions: { terrain: "grass" }, recipe: "pickup", gain: 0.5 },
      { conditions: { terrain: "snow" }, recipe: "clink", gain: 0.4, pitchJitter: 200 },
      { conditions: { terrain: "mud" }, recipe: "water", gain: 0.6 },
    ],
  },
  "ui.button.click": { bus: "ui", recipe: "uiClick", throttleMs: 40, pitchJitter: 45, gainJitter: 0.05, gain: 0.65, tags: ["ui"] },
  "ui.tab.switch": { bus: "ui", recipe: "uiTab", throttleMs: 60, pitchJitter: 45, gainJitter: 0.05, gain: 0.65, tags: ["ui"] },
  "ui.invalid": { bus: "ui", recipe: "uiInvalid", throttleMs: 140, pitchJitter: 20, gain: 0.75, tags: ["ui", "invalid"] },
  "ui.panel.open": {
    bus: "ui",
    recipe: "craft",
    pitchJitter: 80,
    variations: [
      { conditions: { panelId: "inventory" }, recipe: "craft", gain: 1.0 },
      { conditions: { panelId: "settings" }, recipe: "clink", gain: 0.8 },
    ],
  },
  "ui.panel.close": {
    bus: "ui",
    recipe: "pickup",
    pitchJitter: 80,
    variations: [
      { conditions: { panelId: "inventory" }, recipe: "pickup", gain: 0.9 },
      { conditions: { panelId: "settings" }, recipe: "pickup", gain: 0.7 },
    ],
  },
  "ui.inventory.click": {
    bus: "ui",
    recipe: "pickup",
    pitchJitter: 80,
    gainJitter: 0.08,
    variations: [
      { conditions: { itemType: "weapon" }, recipe: "clink", gain: 0.8 },
      { conditions: { itemType: "tool" }, recipe: "clink", gain: 0.7 },
      { conditions: { itemType: "clothing" }, recipe: "pickup", gain: 0.5 },
    ],
  },
  "ui.inventory.equip": {
    bus: "ui",
    recipe: "craft",
    pitchJitter: 100,
    gainJitter: 0.1,
    variations: [
      { conditions: { itemType: "weapon" }, recipe: "clink", gain: 1.1 },
      { conditions: { itemType: "tool" }, recipe: "chop", gain: 0.9 },
      { conditions: { itemType: "clothing" }, recipe: "pickup", gain: 0.8 },
    ],
  },
  "player.fellsweep": { bus: "sfx", recipe: "fellSweepReleaseMid" },
  "player.fellsweep.charge.brace": { bus: "sfx", recipe: "fellSweepBrace", throttleMs: 120 },
  "player.fellsweep.charge.pulse": { bus: "sfx", recipe: "fellSweepPulse", throttleMs: 120 },
  "player.fellsweep.charge.full": { bus: "sfx", recipe: "fellSweepFull", throttleMs: 250 },
  "player.fellsweep.release.low": { bus: "sfx", recipe: "fellSweepReleaseLow" },
  "player.fellsweep.release.mid": { bus: "sfx", recipe: "fellSweepReleaseMid" },
  "player.fellsweep.release.high": { bus: "sfx", recipe: "fellSweepReleaseHigh" },
  "player.fellsweep.denied": { bus: "ui", recipe: "fellSweepDenied", throttleMs: 160 },
  "player.fellsweep.cancel": { bus: "sfx", recipe: "fellSweepCancel", throttleMs: 120 },
  "focused.activate": { bus: "sfx", recipe: "clink", spatial: true },
  "build.place": { bus: "ui", recipe: "craft" },
  "campfire.ignite": { bus: "ambient", recipe: "campfireIgnite", spatial: true, throttleMs: 250, pitchJitter: 70, gainJitter: 0.08, tags: ["environment", "fire"] },
  "campfire.loop": { bus: "ambient", recipe: "campfireCrackle", spatial: true, loopIntervalMs: 420, pitchJitter: 70, gainJitter: 0.12, gain: 0.72, tags: ["environment", "fire", "loop"] },
  "campfire.low": { bus: "ambient", recipe: "campfireLow", spatial: true, loopIntervalMs: 850, pitchJitter: 60, gainJitter: 0.1, gain: 0.55, tags: ["environment", "fire", "loop"] },
  "campfire.extinguish": { bus: "ambient", recipe: "campfireLow", spatial: true, throttleMs: 2000, gain: 0.7, tags: ["environment", "fire"] },
  "rain.loop": { bus: "ambient", recipe: "rainPulse", loopIntervalMs: 520, pitchJitter: 40, gainJitter: 0.08, gain: 0.58, tags: ["environment", "rain", "loop"] },
  "wind.loop": { bus: "ambient", recipe: "wind", loopIntervalMs: 760, pitchJitter: 30, gainJitter: 0.08, gain: 0.55, tags: ["environment", "wind", "loop"] },
  "river.loop": { bus: "ambient", recipe: "riverPulse", spatial: true, loopIntervalMs: 650, pitchJitter: 40, gainJitter: 0.08, gain: 0.62, tags: ["environment", "water", "loop"] },
  "night.ambience": { bus: "ambient", recipe: "nightBed", loopIntervalMs: 1200, pitchJitter: 30, gainJitter: 0.05, gain: 0.45, tags: ["environment", "night", "loop"] },
  "ambient.bird": { bus: "ambient", recipe: "bird" },
  "ambient.wind": { bus: "ambient", recipe: "wind" },
  "ambient.water": { bus: "ambient", recipe: "water" },
  "player.levelup": { bus: "ui", recipe: "momentumActivate", gain: 1.2 },
  "combo.kite": { bus: "sfx", recipe: "kite" },
  "combo.momentum.activate": { bus: "sfx", recipe: "momentumActivate" },
  "combo.momentum.stack": { bus: "sfx", recipe: "momentumStack" },
  "combo.momentum.break": { bus: "sfx", recipe: "momentumBreak" },
  "combo.momentum.overload": { bus: "sfx", recipe: "momentumOverload" },
  "combo.crosscut": { bus: "sfx", recipe: "crosscut", spatial: true, throttleMs: 60 },
  "combo.crosscut.excellent": { bus: "sfx", recipe: "crosscutExcellent", spatial: true, throttleMs: 80 },
  "combo.crosscut.bleed": { bus: "sfx", recipe: "crosscutBleed", spatial: true, throttleMs: 90 },
  "combo.driving_thrust": { bus: "sfx", recipe: "drivingThrust", spatial: true, throttleMs: 80 },
  "combo.driving_thrust.hit": { bus: "sfx", recipe: "drivingThrustHit", spatial: true, throttleMs: 60 },
  "combo.driving_thrust.denied": { bus: "ui", recipe: "fellSweepDenied", throttleMs: 160 },
  // TODO: replace recipe with a real wolf-howl sample when available.
  "wolf.howl.distant": { bus: "entities", recipe: "wind", spatial: true, throttleMs: 30_000, gain: 0.6, tags: ["entity", "wolf"] },
  "wolf.growl.close": { bus: "entities", recipe: "wolfGrowl", spatial: true, throttleMs: 2500, pitchJitter: 50, gainJitter: 0.08, gain: 0.9, tags: ["entity", "wolf"] },
  "boar.snort": { bus: "entities", recipe: "hideTension", spatial: true, throttleMs: 2200, pitchJitter: 80, gainJitter: 0.08, gain: 0.75, tags: ["entity", "boar"] },
  "boar.charge": { bus: "entities", recipe: "boarCharge", spatial: true, throttleMs: 1600, pitchJitter: 75, gainJitter: 0.1, gain: 1.0, tags: ["entity", "boar", "danger"] },
  "rabbit.flee": { bus: "entities", recipe: "animalFlee", spatial: true, throttleMs: 1200, pitchJitter: 140, gainJitter: 0.1, gain: 0.65, tags: ["entity", "rabbit"] },
  "deer.alert": { bus: "entities", recipe: "animalFlee", spatial: true, throttleMs: 1800, pitchJitter: 80, gainJitter: 0.08, gain: 0.75, tags: ["entity", "deer"] },
  // Played when a skill cooldown expires; recipe is closest available to a quiet settle.
  "skill.ready": { bus: "ui", recipe: "discovery", gain: 0.35, pitchJitter: 80, gainJitter: 0.1, throttleMs: 500, tags: ["hotbar", "skill"] },
  "hotbar.bind": { bus: "ui", recipe: "pickup", gain: 0.4, pitchJitter: 80, gainJitter: 0.1, throttleMs: 60, tags: ["hotbar"] },
  "hotbar.reorder": { bus: "ui", recipe: "pickup", gain: 0.25, pitchJitter: 120, gainJitter: 0.15, throttleMs: 60, tags: ["hotbar"] },
  // 'cloth' recipe does not exist; fiberPull is the closest tactile/soft-fabric sound.
  "hotbar.unbind": { bus: "ui", recipe: "fiberPull", gain: 0.3, pitchJitter: 100, gainJitter: 0.1, throttleMs: 60, tags: ["hotbar"] },
  "hotbar.activate.empty": { bus: "ui", recipe: "uiInvalid", gain: 0.35, pitchJitter: 60, gainJitter: 0.05, throttleMs: 200, tags: ["hotbar"] },
};

const GATHER_SOUND_IDS: Record<GatherSoundKey, SoundId> = {
  chop: "gather.chop",
  strike: "gather.strike",
  dig: "gather.dig",
};

/** Resolve a gatherable's declared sound key to its SoundId (defaults to strike). */
export function gatherSoundId(key?: GatherSoundKey): SoundId {
  return key ? GATHER_SOUND_IDS[key] : "gather.strike";
}
