<script lang="ts">
import { onDestroy } from "svelte";
import { getItemDef, traitOf } from "$lib/domain/items";
import ItemIcon from "$lib/ui/components/ItemIcon.svelte";
import { playSound } from "$lib/audio/audio-engine";
import type { InventoryItemView } from "./types";
import { dragState } from "$lib/state/drag.svelte";
import type { ItemId } from "$lib/domain/items";
import { ambientTellChance } from "$lib/domain/crafting/curse-effects";

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

// Cosmetic-only, mechanically-inert tell for Possessed items: an occasional glitch,
// deliberately unreliable (never a clean "this is cursed" signal). Checked on a slow
// interval per cursed cell rather than a CSS loop, since it must stay rare, not ambient motion.
let glitching = $state<Set<string>>(new Set());
const tellInterval = setInterval(() => {
  for (const item of items) {
    if (!item.cursed) continue;
    if (Math.random() < ambientTellChance(item.curseLevel ?? 1)) {
      glitching = new Set(glitching).add(item.itemId);
      setTimeout(() => {
        const next = new Set(glitching);
        next.delete(item.itemId);
        glitching = next;
      }, 160);
    }
  }
}, 1000);
onDestroy(() => clearInterval(tellInterval));
</script>

<div class="grid-scroll">
  {#if items.length === 0}
    <div class="empty-state">nothing gathered yet.</div>
  {:else}
    <div class="grid">
      {#each items as { itemId, qty, tier } (itemId)}
        {@const meta = getItemDef(itemId)}
        {@const isGlitching = glitching.has(itemId)}
        <button
          type="button"
          class="item-cell {selectedItem === itemId ? 'selected' : ''} {isEquipped(itemId) ? 'equipped' : ''} {tier ? `tier-${tier}` : ''} {isGlitching ? 'glitching' : ''}"
          style="opacity: {dragState.active?.source === 'inventory' && dragState.active?.itemId === itemId ? 0.4 : 1}"
          draggable="true"
          onmouseenter={() => onHover(itemId)}
          onmouseleave={() => onHover(null)}
          onclick={() => {
            onSelect(itemId);
            playSound("ui.inventory.click", { conditions: { itemType: meta?.category ?? "component" } });
          }}
          ondblclick={() => onDblClick?.(itemId)}
          ondragstart={(e) => {
            dragState.set({ source: 'inventory', itemId: itemId as ItemId });
            const ghost = document.createElement('div');
            ghost.style.cssText = 'position:fixed;top:-9999px;width:1px;height:1px';
            document.body.appendChild(ghost);
            e.dataTransfer?.setDragImage(ghost, 0, 0);
            requestAnimationFrame(() => document.body.removeChild(ghost));
          }}
          ondragend={() => {
            dragState.clear();
          }}
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

  .item-cell.tier-sloppy { border-color: var(--inv-tier-sloppy); }
  .item-cell.tier-robust { border-color: var(--inv-tier-robust); }
  .item-cell.tier-pristine { border-color: var(--inv-tier-pristine); }
  .item-cell.tier-masterwork { border-color: var(--inv-tier-masterwork); }
  .item-cell.tier-fable { border-color: var(--inv-tier-fable); }
  .item-cell.tier-divine {
    border-color: var(--inv-tier-divine);
    box-shadow: 0 0 0 1px var(--inv-tier-divine), inset 0 0 0 2px var(--inv-tier-fable);
  }

  /* Cosmetic-only Possessed tell: a brief, unreliable glitch. No confirmation, no label. */
  .item-cell.glitching {
    border-color: var(--inv-cursed-tell);
    filter: contrast(1.4) brightness(0.85);
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
