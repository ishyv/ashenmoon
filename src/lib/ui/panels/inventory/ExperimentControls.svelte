<script lang="ts">
import { getItemDef } from "$lib/domain/items";
import type { InventoryItemView } from "./types";

let {
  items,
  inputs,
  message,
  experimentQty,
  addIngredient,
  removeIngredient,
  runExperiment,
  clearExperiment,
}: {
  items: InventoryItemView[];
  inputs: Record<string, number>;
  message: string;
  experimentQty: (itemId: string) => number;
  addIngredient: (itemId: string) => void;
  removeIngredient: (itemId: string) => void;
  runExperiment: () => void;
  clearExperiment: () => void;
} = $props();
</script>

<div class="recipe-card">
  <div>
    <div class="recipe-name">experiment</div>
    <div class="recipe-desc">combine gathered materials to learn recipes.</div>
  </div>

  <div class="cost-list">
    {#each items as { itemId, qty }}
      {@const meta = getItemDef(itemId)}
      {#if meta?.category !== "tool"}
        <button class="cost-item met" disabled={experimentQty(itemId) >= qty} onclick={() => addIngredient(itemId)}>
          <span>{meta?.name.toLowerCase() ?? itemId}</span>
          <span>{experimentQty(itemId)} / {qty}</span>
        </button>
      {/if}
    {/each}
  </div>

  {#if Object.keys(inputs).length > 0}
    <div class="cost-list">
      {#each Object.entries(inputs) as [itemId, qty]}
        <button class="cost-item met" onclick={() => removeIngredient(itemId)}>
          <span>{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
          <span>x{qty}</span>
        </button>
      {/each}
    </div>
  {/if}

  {#if message}
    <div class="message">{message}</div>
  {/if}

  <div class="actions">
    <button class="panel-btn enabled" onclick={runExperiment}>try mix</button>
    <button class="panel-btn muted" onclick={clearExperiment}>clear</button>
  </div>
</div>

<style>
  .recipe-card {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.75rem;
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface-soft);
  }

  .recipe-name {
    font-size: 0.82rem;
    font-weight: 700;
  }

  .recipe-desc,
  .message {
    color: var(--inv-text-muted);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .cost-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .cost-item {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    border: 0;
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface);
    color: var(--inv-text);
    padding: 0.3rem 0.45rem;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .cost-item:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .panel-btn {
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-sm);
    padding: 0.42rem;
    background: transparent;
    color: var(--inv-text);
    cursor: pointer;
  }

  .panel-btn.enabled {
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
  }

  .panel-btn.muted {
    color: var(--inv-text-muted);
  }
</style>

