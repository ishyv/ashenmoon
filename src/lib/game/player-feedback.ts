/**
 * Tiny feedback bus from game-state modules to the canvas. Survival/status/
 * consume modules know *that* something should be shown over the player, but
 * only the engine owns the Pixi layer — it registers the sink at init.
 *
 * WHY not import the engine directly: state modules (`*.svelte.ts`) must stay
 * importable by tests and UI without dragging Pixi along.
 */

export type FeedbackTone = "info" | "good" | "warning" | "danger";

export type PlayerFeedbackSink = (text: string, tone: FeedbackTone) => void;

let sink: PlayerFeedbackSink | null = null;

export function registerPlayerFeedback(next: PlayerFeedbackSink | null): void {
  sink = next;
}

/** Show a floating message over the player. Safe no-op before the engine registers. */
export function emitPlayerFeedback(text: string, tone: FeedbackTone = "info"): void {
  sink?.(text, tone);
}

/**
 * Player hp changes also route through here: the engine's player entity is the
 * hp source of truth (it mirrors into rpgState each frame), so state modules
 * hand deltas to the engine instead of writing health themselves.
 */
export type PlayerHpSink = (delta: number) => void;

let hpSink: PlayerHpSink | null = null;

export function registerPlayerHp(next: PlayerHpSink | null): void {
  hpSink = next;
}

/** Apply an hp change to the player (negative = damage). No-op before engine init. */
export function emitPlayerHpDelta(delta: number): void {
  if (delta !== 0) hpSink?.(delta);
}
