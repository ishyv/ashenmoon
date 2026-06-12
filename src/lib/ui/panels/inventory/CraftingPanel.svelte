<script lang="ts">
import { getItemDef } from "$lib/domain/items";
import type { CraftRecipe } from "$lib/domain/crafting/recipes";
import type { InventoryItemView } from "./types";

let {
  recipes,
  items,
  experimentInputs,
  experimentMessage,
  experimentQty,
  addExperimentIngredient,
  removeExperimentIngredient,
  runExperiment,
  clearExperiment,
  canCraft,
  craftItem,
  isNearCampfire,
}: {
  recipes: CraftRecipe[];
  items: InventoryItemView[];
  experimentInputs: Record<string, number>;
  experimentMessage: string;
  experimentQty: (itemId: string) => number;
  addExperimentIngredient: (itemId: string) => void;
  removeExperimentIngredient: (itemId: string) => void;
  runExperiment: () => void;
  clearExperiment: () => void;
  canCraft: (recipe: CraftRecipe) => boolean;
  craftItem: (recipe: CraftRecipe) => void;
  isNearCampfire: () => boolean;
} = $props();

// Grimoire recipe book state
let selectedRecipeId = $state<string>("experiment");
let categoryFilter = $state<"all" | "tool" | "resource">("all");

const selectedRecipe = $derived(
  selectedRecipeId === "experiment"
    ? null
    : recipes.find((r) => r.id === selectedRecipeId)
);

// Filter recipes for Grimoire list
const filteredRecipes = $derived(
  recipes.filter((r) => {
    const def = getItemDef(r.output.itemId);
    if (categoryFilter === "tool") return def?.category === "tool";
    if (categoryFilter === "resource") return def?.category !== "tool";
    return true;
  })
);

// Filter materials for experimentation bag (exclude tools)
const materialItems = $derived(
  items.filter((item) => getItemDef(item.itemId)?.category !== "tool")
);

// Reactive list of unique items added to the experiment crucible
const experimentUniqueIds = $derived(Object.keys(experimentInputs));

// Campfire heat check
const nearCampfire = $derived(isNearCampfire());

// Calculate Orbiting Slots
const totalSlots = $derived(
  selectedRecipe
    ? selectedRecipe.costs.length
    : Math.max(3, experimentUniqueIds.length)
);

const slotIndices = $derived(Array.from({ length: totalSlots }, (_, i) => i));

// Dimensions for the alchemical circle layout
const circleRadius = 66; // radius in pixels
const centerCoord = 90;  // cx, cy in pixels
const slotSize = 38;      // width/height of slot in pixels

// Unicode alchemical symbols for empty experiment slots
const runicSymbols = ["🜂", "🜄", "🜁", "🜃", "🜍", "🜔"];

function isRecipeReady(recipe: CraftRecipe): boolean {
  return canCraft(recipe);
}
</script>

