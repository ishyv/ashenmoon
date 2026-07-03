<script lang="ts">
/**
 * SpectatorOverlay.svelte
 * Displays telemetry for active animal counts, time, weather, and spectator keyboard hotkeys.
 */
import { devFlags } from "$lib/state/dev-flags.svelte";
import { world } from "$lib/core/ecs/ecs-miniplex";
import { onDestroy, onMount } from "svelte";

let activeAnimalsCount = $state(0);
let rabbitCount = $state(0);
let deerCount = $state(0);
let boarCount = $state(0);
let wolfCount = $state(0);
let intervalId: ReturnType<typeof setInterval>;

onMount(() => {
  intervalId = setInterval(() => {
    const animals = world.with("animal").entities;
    activeAnimalsCount = animals.length;
    rabbitCount = animals.filter(e => e.animal?.speciesId === "rabbit").length;
    deerCount = animals.filter(e => e.animal?.speciesId === "deer").length;
    boarCount = animals.filter(e => e.animal?.speciesId === "boar").length;
    wolfCount = animals.filter(e => e.animal?.speciesId === "wolf").length;
  }, 500);
});

onDestroy(() => {
  clearInterval(intervalId);
});
</script>

{#if devFlags.spectatorEnabled}
  <div class="spectator-overlay" aria-label="Spectator Mode Panel">
    <div class="overlay-header">spectator mode (god/camera)</div>
    <div class="stat-section">
      <div class="stat-row">
        <span class="stat-label">active fauna:</span>
        <span class="stat-value">{activeAnimalsCount}</span>
      </div>
      <div class="fauna-breakdown">
        <span>rabbits: {rabbitCount}</span>
        <span>deer: {deerCount}</span>
        <span>boars: {boarCount}</span>
        <span>wolves: {wolfCount}</span>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-row">WASD/arrows: float camera</div>
      <div class="guide-row">shift: speed boost</div>
      <div class="guide-row command-hint">console: spectator(false)</div>
    </div>
  </div>
{/if}

<style>
  .spectator-overlay {
    position: absolute;
    top: 5rem;
    left: 1.1rem;
    background: rgba(18, 14, 12, 0.88);
    border: 1px solid rgba(255, 220, 120, 0.22);
    border-radius: 4px;
    padding: 0.8rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    color: rgba(255, 220, 120, 0.9);
    z-index: 100;
    pointer-events: none;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 210px;
    transition: opacity 0.2s ease;
  }

  .overlay-header {
    font-weight: bold;
    color: #ffdc78;
    text-transform: lowercase;
    border-bottom: 1px solid rgba(255, 220, 120, 0.15);
    padding-bottom: 0.3rem;
  }

  .stat-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
  }

  .stat-label {
    color: rgba(255, 220, 120, 0.65);
  }

  .stat-value {
    font-weight: bold;
    color: #ffdc78;
  }

  .fauna-breakdown {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.2rem;
    font-size: 0.64rem;
    background: rgba(0, 0, 0, 0.35);
    padding: 0.35rem;
    border-radius: 2px;
    color: rgba(255, 255, 255, 0.7);
  }

  .guide-section {
    font-size: 0.64rem;
    color: rgba(255, 255, 255, 0.45);
    border-top: 1px solid rgba(255, 220, 120, 0.1);
    padding-top: 0.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .command-hint {
    color: #ffdc78;
    opacity: 0.8;
  }
</style>
