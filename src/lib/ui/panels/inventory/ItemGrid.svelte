<script lang="ts">
import { getItemDef, traitOf } from "$lib/domain/items";
import ItemIcon from "$lib/ui/components/ItemIcon.svelte";
import { playSound } from "$lib/audio/audio-engine";
import type { InventoryItemView } from "./types";

let {
  items,
  selectedItem,
  decayProgress,
  isEquipped,
  onSelect,
  onHover,
  onDblClick,
}: {
  items: InventoryItemView[];
  selectedItem: string | null;
  decayProgress: Record<string, number>;
  isEquipped: (itemId: string) => boolean;
  onSelect: (itemId: string) => void;
  onHover: (itemId: string | null) => void;
  onDblClick?: (itemId: string) => void;
} = $props();
</script>

<div class="grid-scroll">
  {#if items.length === 0}
    <div class="empty-state">nothing gathered yet.</div>
  {:else}
    <div class="grid">
      {#each items as { itemId, qty } (itemId)}
        {@const meta = getItemDef(itemId)}
        <button
          type="button"
          class="item-cell {selectedItem === itemId ? 'selected' : ''} {isEquipped(itemId) ? 'equipped' : ''}"
          onmouseenter={() => onHover(itemId)}
          onmouseleave={() => onHover(null)}
          onclick={() => {
            onSelect(itemId);
            playSound("ui.inventory.click", { conditions: { itemType: meta?.category ?? "component" } });
          }}
          ondblclick={() => onDblClick?.(itemId)}
          aria-label="{meta?.name ?? itemId}{qty > 1 ? `, quantity ${qty}` : ''}"
        >
          <div class="item-visual">
            <ItemIcon def={meta} {itemId} />
          </div>
          {#if qty > 1}
            <div class="qty-badge">{qty}</div>
          {/if}
          {#if isEquipped(itemId)}
            <span class="equipped-tag">held</span>
          {/if}
          {#if traitOf(meta, "decayable") && decayProgress[itemId] !== undefined}
            <div class="decay-bar">
              <div class="decay-fill" style="width: {decayProgress[itemId]}%"></div>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .grid-scroll {
    overflow-y: auto;
    min-height: 10rem;
    max-height: 22rem;
    padding: var(--inv-space);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .item-cell {
    position: relative;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface-soft);
    color: var(--inv-text);
    cursor: pointer;
    padding: 0;
    font: inherit;
  }

  .item-cell:hover,
  .item-cell.selected {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
  }

  .item-cell.equipped {
    box-shadow: inset 0 0 0 1px var(--inv-accent);
  }

  .item-visual {
    width: 70%;
    height: 70%;
    display: grid;
    place-items: center;
    font-size: 1rem;
    font-weight: 700;
  }


  .qty-badge,
  .equipped-tag {
    position: absolute;
    right: 0.25rem;
    font-size: 0.6rem;
    color: var(--inv-text);
    text-shadow: 0 1px 2px var(--inv-shadow);
  }

  .qty-badge {
    bottom: 0.2rem;
  }

  .equipped-tag {
    top: 0.2rem;
    left: 0.25rem;
    right: auto;
    color: var(--inv-accent);
  }

  .decay-bar {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    height: 3px;
    background: var(--inv-border-muted);
  }

  .decay-fill {
    height: 100%;
    background: var(--inv-warning);
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--inv-text-muted);
    font-size: 0.78rem;
  }
</style>
