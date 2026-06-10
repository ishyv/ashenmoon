<script lang="ts">
/**
 * EnvironmentGauge handles immersive environmental feedback:
 * 1. Screen vignettes for hazard states (Heat, Cold, Toxins, Humidity).
 * 2. A minimalist, glassmorphic Temperature widget in the top-left corner.
 */
import { fade } from "svelte/transition";
import { activeEnvironment, uiPreferences } from "./rpg-state.svelte";

let showTempWidget = $state(true);
let tempFadeTimeout: ReturnType<typeof setTimeout> | null = null;

// Determine temperature category color name
const getTempColorName = $derived(() => {
  const t = activeEnvironment.temperature;
  if (t < 0) return "cold";
  if (t < 30) return "neutral";
  if (t < 100) return "warm";
  return "hot";
});

// Vignette visibility checks
const showHeatVignette = $derived(activeEnvironment.temperature >= 35);
const showColdVignette = $derived(activeEnvironment.temperature <= 10);
const showToxicVignette = $derived(activeEnvironment.toxins > 0);
const showHumidityVignette = $derived(activeEnvironment.humidity >= 65);

$effect(() => {
  if (!uiPreferences.dynamicEnvironment) {
    showTempWidget = true;
    if (tempFadeTimeout) {
      clearTimeout(tempFadeTimeout);
      tempFadeTimeout = null;
    }
    return;
  }

  // Fade out temperature pill if it has been neutral (20°C) for 3 seconds
  const isNeutral = activeEnvironment.temperature === 20;
  if (isNeutral) {
    if (showTempWidget && !tempFadeTimeout) {
      tempFadeTimeout = setTimeout(() => {
        showTempWidget = false;
        tempFadeTimeout = null;
      }, 3000);
    }
  } else {
    showTempWidget = true;
    if (tempFadeTimeout) {
      clearTimeout(tempFadeTimeout);
      tempFadeTimeout = null;
    }
  }

  return () => {
    if (tempFadeTimeout) {
      clearTimeout(tempFadeTimeout);
      tempFadeTimeout = null;
    }
  };
});
</script>

<!-- Immersive screen border overlays for environmental feedback -->
{#if showHeatVignette}
  <!-- Scales overlay opacity dynamically based on temperature intensity -->
  {@const heatOpacity = Math.min(1.0, (activeEnvironment.temperature - 35) / 105)}
  <div class="vignette heat-vignette" style="--intensity-opacity: {heatOpacity}"></div>
{/if}

{#if showColdVignette}
  <!-- Scales overlay opacity dynamically based on coldness intensity -->
  {@const coldOpacity = Math.min(1.0, (10 - activeEnvironment.temperature) / 60)}
  <div class="vignette cold-vignette" style="--intensity-opacity: {coldOpacity}"></div>
{/if}

{#if showToxicVignette}
  <!-- Scales overlay opacity dynamically based on toxins intensity -->
  {@const toxicOpacity = Math.min(1.0, activeEnvironment.toxins / 100)}
  <div class="vignette toxic-vignette" style="--intensity-opacity: {toxicOpacity}"></div>
{/if}

{#if showHumidityVignette}
  <!-- Scales overlay opacity dynamically based on humidity intensity -->
  {@const humidityOpacity = Math.min(1.0, (activeEnvironment.humidity - 65) / 35)}
  <div class="vignette humidity-vignette" style="--intensity-opacity: {humidityOpacity}"></div>
{/if}

<!-- Minimalist, corner temperature pill widget -->
{#if showTempWidget}
  <div transition:fade={{ duration: 300 }} class="temp-widget">
    <span class="temp-icon {getTempColorName()}">🌡️</span>
    <span class="temp-val">{activeEnvironment.temperature}°C</span>
  </div>
{/if}

<style>
  /* Base full screen vignette layout */
  .vignette {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 85;
    opacity: calc(var(--intensity-opacity) * 0.8);
    transition: opacity 0.5s ease-out;
  }

  /* Heat hazard overlay */
  .heat-vignette {
    box-shadow: inset 0 0 80px rgba(239, 68, 68, 0.45);
    background: radial-gradient(circle, transparent 55%, rgba(239, 68, 68, 0.15) 100%);
    animation: pulse 3s infinite ease-in-out;
  }

  /* Cold hazard overlay */
  .cold-vignette {
    box-shadow: inset 0 0 80px rgba(59, 130, 246, 0.4);
    background: radial-gradient(circle, transparent 55%, rgba(59, 130, 246, 0.12) 100%);
    animation: pulse 4s infinite ease-in-out;
  }

  /* Toxic hazard overlay */
  .toxic-vignette {
    box-shadow: inset 0 0 80px rgba(168, 85, 247, 0.45);
    background: radial-gradient(circle, transparent 55%, rgba(168, 85, 247, 0.15) 100%);
    animation: pulse 2.5s infinite ease-in-out;
  }

  /* Humidity overlay: edge condensation/mist */
  .humidity-vignette {
    box-shadow: inset 0 0 90px rgba(255, 255, 255, 0.15);
    background: radial-gradient(circle, transparent 50%, rgba(255, 255, 255, 0.08) 100%);
    backdrop-filter: blur(1.5px);
    mask-image: radial-gradient(circle, black 55%, transparent 100%);
    -webkit-mask-image: radial-gradient(circle, black 55%, transparent 100%);
    animation: pulse 5s infinite ease-in-out;
  }

  /* Minimalist temperature widget in corner */
  .temp-widget {
    position: fixed;
    top: 1.1rem;
    left: 1.1rem;
    background: rgba(18, 14, 12, 0.85);
    border: 1px solid rgba(255, 220, 120, 0.18);
    border-radius: 20px;
    padding: 0.35rem 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    backdrop-filter: blur(8px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    color: #f0f0f0;
    pointer-events: auto;
    user-select: none;
    z-index: 90;
    transition: border-color 0.3s;
  }

  .temp-icon {
    font-size: 0.8rem;
  }

  .temp-icon.cold { color: #3b82f6; text-shadow: 0 0 4px rgba(59, 130, 246, 0.4); }
  .temp-icon.neutral { color: #10b981; }
  .temp-icon.warm { color: #f59e0b; }
  .temp-icon.hot { color: #ef4444; text-shadow: 0 0 4px rgba(239, 68, 68, 0.4); }

  @keyframes pulse {
    0% { transform: scale(1); opacity: calc(var(--intensity-opacity) * 0.7); }
    50% { transform: scale(1.005); opacity: calc(var(--intensity-opacity) * 0.9); }
    100% { transform: scale(1); opacity: calc(var(--intensity-opacity) * 0.7); }
  }
</style>
