<script lang="ts">
/**
 * Character level + xp progress, bottom HUD. The numeral flashes accent for a
 * beat when a level-up fires (driven by levelUpEvent, same moment as the
 * world VFX ring); the thin bar underneath tracks progress to the next level.
 */
import {
  getCharacterLevel,
  getCharacterXp,
  getCharacterNextXp,
  levelUpEvent,
} from "$lib/state/rpg/stats.svelte";

const level = $derived(getCharacterLevel());
const xp = $derived(getCharacterXp());
const nextXp = $derived(getCharacterNextXp());
const progress = $derived(Math.min(1, xp / Math.max(1, nextXp)));

let flashing = $state(false);
let flashTimeout: ReturnType<typeof setTimeout> | null = null;

$effect(() => {
  if (levelUpEvent.seq === 0) return;
  // read seq so the effect re-runs per level-up
  void levelUpEvent.seq;
  flashing = true;
  if (flashTimeout) clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => {
    flashing = false;
    flashTimeout = null;
  }, 900);
  return () => {
    if (flashTimeout) {
      clearTimeout(flashTimeout);
      flashTimeout = null;
    }
  };
});
</script>

<div class="level-badge" class:flashing>
  <span class="numeral">lv {level}</span>
  <div class="xp-track">
    <div class="xp-fill" style:width="{progress * 100}%"></div>
  </div>
</div>

<style>
  .level-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    min-width: 3.2rem;
    pointer-events: none;
    user-select: none;
  }

  .numeral {
    font-family: var(--font-mono, monospace);
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    color: var(--text-soft);
    transition: color 200ms ease, text-shadow 200ms ease;
  }

  .flashing .numeral {
    color: var(--accent);
    text-shadow: 0 0 8px var(--accent);
  }

  .xp-track {
    width: 100%;
    height: 3px;
    background: var(--bg-elev);
    overflow: hidden;
  }

  .xp-fill {
    height: 100%;
    background: var(--accent);
    transition: width 300ms ease;
  }

  .flashing .xp-fill {
    box-shadow: 0 0 6px var(--accent);
  }
</style>

