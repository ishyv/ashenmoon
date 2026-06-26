<script lang="ts">
/**
 * ConditionPanel — immersive body silhouette that colors up when environmental
 * conditions, wounds, or status effects are active.
 *
 * Silhouette body parts mapping for wounds:
 *   head, core, left_arm, right_arm, left_leg, right_leg
 */
import { wetnessState } from "$lib/state/rpg/wetness.svelte";
import { coldExposure } from "$lib/state/rpg/cold-exposure.svelte";
import { activeEnvironment } from "$lib/state/environment-state.svelte";
import { woundState } from "$lib/state/rpg/wounds.svelte";
import { statusState } from "$lib/state/rpg/status-effects.svelte";
import { STATUS_DEFINITIONS, StatusId } from "$lib/domain/systems/status-types";
import { overlayStack, OverlayId } from "$lib/state/overlay-stack.svelte";

const coldIntensity = $derived(Math.min(1, Math.max(0, (coldExposure.accumulator - 10) / 90)));
const heatIntensity = $derived(Math.min(1, Math.max(0, (activeEnvironment.temperature - 28) / 42)));
const toxinIntensity = $derived(Math.min(1, activeEnvironment.toxins / 100));
const wetIntensity = $derived(
  wetnessState.level === "soaked" ? 1
  : wetnessState.level === "wet"  ? 0.65
  : wetnessState.level === "damp" ? 0.3
  : 0
);

const activeWounds = $derived(woundState.active);
const activeStatuses = $derived(statusState.active);

const anyActive = $derived(
  coldIntensity > 0 || heatIntensity > 0 || toxinIntensity > 0 || wetIntensity > 0 || activeWounds.length > 0 || activeStatuses.length > 0
);

const coreColor = $derived(
  coldIntensity >= heatIntensity
    ? `rgba(59,130,246,${coldIntensity * 0.75})`
    : `rgba(249,115,22,${heatIntensity * 0.75})`
);

const bodyParts = ["head", "left_arm", "right_arm", "core", "left_leg", "right_leg"];

function getWoundLocationRaw(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bodyParts[Math.abs(hash) % bodyParts.length] ?? "core";
}

function getWoundLocation(id: string): string {
  return getWoundLocationRaw(id).replace("_", " ");
}

// Environmental statuses like damp, wet, soaked are already represented on the silhouette
// core/skin fills, but starving or exhaustion are important to list as status chips.
function shouldShowStatusItem(id: StatusId): boolean {
  return ![StatusId.Damp, StatusId.Wet, StatusId.Soaked].includes(id);
}

function handleOpenTreatment(): void {
  overlayStack.push(OverlayId.Medicine);
}
</script>

