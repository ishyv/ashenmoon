<script lang="ts">
import { hotbarState } from '$lib/state/hotbar.svelte';
import { dragState } from '$lib/state/drag.svelte';
import { hudActivity } from '$lib/state/hud-activity.svelte';
import { gameState } from '$lib/state/game-state.svelte';
import { play } from '$lib/audio/audio-engine';
import { getItemDef } from '$lib/domain/items';
import { getAshenmoonItemIconPath } from '$lib/core/assets/render-resource-cache';
import ItemIcon from '$lib/ui/components/ItemIcon.svelte';

// ---------------------------------------------------------------------------
// Visibility
// ---------------------------------------------------------------------------

let hudOpacity = $state(hudActivity.restOpacity);
let transitionDuration = $state(`${hudActivity.fadeMs}ms`);
let localActive = $state(false);

$effect(() => {
  const id = setInterval(() => {
    const shouldShow = hudActivity.isActive || localActive;
    const next = shouldShow ? hudActivity.activeOpacity : hudActivity.restOpacity;
    if (next !== hudOpacity) {
      transitionDuration = next > hudOpacity
        ? `${hudActivity.revealMs}ms`
        : `${hudActivity.fadeMs}ms`;
      hudOpacity = next;
    }
  }, 100);
  return () => clearInterval(id);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const allEmpty = $derived(hotbarState.slots.every((s) => s === null));

// Returns stackable qty for hotbar item, or null for durability items.
function getStackQty(itemId: string): number | null {
  const invSlot = gameState.rpg.inventory?.slots[itemId];
  if (!invSlot || !('qty' in invSlot)) return null;
  return invSlot.qty;
}

// True when item has no count in inventory and is not equipped (stale bind).
function isItemMissing(itemId: string): boolean {
  // check equipped loadout first — gear items leave inventory when equipped
  const loadout = gameState.rpg.profile?.loadout;
  if (loadout) {
    const equipped = Object.values(loadout).some((slotVal) => slotVal === itemId);
    if (equipped) return false;
  }
  const invSlot = gameState.rpg.inventory?.slots[itemId];
  if (!invSlot) return true;
  if ('qty' in invSlot) return invSlot.qty === 0;
  return invSlot.instances.length === 0;
}

// ---------------------------------------------------------------------------
// Drag state
// ---------------------------------------------------------------------------

let dragOver = $state<number | null>(null);
</script>

<div
  class="hotbar"
  style="opacity: {allEmpty ? 0 : hudOpacity}; transition: opacity {transitionDuration} ease"
  onmouseenter={() => { localActive = true; }}
  onmouseleave={() => { localActive = false; }}
  role="group"
  aria-label="item hotbar"
>
  {#each hotbarState.slots as slot, i}
    {@const def = slot ? getItemDef(slot.itemId) : undefined}
    {@const qty = slot ? getStackQty(slot.itemId) : null}
    {@const missing = slot ? isItemMissing(slot.itemId) : false}
    <div
      class="slot"
      class:slot--filled={slot !== null}
      class:slot--active={hotbarState.flashSlot === i}
      class:slot--shake={hotbarState.shakeSlot === i}
      class:slot--dragover={dragOver === i}
      draggable={slot !== null}
      ondragstart={(e) => {
        if (!slot) return;
        dragState.set({ source: 'hotbar', itemId: slot.itemId, fromSlot: i });
        const img = new Image();
        img.src = getAshenmoonItemIconPath(slot.itemId);
        e.dataTransfer?.setDragImage(img, 12, 12);
      }}
      ondragend={() => {
        // If the drag ended without being accepted by a valid target the
        // payload was never consumed — unbind the slot to complete the gesture.
        if (dragState.active?.source === 'hotbar' && dragState.active?.fromSlot === i) {
          hotbarState.unbind(i);
          play('hotbar.unbind');
        }
        dragState.clear();
      }}
      ondragover={(e) => {
        e.preventDefault();
        dragOver = i;
      }}
      ondrop={(e) => {
        e.preventDefault();
        dragOver = null;
        const payload = dragState.active;
        if (!payload) return;
        if (payload.source === 'inventory') {
          hotbarState.bind(i, payload.itemId);
          play('hotbar.bind');
        } else if (payload.source === 'hotbar' && payload.fromSlot !== undefined) {
          hotbarState.swap(payload.fromSlot, i);
          play('hotbar.reorder');
        }
        dragState.clear();
      }}
      ondragleave={() => {
        dragOver = null;
      }}
      role="button"
      tabindex={-1}
      aria-label="slot {i + 1}{slot ? `: ${def?.name ?? slot.itemId}` : ''}"
    >
      <span class="key-num">{i + 1}</span>
      {#if slot}
        <div class="item-visual" style:opacity={missing ? 0.3 : 1}>
          <ItemIcon {def} itemId={slot.itemId} />
        </div>
        {#if qty !== null && qty > 1}
          <span class="qty-badge">{qty}</span>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<style>
  .hotbar {
    display: flex;
    gap: 0.25rem;
    pointer-events: auto;
    user-select: none;
  }

  .slot {
    position: relative;
    width: var(--hud-slot-size);
    height: var(--hud-slot-size);
    display: grid;
    place-items: center;
    background: oklch(from var(--bg-base) l c h / 0.3);
    border: 1px dashed var(--line);
    opacity: 0.15;
    cursor: default;
    overflow: hidden;
  }

  .slot--filled {
    border-style: solid;
    opacity: 1;
    cursor: grab;
  }

  .slot--dragover {
    border-color: var(--accent);
    background: oklch(from var(--bg-base) l c h / 0.5);
  }

  .key-num {
    position: absolute;
    top: 0.15rem;
    left: 0.2rem;
    font-size: 0.7rem;
    font-family: monospace;
    color: var(--text-soft);
    opacity: 0.4;
    line-height: 1;
    pointer-events: none;
  }

  .item-visual {
    width: 70%;
    height: 70%;
    display: grid;
    place-items: center;
    transition: opacity 150ms ease;
  }

  .qty-badge {
    position: absolute;
    bottom: 0.2rem;
    right: 0.25rem;
    font-size: 0.7rem;
    font-family: monospace;
    color: var(--text-soft);
    line-height: 1;
    pointer-events: none;
  }

  @keyframes slot-keypress-pulse {
    0% { border-color: var(--accent); box-shadow: 0 0 4px var(--accent); }
    100% { border-color: var(--line); box-shadow: none; }
  }

  .slot--active {
    animation: slot-keypress-pulse 200ms ease-out forwards;
  }

  @keyframes slot-shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }

  .slot--shake {
    animation: slot-shake 300ms ease-in-out;
  }
</style>
