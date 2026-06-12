<script lang="ts">
import { gameState } from "$lib/state/game-state.svelte";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { localRpgCommands } from "$lib/state/persistence/rpg-commands";
import { getItemDef } from "$lib/domain/items";

let hoveredSlot = $state<string | null>(null);

function getMaxDurability(itemId: string): number {
  if (itemId.startsWith("starter_")) return 50;
  return 100;
}

function getDurabilityPercent(current: number, max: number): number {
  return Math.max(0, Math.min(100, (current / max) * 100));
}

function getDurabilityColor(percent: number): string {
  if (percent > 50) return "var(--gear-good)";
  if (percent > 20) return "var(--gear-warning)";
  return "var(--gear-danger)";
}

async function unequipTool() {
  try {
    applyRpgState(localRpgCommands.equipTool(null));
  } catch (err) {
    console.error("Failed to unequip:", err);
  }
}

const weapon = $derived(() => {
  const w = gameState.rpg.profile?.loadout?.weapon;
  if (!w) return null;
  if (typeof w === "string") {
    return { itemId: w, durability: getMaxDurability(w) };
  }
  return w;
});

const weaponMeta = $derived(() => {
  const w = weapon();
  return w ? getItemDef(w.itemId) ?? null : null;
});
</script>

<div class="equip-panel">
  <div class="panel-header">
    loadout
  </div>

  <div class="gear-slots">
    <!-- Row 1: Helmet -->
    <div class="slot-row">
      <div 
        class="slot empty" 
        role="presentation"
        onmouseenter={() => (hoveredSlot = "head")} 
        onmouseleave={() => (hoveredSlot = null)}
      >
        <span class="slot-placeholder">head</span>
      </div>
    </div>

    <!-- Row 2: Weapon + Chest + Shield -->
    <div class="slot-row side-slots">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="slot weapon-slot {weapon() ? 'filled' : 'empty'}" 
        role="presentation"
        onclick={weapon() ? unequipTool : undefined}
        onmouseenter={() => (hoveredSlot = "weapon")} 
        onmouseleave={() => (hoveredSlot = null)}
        title={weapon() ? "Click to unequip tool" : "Equip a tool from stash"}
      >
        {#if weapon()}
          {@const meta = weaponMeta()}
          {#if meta}
            {#if meta.iconUrl}
              <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
            {:else if meta.icon}
              <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
            {:else}
              <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
            {/if}
          {/if}
        {:else}
          <span class="slot-placeholder">tool</span>
        {/if}
      </div>

      <div 
        class="slot empty" 
        role="presentation"
        onmouseenter={() => (hoveredSlot = "chest")} 
        onmouseleave={() => (hoveredSlot = null)}
      >
        <span class="slot-placeholder">body</span>
      </div>

      <div 
        class="slot empty" 
        role="presentation"
        onmouseenter={() => (hoveredSlot = "shield")} 
        onmouseleave={() => (hoveredSlot = null)}
      >
        <span class="slot-placeholder">guard</span>
      </div>
    </div>

    <!-- Row 3: Pants -->
    <div class="slot-row">
      <div 
        class="slot empty" 
        role="presentation"
        onmouseenter={() => (hoveredSlot = "legs")} 
        onmouseleave={() => (hoveredSlot = null)}
      >
        <span class="slot-placeholder">legs</span>
      </div>
    </div>

    <!-- Row 4: Boots -->
    <div class="slot-row">
      <div 
        class="slot empty" 
        role="presentation"
        onmouseenter={() => (hoveredSlot = "feet")} 
        onmouseleave={() => (hoveredSlot = null)}
      >
        <span class="slot-placeholder">feet</span>
      </div>
    </div>
  </div>

  <!-- Durability bar & tooltip details -->
  <div class="slot-details">
    {#if hoveredSlot === "weapon" && weapon()}
      {@const maxDur = getMaxDurability(weapon()!.itemId)}
      {@const pct = getDurabilityPercent(weapon()!.durability, maxDur)}
      <div class="details-active">
        <div class="item-name">{weaponMeta()?.name ?? weapon()!.itemId}</div>
        <div class="durability-info">
          <span>Durability: {weapon()!.durability} / {maxDur}</span>
          <span style="color: {getDurabilityColor(pct)}">{Math.round(pct)}%</span>
        </div>
        <div class="durability-track">
          <div 
            class="durability-fill" 
            style="width: {pct}%; background-color: {getDurabilityColor(pct)};"
          ></div>
        </div>
        <div class="action-hint">Click slot to unequip</div>
      </div>
    {:else if hoveredSlot}
      <div class="details-locked">
        <span class="lock-icon">locked</span> tier 2 shelter required
      </div>
    {:else if weapon()}
      {@const maxDur = getMaxDurability(weapon()!.itemId)}
      {@const pct = getDurabilityPercent(weapon()!.durability, maxDur)}
      <div class="details-active">
        <div class="item-name">{weaponMeta()?.name ?? weapon()!.itemId}</div>
        <div class="durability-info">
          <span>Durability: {weapon()!.durability} / {maxDur}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div class="durability-track">
          <div 
            class="durability-fill" 
            style="width: {pct}%; background-color: {getDurabilityColor(pct)};"
          ></div>
        </div>
      </div>
    {:else}
      <div class="details-empty">
        no tool equipped. trees and stone nodes need the right tool.
      </div>
    {/if}
  </div>
</div>

<style>
  .equip-panel {
    --gear-good: var(--color-success, lightgreen);
    --gear-warning: var(--color-warning, gold);
    --gear-danger: var(--color-danger, tomato);
    position: absolute;
    top: 5rem;
    left: 1.1rem;
    width: 250px;
    background: rgba(18, 14, 12, 0.82);
    border: 1px solid rgba(255, 220, 120, 0.15);
    border-radius: 8px;
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    z-index: 90;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    font-family: "IBM Plex Mono", monospace;
    color: var(--color-text, white);
    user-select: none;
    pointer-events: auto;
  }

  .panel-header {
    text-align: center;
    padding: 0.8rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: rgba(255, 220, 120, 0.95);
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(255, 220, 120, 0.1);
  }

  .gear-slots {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.2rem 1rem;
  }

  .slot-row {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .side-slots {
    justify-content: space-between;
    padding: 0 1rem;
  }

  .slot {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: all 0.12s;
  }

  .slot.empty {
    opacity: 0.35;
  }

  .slot.filled {
    border-color: rgba(255, 220, 120, 0.7);
    background: rgba(255, 220, 120, 0.05);
    cursor: pointer;
  }

  .slot.filled:hover {
    border-color: rgba(255, 220, 120, 0.9);
    background: rgba(255, 220, 120, 0.12);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.12);
  }

  .slot-placeholder {
    font-size: 1.3rem;
  }

  .slot-icon {
    font-size: 1.4rem;
  }

  .slot-icon-emoji {
    font-size: 1.6rem;
    line-height: 1;
  }

  .slot-details {
    padding: 0.8rem 1rem;
    background: rgba(12, 9, 8, 0.95);
    border-top: 1px solid rgba(255, 220, 120, 0.1);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    min-height: 72px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .details-empty {
    font-size: 0.65rem;
    color: rgba(244, 67, 54, 0.85);
    text-align: center;
    line-height: 1.4;
  }

  .details-locked {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.35);
    text-align: center;
  }

  .lock-icon {
    margin-right: 0.2rem;
  }

  .details-active {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .item-name {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 220, 120, 0.95);
  }

  .durability-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .durability-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 1px;
    overflow: hidden;
    margin-top: 0.15rem;
  }

  .durability-fill {
    height: 100%;
    border-radius: 1px;
    transition: width 0.2s;
  }

  .action-hint {
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    margin-top: 0.3rem;
  }

  .item-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
