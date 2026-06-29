<script lang="ts">
import { getItemDef } from "$lib/domain/items";
import type { CraftRecipe } from "$lib/domain/crafting/recipes";
import ItemIcon from "$lib/ui/components/ItemIcon.svelte";
import { getKnownSources } from "$lib/state/rpg/knowledge.svelte";
import { ChevronLeft, ChevronRight, CornerUpLeft, CornerUpRight } from "lucide-svelte";
import {
  EMPTY_RECIPE_HISTORY,
  adjacentRecipeId,
  currentRecipeFromHistory,
  selectRecipeInHistory,
  stepRecipeHistory,
  type RecipeHistoryState,
} from "./crafting-navigation";

function formatSources(sources: readonly string[]): string {
  if (sources.length === 0) return "source unknown";
  if (sources.length <= 2) return sources.join(", ");
  return `${sources.slice(0, 2).join(", ")} +${sources.length - 2}`;
}

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
let recipeHistory = $state<RecipeHistoryState>(EMPTY_RECIPE_HISTORY);

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
const filteredRecipeIds = $derived(filteredRecipes.map((recipe) => recipe.id));
const canGoBack = $derived(recipeHistory.index > 0);
const canGoForward = $derived(recipeHistory.index >= 0 && recipeHistory.index < recipeHistory.entries.length - 1);
const previousRecipeId = $derived(adjacentRecipeId(filteredRecipeIds, selectedRecipeId, -1));
const nextRecipeId = $derived(adjacentRecipeId(filteredRecipeIds, selectedRecipeId, 1));

const totalSlots = $derived(selectedRecipe ? selectedRecipe.costs.length : 3);
const slotIndices = $derived(Array.from({ length: totalSlots }, (_, i) => i));

const circleRadius = 66;
const centerCoord = 90;
const slotSize = 38;

function isRecipeReady(recipe: CraftRecipe): boolean {
  return isKnown(recipe.id) && canCraft(recipe);
}

function selectRecipe(recipeId: string, pushHistory = true): void {
  selectedRecipeId = recipeId;
  if (pushHistory) {
    recipeHistory = selectRecipeInHistory(recipeHistory, recipeId);
  }
}

function stepHistory(direction: -1 | 1): void {
  const nextHistory = stepRecipeHistory(recipeHistory, direction);
  if (nextHistory === recipeHistory) return;
  recipeHistory = nextHistory;
  selectedRecipeId = currentRecipeFromHistory(nextHistory);
}

function selectAdjacentRecipe(direction: -1 | 1): void {
  const adjacent = adjacentRecipeId(filteredRecipeIds, selectedRecipeId, direction);
  if (adjacent) selectRecipe(adjacent);
}

$effect(() => {
  if (filteredRecipes.length === 0) {
    selectedRecipeId = null;
    return;
  }

  // Only auto-select when the current selection is absent from allRecipes entirely
  // (i.e., it is null or was deleted). Deliberate navigation via handleComponentClick
  // or selectRecipe always picks a valid allRecipes entry, so we must not override it
  // just because categoryFilter changed and the recipe isn't in the filtered sidebar.
  const existsInAll = selectedRecipeId && allRecipes.some((r) => r.id === selectedRecipeId);
  if (existsInAll) return;

  const firstKnown = filteredRecipes.find((recipe) => isKnown(recipe.id));
  selectedRecipeId = (firstKnown ?? filteredRecipes[0])?.id ?? null;
});

function getItemQty(itemId: string): number {
  return items.find((i) => i.itemId === itemId)?.qty ?? 0;
}

function isCostSatisfied(cost: import("$lib/domain/crafting/recipe-types").RecipeCost): boolean {
  if (getItemQty(cost.itemId) >= cost.required) return true;
  return (cost.substitutes ?? []).some((s) => getItemQty(s.itemId) >= s.required);
}

function handleComponentClick(costItemId: string) {
  const componentRecipe = allRecipes.find((r) => r.output.itemId === costItemId);
  if (!componentRecipe) return;
  // Navigate to the component recipe and widen the filter to "all" so it is
  // always visible in the sidebar regardless of the current category.
  selectRecipe(componentRecipe.id);
  categoryFilter = "all";
}