{#if anyActive}
  <div
    class="condition-panel"
    onclick={handleOpenTreatment}
    onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpenTreatment(); }}
    role="button"
    tabindex="0"
    aria-label="Player condition and injuries diagnostics. Click to open medical treatment screen."
  >
    <div class="silhouette-container">
      <svg viewBox="0 0 32 64" width="48" height="96" xmlns="http://www.w3.org/2000/svg">
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
        <ellipse cx="16" cy="10" rx="6" ry="6.5" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />
        <rect x="10" y="16" width="12" height="22" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />
        <rect x="5" y="16" width="5" height="16" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />
        <rect x="22" y="16" width="5" height="16" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />
        <rect x="11" y="38" width="4" height="18" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />
        <rect x="17" y="38" width="4" height="18" rx="2" fill="none" stroke="var(--text-soft)" stroke-width="1.5" opacity="0.4" />

        <!-- Core glow (cold or heat) -->
        {#if coldIntensity > 0 || heatIntensity > 0}
          <rect x="11" y="17" width="10" height="18" rx="1" fill={coreColor} />
        {/if}

        <!-- Head glow (toxins) -->
        {#if toxinIntensity > 0}
          <ellipse cx="16" cy="10" rx="5.5" ry="6" fill="rgba(168,85,247,{toxinIntensity * 0.65})" />
        {/if}

        <!-- Wounds rendering -->
        {#each activeWounds as wound (wound.id)}
          {@const part = getWoundLocationRaw(wound.id)}
          {#if part === "head"}
            <ellipse cx="16" cy="10" rx="5.5" ry="6" fill="rgba(239,68,68,0.4)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="13" y1="8" x2="19" y2="12" stroke="#b91c1c" stroke-width="1.8" />
          {:else if part === "core"}
            <rect x="11" y="17" width="10" height="20" rx="1" fill="rgba(239,68,68,0.45)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="12" y1="22" x2="20" y2="30" stroke="#b91c1c" stroke-width="1.8" />
          {:else if part === "left_arm"}
            <rect x="6" y="17" width="3" height="14" rx="1" fill="rgba(239,68,68,0.4)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="6" y1="20" x2="9" y2="25" stroke="#b91c1c" stroke-width="1.5" />
          {:else if part === "right_arm"}
            <rect x="23" y="17" width="3" height="14" rx="1" fill="rgba(239,68,68,0.4)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="23" y1="20" x2="26" y2="25" stroke="#b91c1c" stroke-width="1.5" />
          {:else if part === "left_leg"}
            <rect x="12" y="39" width="2" height="16" rx="1" fill="rgba(239,68,68,0.4)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="12" y1="42" x2="14" y2="49" stroke="#b91c1c" stroke-width="1.5" />
          {:else if part === "right_leg"}
            <rect x="18" y="39" width="2" height="16" rx="1" fill="rgba(239,68,68,0.4)" stroke="#ef4444" stroke-width="1.2" />
            <line x1="18" y1="42" x2="20" y2="49" stroke="#b91c1c" stroke-width="1.5" />
          {/if}
        {/each}
      </svg>
    </div>

    <!-- Diagnostic List on the right -->
    <div class="condition-list">
      {#each activeWounds as wound (wound.id)}
        <div class="condition-item wound" class:bleeding={wound.bleeding} class:infected={wound.infected}>
          <span class="status-icon">{wound.bleeding ? "🩸" : wound.infected ? "🤢" : "🩹"}</span>
          <span class="status-label">{wound.severity.replace("_", " ")}</span>
          <span class="status-location">({getWoundLocation(wound.id)})</span>
        </div>
      {/each}

      {#each activeStatuses as status (status.id)}
        {#if shouldShowStatusItem(status.id)}
          <div class="condition-item status {status.id}">
            <span class="status-icon">{STATUS_DEFINITIONS[status.id]?.icon || "🩹"}</span>
            <span class="status-label">{STATUS_DEFINITIONS[status.id]?.label || status.id}</span>
            <span class="status-time">{Math.ceil(status.remainingSec)}s</span>
          </div>
        {/if}
      {/each}

      <!-- Environmental items -->
      {#if coldIntensity > 0}
        <div class="condition-item env cold">
          <span class="status-icon">❄️</span>
          <span class="status-label">freezing</span>
          <span class="status-percent">{Math.round(coldIntensity * 100)}%</span>
        </div>
      {/if}
      {#if heatIntensity > 0}
        <div class="condition-item env heat">
          <span class="status-icon">🔥</span>
          <span class="status-label">overheating</span>
          <span class="status-percent">{Math.round(heatIntensity * 100)}%</span>
        </div>
      {/if}
      {#if toxinIntensity > 0}
        <div class="condition-item env toxic">
          <span class="status-icon">☣️</span>
          <span class="status-label">toxins</span>
          <span class="status-percent">{Math.round(toxinIntensity * 100)}%</span>
        </div>
      {/if}
      {#if wetIntensity > 0}
        <div class="condition-item env wet">
          <span class="status-icon">💧</span>
          <span class="status-label">{wetnessState.level}</span>
          <span class="status-percent">{Math.round(wetIntensity * 100)}%</span>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .condition-panel {
    position: fixed;
    bottom: 5.8rem;
    left: 1.1rem;
    display: flex;
    align-items: center;
    gap: 0;
    pointer-events: auto; /* enable click / hover */
    cursor: pointer;
    z-index: 88;
    background: rgba(18, 14, 12, 0.88);
    border: 1px solid rgba(185, 155, 98, 0.35);
    border-radius: 6px;
    padding: 0.6rem 0.7rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 238, 190, 0.02);
    transition: padding 0.35s ease, gap 0.35s ease, border-color 0.2s ease;
  }

  .condition-panel:hover {
    border-color: rgba(185, 155, 98, 0.7);
    padding: 0.6rem 0.9rem;
  }

  .silhouette-container {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.2rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .condition-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
    max-width: 0;
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-width 0.35s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-left 0.35s ease;
  }

  .condition-panel:hover .condition-list {
    max-width: 190px;
    max-height: 300px;
    opacity: 1;
    margin-left: 0.8rem;
  }

  .condition-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.68rem;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.03);
    border-left: 2px solid transparent;
  }

  .condition-item.wound {
    color: #f87171;
    border-left-color: #ef4444;
  }

  .condition-item.wound.bleeding {
    animation: pulse-red 1.5s infinite alternate;
  }

  .condition-item.wound.infected {
    color: #a7f3d0;
    border-left-color: #10b981;
  }

  .condition-item.status {
    color: #e2e8f0;
    border-left-color: #94a3b8;
  }

  .condition-item.status.bleeding {
    color: #f87171;
    border-left-color: #ef4444;
  }

  .condition-item.status.starving {
    color: #fb923c;
    border-left-color: #ea580c;
  }

  .condition-item.status.poison {
    color: #c084fc;
    border-left-color: #a855f7;
  }

  .condition-item.status.sickness {
    color: #a7f3d0;
    border-left-color: #10b981;
  }

  .status-location {
    font-size: 0.6rem;
    color: rgba(248, 113, 113, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .status-time, .status-percent {
    margin-left: auto;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.45);
  }

  @keyframes pulse-red {
    from { box-shadow: inset 2px 0 0 rgba(239, 68, 68, 0.15); }
    to { box-shadow: inset 2px 0 8px rgba(239, 68, 68, 0.45); }
  }
</style>
