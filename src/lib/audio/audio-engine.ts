/**
 * The mixer + voice host. Owns the single AudioContext and the routing graph:
 *
 *   voice -> voiceGain -> [panner?] -> busGain -> master -> compressor -> out
 *
 * Everything routes through a category bus and the master, so volume, mute, and
 * spatialization are global properties of the graph rather than per-sound code.
 * `playSound` is the only entry point gameplay needs. Framework-free and
 * SSR/test safe: with no AudioContext available, every call is a silent no-op.
 */

import { SOUNDS, type Bus, type SoundId, type AmbientBiome, type SoundDef } from "./sound-manifest";
import { RECIPES } from "./recipes";
import { getSampleBuffer, preloadSamples } from "./sample-loader";
import { shouldThrottle, spatialGainPan, type Vec2 } from "./spatial";
import type { RecipeParams } from "./recipes";

const ORDERED_BUSES: Bus[] = ["music", "sfx", "ui", "ambient", "entities"];
/** Soft cap: at most this many voices may start within VOICE_WINDOW_MS. */
const VOICE_WINDOW_MS = 60;
const MAX_VOICES_PER_WINDOW = 16;

interface Engine {
  ctx: AudioContext;
  master: GainNode;
  buses: Record<Bus, GainNode>;
}

let engine: Engine | null = null;
let initFailed = false;
let muted = false;
let masterVolume = 0.8;
const busVolumes: Record<Bus, number> = {
  music: 0.5,
  sfx: 0.8,
  ui: 0.7,
  ambient: 0.65,
  entities: 0.8,
};
const listener: Vec2 = { x: 0, y: 0 };
const lastPlayed = new Map<string, number>();
const recentVoices: number[] = [];
let ambientTimer = 1.5;

function ensureEngine(): Engine | null {
  if (engine) return engine;
  if (initFailed) return null;
  const AC =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AC) {
    initFailed = true;
    return null;
  }
  const ctx = new AC();
  const compressor = ctx.createDynamicsCompressor();
  const master = ctx.createGain();
  master.gain.value = muted ? 0 : masterVolume;
  master.connect(compressor);
  compressor.connect(ctx.destination);

  const buses = {} as Record<Bus, GainNode>;
  for (const bus of ORDERED_BUSES) {
    const gain = ctx.createGain();
    gain.gain.value = busVolumes[bus];
    gain.connect(master);
    buses[bus] = gain;
  }
  engine = { ctx, master, buses };
  void preloadSamples(ctx);
  return engine;
}

/** Resume the context. Call from the first user gesture (autoplay policy). */
export function unlock(): void {
  const e = ensureEngine();
  if (e && e.ctx.state === "suspended") void e.ctx.resume();
}

/** Listener position (player center), pushed each frame by the engine. */
export function setListener(x: number, y: number): void {
  listener.x = x;
  listener.y = y;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (engine) engine.master.gain.value = value ? 0 : masterVolume;
}

export function setBusVolume(bus: Bus | "master", value: number): void {
  const v = Math.max(0, Math.min(1, value));
  if (bus === "master") {
    masterVolume = v;
    if (engine && !muted) engine.master.gain.value = v;
    return;
  }
  busVolumes[bus] = v;
  if (engine) engine.buses[bus].gain.value = v;
}

export interface PlayOpts {
  /** World position for spatial sounds. */
  position?: Vec2;
  /** Extra gain multiplier on top of the manifest/spatial gain. */
  gain?: number;
  /** Detune in cents (samples only). */
  pitch?: number;
  /** Forwarded to the recipe (e.g. combo `stacks`). */
  params?: RecipeParams;
  /** Key-value pairs for conditional sound variations. */
  conditions?: Record<string, string | number | boolean>;
}

/** Evaluate current conditions against variations defined in SoundDef. First match wins. */
export function resolveSoundDef(
  def: SoundDef,
  conditions?: Record<string, string | number | boolean>,
) {
  const pitchJitter = def.pitchJitter ?? 0;
  const gainJitter = def.gainJitter ?? 0;
  const baseGain = def.gain ?? 1;

  if (def.variations && conditions) {
    for (const variant of def.variations) {
      let matches = true;
      for (const [key, value] of Object.entries(variant.conditions)) {
        if (conditions[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        return {
          recipe: variant.recipe ?? def.recipe,
          sample: variant.sample ?? def.sample,
          gain: variant.gain ?? baseGain,
          pitchJitter: variant.pitchJitter ?? pitchJitter,
          gainJitter: variant.gainJitter ?? gainJitter,
        };
      }
    }
  }

  return {
    recipe: def.recipe,
    sample: def.sample,
    gain: baseGain,
    pitchJitter,
    gainJitter,
  };
}

/** Play a sound by event id. Silent no-op when muted, throttled, or capped. */
export function playSound(id: SoundId, opts: PlayOpts = {}): void {
  if (muted) return;
  const def = SOUNDS[id];
  if (!def) return;
  const e = ensureEngine();
  if (!e) return;

  const ctx = e.ctx;
  const nowMs = ctx.currentTime * 1000;
  if (shouldThrottle(lastPlayed, id, def.throttleMs, nowMs)) return;
  while (recentVoices.length > 0 && nowMs - (recentVoices[0] ?? nowMs) > VOICE_WINDOW_MS) recentVoices.shift();
  if (recentVoices.length >= MAX_VOICES_PER_WINDOW) return;

  // Resolve conditional overrides
  const resolved = resolveSoundDef(def, opts.conditions);

  const voiceGain = ctx.createGain();
  let spatialGain = 1;
  if (def.spatial && opts.position) {
    const sp = spatialGainPan(listener, opts.position);
    if (sp.gain <= 0.001) return; // inaudible — skip without claiming a voice slot
    spatialGain = sp.gain;
    const panner = ctx.createStereoPanner();
    panner.pan.value = sp.pan;
    voiceGain.connect(panner);
    panner.connect(e.buses[def.bus]);
  } else {
    voiceGain.connect(e.buses[def.bus]);
  }

  // Calculate final gain with options, resolved base, and random volume jitter
  let finalGain = (opts.gain ?? resolved.gain) * spatialGain;
  if (resolved.gainJitter > 0) {
    const jitter = (Math.random() * 2 - 1) * resolved.gainJitter;
    finalGain *= (1 + jitter);
  }
  voiceGain.gain.value = finalGain;

  lastPlayed.set(id, nowMs);
  recentVoices.push(nowMs);

  const buffer = getSampleBuffer(resolved.sample);
  if (buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    
    // Apply pitch detune + random pitch jitter detune
    let detuneValue = opts.pitch ?? 0;
    if (resolved.pitchJitter > 0) {
      detuneValue += (Math.random() * 2 - 1) * resolved.pitchJitter;
    }
    src.detune.value = detuneValue;
    
    src.connect(voiceGain);
    src.start();
  } else {
    RECIPES[resolved.recipe]({ ctx, out: voiceGain, now: ctx.currentTime, rng: Math.random }, opts.params);
  }
}

/** Biome-driven ambient scheduler (moved here from the VFX system). */
export function tickAmbient(dt: number, biome: AmbientBiome): void {
  ambientTimer -= dt;
  if (ambientTimer > 0) return;
  switch (biome) {
    case "forest":
      playSound("ambient.bird");
      ambientTimer = 3 + Math.random() * 5;
      break;
    case "frost":
      playSound("ambient.wind");
      ambientTimer = 3.5 + Math.random() * 4;
      break;
    case "water":
      playSound("ambient.water");
      ambientTimer = 1.5 + Math.random() * 2.5;
      break;
    default:
      ambientTimer = 3;
  }
}
