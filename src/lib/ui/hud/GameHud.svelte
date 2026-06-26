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
import LevelBadge from "./LevelBadge.svelte";
import { getPlayerStats } from "$lib/state/rpg/stats.svelte";
import { stamina, staminaConfig } from "$lib/state/rpg/stamina.svelte";
import { thirstEvent, thirstConfig, hungerEvent, hungerConfig } from "$lib/state/rpg/survival.svelte";
import { statusState } from "$lib/state/rpg/status-effects.svelte";
import { uiPreferences } from "$lib/state/runtime-ui-state.svelte";
import { gameState } from "$lib/state/game-state.svelte";

let showHud = $state(true);
let fadeTimeout: ReturnType<typeof setTimeout> | null = null;

const maxHp = $derived(getPlayerStats().combat.maxHealth);
const hp = $derived(gameState.rpg.profile?.hpCurrent ?? maxHp);
const stam = $derived(stamina.current);
const maxStam = $derived(staminaConfig.max);
const thirstVal = $derived(gameState.survival.thirst);
const maxThirst = $derived(thirstConfig.max);
const hungerVal = $derived(gameState.survival.hunger);
const maxHunger = $derived(hungerConfig.max);

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
  const isFull = hp >= maxHp && stam >= maxStam && thirstVal >= maxThirst && hungerVal >= maxHunger && statusState.active.length === 0;
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

<!-- Definitions for dial progress color gradients -->
<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" aria-hidden="true">
  <defs>
    <linearGradient id="thirst-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
    <linearGradient id="hunger-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c2d12" />
      <stop offset="50%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#fb923c" />
    </linearGradient>
  </defs>
</svg>

{#if showHud}
  <div transition:fade={{ duration: 300 }} class="hud-stack">
    <StatusHud />
    <div class="hud-container" aria-label="Survival and status indicators">
      
      <!-- Left side: Level Badge -->
      <div class="level-section">
        <LevelBadge />
      </div>

      <!-- Vertical divider -->
      <div class="divider"></div>

      <!-- Middle: Health and Stamina stacked -->
      <div class="vitals-section">
        <div class="bar-wrapper">
          <span class="bar-label hp">H</span>
          <StatBar value={hp} max={maxHp} kind="hp" fill="rgba(240, 90, 90, 0.65)" />
        </div>

        <div class="bar-wrapper">
          <span class="bar-label stamina">S</span>
          <StatBar value={stam} max={maxStam} kind="stamina" event={stamina.event} />
        </div>
      </div>

      <!-- Vertical divider -->
      <div class="divider"></div>

      <!-- Right: Thirst and Hunger circular dials -->
      <div class="dials-section">
        <!-- Thirst Dial -->
        <div class="dial-wrapper" title="Thirst: {Math.round(thirstVal)} / {maxThirst}">
          <svg class="dial-svg" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="rgba(185, 155, 98, 0.2)" stroke-width="0.75" />
            <circle cx="18" cy="18" r="15" fill="rgba(14, 10, 8, 0.85)" stroke="rgba(185, 155, 98, 0.08)" stroke-width="1.8" />
            <circle
              class="dial-fill thirst"
              cx="18"
              cy="18"
              r="15"
              stroke-dasharray="94.2"
              stroke-dashoffset={94.2 - (thirstVal / maxThirst) * 94.2}
            />
          </svg>
          <div class="dial-icon-container">
            <svg viewBox="0 0 24 24" width="13" height="13" class="dial-icon thirst-icon" fill="currentColor">
              <path d="M12 2.5C11.3 3.5 6.5 11 6.5 14.5a5.5 5.5 0 0 0 11 0c0-3.5-4.8-11-5.5-12zm-3 12c0-1.7 1.3-3 3-3 .3 0 .5-.2.5-.5s-.2-.5-.5-.5c-2.2 0-4 1.8-4 4 0 .3.2.5.5.5s.5-.2.5-.5z" />
            </svg>
          </div>
        </div>

        <!-- Hunger Dial -->
        <div class="dial-wrapper" title="Hunger: {Math.round(hungerVal)} / {maxHunger}">
          <svg class="dial-svg" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="rgba(185, 155, 98, 0.2)" stroke-width="0.75" />
            <circle cx="18" cy="18" r="15" fill="rgba(14, 10, 8, 0.85)" stroke="rgba(185, 155, 98, 0.08)" stroke-width="1.8" />
            <circle
              class="dial-fill hunger"
              cx="18"
              cy="18"
              r="15"
              stroke-dasharray="94.2"
              stroke-dashoffset={94.2 - (hungerVal / maxHunger) * 94.2}
            />
          </svg>
          <div class="dial-icon-container">
            <svg viewBox="0 0 24 24" width="13" height="13" class="dial-icon hunger-icon" fill="currentColor">
              <path d="M19.7 4.3c-2.5-2.5-6.6-2.1-9.1.6L6.5 9c-.8-.2-1.7 0-2.3.6C3.4 10.4 3.4 11.6 4 12.3l.6.6-2.1 2.1c-.8.8-.8 2 0 2.8s2 .8 2.8 0l2.1-2.1.6.6c.7.7 1.9.7 2.7 0 .6-.6.8-1.5.6-2.3l4.1-4.1c2.7-2.5 3.1-6.6.6-9.1zm-4.9 5.3c-.3.3-.8.3-1.1 0-.3-.3-.3-.8 0-1.1l3.5-3.5c.3-.3.8-.3 1.1 0 .3.3.3.8 0 1.1l-3.5 3.5z" />
            </svg>
          </div>
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  .hud-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .hud-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.1rem;
    width: max-content;
    pointer-events: none;
    user-select: none;
    background: linear-gradient(135deg, rgba(22, 18, 16, 0.95) 0%, rgba(12, 10, 8, 0.98) 100%);
    border: 1px solid rgba(185, 155, 98, 0.35);
    border-radius: 8px;
    padding: 0.5rem 1.3rem;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 0 0 1px rgba(255, 238, 190, 0.03);
    position: relative;
  }

  .hud-container::before,
  .hud-container::after {
    content: "";
    position: absolute;
    width: 8px;
    height: 8px;
    border-color: rgba(185, 155, 98, 0.55);
    border-style: solid;
    pointer-events: none;
  }

  .hud-container::before {
    top: 4px;
    left: 4px;
    border-width: 1px 0 0 1px;
  }

  .hud-container::after {
    bottom: 4px;
    right: 4px;
    border-width: 0 1px 1px 0;
  }

  .level-section {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .divider {
    width: 1px;
    height: 28px;
    background: rgba(185, 155, 98, 0.15);
  }

  .vitals-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    width: 180px;
  }

  .bar-wrapper {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }

  .bar-label {
    min-width: 0.7rem;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 0.75rem;
    font-weight: bold;
    text-align: center;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }

  .bar-label.hp {
    color: #ef4444;
  }

  .bar-label.stamina {
    color: #10b981;
  }

  .dials-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dial-wrapper {
    position: relative;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto; /* Allow tooltip hover */
  }

  .dial-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .dial-fill {
    fill: none;
    stroke-width: 2.8;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }

  .dial-fill.thirst {
    stroke: url(#thirst-grad);
    filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.45));
  }

  .dial-fill.hunger {
    stroke: url(#hunger-grad);
    filter: drop-shadow(0 0 2px rgba(249, 115, 22, 0.45));
  }

  .dial-icon-container {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  :global(.dial-icon) {
    color: #d9c28e;
    filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.85));
  }
</style>

