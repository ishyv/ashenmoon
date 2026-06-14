<script lang="ts">
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import type { WorldActionOption } from "$lib/domain/world-actions";

interface ObjectActionEngine {
  executeWorldAction(action: WorldActionOption): void;
}

let {
  title,
  actions,
  engine,
  onClose,
}: {
  title: string;
  actions: WorldActionOption[];
  engine: ObjectActionEngine | null;
  onClose: () => void;
} = $props();

function execute(action: WorldActionOption) {
  engine?.executeWorldAction(action);
  if (action.executeIntent.kind !== "carcass.inspect") onClose();
}
</script>

<GamePanel id="object-action-panel" title={title} width="22rem" {onClose}>
  <div class="action-list">
    {#if actions.length === 0}
      <p class="empty">nothing useful here.</p>
    {:else}
      {#each actions as action (action.id)}
        <button class="action-row" onclick={() => execute(action)}>
          <span class="action-label">{action.label}</span>
          {#if action.durationSec}
            <span class="action-duration">{action.durationSec}s</span>
          {/if}
        </button>
      {/each}
    {/if}
  </div>
</GamePanel>

<style>
  .action-list {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    min-width: 0;
  }

  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    min-height: 2.4rem;
    padding: 0.55rem 0.65rem;
    border: 1px solid rgba(255, 220, 120, 0.14);
    border-radius: 4px;
    background: rgba(255, 220, 120, 0.06);
    color: #eadfc4;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
  }

  .action-row:hover {
    border-color: rgba(255, 220, 120, 0.32);
    background: rgba(255, 220, 120, 0.11);
  }

  .action-label {
    overflow-wrap: anywhere;
  }

  .action-duration {
    flex: 0 0 auto;
    color: rgba(234, 223, 196, 0.62);
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
  }

  .empty {
    margin: 0;
    color: rgba(234, 223, 196, 0.62);
  }
</style>
