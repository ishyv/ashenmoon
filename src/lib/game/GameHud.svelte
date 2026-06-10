<script lang="ts">
/**
 * Bottom-center HUD: a flex row of stat bars. Children stay centered, grow into
 * the available width, and shrink when space runs out.
 * 
 * Supports a minimalist configuration (`uiPreferences.minimalHud`) which hides
 * the HUD when the player's health and stamina are fully-restored (100%),
 * fading it back in dynamically whenever resources are consumed or damaged.
 */
import { fade } from "svelte/transition";
import StatBar from "./StatBar.svelte";
import StatusHud from "./StatusHud.svelte";
import { stamina, staminaConfig } from "./stamina.svelte";
import { thirst, thirstConfig } from "./survival.svelte";
import { statusState } from "./status-effects.svelte";
import { rpgState, uiPreferences } from "./rpg-state.svelte";

let showHud = $state(true);
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

const hp = $derived(rpgState.profile?.hpCurrent ?? 100);
const stam = $derived(stamina.current);
const maxStam = $derived(staminaConfig.max);
const thirstVal = $derived(thirst.current);
const maxThirst = $derived(thirstConfig.max);

$effect(() => {
  if (!uiPreferences.minimalHud) {
    showHud = true;
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
    return;
  }

  // Fade in HUD if resources are spent or damaged. Keep visible for a 3s cooldown after reaching 100%.
  const isFull = hp >= 100 && stam >= maxStam && thirstVal >= maxThirst && statusState.active.length === 0;
  if (!isFull) {
    showHud = true;
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
  } else {
    if (showHud && !fadeTimeout) {
      fadeTimeout = setTimeout(() => {
        showHud = false;
        fadeTimeout = null;
      }, 3000);
    }
  }

  return () => {
    if (fadeTimeout) {
      clearTimeout(fadeTimeout);
      fadeTimeout = null;
    }
  };
});
</script>

{#if showHud}
  <div transition:fade={{ duration: 300 }} class="hud-stack">
    <StatusHud />
    <div class="hud-container">
      <div class="bar-wrapper">
        <span class="icon">❤️</span>
        <StatBar value={hp} max={100} fill="rgba(240, 90, 90, 0.65)" />
      </div>

      <div class="bar-wrapper">
        <span class="icon">⚡</span>
        <StatBar value={stam} max={maxStam} event={stamina.event} />
      </div>

      <div class="bar-wrapper">
        <span class="icon">💧</span>
        <StatBar value={thirstVal} max={maxThirst} fill="rgba(90, 170, 240, 0.65)" event={thirst.event} />
      </div>
    </div>
  </div>
{/if}

<style>
  .hud-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .hud-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
    width: max-content;
    max-width: min(92vw, 680px);
    pointer-events: none;
    user-select: none;
    background: rgba(18, 14, 12, 0.6);
    border: 1px solid rgba(255, 220, 120, 0.1);
    border-radius: 30px;
    padding: 0.5rem 1.2rem;
    backdrop-filter: blur(4px);
  }

  .bar-wrapper {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .icon {
    font-size: 0.9rem;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }
</style>
