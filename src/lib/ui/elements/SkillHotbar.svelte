<script lang="ts">
/**
 * SkillHotbar.svelte
 * Displays the active skill slots (Evade, Super-Gather) with glowing
 * hextech-themed circular icons and radial cooldown clock overlays.
 */
import { fade } from "svelte/transition";
import { gameState } from "$lib/state/game-state.svelte";
import { cooldownsState, uiPreferences } from "$lib/state/runtime-ui-state.svelte";
import { stamina } from "$lib/domain/stamina.svelte";

const evadeCooldown = $derived(cooldownsState.evade);
const evadeMax = $derived(cooldownsState.evadeMax);
const sgCooldown = $derived(cooldownsState.superGather);
const sgMax = $derived(cooldownsState.superGatherMax);

// Compute percentages (100 is fully on cooldown, 0 is fully off cooldown)
const evadePercent = $derived(evadeCooldown > 0 ? (evadeCooldown / evadeMax) * 100 : 0);
const sgPercent = $derived(sgCooldown > 0 ? (sgCooldown / sgMax) * 100 : 0);

// Evade Stamina Check
const hasEvadeStam = $derived(stamina.current >= 25);
// Super-Gather Stamina Check
const hasSgStam = $derived(stamina.current >= 35);
</script>

<div class="hotbar-container">
  <!-- Evade Skill Icon -->
  <div class="skill-slot" class:on-cooldown={evadeCooldown > 0} class:out-of-stamina={!hasEvadeStam}>
    <!-- SVG Circular Radial Cooldown Overlay -->
    {#if evadeCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - evadePercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{evadeCooldown.toFixed(1)}s</div>
    {/if}
    
    <div class="skill-icon evade-bg">ev</div>
    <div class="skill-key">SHIFT</div>
    <div class="tooltip">
      <div class="title">Evade (Lvl {gameState.rpg.skills?.evade?.level ?? 1})</div>
      <div class="desc">Perform a quick dash in your movement direction. Grant invulnerability frames if neutral-dashing.</div>
      <div class="cost">Cost: 25 Stamina</div>
    </div>
  </div>

  <!-- Super-Gather Skill Icon -->
  <div class="skill-slot" class:on-cooldown={sgCooldown > 0} class:out-of-stamina={!hasSgStam}>
    <!-- SVG Circular Radial Cooldown Overlay -->
    {#if sgCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - sgPercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{sgCooldown.toFixed(1)}s</div>
    {/if}
    
    <div class="skill-icon sg-bg">sg</div>
    <div class="skill-key">EE</div>
    <div class="tooltip">
      <div class="title">Super-Gather (Lvl {gameState.rpg.skills?.superGather?.level ?? 1})</div>
      <div class="desc">Double-tap E to execute a strong strike yielding double drops and doubling impact feedback.</div>
      <div class="cost">Cost: {Math.max(15, 35 - ((gameState.rpg.skills?.superGather?.level ?? 1) - 1) * 2)} Stamina</div>
    </div>
  </div>
</div>

<style>
  .hotbar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    pointer-events: auto; /* enable tooltip hover */
    background: rgba(18, 14, 12, 0.45);
    border: 1px solid rgba(255, 220, 120, 0.08);
    border-radius: 40px;
    padding: 0.4rem 1rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .skill-slot {
    position: relative;
    width: 48px;
    height: 48px;
    background: rgba(30, 24, 20, 0.85);
    border: 1.5px solid rgba(255, 170, 0, 0.35);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: default;
    transition: all 0.15s ease;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
  }

  .skill-slot:hover {
    border-color: rgba(255, 170, 0, 0.85);
    box-shadow: 0 0 10px rgba(255, 170, 0, 0.25), inset 0 0 6px rgba(0,0,0,0.6);
  }

  /* Tooltip logic */
  .skill-slot:hover .tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .skill-icon {
    font-size: 1.35rem;
    user-select: none;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
    transition: transform 0.15s ease;
  }

  .skill-slot:hover .skill-icon {
    transform: scale(1.1);
  }

  .evade-bg {
    color: var(--color-cold, skyblue);
  }

  .sg-bg {
    color: var(--color-warning, gold);
  }

  /* Hotkey labels underneath slot */
  .skill-key {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(18, 14, 12, 0.95);
    border: 1px solid rgba(255, 220, 120, 0.3);
    border-radius: 3px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.58rem;
    font-weight: bold;
    color: rgba(255, 220, 120, 0.95);
    padding: 0 4px;
    letter-spacing: 0.05em;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  /* SVG Cooldown Swipe Overlay */
  .cooldown-overlay {
    position: absolute;
    inset: -1.5px;
    width: calc(100% + 3px);
    height: calc(100% + 3px);
    transform: rotate(-90deg);
    pointer-events: none;
    z-index: 2;
  }

  .cooldown-progress {
    fill: rgba(0, 0, 0, 0.65);
    stroke: rgba(255, 170, 0, 0.8);
    stroke-width: 1.5px;
    stroke-linecap: round;
  }

  .cooldown-time {
    position: absolute;
    z-index: 3;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    font-weight: bold;
    color: var(--color-text, white);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 1), 0 0 6px rgba(255, 170, 0, 0.8);
    pointer-events: none;
  }

  /* Out of stamina warning */
  .out-of-stamina .skill-icon {
    opacity: 0.4;
    filter: grayscale(1) drop-shadow(none);
  }

  .out-of-stamina {
    border-color: rgba(255, 85, 85, 0.35);
  }

  /* Tooltip styles */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    width: 220px;
    background: rgba(18, 14, 12, 0.95);
    border: 1px solid rgba(255, 220, 120, 0.25);
    border-radius: 6px;
    padding: 0.6rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 170, 0, 0.05);
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 100;
    pointer-events: none;
    text-align: left;
    backdrop-filter: blur(8px);
  }

  .tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: rgba(18, 14, 12, 0.95) transparent transparent transparent;
  }

  .tooltip .title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    font-weight: bold;
    color: var(--color-warning, gold);
    margin-bottom: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .tooltip .desc {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.35;
    margin-bottom: 0.4rem;
  }

  .tooltip .cost {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    color: var(--color-cold, skyblue);
    font-weight: bold;
  }
</style>
