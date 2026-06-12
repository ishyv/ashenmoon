<script lang="ts">
import { getItemDef } from "$lib/domain/items";
import type { CraftRecipe } from "$lib/domain/crafting/recipes";
import type { InventoryItemView } from "./types";
import ExperimentControls from "./ExperimentControls.svelte";

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
} = $props();

let selectedRecipeId = $state<string>("experiment");

const selectedRecipe = $derived(
  selectedRecipeId === "experiment"
    ? null
    : recipes.find((r) => r.id === selectedRecipeId)
);

// Group recipes by category or just list them
const toolRecipes = $derived(recipes.filter(r => getItemDef(r.output.itemId)?.category === "tool"));
const otherRecipes = $derived(recipes.filter(r => getItemDef(r.output.itemId)?.category !== "tool"));
</script>

<div class="crafting-dual-pane">
  <!-- Left Column: Recipe Selection Sidebar -->
  <aside class="recipe-sidebar">
    <button 
      class="sidebar-item experiment-toggle" 
      class:selected={selectedRecipeId === "experiment"}
      onclick={() => (selectedRecipeId = "experiment")}
    >
      <span class="icon">🔬</span>
      <span class="label">experimentation</span>
    </button>
    
    <div class="sidebar-divider"></div>
    
    {#if recipes.length === 0}
      <div class="sidebar-empty">no recipes learned yet.</div>
    {/if}

    {#if toolRecipes.length > 0}
      <div class="category-header">tools</div>
      {#each toolRecipes as recipe}
        <button 
          class="sidebar-item" 
          class:selected={selectedRecipeId === recipe.id}
          onclick={() => (selectedRecipeId = recipe.id)}
        >
          <span class="status-indicator" class:ready={canCraft(recipe)}></span>
          <span class="label">{recipe.name.toLowerCase()}</span>
        </button>
      {/each}
    {/if}

    {#if otherRecipes.length > 0}
      <div class="category-header">resources</div>
      {#each otherRecipes as recipe}
        <button 
          class="sidebar-item" 
          class:selected={selectedRecipeId === recipe.id}
          onclick={() => (selectedRecipeId = recipe.id)}
        >
          <span class="status-indicator" class:ready={canCraft(recipe)}></span>
          <span class="label">{recipe.name.toLowerCase()}</span>
        </button>
      {/each}
    {/if}
  </aside>

  <!-- Right Column: Selected Recipe Details & Action -->
  <main class="recipe-detail-pane">
    {#if selectedRecipeId === "experiment"}
      <ExperimentControls
        items={items}
        inputs={experimentInputs}
        message={experimentMessage}
        {experimentQty}
        addIngredient={addExperimentIngredient}
        removeIngredient={removeExperimentIngredient}
        {runExperiment}
        {clearExperiment}
      />
    {:else if selectedRecipe}
      {@const recipe = selectedRecipe}
      <div class="recipe-details">
        <header class="detail-header">
          <div class="title-row">
            <h4 class="recipe-title">{recipe.name.toLowerCase()}</h4>
            {#if recipe.requiresCampfire}
              <span class="campfire-badge" title="Must be near a campfire to craft">requires campfire</span>
            {/if}
          </div>
          <p class="recipe-desc">{recipe.description}</p>
        </header>

        <section class="ingredients-section">
          <h5 class="section-title">required ingredients</h5>
          <div class="ingredients-list">
            {#each recipe.costs as cost}
              {@const itemId = cost.itemId}
              {@const required = cost.required}
              {@const current = items.find((item) => item.itemId === itemId)?.qty ?? 0}
              {@const isMet = current >= required}
              <div class="ingredient-card" class:met={isMet} class:missing={!isMet}>
                <div class="card-left">
                  <div class="check-box" class:checked={isMet}>
                    {#if isMet}✓{:else}○{/if}
                  </div>
                  <span class="ingredient-name">{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
                </div>
                <span class="ingredient-qty">{current} / {required}</span>
              </div>
            {/each}
          </div>
        </section>

        <div class="craft-action">
          <button 
            class="craft-btn" 
            class:enabled={canCraft(recipe)} 
            disabled={!canCraft(recipe)} 
            onclick={() => craftItem(recipe)}
          >
            {canCraft(recipe) ? `craft ${recipe.name.toLowerCase()}` : "missing requirements"}
          </button>
        </div>
      </div>
    {/if}
  </main>
</div>

<style>
  .crafting-dual-pane {
    display: flex;
    height: 24rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    overflow: hidden;
  }

  /* Left column styling */
  .recipe-sidebar {
    width: 14rem;
    border-right: 1px solid var(--inv-border-muted);
    background: rgba(10, 8, 7, 0.4);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 0.75rem;
    gap: 0.2rem;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.45rem 0.6rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--inv-text-muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.12s;
  }

  .sidebar-item:hover {
    background: rgba(255, 220, 120, 0.04);
    color: var(--inv-text);
  }

  .sidebar-item.selected {
    background: rgba(255, 220, 120, 0.08);
    border-color: rgba(255, 220, 120, 0.22);
    color: var(--inv-accent);
  }

  .sidebar-item .label {
    font-family: "Cinzel", serif;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .sidebar-item .icon {
    font-size: 0.85rem;
  }

  .experiment-toggle {
    background: rgba(255, 220, 120, 0.02);
    border: 1px solid rgba(255, 220, 120, 0.08);
  }

  .sidebar-divider {
    height: 1px;
    background: var(--inv-border-muted);
    margin: 0.4rem 0;
  }

  .sidebar-empty {
    padding: 1rem 0.5rem;
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted);
    text-align: center;
  }

  .category-header {
    font-family: "Cinzel", serif;
    font-size: 0.6rem;
    font-weight: bold;
    color: var(--inv-accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.4rem 0.6rem 0.15rem;
    opacity: 0.6;
  }

  .status-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
  }

  .status-indicator.ready {
    background: var(--inv-good);
    box-shadow: 0 0 6px var(--inv-good);
  }

  /* Right column styling */
  .recipe-detail-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.1);
  }

  .recipe-details {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .detail-header {
    margin-bottom: 1rem;
    border-bottom: 1px solid var(--inv-border-muted);
    padding-bottom: 0.8rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.35rem;
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

  .campfire-badge {
    font-family: "Cinzel", serif;
    font-size: 0.58rem;
    font-weight: bold;
    background: rgba(255, 100, 50, 0.08);
    border: 1px solid rgba(255, 100, 50, 0.25);
    color: #ff6432;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .recipe-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.82rem;
    color: var(--inv-text-muted);
    line-height: 1.45;
    margin: 0;
  }

  .ingredients-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
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

  .ingredients-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .ingredient-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--inv-border-muted);
    border-radius: 4px;
    background: rgba(20, 16, 14, 0.5);
    transition: all 0.1s;
  }

  .ingredient-card.met {
    border-color: rgba(76, 175, 80, 0.25);
    background: rgba(76, 175, 80, 0.03);
  }

  .ingredient-card.missing {
    border-color: rgba(244, 67, 54, 0.22);
    background: rgba(244, 67, 54, 0.02);
  }

  .card-left {
    display: flex;
    align-items: center;
    gap: 0.55rem;
  }

  .check-box {
    font-size: 0.75rem;
    width: 1rem;
    height: 1rem;
    display: grid;
    place-items: center;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.25);
  }

  .ingredient-card.met .check-box {
    border-color: var(--inv-good);
    color: var(--inv-good);
    background: rgba(76, 175, 80, 0.1);
  }

  .ingredient-card.missing .check-box {
    border-color: rgba(244, 67, 54, 0.4);
    color: rgba(244, 67, 54, 0.5);
  }

  .ingredient-name {
    font-size: 0.78rem;
    color: var(--inv-text);
  }

  .ingredient-card.met .ingredient-name {
    color: #fff;
  }

  .ingredient-card.missing .ingredient-name {
    color: var(--inv-text-muted);
  }

  .ingredient-qty {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.75rem;
  }

  .ingredient-card.met .ingredient-qty {
    color: var(--inv-good);
  }

  .ingredient-card.missing .ingredient-qty {
    color: var(--inv-danger);
  }

  .craft-action {
    display: flex;
    justify-content: flex-end;
  }

  .craft-btn {
    width: 100%;
    border: 1px solid var(--inv-border-muted);
    border-radius: 4px;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted);
    font-family: "Cinzel", serif;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: not-allowed;
    transition: all 0.15s;
  }

  .craft-btn.enabled {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.05);
  }

  .craft-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.22);
    color: #fff;
    box-shadow: 0 0 16px rgba(255, 220, 120, 0.15);
    transform: translateY(-1px);
  }
</style>
