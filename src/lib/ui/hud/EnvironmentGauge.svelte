<script lang="ts">
/**
 * EnvironmentGauge handles immersive environmental feedback:
 * 1. Screen vignettes for hazard states (Heat, Cold, Wetness, Toxins, Humidity).
 * 2. A minimalist, glassmorphic Temperature widget in the top-left corner.
 */
import { fade } from "svelte/transition";
import { activeEnvironment } from "$lib/state/environment-state.svelte";
import { uiPreferences } from "$lib/state/runtime-ui-state.svelte";
import { wetnessState } from "$lib/state/rpg/wetness.svelte";
import { coldExposure } from "$lib/state/rpg/cold-exposure.svelte";

const coldAccumulator = $derived(coldExposure.accumulator);

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
const showHeatVignette = $derived(activeEnvironment.temperature >= 28);
const showColdVignette = $derived(activeEnvironment.temperature <= 10 || coldAccumulator > 15);
const showToxicVignette = $derived(activeEnvironment.toxins > 0);
const showHumidityVignette = $derived(activeEnvironment.humidity >= 65);
const showWetVignette = $derived(wetnessState.level === "wet" || wetnessState.level === "soaked");
const showSoakedVignette = $derived(wetnessState.level === "soaked");

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
  {@const heatOpacity = Math.min(1.0, (activeEnvironment.temperature - 28) / 112)}
  <div class="vignette heat-vignette" style="--intensity-opacity: {heatOpacity}"></div>
{/if}

{#if showColdVignette}
  {@const tempCold = Math.min(1.0, (10 - activeEnvironment.temperature) / 60)}
  {@const accumCold = Math.min(1.0, Math.max(0, (coldAccumulator - 15) / 85))}
  {@const coldOpacity = Math.max(tempCold, accumCold * 0.6)}
  <div class="vignette cold-vignette" style="--intensity-opacity: {coldOpacity}"></div>
{/if}

{#if showWetVignette}
  {@const wetOpacity = wetnessState.level === "soaked" ? 0.85 : 0.5}
  <div class="vignette wet-vignette" style="--intensity-opacity: {wetOpacity}"></div>
{/if}

{#if showSoakedVignette}
  <div class="vignette soaked-vignette" style="--intensity-opacity: 0.6"></div>
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
    <span class="temp-icon {getTempColorName()}">temp</span>
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

  /* Wet overlay: teal shimmer for wet/soaked state */
  .wet-vignette {
    box-shadow: inset 0 0 80px rgba(20, 180, 160, 0.45);
    background: radial-gradient(circle, transparent 55%, rgba(20, 180, 160, 0.12) 100%);
    animation: pulse 3.5s infinite ease-in-out;
  }

  /* Soaked overlay: heavier teal distortion on top */
  .soaked-vignette {
    box-shadow: inset 0 0 120px rgba(20, 160, 180, 0.55);
    background: radial-gradient(circle, transparent 40%, rgba(20, 160, 180, 0.18) 100%);
    backdrop-filter: blur(0.5px);
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
    color: var(--color-text, white);
    pointer-events: auto;
    user-select: none;
    z-index: 90;
    transition: border-color 0.3s;
  }

  .temp-icon {
    font-size: 0.8rem;
  }

  .temp-icon.cold { color: var(--color-cold, skyblue); text-shadow: 0 0 4px rgba(59, 130, 246, 0.4); }
  .temp-icon.neutral { color: var(--color-success, lightgreen); }
  .temp-icon.warm { color: var(--color-warning, gold); }
  .temp-icon.hot { color: var(--color-danger, tomato); text-shadow: 0 0 4px rgba(239, 68, 68, 0.4); }

  @keyframes pulse {
    0% { transform: scale(1); opacity: calc(var(--intensity-opacity) * 0.7); }
    50% { transform: scale(1.005); opacity: calc(var(--intensity-opacity) * 0.9); }
    100% { transform: scale(1); opacity: calc(var(--intensity-opacity) * 0.7); }
  }
</style>