async function handleComponentDblClick(costItemId: string) {
  const componentRecipe = allRecipes.find((r) => r.output.itemId === costItemId);
  if (componentRecipe && isKnown(componentRecipe.id) && canCraft(componentRecipe)) {
    await craftItem(componentRecipe);
  }
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
              onclick={() => selectRecipe(recipe.id)}
              title={recipe.name.toLowerCase()}
            >
              <div class="medallion-inner">
                {#if known}
                  <ItemIcon itemId={recipe.output.itemId} def={meta} class="item-icon-img" />
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
    <nav class="recipe-nav" aria-label="recipe navigation">
      <div class="history-controls">
        <button
          type="button"
          class="nav-icon-btn"
          disabled={!canGoBack}
          aria-label="go back to previous recipe"
          title="back"
          onclick={() => stepHistory(-1)}
        >
          <CornerUpLeft size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          class="nav-icon-btn"
          disabled={!canGoForward}
          aria-label="go forward to next recipe in history"
          title="forward"
          onclick={() => stepHistory(1)}
        >
          <CornerUpRight size={14} aria-hidden="true" />
        </button>
      </div>
      <div class="sequence-controls">
        <button
          type="button"
          class="nav-step-btn"
          disabled={!previousRecipeId}
          aria-label="select previous visible recipe"
          onclick={() => selectAdjacentRecipe(-1)}
        >
          <ChevronLeft size={14} aria-hidden="true" />
          <span>prev</span>
        </button>
        <button
          type="button"
          class="nav-step-btn"
          disabled={!nextRecipeId}
          aria-label="select next visible recipe"
          onclick={() => selectAdjacentRecipe(1)}
        >
          <span>next</span>
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
    {#if selectedRecipe}
      {@const known = isKnown(selectedRecipe.id)}
      <div class="detail-split-container">
        <!-- Left half: runic crucible circle -->
        <div class="alchemy-workspace">
          <div class="circle-wrapper" style="width: {centerCoord * 2}px; height: {centerCoord * 2}px; position: relative; display: block;">
            <div class="runic-ring outer-ring"></div>
            <div class="runic-ring inner-ring"></div>

            <svg class="resonance-canvas" viewBox="0 0 {centerCoord * 2} {centerCoord * 2}">
              {#each slotIndices as index}
                {@const angle = (index * 2 * Math.PI) / totalSlots - Math.PI / 2}
                {@const targetX = centerCoord + circleRadius * Math.cos(angle)}
                {@const targetY = centerCoord + circleRadius * Math.sin(angle)}
                {@const satisfied = (getItemQty(selectedRecipe.costs[index]?.itemId ?? "") >= (selectedRecipe.costs[index]?.required ?? 0))}
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

              {@const cost = selectedRecipe.costs[index]}
              {#if cost}
                {@const meta = getItemDef(cost.itemId)}
                {@const current = getItemQty(cost.itemId)}
                {@const satisfied = current >= cost.required}
                <div
                  class="orbiting-slot recipe-slot"
                  class:satisfied={satisfied && known}
                  style="left: {slotX}px; top: {slotY}px;"
                  title="{meta?.name ?? cost.itemId}: {known ? `${current} / ${cost.required}` : '?'}"
                >
                  <div class="slot-visual">
                    {#if known}
                      <ItemIcon itemId={cost.itemId} def={meta} class="slot-icon-img" />
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
            {/each}

            <!-- Central core -->
            <button
              type="button"
              class="crucible-core lift"
              class:has-heat={nearCampfire}
              class:craftable={isRecipeReady(selectedRecipe)}
              disabled={!isRecipeReady(selectedRecipe)}
              onclick={() => {
                if (isRecipeReady(selectedRecipe)) craftItem(selectedRecipe);
              }}
              aria-label="assemble {selectedRecipe.name.toLowerCase()}"
              title="assemble {selectedRecipe.name.toLowerCase()}"
            >
              <div class="core-aura"></div>
              <div class="core-visual">
                {#if known}
                  <ItemIcon itemId={selectedRecipe.output.itemId} def={getItemDef(selectedRecipe.output.itemId)} class="core-icon-img" />
                {:else}
                  <span class="core-icon-emoji locked-core">⚿</span>
                {/if}
              </div>
              {#if known && selectedRecipe.output.qty > 1}
                <span class="core-qty-badge">x{selectedRecipe.output.qty}</span>
              {/if}

              {#if selectedRecipe.requiresCampfire && known}
                <div class="campfire-heat-indicator" class:active={nearCampfire}>
                  🔥
                </div>
              {/if}
            </button>
          </div>
        </div>

        <!-- Right half: details and checklist -->
        <div class="workspace-details">
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

            {#if known}
              <div class="materials-header">required materials</div>
              <div class="materials-scroll-wrapper">
                <ul class="materials-list">
                  {#each selectedRecipe.costs as cost (cost.itemId)}
                    {@const meta = getItemDef(cost.itemId)}
                    {@const current = getItemQty(cost.itemId)}
                    {@const satisfied = isCostSatisfied(cost)}
                    {@const sources = getKnownSources(cost.itemId)}
                    {@const componentRecipe = allRecipes.find((r) => r.output.itemId === cost.itemId)}
                    {@const isClickable = !!componentRecipe}
                    <li class="material-list-row">
                      {#if isClickable}
                        <button
                          type="button"
                          class="material-item"
                          class:satisfied={satisfied}
                          class:clickable={isClickable}
                          onclick={() => handleComponentClick(cost.itemId)}
                          ondblclick={() => handleComponentDblClick(cost.itemId)}
                          aria-label="open recipe for {meta?.name.toLowerCase() ?? cost.itemId}"
                        >
                          <div class="material-left">
                            <div class="material-icon-wrapper">
                              <ItemIcon itemId={cost.itemId} def={meta} />
                            </div>
                            <span class="material-name">{meta?.name.toLowerCase() ?? cost.itemId}</span>
                            <span class="material-sources" class:unknown={sources.length === 0} title={sources.length > 0 ? `Known sources: ${sources.join(', ')}` : "Source unknown"}>
                              ({formatSources(sources)})
                            </span>
                          </div>
                          <span class="material-jump">recipe</span>
                          <span class="material-qty" class:missing={!satisfied}>
                            {current} / {cost.required}
                          </span>
                        </button>
                      {:else}
                        <div class="material-item" class:satisfied={satisfied}>
                          <div class="material-left">
                            <div class="material-icon-wrapper">
                              <ItemIcon itemId={cost.itemId} def={meta} />
                            </div>
                            <span class="material-name">{meta?.name.toLowerCase() ?? cost.itemId}</span>
                            <span class="material-sources" class:unknown={sources.length === 0} title={sources.length > 0 ? `Known sources: ${sources.join(', ')}` : "Source unknown"}>
                              ({formatSources(sources)})
                            </span>
                          </div>
                          <span class="material-qty" class:missing={!satisfied}>
                            {current} / {cost.required}
                          </span>
                        </div>
                      {/if}
                    </li>
                    {#each cost.substitutes ?? [] as sub (sub.itemId)}
                      {@const subMeta = getItemDef(sub.itemId)}
                      {@const subQty = getItemQty(sub.itemId)}
                      {@const subSatisfied = subQty >= sub.required}
                      <li class="material-item material-substitute" class:satisfied={subSatisfied}>
                        <div class="material-left">
                          <span class="substitute-or">or</span>
                          <div class="material-icon-wrapper">
                            <ItemIcon itemId={sub.itemId} def={subMeta} />
                          </div>
                          <span class="material-name">{subMeta?.name.toLowerCase() ?? sub.itemId}</span>
                        </div>
                        <span class="material-qty" class:missing={!subSatisfied}>
                          {subQty} / {sub.required}
                        </span>
                      </li>
                    {/each}
                  {/each}
                </ul>
              </div>
            {/if}

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
        </div>
      </div>
    {:else}
      <div class="idle-hint">
        <span class="idle-text">select a formula from the grimoire.</span>
      </div>
    {/if}
  </main>
</div>

<style>
  .crafting-dual-pane {
    display: flex;
    width: 100%;
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

  :global(.item-icon-img) {
    width: 100%;
    height: 100%;
    object-fit: contain;
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
    gap: 0.55rem;
  }

  .recipe-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: 1.75rem;
    flex-shrink: 0;
  }

  .history-controls,
  .sequence-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .nav-icon-btn,
  .nav-step-btn {
    height: 1.55rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    border: 1px solid var(--inv-border-muted);
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted);
    font-family: "Cinzel", serif;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }

  .nav-icon-btn {
    width: 1.65rem;
    padding: 0;
  }

  .nav-step-btn {
    padding: 0 0.45rem;
  }

  .nav-icon-btn:hover:not(:disabled),
  .nav-step-btn:hover:not(:disabled) {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
  }

  .nav-icon-btn:disabled,
  .nav-step-btn:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }

  .detail-split-container {
    display: flex;
    gap: 1.2rem;
    flex: 1;
    min-height: 0;
    width: 100%;
    align-items: stretch;
  }

  .alchemy-workspace {
    flex: 0 0 180px;
    width: 180px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
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


  .slot-visual {
    width: 60%;
    height: 60%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.slot-icon-img) { width: 100%; height: 100%; object-fit: contain; }
  .slot-icon-text {
    font-size: 0.58rem;
    font-family: "IBM Plex Mono", monospace;
    color: var(--inv-text-muted);
    font-weight: bold;
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
    padding: 0;
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

  .crucible-core:disabled {
    color: inherit;
  }

  .core-visual {
    width: 50%;
    height: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
  }

  :global(.core-icon-img) { width: 100%; height: 100%; object-fit: contain; }
  .core-icon-emoji { font-size: 1.85rem; line-height: 1; filter: drop-shadow(0 2px 4px black); }

  .locked-core {
    font-size: 1.2rem !important;
    opacity: 0.4;
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
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--inv-border-muted);
    padding-left: 1.2rem;
  }

  .materials-scroll-wrapper {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    margin-bottom: 0.5rem;
    padding-right: 0.25rem;
  }

  .materials-scroll-wrapper::-webkit-scrollbar {
    width: 4px;
  }
  .materials-scroll-wrapper::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
  }
  .materials-scroll-wrapper::-webkit-scrollbar-thumb {
    background: rgba(185, 155, 98, 0.25);
    border-radius: 2px;
  }
  .materials-scroll-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(185, 155, 98, 0.45);
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

  .materials-header {
    font-family: "Cinzel", serif;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--inv-accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 0.8rem;
    margin-bottom: 0.4rem;
    opacity: 0.8;
    border-bottom: 1px solid var(--inv-border-muted);
    padding-bottom: 0.2rem;
  }

  .materials-list {
    list-style: none;
    margin: 0 0 0.8rem 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .material-list-row {
    margin: 0;
    padding: 0;
  }

  .material-item {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.72rem;
    color: var(--inv-text-muted);
    border: 0;
    background: transparent;
    padding: 0;
    font: inherit;
    text-align: left;
  }

  .material-item.satisfied {
    color: var(--inv-text);
  }

  .material-left {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    flex: 1;
  }

  .material-icon-wrapper {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .material-name {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .material-sources {
    font-size: 0.6rem;
    color: rgba(255, 220, 120, 0.45);
    font-style: italic;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-left: 0.25rem;
    flex: 1;
  }

  .material-sources.unknown {
    color: rgba(255, 255, 255, 0.2);
  }

  .material-qty {
    font-weight: 700;
    font-size: 0.7rem;
    color: var(--inv-accent);
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .material-jump {
    flex-shrink: 0;
    margin-left: 0.45rem;
    padding: 0.05rem 0.25rem;
    border: 1px solid rgba(255, 220, 120, 0.16);
    border-radius: 3px;
    color: rgba(255, 220, 120, 0.5);
    font-family: "Cinzel", serif;
    font-size: 0.52rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .material-qty.missing {
    color: #ef4444;
  }

  .material-item.clickable {
    cursor: pointer;
  }

  .material-item.clickable:hover .material-name,
  .material-item.clickable:focus-visible .material-name {
    text-decoration: underline;
    color: var(--inv-accent);
  }

  .material-item.clickable:focus-visible {
    outline: 1px solid var(--inv-accent);
    outline-offset: 2px;
  }

  .material-substitute {
    margin-top: -0.1rem;
    padding-left: 0.25rem;
    opacity: 0.7;
  }

  .substitute-or {
    font-size: 0.6rem;
    font-style: italic;
    color: var(--text-soft);
    flex-shrink: 0;
    min-width: 1.4rem;
  }
</style>
