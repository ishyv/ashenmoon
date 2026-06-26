<script lang="ts">
/**
 * One HUD stat bar. The fill width tracks value/max via a CSS transition whose
 * speed — plus an optional pop — is driven by the *kind* of the last change:
 *   - "drain": slow, smooth unfill (continuous costs like sprint).
 *   - "burst": fast snap + a scale/flash pop, "exploding to disappear" (instant
 *     chunk costs like dash / focused gathering).
 * Styled with premium gradients, diagonal stripes, and monospace text value readouts.
 */
interface Props {
  value: number;
  max: number;
  /** Kind of stat bar to apply custom styled gradients. */
  kind?: "hp" | "stamina" | "thirst" | "hunger";
  /** Fallback color if kind is not supplied. */
  fill?: string;
  /** Last spend event from the owning system; drives the drop animation. */
  event?: { seq: number; mode: "drain" | "burst" };
}
let { value, max, kind = "stamina", fill = "rgba(120, 224, 130, 0.5)", event }: Props = $props();

const IDLE_MS = 150;
let fillMs = $state(IDLE_MS);
let popping = $state(false);
let seenSeq = -1;
let resetTimer: ReturnType<typeof setTimeout> | undefined;

// React to a new spend: pick the transition speed for the mode, pop on burst,
// then revert to the idle speed so regen stays smooth.
$effect(() => {
  const e = event;
  if (!e || e.seq === seenSeq) return;
  seenSeq = e.seq;

  clearTimeout(resetTimer);
  if (e.mode === "burst") {
    fillMs = 110;
    popping = true;
    resetTimer = setTimeout(() => {
      popping = false;
      fillMs = IDLE_MS;
    }, 280);
  } else {
    fillMs = 380;
    resetTimer = setTimeout(() => {
      fillMs = IDLE_MS;
    }, 420);
  }
});

const pct = $derived(Math.max(0, Math.min(1, max > 0 ? value / max : 0)) * 100);
</script>

<div class="bar-container">
  <div class="bar {kind}" class:popping style="--fill-ms: {fillMs}ms;">
    <!-- Striped track background overlay -->
    <div class="bar-track-stripes"></div>
    <div class="fill" style="width: {pct}%; background: {kind ? undefined : fill};"></div>
    <!-- Numeric readout -->
    <div class="readout">{Math.round(Math.max(0, value))} / {Math.round(max)}</div>
  </div>
</div>

<style>
  .bar-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;
  }

  .bar {
    width: 100%;
    height: 16px;
    padding: 1px;
    box-sizing: border-box;
    border: 1px solid rgba(185, 155, 98, 0.45);
    border-radius: 4px;
    background: rgba(14, 10, 8, 0.85);
    transform-origin: center;
    position: relative;
    overflow: hidden;
    box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.4);
  }

  .bar.hp {
    height: 15px;
    border-color: rgba(185, 155, 98, 0.5);
  }

  .bar.stamina {
    height: 10px;
    border-color: rgba(185, 155, 98, 0.35);
  }

  .bar-track-stripes {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.03) 0px,
      rgba(255, 255, 255, 0.03) 4px,
      transparent 4px,
      transparent 8px
    );
    pointer-events: none;
    z-index: 1;
  }

  .fill {
    height: 100%;
    border-radius: 2px;
    transition: width var(--fill-ms) ease-out;
    z-index: 2;
    position: relative;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 0 4px rgba(0, 0, 0, 0.35);
  }

  /* Custom styled gradients */
  .bar.hp .fill {
    background: linear-gradient(90deg, #7f1d1d 0%, #dc2626 50%, #ef4444 100%);
    box-shadow: 0 0 8px rgba(220, 38, 38, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .bar.stamina .fill {
    background: linear-gradient(90deg, #064e3b 0%, #10b981 50%, #34d399 100%);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .bar.thirst .fill {
    background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%);
    box-shadow: 0 0 8px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .bar.hunger .fill {
    background: linear-gradient(90deg, #7c2d12 0%, #f97316 50%, #fb923c 100%);
    box-shadow: 0 0 8px rgba(249, 115, 22, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  }

  .readout {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono, monospace);
    font-size: 0.65rem;
    font-weight: 600;
    color: #f3f4f6;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.8);
    pointer-events: none;
    z-index: 3;
    opacity: 0.85;
    letter-spacing: 0.02em;
  }

  .bar.stamina .readout {
    display: none;
    font-size: 0.56rem;
  }

  .bar.stamina:hover .readout {
    display: flex;
  }

  /* burst: a quick vertical bulge while the fill snaps down — reads as a punch. */
  .bar.popping {
    animation: pop 280ms ease-out;
  }
  .bar.popping .fill {
    animation: flash 280ms ease-out;
  }

  @keyframes pop {
    0%   { transform: scale(1); }
    28%  { transform: scale(1.05) scaleY(1.4); }
    100% { transform: scale(1); }
  }

  @keyframes flash {
    0%   { filter: brightness(2.3) saturate(1.4); }
    100% { filter: brightness(1); }
  }
</style>
