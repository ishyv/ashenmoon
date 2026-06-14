<script lang="ts">
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { getItemDef, traitOf } from "$lib/domain/items";

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
    const result = await dispatchRpgCommand({ type: "equipTool", itemId: null });
    if (!result.ok) throw new Error(result.error);
  } catch (err) {
    console.error("Failed to unequip tool:", err);
  }
}

async function unequipGear(slot: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace") {
  try {
    const result = await dispatchRpgCommand({ type: "equipGear", itemId: null, slot });
    if (!result.ok) throw new Error(result.error);
  } catch (err) {
    console.error(`Failed to unequip ${slot}:`, err);
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

const helmet = $derived(() => {
  const h = gameState.rpg.profile?.loadout?.helmet;
  if (!h) return null;
  if (typeof h === "string") {
    return { itemId: h, durability: getMaxDurability(h) };
  }
  return h;
});

const helmetMeta = $derived(() => {
  const h = helmet();
  return h ? getItemDef(h.itemId) ?? null : null;
});

const chest = $derived(() => {
  const c = gameState.rpg.profile?.loadout?.chest;
  if (!c) return null;
  if (typeof c === "string") {
    return { itemId: c, durability: getMaxDurability(c) };
  }
  return c;
});

const chestMeta = $derived(() => {
  const c = chest();
  return c ? getItemDef(c.itemId) ?? null : null;
});

const boots = $derived(() => {
  const b = gameState.rpg.profile?.loadout?.boots;
  if (!b) return null;
  if (typeof b === "string") {
    return { itemId: b, durability: getMaxDurability(b) };
  }
  return b;
});

const bootsMeta = $derived(() => {
  const b = boots();
  return b ? getItemDef(b.itemId) ?? null : null;
});

const shield = $derived(() => {
  const s = gameState.rpg.profile?.loadout?.shield;
  if (!s) return null;
  if (typeof s === "string") {
    return { itemId: s, durability: getMaxDurability(s) };
  }
  return s;
});

const shieldMeta = $derived(() => {
  const s = shield();
  return s ? getItemDef(s.itemId) ?? null : null;
});

const pants = $derived(() => {
  const p = gameState.rpg.profile?.loadout?.pants;
  if (!p) return null;
  if (typeof p === "string") {
    return { itemId: p, durability: getMaxDurability(p) };
  }
  return p;
});

const pantsMeta = $derived(() => {
  const p = pants();
  return p ? getItemDef(p.itemId) ?? null : null;
});

function getActiveSlotInfo(slot: string | null) {
  if (slot === "weapon") return { item: weapon(), meta: weaponMeta() };
  if (slot === "helmet") return { item: helmet(), meta: helmetMeta() };
  if (slot === "chest") return { item: chest(), meta: chestMeta() };
  if (slot === "boots") return { item: boots(), meta: bootsMeta() };
  if (slot === "shield") return { item: shield(), meta: shieldMeta() };
  if (slot === "pants") return { item: pants(), meta: pantsMeta() };
  return null;
}

const activeHoverDetail = $derived(() => {
  if (!hoveredSlot) return null;
  const info = getActiveSlotInfo(hoveredSlot);
  if (!info || !info.item) return null;
  const maxDur = getMaxDurability(info.item.itemId);
  const pct = getDurabilityPercent(info.item.durability, maxDur);
  const insulation = traitOf(info.meta ?? undefined, "insulation_material");
  const armor = traitOf(info.meta ?? undefined, "armor_material");
  return {
    name: info.meta?.name ?? info.item.itemId,
    durability: info.item.durability,
    maxDurability: maxDur,
    pct,
    insulation: insulation?.warmth ?? 0,
    armor: armor?.protection ?? 0,
  };
});
</script>

<GamePanel id="loadout" title="loadout">
  <div class="equip-panel-body">
    <div class="gear-slots">
      <!-- Row 1: Helmet -->
      <div class="slot-row">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="slot {helmet() ? 'filled' : 'empty'}" 
          role="presentation"
          onclick={helmet() ? () => unequipGear("helmet") : undefined}
          onmouseenter={() => (hoveredSlot = "helmet")} 
          onmouseleave={() => (hoveredSlot = null)}
          title={helmet() ? "Click to unequip headgear" : ""}
        >
          {#if helmet()}
            {@const meta = helmetMeta()}
            {#if meta}
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
                <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
              {:else if meta.icon}
                <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
              {:else}
                <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            {/if}
          {:else}
            <span class="slot-placeholder">head</span>
          {/if}
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
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
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

        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="slot {chest() ? 'filled' : 'empty'}" 
          role="presentation"
          onclick={chest() ? () => unequipGear("chest") : undefined}
          onmouseenter={() => (hoveredSlot = "chest")} 
          onmouseleave={() => (hoveredSlot = null)}
          title={chest() ? "Click to unequip chestwear" : ""}
        >
          {#if chest()}
            {@const meta = chestMeta()}
            {#if meta}
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
                <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
              {:else if meta.icon}
                <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
              {:else}
                <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            {/if}
          {:else}
            <span class="slot-placeholder">body</span>
          {/if}
        </div>

        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="slot {shield() ? 'filled' : 'empty'}" 
          role="presentation"
          onclick={shield() ? () => unequipGear("shield") : undefined}
          onmouseenter={() => (hoveredSlot = "shield")} 
          onmouseleave={() => (hoveredSlot = null)}
          title={shield() ? "Click to unequip guard" : ""}
        >
          {#if shield()}
            {@const meta = shieldMeta()}
            {#if meta}
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
                <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
              {:else if meta.icon}
                <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
              {:else}
                <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            {/if}
          {:else}
            <span class="slot-placeholder">guard</span>
          {/if}
        </div>
      </div>

      <!-- Row 3: Pants -->
      <div class="slot-row">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="slot {pants() ? 'filled' : 'empty'}" 
          role="presentation"
          onclick={pants() ? () => unequipGear("pants") : undefined}
          onmouseenter={() => (hoveredSlot = "pants")} 
          onmouseleave={() => (hoveredSlot = null)}
          title={pants() ? "Click to unequip legwear" : ""}
        >
          {#if pants()}
            {@const meta = pantsMeta()}
            {#if meta}
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
                <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
              {:else if meta.icon}
                <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
              {:else}
                <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            {/if}
          {:else}
            <span class="slot-placeholder">legs</span>
          {/if}
        </div>
      </div>

      <!-- Row 4: Boots -->
      <div class="slot-row">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="slot {boots() ? 'filled' : 'empty'}" 
          role="presentation"
          onclick={boots() ? () => unequipGear("boots") : undefined}
          onmouseenter={() => (hoveredSlot = "boots")} 
          onmouseleave={() => (hoveredSlot = null)}
          title={boots() ? "Click to unequip footwear" : ""}
        >
          {#if boots()}
            {@const meta = bootsMeta()}
            {#if meta}
              {#if meta.iconSheet}
                {@const s = meta.iconSheet}
                <div class="slot-icon" style="background-image:url({s.src});background-position:-{s.col*s.size}px -{s.row*s.size}px;width:{s.size}px;height:{s.size}px;background-repeat:no-repeat;image-rendering:pixelated;" role="img" aria-label={meta.name}></div>
              {:else if meta.iconUrl}
                <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" />
              {:else if meta.icon}
                <span class="slot-icon slot-icon-emoji">{meta.icon}</span>
              {:else}
                <span class="slot-icon">{meta.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            {/if}
          {:else}
            <span class="slot-placeholder">feet</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Durability bar & tooltip details -->
    <div class="slot-details">
      {#if activeHoverDetail()}
        {@const details = activeHoverDetail()!}
        <div class="details-active">
          <div class="item-name">{details.name}</div>
          <div class="durability-info">
            <span>Durability: {details.durability} / {details.maxDurability}</span>
            <span style="color: {getDurabilityColor(details.pct)}">{Math.round(details.pct)}%</span>
          </div>
          <div class="durability-track">
            <div 
              class="durability-fill" 
              style="width: {details.pct}%; background-color: {getDurabilityColor(details.pct)};"
            ></div>
          </div>
          <div class="extra-stats" style="font-size: 0.6rem; color: rgba(255, 255, 255, 0.7); display: flex; gap: 0.8rem; margin-top: 0.2rem;">
            {#if details.armor > 0}
              <span>Armor: +{details.armor}</span>
            {/if}
            {#if details.insulation > 0}
              <span>Warmth: +{details.insulation}</span>
            {/if}
          </div>
          <div class="action-hint">Click slot to unequip</div>
        </div>
      {:else if hoveredSlot}
        <div class="details-locked" style="color: rgba(255, 255, 255, 0.45); font-size: 0.65rem; text-align: center;">
          {hoveredSlot} slot is empty. equip gear from your stash.
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
</GamePanel>

<style>
  .equip-panel-body {
    --gear-good: var(--color-success, lightgreen);
    --gear-warning: var(--color-warning, gold);
    --gear-danger: var(--color-danger, tomato);
    width: 250px;
    display: flex;
    flex-direction: column;
    font-family: "IBM Plex Mono", monospace;
    color: var(--color-text, white);
    user-select: none;
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
    border-color: var(--color-primary, rgba(255, 220, 120, 0.7));
    background: rgba(255, 220, 120, 0.05);
    cursor: pointer;
    opacity: 1;
  }

  .slot.filled:hover {
    border-color: rgba(255, 220, 120, 0.9);
    background: rgba(255, 220, 120, 0.12);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.12);
  }

  .slot-placeholder {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
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
