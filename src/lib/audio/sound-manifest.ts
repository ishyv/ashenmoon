/**
 * The event vocabulary. Gameplay code names *what happened* ("gather.chop"),
 * never how it sounds — this table owns the routing, throttle, spatial flag,
 * and which recipe (or, once a file exists, which sample) voices it. Adding a
 * sound is one entry here; promoting it to a real sample is one `sample` field.
 */

import type { GatherSoundKey } from "$lib/domain/gathering/gatherables";
import type { RecipeId } from "./recipes";

export type Bus = "sfx" | "ambient" | "ui" | "music";

/** Coarse biome for the ambient scheduler (engine maps Cell -> this). */
export type AmbientBiome = "forest" | "frost" | "water" | "none";

export interface SoundDef {
  bus: Bus;
  recipe: RecipeId;
  /** Attenuate + pan by world position relative to the player listener. */
  spatial?: boolean;
  /** Minimum ms between retriggers of this sound (drops spam). */
  throttleMs?: number;
  /** Base gain multiplier (before spatial/opts gain). */
  gain?: number;
  /** Sample file under static/audio/; when loaded it wins over the recipe. */
  sample?: string | string[];
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
  | "combo.driving_thrust.denied";

export const SOUNDS: Record<SoundId, SoundDef> = {
  "gather.chop": { bus: "sfx", recipe: "chop", spatial: true, throttleMs: 60 },
  "gather.strike": { bus: "sfx", recipe: "clink", spatial: true, throttleMs: 60 },
  "gather.dig": { bus: "sfx", recipe: "pickup", spatial: true, throttleMs: 60 },
  "node.deplete": { bus: "sfx", recipe: "deplete", spatial: true },
  "node.treefall": { bus: "sfx", recipe: "fall", spatial: true },
  "combat.hit.player": { bus: "sfx", recipe: "fall", spatial: true, throttleMs: 80 },
  "combat.hit.enemy": { bus: "sfx", recipe: "clink", spatial: true, throttleMs: 50 },
  "enemy.death": { bus: "sfx", recipe: "deplete", spatial: true },
  pickup: { bus: "sfx", recipe: "pickup" },
  craft: { bus: "ui", recipe: "craft" },
  consume: { bus: "sfx", recipe: "pickup" },
  "station.boil": { bus: "sfx", recipe: "water", throttleMs: 200 },
  "player.swing": { bus: "sfx", recipe: "chop", throttleMs: 60 },
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
