/**
 * Procedural Audio Synthesizer for Ashenmoor Wilderness.
 * Uses the Web Audio API to generate game sound effects dynamically,
 * avoiding the need for large audio asset downloads and eliminating latency.
 */

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

/**
 * Initializes the AudioContext lazily.
 * Browsers block audio until the user interacts with the page; this should
 * be triggered on user action (input key, click, etc.).
 */
function getAudioContext(): AudioContext | null {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    // Standard audio context setup
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx?.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

/** Toggles SFX on/off. */
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;
  if (!enabled && audioCtx) {
    void audioCtx.suspend();
  }
}

/** Returns whether sound effects are currently enabled. */
export function getSoundEnabled(): boolean {
  return soundEnabled;
}

/**
 * Creates low-pass filtered noise to simulate friction/rustling.
 * Helper for complex physical sounds like wood cutting or falling.
 */
function playNoise(ctx: AudioContext, duration: number, cutoff: number, gainVal: number): void {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Fill buffer with random white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, ctx.currentTime);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gainVal, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  noiseNode.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  noiseNode.start();
  noiseNode.stop(ctx.currentTime + duration);
}

/**
 * Plays a wooden chop sound (for woodcutting).
 * Combines low-pitched sweeping triangle wave with filtered white noise.
 */
export function playChopSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.15;
  const p = 0.88 + Math.random() * 0.24;

  // 1. Tonal "thud" using triangle wave
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "triangle";
  // Rapid pitch slide down
  osc.frequency.setValueAtTime(120 * p, now);
  osc.frequency.exponentialRampToValueAtTime(40 * p, now + duration);

  gainNode.gain.setValueAtTime(0.4, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  // 2. High-frequency crack using noise burst
  playNoise(ctx, 0.08, 1200, 0.25);
}

/**
 * Plays a metallic clink sound (for mining ores).
 * Combines two high-pitched sine waves with very fast exponential decays.
 */
export function playClinkSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 0.25;
  const p = 0.88 + Math.random() * 0.24;

  // Primary ring tone
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(1400 * p, now);
  gain1.gain.setValueAtTime(0.35, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Secondary metallic frequency/overtone
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(2100 * p, now);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + duration);

  osc2.start(now);
  osc2.stop(now + 0.12);
}

/**
 * Plays a rumbling, sweeping sound for a falling tree.
 * Swipes pitch downwards with low-frequency noise.
 */
export function playFallSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const duration = 1.2;
  const p = 0.88 + Math.random() * 0.24;

  // Sweeping low frequency oscillator
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(80 * p, now);
  osc.frequency.linearRampToValueAtTime(20 * p, now + duration);

  // Filter out harsh highs
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(150, now);

  gainNode.gain.setValueAtTime(0.3, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  // Leaf rustling noise overlay
  playNoise(ctx, duration * 0.8, 600, 0.18);
}

/**
 * Plays a satisfying popup/depletion chime when a node is fully harvested.
 * A quick upward chime using two ascending sine sweeps.
 */
export function playDepleteSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const p = 0.88 + Math.random() * 0.24;

  // Ascending note 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(320 * p, now);
  osc1.frequency.linearRampToValueAtTime(640 * p, now + 0.15);
  gain1.gain.setValueAtTime(0.2, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  // Ascending note 2 (delayed slightly)
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(480 * p, now + 0.08);
  osc2.frequency.linearRampToValueAtTime(960 * p, now + 0.23);
  gain2.gain.setValueAtTime(0.25, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);

  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + 0.18);

  osc2.start(now + 0.08);
  osc2.stop(now + 0.28);
}

/** Plays a rustle/pop sound for picking up ground resources. */
export function playPickupSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.12;
  const p = 0.88 + Math.random() * 0.24;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(600 * p, now);
  osc.frequency.exponentialRampToValueAtTime(300 * p, now + duration);
  gainNode.gain.setValueAtTime(0.2, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
  playNoise(ctx, 0.06, 800, 0.15);
}

/** Plays a metallic clink sound for successful tool crafting. */
export function playCraftSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const duration = 0.4;
  const p = 0.88 + Math.random() * 0.24;
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880 * p, now);
  osc1.frequency.exponentialRampToValueAtTime(440 * p, now + duration);
  gain1.gain.setValueAtTime(0.3, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(220 * p, now);
  gain2.gain.setValueAtTime(0.15, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(now);
  osc1.stop(now + duration);
  osc2.start(now);
  osc2.stop(now + 0.2);
}

/** Plays a procedural bird chirp for Meadows/CrimsonGrove ambient. */
export function playBirdChirp(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const p = 0.85 + Math.random() * 0.3;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  const base = 1800 * p;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.linearRampToValueAtTime(base * 1.4, now + 0.06);
  osc.frequency.linearRampToValueAtTime(base * 0.9, now + 0.14);
  gain.gain.setValueAtTime(0.04, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
}

/** Plays a soft wind gust for Frostbane/ScorchedWastes ambient. */
export function playWindGust(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const duration = 0.7 + Math.random() * 0.5;
  playNoise(ctx, duration, 600 + Math.random() * 400, 0.04 + Math.random() * 0.025);
}

/** Plays a subtle water/bubble sound for Water/FungalMire ambient. */
export function playWaterBubble(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const p = 0.9 + Math.random() * 0.2;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(280 * p, now);
  osc.frequency.exponentialRampToValueAtTime(140 * p, now + 0.14);
  gain.gain.setValueAtTime(0.055, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.18);
  playNoise(ctx, 0.09, 450, 0.025);
}
