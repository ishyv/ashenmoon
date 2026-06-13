<script lang="ts">
/**
 * Active status chips above the HUD bars: icon + label + remaining seconds.
 * Reads `statusState.active`; never decides anything (the status system owns
 * application/expiry, this only displays it).
 */
import { fade } from "svelte/transition";
import { statusState } from "$lib/state/rpg/status-effects.svelte";
import { STATUS_DEFINITIONS } from "$lib/domain/systems/status-types";
</script>

{#if statusState.active.length > 0}
  <div class="status-row" transition:fade={{ duration: 200 }}>
    {#each statusState.active as status (status.id)}
      {@const def = STATUS_DEFINITIONS[status.id]}
      <div class="chip" transition:fade={{ duration: 200 }}>
        <span class="chip-icon">{def.icon}</span>
        <span class="chip-label">{def.label}</span>
        <span class="chip-time">{Math.ceil(status.remainingSec)}s</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .status-row {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    pointer-events: none;
    user-select: none;
    margin-bottom: 0.4rem;
  }

  .chip {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: rgba(18, 14, 12, 0.7);
    border: 1px solid rgba(240, 90, 90, 0.35);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    backdrop-filter: blur(4px);
  }

  .chip-icon {
    font-size: 0.8rem;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
  }

  .chip-label {
    font-size: 0.68rem;
    font-family: "IBM Plex Mono", monospace;
    color: rgba(255, 220, 220, 0.9);
  }

  .chip-time {
    font-size: 0.6rem;
    font-family: "IBM Plex Mono", monospace;
    color: rgba(255, 255, 255, 0.45);
  }
</style>

