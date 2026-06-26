/**
 * The event vocabulary. Gameplay code names *what happened* ("gather.chop"),
 * never how it sounds — this table owns the routing, throttle, spatial flag,
 * and which recipe (or, once a file exists, which sample) voices it. Adding a
 * sound is one entry here; promoting it to a real sample is one `sample` field.
 */

import type { GatherSoundKey } from "$lib/domain/gathering/gatherables";
import type { RecipeId } from "./recipes";

export type Bus = "music" | "sfx" | "ui" | "ambient" | "entities";

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
  | "consume"
  | "station.boil"
  | "player.swing"
  | "player.footstep"
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
  | "wolf.howl.distant";

export const SOUNDS: Record<SoundId, SoundDef> = {
  "gather.chop": { bus: "sfx", recipe: "chop", spatial: true, throttleMs: 60, pitchJitter: 120, gainJitter: 0.1 },
  "gather.strike": { bus: "sfx", recipe: "clink", spatial: true, throttleMs: 60, pitchJitter: 100, gainJitter: 0.1 },
  "gather.dig": { bus: "sfx", recipe: "pickup", spatial: true, throttleMs: 60, pitchJitter: 80, gainJitter: 0.1 },
  "node.deplete": { bus: "sfx", recipe: "deplete", spatial: true, pitchJitter: 80 },
  "node.treefall": { bus: "sfx", recipe: "fall", spatial: true, pitchJitter: 150 },
  "combat.hit.player": { bus: "sfx", recipe: "fall", spatial: true, throttleMs: 80, pitchJitter: 120, gainJitter: 0.12 },
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
  craft: { bus: "ui", recipe: "craft", pitchJitter: 50 },
  consume: { bus: "sfx", recipe: "pickup", pitchJitter: 100, gainJitter: 0.1 },
  "station.boil": { bus: "sfx", recipe: "water", throttleMs: 200, pitchJitter: 80 },
  "player.swing": {
    bus: "sfx",
    recipe: "chop",
    throttleMs: 60,
    pitchJitter: 120,
    gainJitter: 0.08,
    variations: [
      { conditions: { weaponCategory: "knife" },   recipe: "crosscut", gain: 1.0, pitchJitter: 100 },
      { conditions: { weaponCategory: "spear" },   recipe: "crosscut", gain: 0.9, pitchJitter: 140 },
      { conditions: { weaponCategory: "axe" },     recipe: "chop",     gain: 1.3, pitchJitter: 80  },
      { conditions: { weaponCategory: "weapon" },  recipe: "crosscut", gain: 1.1 },
      { conditions: { weaponCategory: "tool" },    recipe: "chop",     gain: 1.0 },
      { conditions: { weaponCategory: "unarmed" }, recipe: "pickup",   gain: 0.6 },
    ],
  },
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
  "wolf.howl.distant": { bus: "entities", recipe: "wind", throttleMs: 30_000, gain: 0.6 },
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
