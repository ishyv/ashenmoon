<script lang="ts">
/**
 * One HUD stat bar (stamina now; hp / effects later). The fill width tracks
 * value/max via a CSS transition whose speed — plus an optional pop — is driven
 * by the *kind* of the last change, so two decrease idioms read differently:
 *   - "drain": slow, smooth unfill (continuous costs like sprint).
 *   - "burst": fast snap + a scale/flash pop, "exploding to disappear" (instant
 *     chunk costs like dash / focused gathering).
 * Increases (regen) just follow smoothly at the idle speed.
 */
interface Props {
  value: number;
  max: number;
  /** CSS color for the fill (kept semi-transparent so the track shows through). */
  fill?: string;
  /** Last spend event from the owning system; drives the drop animation. */
  event?: { seq: number; mode: "drain" | "burst" };
}
let { value, max, fill = "rgba(120, 224, 130, 0.5)", event }: Props = $props();

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

<div class="bar" class:popping style="--fill-ms: {fillMs}ms;">
  <div class="fill" style="width: {pct}%; background: {fill};"></div>
</div>

<style>
  .bar {
    flex: 0 1 200px;
    min-width: 84px;
    height: 15px;
    padding: 2px;
    box-sizing: border-box;
    border: 1.5px solid rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    background: rgba(8, 12, 10, 0.45);
    transform-origin: center;
  }

  .fill {
    height: 100%;
    border-radius: 999px;
    transition: width var(--fill-ms) ease-out;
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
