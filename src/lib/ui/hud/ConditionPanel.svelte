<script lang="ts">
/**
 * ConditionPanel — immersive body silhouette that colors up when environmental
 * conditions are active. Hidden entirely when all conditions are baseline so it
 * adds no permanent chrome.
 *
 * Zones:
 *   core (torso) — blue for cold building, orange for heat
 *   skin (full)  — teal/cyan for wet/soaked
 *   head         — purple for toxins
 */
import { wetnessState } from "$lib/state/rpg/wetness.svelte";
import { coldExposure } from "$lib/state/rpg/cold-exposure.svelte";
import { activeEnvironment } from "$lib/state/environment-state.svelte";

const coldIntensity = $derived(Math.min(1, Math.max(0, (coldExposure.accumulator - 10) / 90)));
const heatIntensity = $derived(Math.min(1, Math.max(0, (activeEnvironment.temperature - 28) / 42)));
const toxinIntensity = $derived(Math.min(1, activeEnvironment.toxins / 100));
const wetIntensity = $derived(
  wetnessState.level === "soaked" ? 1
  : wetnessState.level === "wet"  ? 0.65
  : wetnessState.level === "damp" ? 0.3
  : 0
);

const anyActive = $derived(
  coldIntensity > 0 || heatIntensity > 0 || toxinIntensity > 0 || wetIntensity > 0
);

const coreColor = $derived(
  coldIntensity >= heatIntensity
    ? `rgba(59,130,246,${coldIntensity * 0.75})`
    : `rgba(249,115,22,${heatIntensity * 0.75})`
);
</script>

{#if anyActive}
  <div class="condition-panel" aria-hidden="true">
    <svg viewBox="0 0 32 64" width="32" height="64" xmlns="http://www.w3.org/2000/svg">
      <!-- Skin fill layer (wet/soaked) -->
      {#if wetIntensity > 0}
        <ellipse cx="16" cy="10" rx="6" ry="6.5" fill="rgba(20,180,160,{wetIntensity * 0.55})" />
        <rect x="10" y="16" width="12" height="22" rx="2" fill="rgba(20,180,160,{wetIntensity * 0.55})" />
        <rect x="5" y="16" width="5" height="16" rx="2" fill="rgba(20,180,160,{wetIntensity * 0.45})" />
        <rect x="22" y="16" width="5" height="16" rx="2" fill="rgba(20,180,160,{wetIntensity * 0.45})" />
        <rect x="11" y="38" width="4" height="18" rx="2" fill="rgba(20,180,160,{wetIntensity * 0.5})" />
        <rect x="17" y="38" width="4" height="18" rx="2" fill="rgba(20,180,160,{wetIntensity * 0.5})" />
      {/if}

      <!-- Silhouette outline -->
      <ellipse cx="16" cy="10" rx="6" ry="6.5" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />
      <rect x="10" y="16" width="12" height="22" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />
      <rect x="5" y="16" width="5" height="16" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />
      <rect x="22" y="16" width="5" height="16" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />
      <rect x="11" y="38" width="4" height="18" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />
      <rect x="17" y="38" width="4" height="18" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.5" />

      <!-- Core glow (cold or heat) -->
      {#if coldIntensity > 0 || heatIntensity > 0}
        <rect x="11" y="17" width="10" height="20" rx="2" fill={coreColor} />
      {/if}

      <!-- Head glow (toxins) -->
      {#if toxinIntensity > 0}
        <ellipse cx="16" cy="10" rx="5.5" ry="6" fill="rgba(168,85,247,{toxinIntensity * 0.65})" />
      {/if}
    </svg>
  </div>
{/if}

<style>
  .condition-panel {
    position: fixed;
    bottom: 5.5rem;
    left: 1.1rem;
    pointer-events: none;
    z-index: 88;
    opacity: 0.9;
    filter: drop-shadow(0 0 4px rgba(0,0,0,0.6));
  }
</style>
