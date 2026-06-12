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

const materialItems = $derived(items.filter(item => getItemDef(item.itemId)?.category !== "tool"));
</script>

<div class="experiment-details">
  <header class="detail-header">
    <div class="title-row">
      <h4 class="recipe-title">alchemical experiment</h4>
    </div>
    <p class="recipe-desc">combine raw materials in the crucible to discover new formulae.</p>
  </header>

  <div class="experiment-grid">
    <!-- Left Column: Available Raw Materials -->
    <section class="materials-section">
      <h5 class="section-title">available materials</h5>
      <div class="materials-list">
        {#if materialItems.length === 0}
          <div class="materials-empty">no raw materials available.</div>
        {:else}
          {#each materialItems as { itemId, qty }}
            {@const meta = getItemDef(itemId)}
            {@const added = experimentQty(itemId)}
            {@const maxReached = added >= qty}
            <button 
              class="material-card" 
              class:max-reached={maxReached}
              disabled={maxReached}
              onclick={() => addIngredient(itemId)}
            >
              <div class="material-name-row">
                <span class="material-name">{meta?.name.toLowerCase() ?? itemId}</span>
                <span class="material-qty">{added} / {qty}</span>
              </div>
              <div class="material-action-tip">add to mixture</div>
            </button>
          {/each}
        {/if}
      </div>
    </section>

    <!-- Right Column: The Crucible (Current mix) -->
    <section class="crucible-section">
      <h5 class="section-title">the crucible</h5>
      <div class="crucible-list">
        {#if Object.keys(inputs).length === 0}
          <div class="crucible-empty">
            <span class="crucible-icon">🏺</span>
            <span class="crucible-tip">crucible is empty. add materials to begin.</span>
          </div>
        {:else}
          {#each Object.entries(inputs) as [itemId, qty]}
            <button 
              class="crucible-card" 
              onclick={() => removeIngredient(itemId)}
              title="Remove from crucible"
            >
              <span class="crucible-item-name">{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
              <span class="crucible-item-qty">x{qty}</span>
            </button>
          {/each}
        {/if}
      </div>
    </section>
  </div>

  {#if message}
    <div class="experiment-message" class:success={message.toLowerCase().includes("success") || message.toLowerCase().includes("learned") || message.toLowerCase().includes("discovered")}>
      <span class="msg-icon">✦</span>
      <span class="msg-text">{message.toLowerCase()}</span>
    </div>
  {/if}

  <div class="experiment-actions">
    <button 
      class="action-btn mix-btn" 
      class:enabled={Object.keys(inputs).length > 0}
      disabled={Object.keys(inputs).length === 0}
      onclick={runExperiment}
    >
      transmute mixture
    </button>
    <button 
      class="action-btn clear-btn" 
      class:enabled={Object.keys(inputs).length > 0}
      disabled={Object.keys(inputs).length === 0}
      onclick={clearExperiment}
    >
      clear
    </button>
  </div>
</div>

<style>
  .experiment-details {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.8rem;
  }

  .detail-header {
    border-bottom: 1px solid var(--inv-border-muted);
    padding-bottom: 0.6rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    margin-bottom: 0.2rem;
  }

  .recipe-title {
    font-family: "Cinzel", serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--inv-accent);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
  }

  .recipe-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.82rem;
    color: var(--inv-text-muted);
    line-height: 1.45;
    margin: 0;
  }

  .experiment-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 0.75rem;
    flex: 1;
    min-height: 0;
  }

  .materials-section,
  .crucible-section {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-height: 0;
  }

  .section-title {
    font-family: "Cinzel", serif;
    font-size: 0.68rem;
    font-weight: bold;
    color: var(--inv-text-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin: 0;
    opacity: 0.8;
  }

  .materials-list,
  .crucible-list {
    flex: 1;
    overflow-y: auto;
    border: 1px solid rgba(255, 220, 120, 0.05);
    background: rgba(10, 8, 7, 0.3);
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .materials-empty {
    padding: 1rem 0.5rem;
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted);
    text-align: center;
  }

  .material-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--inv-border-muted);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 3px;
    color: var(--inv-text);
    font-family: inherit;
    font-size: 0.72rem;
    cursor: pointer;
    transition: all 0.12s;
    text-align: left;
  }

  .material-card:hover:not(:disabled) {
    background: rgba(255, 220, 120, 0.06);
    border-color: rgba(255, 220, 120, 0.2);
  }

  .material-card:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .material-name-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-weight: 500;
  }

  .material-name {
    color: rgba(255, 255, 255, 0.85);
  }

  .material-qty {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.7rem;
    color: var(--inv-text-muted);
  }

  .material-action-tip {
    font-size: 0.58rem;
    color: var(--inv-text-muted);
    opacity: 0.6;
    text-transform: uppercase;
    margin-top: 0.1rem;
  }

  .crucible-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: 0.5rem;
    padding: 1rem;
    text-align: center;
  }

  .crucible-icon {
    font-size: 1.5rem;
    opacity: 0.5;
  }

  .crucible-tip {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted);
  }

  .crucible-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.4rem 0.6rem;
    border: 1px solid rgba(255, 220, 120, 0.15);
    background: rgba(255, 220, 120, 0.03);
    border-radius: 3px;
    color: var(--inv-accent);
    cursor: pointer;
    transition: all 0.12s;
    width: 100%;
    text-align: left;
  }

  .crucible-card:hover {
    background: rgba(244, 67, 54, 0.05);
    border-color: rgba(244, 67, 54, 0.3);
    color: #ff5555;
  }

  .crucible-item-name {
    font-size: 0.72rem;
    font-weight: 600;
  }

  .crucible-item-qty {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.7rem;
  }

  .experiment-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--inv-border-muted);
    border-radius: 4px;
  }

  .experiment-message.success {
    border-color: rgba(76, 175, 80, 0.3);
    background: rgba(76, 175, 80, 0.05);
    color: var(--inv-good);
  }

  .msg-icon {
    font-size: 0.8rem;
    color: var(--inv-accent);
  }

  .experiment-message.success .msg-icon {
    color: var(--inv-good);
  }

  .msg-text {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .experiment-actions {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 0.5rem;
  }

  .action-btn {
    border: 1px solid var(--inv-border-muted);
    border-radius: 4px;
    padding: 0.6rem;
    font-family: "Cinzel", serif;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: not-allowed;
    transition: all 0.15s;
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted);
  }

  .mix-btn.enabled {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.05);
  }

  .mix-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.22);
    color: #fff;
    box-shadow: 0 0 16px rgba(255, 220, 120, 0.15);
    transform: translateY(-1px);
  }

  .clear-btn.enabled {
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--inv-text);
    cursor: pointer;
  }

  .clear-btn.enabled:hover {
    border-color: #ff5555;
    background: rgba(244, 67, 54, 0.15);
    color: #ff5555;
  }
</style>