<div class="crafting-dual-pane">
  <!-- Left Pane: The Grimoire of Formulae -->
  <aside class="recipe-sidebar">
    <div class="grimoire-header">
      <span class="grimoire-title">grimoire</span>
      <div class="category-tabs">
        <button 
          class="tab-btn" 
          class:active={categoryFilter === "all"} 
          onclick={() => (categoryFilter = "all")}
          title="All Recipes"
        >
          all
        </button>
        <button 
          class="tab-btn" 
          class:active={categoryFilter === "tool"} 
          onclick={() => (categoryFilter = "tool")}
          title="Tools"
        >
          tools
        </button>
        <button 
          class="tab-btn" 
          class:active={categoryFilter === "resource"} 
          onclick={() => (categoryFilter = "resource")}
          title="Refined Materials"
        >
          mats
        </button>
      </div>
    </div>

    <!-- Switch to experimentation mode (Crucible) -->
    <button 
      class="sidebar-item experiment-toggle" 
      class:selected={selectedRecipeId === "experiment"}
      onclick={() => {
        selectedRecipeId = "experiment";
        experimentMessage = "";
      }}
    >
      <span class="pulse-aura"></span>
      <span class="icon">🔮</span>
      <span class="label">crucible experiment</span>
    </button>
    
    <div class="sidebar-divider"></div>
    
    <div class="grimoire-scroll">
      {#if filteredRecipes.length === 0}
        <div class="sidebar-empty">no formulae discovered here.</div>
      {:else}
        <div class="medallion-grid">
          {#each filteredRecipes as recipe}
            {@const meta = getItemDef(recipe.output.itemId)}
            {@const craftable = isRecipeReady(recipe)}
            <button 
              class="recipe-medallion" 
              class:selected={selectedRecipeId === recipe.id}
              class:craftable={craftable}
              onclick={() => (selectedRecipeId = recipe.id)}
              title={recipe.name.toLowerCase()}
            >
              <div class="medallion-inner">
                {#if meta?.iconUrl}
                  <img src={meta.iconUrl} alt={recipe.name} class="item-icon-img" />
                {:else if meta?.icon}
                  <span class="item-icon-emoji">{meta.icon}</span>
                {:else}
                  <span class="item-icon-text">{recipe.name.slice(0, 2).toLowerCase()}</span>
                {/if}
              </div>
              {#if craftable}
                <span class="craftable-dot" title="Ready to craft"></span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </aside>

  <!-- Right Pane: Alchemical Circle & Workspace -->
  <main class="recipe-detail-pane">
    <!-- Section 1: The Alchemical Resonance Circle -->
    <div class="alchemy-workspace" style="display: flex; justify-content: center; align-items: center; width: 100%; min-height: 180px; position: relative;">
      <div class="circle-wrapper" style="width: {centerCoord * 2}px; height: {centerCoord * 2}px; margin: 0 auto; position: relative; display: block;">
        
        <!-- Rotating runic boundaries -->
        <div class="runic-ring outer-ring"></div>
        <div class="runic-ring inner-ring"></div>

        <!-- SVG Resonance lines connecting orbiting slots to center core -->
        <svg class="resonance-canvas" viewBox="0 0 {centerCoord * 2} {centerCoord * 2}">
          {#each slotIndices as index}
            {@const angle = (index * 2 * Math.PI) / totalSlots - Math.PI / 2}
            {@const targetX = centerCoord + circleRadius * Math.cos(angle)}
            {@const targetY = centerCoord + circleRadius * Math.sin(angle)}
            
            {@const satisfied = selectedRecipe
              ? (items.find((item) => item.itemId === selectedRecipe.costs[index]?.itemId)?.qty ?? 0) >= (selectedRecipe.costs[index]?.required ?? 0)
              : index < experimentUniqueIds.length}
              
            <line 
              x1={centerCoord} y1={centerCoord} 
              x2={targetX} y2={targetY} 
              class="resonance-line"
              class:active={satisfied}
            />
          {/each}
        </svg>

        <!-- Orbiting Reagent Slots -->
        {#each slotIndices as index}
          {@const angle = (index * 2 * Math.PI) / totalSlots - Math.PI / 2}
          {@const slotX = centerCoord + circleRadius * Math.cos(angle) - slotSize / 2}
          {@const slotY = centerCoord + circleRadius * Math.sin(angle) - slotSize / 2}
          
          {#if selectedRecipe}
            <!-- Recipe Ingredient Slot -->
            {@const cost = selectedRecipe.costs[index]}
            {@const meta = getItemDef(cost.itemId)}
            {@const current = items.find((item) => item.itemId === cost.itemId)?.qty ?? 0}
            {@const satisfied = current >= cost.required}
            
            <div 
              class="orbiting-slot recipe-slot" 
              class:satisfied={satisfied}
              style="left: {slotX}px; top: {slotY}px;"
              title="{meta?.name ?? cost.itemId}: {current} / {cost.required}"
            >
              <div class="slot-visual">
                {#if meta?.iconUrl}
                  <img src={meta.iconUrl} alt={meta.name} class="slot-icon-img" />
                {:else if meta?.icon}
                  <span class="slot-icon-emoji">{meta.icon}</span>
                {:else}
                  <span class="slot-icon-text">{cost.itemId.slice(0, 2).toLowerCase()}</span>
                {/if}
              </div>
              <span class="qty-label" class:missing={!satisfied}>
                {current}/{cost.required}
              </span>
            </div>
          {:else}
            <!-- Experiment Crucible Slot -->
            {@const itemId = experimentUniqueIds[index]}
            
            {#if index < experimentUniqueIds.length}
              {@const meta = getItemDef(itemId)}
              {@const qty = experimentInputs[itemId]}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div 
                class="orbiting-slot experiment-slot added lift" 
                style="left: {slotX}px; top: {slotY}px;"
                onclick={() => removeExperimentIngredient(itemId)}
                title="Click to remove 1 unit of {meta?.name.toLowerCase() ?? itemId}"
              >
                <div class="slot-visual">
                  {#if meta?.iconUrl}
                    <img src={meta.iconUrl} alt={meta.name} class="slot-icon-img" />
                  {:else if meta?.icon}
                    <span class="slot-icon-emoji">{meta.icon}</span>
                  {:else}
                    <span class="slot-icon-text">{itemId.slice(0, 2).toLowerCase()}</span>
                  {/if}
                </div>
                <span class="qty-label added-qty">x{qty}</span>
                <span class="remove-overlay">✕</span>
              </div>
            {:else}
              <!-- Empty placeholder slot with alchemical rune -->
              <div 
                class="orbiting-slot experiment-slot empty" 
                style="left: {slotX}px; top: {slotY}px;"
              >
                <span class="placeholder-rune">{runicSymbols[index % runicSymbols.length]}</span>
              </div>
            {/if}
          {/if}
        {/each}

        <!-- Central Transmutation/Assembly Core -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div 
          class="crucible-core lift" 
          class:has-heat={nearCampfire}
          class:craftable={selectedRecipe ? isRecipeReady(selectedRecipe) : experimentUniqueIds.length > 0}
          onclick={() => {
            if (selectedRecipe) {
              if (isRecipeReady(selectedRecipe)) craftItem(selectedRecipe);
            } else {
              if (experimentUniqueIds.length > 0) runExperiment();
            }
          }}
          title={selectedRecipe ? `Assemble ${selectedRecipe.name.toLowerCase()}` : "Transmute Crucible"}
        >
          <div class="core-aura"></div>
          
          {#if selectedRecipe}
            {@const outputMeta = getItemDef(selectedRecipe.output.itemId)}
            <div class="core-visual">
              {#if outputMeta?.iconUrl}
                <img src={outputMeta.iconUrl} alt={selectedRecipe.name} class="core-icon-img" />
              {:else if outputMeta?.icon}
                <span class="core-icon-emoji">{outputMeta.icon}</span>
              {:else}
                <span class="core-icon-text">{selectedRecipe.name.slice(0, 2).toLowerCase()}</span>
              {/if}
            </div>
            {#if selectedRecipe.output.qty > 1}
              <span class="core-qty-badge">x{selectedRecipe.output.qty}</span>
            {/if}
          {:else}
            <div class="core-visual">
              <span class="core-icon-emoji">🏺</span>
            </div>
          {/if}

          <!-- Campfire Heat Indicator Overlay -->
          {#if selectedRecipe?.requiresCampfire || (!selectedRecipe && experimentUniqueIds.length > 0)}
            <div 
              class="campfire-heat-indicator" 
              class:active={nearCampfire} 
              title={nearCampfire ? "Crucible heated by campfire" : "Requires campfire heat"}
            >
              🔥
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Section 2: Workspace controls & details -->
    <div class="workspace-details">
      {#if selectedRecipe}
        <!-- Recipe Info Panel -->
        <div class="recipe-info-box">
          <header class="info-header">
            <h4 class="info-title">{selectedRecipe.name.toLowerCase()}</h4>
            {#if selectedRecipe.requiresCampfire}
              <span class="campfire-tag" class:active={nearCampfire}>
                {nearCampfire ? "lit campfire nearby" : "requires campfire"}
              </span>
            {/if}
          </header>
          <p class="info-desc">{selectedRecipe.description}</p>
          
          <button 
            class="action-btn craft-action-btn" 
            class:enabled={isRecipeReady(selectedRecipe)} 
            disabled={!isRecipeReady(selectedRecipe)} 
            onclick={() => craftItem(selectedRecipe)}
          >
            {#if isRecipeReady(selectedRecipe)}
              transmute {selectedRecipe.name.toLowerCase()}
            {:else if selectedRecipe.requiresCampfire && !nearCampfire}
              needs campfire heat
            {:else}
              lacks materials
            {/if}
          </button>
        </div>
      {:else}
        <!-- Experiment Controls Panel -->
        <div class="experiment-workspace">
          <div class="workspace-actions-row">
            <button 
              class="action-btn mix-btn" 
              class:enabled={experimentUniqueIds.length > 0}
              disabled={experimentUniqueIds.length === 0}
              onclick={runExperiment}
            >
              transmute mixture
            </button>
            <button 
              class="action-btn clear-btn" 
              class:enabled={experimentUniqueIds.length > 0}
              disabled={experimentUniqueIds.length === 0}
              onclick={clearExperiment}
            >
              clear
            </button>
          </div>

          <!-- Experimentation Message Display -->
          {#if experimentMessage}
            {@const isSuccess = experimentMessage.toLowerCase().includes("success") || experimentMessage.toLowerCase().includes("learned") || experimentMessage.toLowerCase().includes("discovered")}
            <div class="resonance-message" class:success={isSuccess}>
              <span class="rune-sparkle">✦</span>
              <span class="message-text">{experimentMessage.toLowerCase()}</span>
            </div>
          {:else}
            <div class="resonance-message idle">
              <span class="rune-sparkle">✦</span>
              <span class="message-text">crucible empty. add reagents to test mixtures.</span>
            </div>
          {/if}

          <!-- Available Reagents Bag Drawer -->
          <div class="materials-drawer">
            <div class="drawer-header">available reagents</div>
            <div class="reagents-grid-scroll">
              {#if materialItems.length === 0}
                <div class="reagents-empty">no alchemical components available in stash.</div>
              {:else}
                <div class="reagents-grid">
                  {#each materialItems as { itemId, qty }}
                    {@const meta = getItemDef(itemId)}
                    {@const added = experimentQty(itemId)}
                    {@const remaining = qty - added}
                    <button 
                      class="reagent-cell lift" 
                      class:max-reached={remaining <= 0}
                      disabled={remaining <= 0}
                      onclick={() => addExperimentIngredient(itemId)}
                      title="{meta?.name.toLowerCase() ?? itemId} (left: {remaining})"
                    >
                      <div class="reagent-icon-wrapper">
                        {#if meta?.iconUrl}
                          <img src={meta.iconUrl} alt={itemId} class="reagent-img" />
                        {:else if meta?.icon}
                          <span class="reagent-emoji">{meta.icon}</span>
                        {:else}
                          <span class="reagent-text">{itemId.slice(0, 2).toLowerCase()}</span>
                        {/if}
                      </div>
                      <span class="reagent-badge">{remaining}</span>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>

<style>
  /* Base Container Split */
  .crafting-dual-pane {
    display: flex;
    height: 22rem;
    background: rgba(8, 6, 5, 0.4);
    border-radius: 4px;
    overflow: hidden;
  }

  /* Left Sidebar: Grimoire */
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

  /* Experiment Toggle medallion */
  .experiment-toggle {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: rgba(255, 220, 120, 0.02);
    border: 1px solid rgba(255, 220, 120, 0.12);
    border-radius: 4px;
    color: var(--inv-text-muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.12s;
    overflow: hidden;
  }

  .experiment-toggle:hover {
    background: rgba(255, 220, 120, 0.05);
    border-color: rgba(255, 220, 120, 0.25);
    color: var(--inv-text);
  }

  .experiment-toggle.selected {
    background: rgba(255, 220, 120, 0.08);
    border-color: var(--inv-accent);
    color: var(--inv-accent);
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.05);
  }

  .pulse-aura {
    position: absolute;
    inset: 0;
    border: 1px solid var(--inv-accent);
    border-radius: 4px;
    opacity: 0;
  }

  .experiment-toggle.selected .pulse-aura {
    animation: cell-pulse 2s cubic-bezier(0.25, 0, 0, 1) infinite;
  }

  @keyframes cell-pulse {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.15); opacity: 0; }
  }

  .experiment-toggle .label {
    font-family: "Cinzel", serif;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .experiment-toggle .icon {
    font-size: 0.85rem;
  }

  .sidebar-divider {
    height: 1px;
    background: var(--inv-border-muted);
    margin: 0.1rem 0;
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

  /* Known Recipes Medallion Grid */
  .medallion-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
    padding: 0.2rem 0;
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

  /* Right Pane: Alchemical Circle workspace */
  .recipe-detail-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.15);
    position: relative;
    padding: 0.8rem;
  }

  .alchemy-workspace {
    width: 100%;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    min-height: 180px;
  }

  .circle-wrapper {
    position: relative;
    margin: 0 auto;
  }

  /* Runic Rings */
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

  .outer-ring::after {
    content: "";
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1px solid rgba(255, 220, 120, 0.02);
  }

  .inner-ring {
    inset: 20px;
    border: 1px double rgba(255, 220, 120, 0.04);
    animation: rotate-counter 90s linear infinite;
  }

  @keyframes rotate-counter {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  /* SVG resonance canvas */
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

  /* Orbiting Slots */
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

  .orbiting-slot.added {
    cursor: pointer;
    border-color: rgba(255, 220, 120, 0.35);
  }

  .orbiting-slot.added:hover {
    border-color: var(--inv-danger);
    transform: scale(1.05);
  }

  .orbiting-slot.empty {
    border: 1px dashed rgba(255, 255, 255, 0.08);
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

  .slot-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .slot-icon-emoji {
    font-size: 1.1rem;
    line-height: 1;
  }

  .slot-icon-text {
    font-size: 0.58rem;
    font-family: "IBM Plex Mono", monospace;
    color: var(--inv-text-muted);
    font-weight: bold;
  }

  .placeholder-rune {
    font-size: 0.85rem;
    color: var(--inv-text-muted);
    opacity: 0.15;
    font-family: serif;
  }

  /* Quantity labels on orbiting slots */
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

  .added-qty {
    color: var(--inv-accent);
    border-color: rgba(255, 220, 120, 0.2);
  }

  /* Remove hover overlay on experiment slots */
  .remove-overlay {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(180, 30, 20, 0.85);
    color: white;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.1s ease;
  }

  .orbiting-slot.added:hover .remove-overlay {
    opacity: 1;
  }

  /* Central Crucible Vessel / Assembly Core */
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

  .core-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .core-icon-emoji {
    font-size: 1.85rem;
    line-height: 1;
    filter: drop-shadow(0 2px 4px black);
  }

  .core-icon-text {
    font-size: 0.75rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 700;
    color: var(--inv-accent);
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

  /* Campfire Fire Indicator */
  .campfire-heat-indicator {
    position: absolute;
    bottom: -6px;
    font-size: 0.9rem;
    line-height: 1;
    filter: grayscale(1) opacity(0.3) drop-shadow(0 0 0 transparent);
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

  /* Workspace details area (bottom half) */
  .workspace-details {
    margin-top: auto;
    padding-top: 0.6rem;
    border-top: 1px solid var(--inv-border-muted);
    min-height: 5.5rem;
    display: flex;
    flex-direction: column;
  }

  /* Recipe Details Info Box */
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
  }

  .campfire-tag.active {
    background: rgba(255, 100, 50, 0.08);
    border-color: rgba(255, 100, 50, 0.35);
    color: #ff6432;
    box-shadow: 0 0 8px rgba(255, 100, 50, 0.08);
  }

  .info-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted);
    line-height: 1.4;
    margin: 0;
  }

  /* Experiment Controls & Workspace */
  .experiment-workspace {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 0.5rem;
  }

  .workspace-actions-row {
    display: flex;
    gap: 0.5rem;
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

  .clear-btn {
    padding: 0.45rem 0.6rem;
  }

  .craft-action-btn {
    width: 100%;
    margin-top: auto;
    font-size: 0.78rem;
    padding: 0.55rem;
  }

  /* Resonance Messages below Circle */
  .resonance-message {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0.5rem;
    background: rgba(186, 157, 108, 0.02);
    border: 1px solid rgba(186, 157, 108, 0.05);
    border-radius: 4px;
  }

  .resonance-message.success {
    background: rgba(76, 175, 80, 0.04);
    border-color: rgba(76, 175, 80, 0.25);
  }

  .resonance-message.success .message-text,
  .resonance-message.success .rune-sparkle {
    color: var(--inv-good);
  }

  .resonance-message.idle {
    opacity: 0.6;
  }

  .rune-sparkle {
    font-size: 0.65rem;
    color: var(--inv-accent);
    animation: rotate-slow 5s linear infinite;
  }

  .message-text {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.72rem;
    color: var(--inv-text-muted);
  }

  /* Reagents bag drawer at bottom */
  .materials-drawer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-height: 0;
  }

  .drawer-header {
    font-family: "Cinzel", serif;
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--inv-text-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.7;
  }

  .reagents-grid-scroll {
    overflow-x: auto;
    white-space: nowrap;
    padding: 0.15rem 0;
  }

  .reagents-empty {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.72rem;
    color: var(--inv-text-muted);
    text-align: center;
    opacity: 0.6;
    padding: 0.5rem;
  }

  .reagents-grid {
    display: flex;
    gap: 0.35rem;
  }

  .reagent-cell {
    position: relative;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border-radius: 4px;
    border: 1px solid var(--inv-border-muted);
    background: rgba(18, 14, 12, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    transition: all 0.1s;
  }

  .reagent-cell:hover:not(:disabled) {
    border-color: var(--inv-accent);
    background: rgba(255, 220, 120, 0.05);
  }

  .reagent-cell:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .reagent-icon-wrapper {
    width: 60%;
    height: 60%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .reagent-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .reagent-emoji {
    font-size: 0.95rem;
    line-height: 1;
  }

  .reagent-text {
    font-size: 0.52rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 700;
    color: var(--inv-text-muted);
  }

  .reagent-badge {
    position: absolute;
    bottom: -1px;
    right: -1px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.52rem;
    color: var(--inv-text);
    background: rgba(0, 0, 0, 0.85);
    padding: 0px 3px;
    border-radius: 2px;
    border: 1px solid var(--inv-border-muted);
    text-shadow: 0 1px 1px black;
  }
</style>
