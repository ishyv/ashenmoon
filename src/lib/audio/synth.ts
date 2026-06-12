/**
 * Procedural synthesis primitives. Every recipe builds from these two helpers
 * instead of hand-wiring oscillators, which is what kept the old per-sound
 * functions at ~20 lines each. The crucial difference from the legacy code:
 * a primitive connects to the voice's `out` node (a bus-routed gain), never to
 * `ctx.destination` — that is what lets buses, volume, and spatialization work.
 */

export interface Voice {
  ctx: AudioContext;
  /** Bus-routed output node the primitive connects into. */
  out: AudioNode;
  /** Start time (ctx.currentTime) for the voice. */
  now: number;
  rng: () => number;
}

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Frequency to glide to over `dur`. */
  sweepTo?: number;
  sweepShape?: "exp" | "lin";
  /** Optional lowpass cutoff to shape the timbre. */
  cutoff?: number;
  gain?: number;
  dur: number;
  /** Offset from voice start, seconds. */
  delay?: number;
}

/** A single oscillator with a gain envelope that decays to silence over `dur`. */
export function tone(v: Voice, o: ToneOpts): void {
  const { ctx, out } = v;
  const start = v.now + (o.delay ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, start);
  if (o.sweepTo !== undefined) {
    if ((o.sweepShape ?? "exp") === "lin") osc.frequency.linearRampToValueAtTime(o.sweepTo, start + o.dur);
    else osc.frequency.exponentialRampToValueAtTime(o.sweepTo, start + o.dur);
  }
  gain.gain.setValueAtTime(o.gain ?? 0.2, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + o.dur);

  if (o.cutoff !== undefined) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(o.cutoff, start);
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(out);
  osc.start(start);
  osc.stop(start + o.dur);
}

export interface NoiseOpts {
  dur: number;
  cutoff: number;
  gain: number;
  delay?: number;
}

/** Lowpass-filtered white noise burst — friction, rustle, impact texture. */
export function noise(v: Voice, o: NoiseOpts): void {
  const { ctx, out } = v;
  const start = v.now + (o.delay ?? 0);
  const size = Math.max(1, Math.floor(ctx.sampleRate * o.dur));
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(o.cutoff, start);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(o.gain, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + o.dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  src.start(start);
  src.stop(start + o.dur);
}
