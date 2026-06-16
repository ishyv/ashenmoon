<script lang="ts">
import { getItemDef } from "$lib/domain/items";
import type { CraftRecipe } from "$lib/domain/crafting/recipes";

let {
  allRecipes,
  knownRecipeIds,
  items,
  canCraft,
  craftItem,
  isNearCampfire,
}: {
  allRecipes: CraftRecipe[];
  knownRecipeIds: ReadonlySet<string>;
  items: { itemId: string; qty: number }[];
  canCraft: (recipe: CraftRecipe) => boolean;
  craftItem: (recipe: CraftRecipe) => void;
  isNearCampfire: () => boolean;
} = $props();

let selectedRecipeId = $state<string | null>(null);
let categoryFilter = $state<"all" | "tool" | "resource">("all");
let craftingSearchQuery = $state("");

const selectedRecipe = $derived(
  selectedRecipeId ? allRecipes.find((r) => r.id === selectedRecipeId) ?? null : null
);

const isKnown = $derived((recipeId: string) => knownRecipeIds.has(recipeId));

const filteredRecipes = $derived(
  allRecipes.filter((r) => {
    const def = getItemDef(r.output.itemId);
    const matchesSearch = r.name.toLowerCase().includes(craftingSearchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (categoryFilter === "tool") return def?.category === "tool";
    if (categoryFilter === "resource") return def?.category !== "tool";
    return true;
  })
);

const nearCampfire = $derived(isNearCampfire());

const totalSlots = $derived(selectedRecipe ? selectedRecipe.costs.length : 3);
const slotIndices = $derived(Array.from({ length: totalSlots }, (_, i) => i));

const circleRadius = 66;
const centerCoord = 90;
const slotSize = 38;

function isRecipeReady(recipe: CraftRecipe): boolean {
  return isKnown(recipe.id) && canCraft(recipe);
}

function getItemQty(itemId: string): number {
  return items.find((i) => i.itemId === itemId)?.qty ?? 0;
}
</script>

<div class="crafting-dual-pane">
  <!-- Left Pane: Grimoire -->
  <aside class="recipe-sidebar">
    <div class="grimoire-header">
      <span class="grimoire-title">grimoire</span>
      <div class="category-tabs">
        <button
          class="tab-btn"
          class:active={categoryFilter === "all"}
          onclick={() => (categoryFilter = "all")}
        >all</button>
        <button
          class="tab-btn"
          class:active={categoryFilter === "tool"}
          onclick={() => (categoryFilter = "tool")}
        >tools</button>
        <button
          class="tab-btn"
          class:active={categoryFilter === "resource"}
          onclick={() => (categoryFilter = "resource")}
        >mats</button>
      </div>
    </div>

    <div class="crafting-search-container">
      <input
        type="text"
        bind:value={craftingSearchQuery}
        placeholder="filter formulae..."
        class="crafting-search-input"
      />
    </div>

    <div class="grimoire-scroll">
      {#if filteredRecipes.length === 0}
        <div class="sidebar-empty">no formulae here.</div>
      {:else}
        <div class="medallion-grid">
          {#each filteredRecipes as recipe}
            {@const meta = getItemDef(recipe.output.itemId)}
            {@const known = isKnown(recipe.id)}
            {@const craftable = isRecipeReady(recipe)}
            <button
              class="recipe-medallion"
              class:selected={selectedRecipeId === recipe.id}
              class:craftable={craftable}
              class:locked={!known}
              onclick={() => (selectedRecipeId = recipe.id)}
              title={recipe.name.toLowerCase()}
            >
              <div class="medallion-inner">
                {#if known}
                  {#if meta?.iconUrl}
                    <img src={meta.iconUrl} alt={recipe.name} class="item-icon-img" />
                  {:else if meta?.icon}
                    <span class="item-icon-emoji">{meta.icon}</span>
                  {:else}
                    <span class="item-icon-text">{recipe.name.slice(0, 2).toLowerCase()}</span>
                  {/if}
                {:else}
                  <span class="locked-glyph">⚿</span>
                {/if}
              </div>
              {#if craftable}
                <span class="craftable-dot"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </aside>

  <!-- Right Pane: Detail & Circle -->
  <main class="recipe-detail-pane">
    <div class="alchemy-workspace">
      <div class="circle-wrapper" style="width: {centerCoord * 2}px; height: {centerCoord * 2}px; margin: 0 auto; position: relative; display: block;">
        <div class="runic-ring outer-ring"></div>
        <div class="runic-ring inner-ring"></div>

        <svg class="resonance-canvas" viewBox="0 0 {centerCoord * 2} {centerCoord * 2}">
          {#each slotIndices as index}
            {@const angle = (index * 2 * Math.PI) / totalSlots - Math.PI / 2}
            {@const targetX = centerCoord + circleRadius * Math.cos(angle)}
            {@const targetY = centerCoord + circleRadius * Math.sin(angle)}
            {@const satisfied = selectedRecipe
              ? (getItemQty(selectedRecipe.costs[index]?.itemId ?? "") >= (selectedRecipe.costs[index]?.required ?? 0))
              : false}
            <line
              x1={centerCoord} y1={centerCoord}
              x2={targetX} y2={targetY}
              class="resonance-line"
              class:active={satisfied}
            />
          {/each}
        </svg>

        {#each slotIndices as index}
          {@const angle = (index * 2 * Math.PI) / totalSlots - Math.PI / 2}
          {@const slotX = centerCoord + circleRadius * Math.cos(angle) - slotSize / 2}
          {@const slotY = centerCoord + circleRadius * Math.sin(angle) - slotSize / 2}

          {#if selectedRecipe}
            {@const cost = selectedRecipe.costs[index]}
            {#if cost}
              {@const meta = getItemDef(cost.itemId)}
              {@const current = getItemQty(cost.itemId)}
              {@const satisfied = current >= cost.required}
              {@const known = isKnown(selectedRecipe.id)}
              <div
                class="orbiting-slot recipe-slot"
                class:satisfied={satisfied && known}
                style="left: {slotX}px; top: {slotY}px;"
                title="{meta?.name ?? cost.itemId}: {known ? `${current} / ${cost.required}` : '?'}"
              >
                <div class="slot-visual">
                  {#if known}
                    {#if meta?.iconUrl}
                      <img src={meta.iconUrl} alt={meta.name} class="slot-icon-img" />
                    {:else if meta?.icon}
                      <span class="slot-icon-emoji">{meta.icon}</span>
                    {:else}
                      <span class="slot-icon-text">{cost.itemId.slice(0, 2).toLowerCase()}</span>
                    {/if}
                  {:else}
                    <span class="slot-icon-text">?</span>
                  {/if}
                </div>
                {#if known}
                  <span class="qty-label" class:missing={!satisfied}>
                    {current}/{cost.required}
                  </span>
                {:else}
                  <span class="qty-label missing">?</span>
                {/if}
              </div>
            {/if}
          {:else}
            <div class="orbiting-slot empty" style="left: {slotX}px; top: {slotY}px;">
              <span class="placeholder-rune">◦</span>
            </div>
          {/if}
        {/each}

        <!-- Central core -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="crucible-core lift"
          class:has-heat={nearCampfire}
          class:craftable={selectedRecipe && isRecipeReady(selectedRecipe)}
          onclick={() => {
            if (selectedRecipe && isRecipeReady(selectedRecipe)) craftItem(selectedRecipe);
          }}
          title={selectedRecipe ? `assemble ${selectedRecipe.name.toLowerCase()}` : "select a recipe"}
        >
          <div class="core-aura"></div>
          {#if selectedRecipe}
            {@const outputMeta = getItemDef(selectedRecipe.output.itemId)}
            {@const known = isKnown(selectedRecipe.id)}
            <div class="core-visual">
              {#if known}
                {#if outputMeta?.iconUrl}
                  <img src={outputMeta.iconUrl} alt={selectedRecipe.name} class="core-icon-img" />
                {:else if outputMeta?.icon}
                  <span class="core-icon-emoji">{outputMeta.icon}</span>
                {:else}
                  <span class="core-icon-text">{selectedRecipe.name.slice(0, 2).toLowerCase()}</span>
                {/if}
              {:else}
                <span class="core-icon-emoji locked-core">⚿</span>
              {/if}
            </div>
            {#if known && selectedRecipe.output.qty > 1}
              <span class="core-qty-badge">x{selectedRecipe.output.qty}</span>
            {/if}
          {:else}
            <div class="core-visual">
              <span class="core-icon-text idle-core">select</span>
            </div>
          {/if}

          {#if selectedRecipe?.requiresCampfire && isKnown(selectedRecipe.id)}
            <div class="campfire-heat-indicator" class:active={nearCampfire}>
              🔥
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Detail panel -->
    <div class="workspace-details">
      {#if selectedRecipe}
        {@const known = isKnown(selectedRecipe.id)}
        <div class="recipe-info-box">
          <header class="info-header">
            <h4 class="info-title">{selectedRecipe.name.toLowerCase()}</h4>
            {#if known && selectedRecipe.requiresCampfire}
              <span class="campfire-tag" class:active={nearCampfire}>
                {nearCampfire ? "lit campfire nearby" : "requires campfire"}
              </span>
            {/if}
            {#if !known}
              <span class="locked-tag">blueprint required</span>
            {/if}
          </header>
          <p class="info-desc">{selectedRecipe.description}</p>

          <button
            class="action-btn craft-action-btn"
            class:enabled={isRecipeReady(selectedRecipe)}
            disabled={!isRecipeReady(selectedRecipe)}
            onclick={() => { if (isRecipeReady(selectedRecipe)) craftItem(selectedRecipe); }}
          >
            {#if !known}
              blueprint required
            {:else if isRecipeReady(selectedRecipe)}
              transmute {selectedRecipe.name.toLowerCase()}
            {:else if selectedRecipe.requiresCampfire && !nearCampfire}
              needs campfire heat
            {:else}
              lacks materials
            {/if}
          </button>
        </div>
      {:else}
        <div class="idle-hint">
          <span class="idle-text">select a formula from the grimoire.</span>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  .crafting-dual-pane {
    display: flex;
    width: 44rem;
    height: 26rem;
    background: rgba(8, 6, 5, 0.4);
    border-radius: 4px;
    overflow: hidden;
  }

  .recipe-sidebar {
    width: 14.5rem;
    border-right: 1px solid var(--inv-border-muted);
    background: rgba(14, 11, 9, 0.75);
    display: flex;
    flex-direction: column;
    padding: 0.75rem;
    gap: 0.5rem;
    min-width: 14.5rem;
  }

  .grimoire-header {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 0.2rem;
  }

  .grimoire-title {
    font-family: "Cinzel", serif;
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--inv-accent);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.85;
  }

  .category-tabs {
    display: flex;
    gap: 0.25rem;
  }

  .tab-btn {
    flex: 1;
    padding: 0.2rem 0.4rem;
    font-family: "Cinzel", serif;
    font-size: 0.58rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid var(--inv-border-muted);
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted);
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.1s ease;
  }

  .tab-btn:hover {
    background: rgba(255, 220, 120, 0.04);
    color: var(--inv-text);
  }

  .tab-btn.active {
    border-color: rgba(255, 220, 120, 0.3);
    background: rgba(255, 220, 120, 0.08);
    color: var(--inv-accent);
  }

  .crafting-search-container {
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--inv-border-muted);
  }

  .crafting-search-input {
    width: 100%;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid var(--inv-border-muted);
    border-radius: 4px;
    color: #fff;
    font-family: inherit;
    font-size: 0.72rem;
    padding: 0.3rem 0.45rem;
    outline: none;
    transition: border-color 0.1s;
    box-sizing: border-box;
  }

  .crafting-search-input:focus {
    border-color: var(--inv-border);
  }

  .grimoire-scroll {
    flex: 1;
    overflow-y: auto;
  }

  .sidebar-empty {
    padding: 1.5rem 0.5rem;
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.75rem;
    color: var(--inv-text-muted);
    text-align: center;
    opacity: 0.7;
  }

  .medallion-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
    padding: 0.5rem 0;
  }

  .recipe-medallion {
    position: relative;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1px solid var(--inv-border-muted);
    background: rgba(18, 14, 12, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.15s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .recipe-medallion::before {
    content: "";
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border: 1px dashed transparent;
    transition: all 0.2s;
  }

  .recipe-medallion:hover {
    border-color: rgba(255, 220, 120, 0.4);
    background: rgba(255, 220, 120, 0.05);
    transform: scale(1.05);
  }

  .recipe-medallion:hover::before {
    border-color: rgba(255, 220, 120, 0.15);
    transform: rotate(45deg);
  }

  .recipe-medallion.selected {
    border-color: var(--inv-accent);
    background: rgba(255, 220, 120, 0.09);
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.1);
  }

  .recipe-medallion.selected::before {
    border-color: rgba(255, 220, 120, 0.4);
    animation: rotate-slow 40s linear infinite;
  }

  .recipe-medallion.locked {
    opacity: 0.45;
    border-style: dashed;
  }

  .recipe-medallion.locked:hover {
    opacity: 0.65;
  }

  .medallion-inner {
    width: 65%;
    height: 65%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .item-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .item-icon-emoji {
    font-size: 1.25rem;
    line-height: 1;
  }

  .item-icon-text {
    font-size: 0.65rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 700;
    color: var(--inv-text-muted);
  }

  .locked-glyph {
    font-size: 0.9rem;
    color: var(--inv-text-muted);
    opacity: 0.6;
  }

  .craftable-dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--inv-good);
    box-shadow: 0 0 6px var(--inv-good);
  }

  /* Right Pane */
  .recipe-detail-pane {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.15);
    position: relative;
    padding: 0.8rem;
  }

  .alchemy-workspace {
    width: 100%;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 180px;
  }

  .circle-wrapper {
    position: relative;
    margin: 0 auto;
    border-radius: 50%;
  }

  .runic-ring {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .outer-ring {
    inset: 4px;
    border: 1px dashed rgba(255, 220, 120, 0.06);
    animation: rotate-slow 120s linear infinite;
  }

  .inner-ring {
    inset: 20px;
    border: 1px double rgba(255, 220, 120, 0.04);
    animation: rotate-counter 90s linear infinite;
  }

  @keyframes rotate-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes rotate-counter {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  .resonance-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .resonance-line {
    stroke: rgba(255, 220, 120, 0.04);
    stroke-width: 1.5;
    stroke-dasharray: 4 4;
    transition: all 0.25s ease;
  }

  .resonance-line.active {
    stroke: var(--inv-accent);
    stroke-width: 2;
    stroke-dasharray: none;
    filter: drop-shadow(0 0 2px rgba(255, 220, 120, 0.3));
  }

  .orbiting-slot {
    position: absolute;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: rgba(14, 11, 9, 0.95);
    border: 1px solid var(--inv-border-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;
  }

  .orbiting-slot.satisfied {
    border-color: rgba(76, 175, 80, 0.4);
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.1), 0 4px 10px rgba(0, 0, 0, 0.4);
  }

  .orbiting-slot.empty {
    border: 1px dashed rgba(255, 255, 255, 0.06);
    background: rgba(255, 255, 255, 0.01);
    box-shadow: none;
  }

  .slot-visual {
    width: 60%;
    height: 60%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .slot-icon-img { width: 100%; height: 100%; object-fit: contain; }
  .slot-icon-emoji { font-size: 1.1rem; line-height: 1; }
  .slot-icon-text {
    font-size: 0.58rem;
    font-family: "IBM Plex Mono", monospace;
    color: var(--inv-text-muted);
    font-weight: bold;
  }

  .placeholder-rune {
    font-size: 0.8rem;
    color: var(--inv-text-muted);
    opacity: 0.12;
  }

  .qty-label {
    position: absolute;
    bottom: -13px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--inv-good);
    background: rgba(0, 0, 0, 0.8);
    padding: 1px 4px;
    border-radius: 3px;
    border: 1px solid rgba(76, 175, 80, 0.25);
    white-space: nowrap;
    z-index: 3;
  }

  .qty-label.missing {
    color: var(--inv-danger);
    border-color: rgba(244, 67, 54, 0.25);
  }

  .crucible-core {
    position: absolute;
    top: 58px;
    left: 58px;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(18, 14, 12, 0.95);
    border: 2px solid rgba(255, 220, 120, 0.12);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.6);
    cursor: default;
    transition: all 0.2s ease;
  }

  .crucible-core.craftable {
    border-color: rgba(255, 220, 120, 0.45);
    cursor: pointer;
  }

  .core-aura {
    position: absolute;
    inset: -2px;
    border-radius: 50%;
    border: 1px solid transparent;
    transition: all 0.3s ease;
  }

  .crucible-core.craftable:hover .core-aura {
    border-color: var(--inv-accent);
    transform: scale(1.04);
    box-shadow: 0 0 20px rgba(255, 220, 120, 0.25);
  }

  .crucible-core.craftable:active {
    transform: scale(0.96);
  }

  .core-visual {
    width: 50%;
    height: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  .core-icon-img { width: 100%; height: 100%; object-fit: contain; }
  .core-icon-emoji { font-size: 1.85rem; line-height: 1; filter: drop-shadow(0 2px 4px black); }
  .core-icon-text {
    font-size: 0.6rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 700;
    color: var(--inv-text-muted);
    opacity: 0.5;
  }

  .locked-core {
    font-size: 1.2rem !important;
    opacity: 0.4;
  }

  .idle-core {
    font-size: 0.52rem !important;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .core-qty-badge {
    position: absolute;
    top: 50%;
    right: 5px;
    transform: translateY(-50%);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.62rem;
    font-weight: bold;
    color: var(--inv-text);
    background: rgba(0,0,0,0.8);
    padding: 1px 3px;
    border-radius: 2px;
    border: 1px solid var(--inv-border-muted);
  }

  .campfire-heat-indicator {
    position: absolute;
    bottom: -6px;
    font-size: 0.9rem;
    line-height: 1;
    filter: grayscale(1) opacity(0.3);
    z-index: 4;
    transition: all 0.3s;
  }

  .campfire-heat-indicator.active {
    filter: grayscale(0) opacity(1);
    animation: flicker 1.5s ease-in-out infinite;
  }

  @keyframes flicker {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 3px #ff6432) saturate(1.2); }
    50% { transform: scale(1.15); filter: drop-shadow(0 0 6px #ff9832) saturate(1.5); }
  }

  .workspace-details {
    flex: 1;
    min-height: 0;
    padding-top: 0.6rem;
    border-top: 1px solid var(--inv-border-muted);
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .recipe-info-box {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.4rem;
  }

  .info-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .info-title {
    font-family: "Cinzel", serif;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--inv-accent);
    margin: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .campfire-tag {
    font-family: "Cinzel", serif;
    font-size: 0.54rem;
    font-weight: bold;
    background: rgba(255, 100, 50, 0.03);
    border: 1px solid rgba(255, 100, 50, 0.15);
    color: rgba(255, 100, 50, 0.55);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .campfire-tag.active {
    background: rgba(255, 100, 50, 0.08);
    border-color: rgba(255, 100, 50, 0.35);
    color: #ff6432;
    box-shadow: 0 0 8px rgba(255, 100, 50, 0.08);
  }

  .locked-tag {
    font-family: "Cinzel", serif;
    font-size: 0.54rem;
    font-weight: bold;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--inv-border-muted);
    color: var(--inv-text-muted);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .info-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted);
    line-height: 1.4;
    margin: 0;
  }

  .action-btn {
    border: 1px solid var(--inv-border-muted);
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted);
    font-family: "Cinzel", serif;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0.45rem 0.75rem;
    border-radius: 4px;
    cursor: not-allowed;
    transition: all 0.15s;
  }

  .action-btn.enabled {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
    cursor: pointer;
  }

  .action-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.18);
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.1);
  }

  .action-btn.enabled:active {
    transform: none;
  }

  .craft-action-btn {
    width: 100%;
    margin-top: auto;
    font-size: 0.78rem;
    padding: 0.55rem;
  }

  .idle-hint {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .idle-text {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.75rem;
    color: var(--inv-text-muted);
    opacity: 0.5;
  }
</style>
