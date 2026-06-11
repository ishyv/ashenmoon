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
</script>

<div class="panel-scroll">
  <div class="panel-list">
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

    {#if recipes.length === 0}
      <div class="empty-state">no recipes learned yet.</div>
    {/if}

    {#each recipes as recipe}
      <div class="recipe-card">
        <div>
          <div class="recipe-name">
            {recipe.name.toLowerCase()}
            {#if recipe.requiresCampfire}
              <span class="tag">campfire</span>
            {/if}
          </div>
          <div class="recipe-desc">{recipe.description}</div>
        </div>

        <div class="cost-list">
          {#each recipe.costs as cost}
            {@const itemId = cost.itemId}
            {@const required = cost.required}
            {@const current = items.find((item) => item.itemId === itemId)?.qty ?? 0}
            <div class="cost-item {current >= required ? 'met' : 'missing'}">
              <span>{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
              <span>{current} / {required}</span>
            </div>
          {/each}
        </div>

        <button class="panel-btn {canCraft(recipe) ? 'enabled' : 'disabled'}" disabled={!canCraft(recipe)} onclick={() => craftItem(recipe)}>
          craft {recipe.name.toLowerCase()}
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .panel-scroll {
    overflow-y: auto;
    min-height: 10rem;
    max-height: 22rem;
    padding: var(--inv-space);
  }

  .panel-list,
  .recipe-card,
  .cost-list {
    display: flex;
    flex-direction: column;
  }

  .panel-list {
    gap: 0.75rem;
  }

  .recipe-card {
    gap: 0.65rem;
    padding: 0.75rem;
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface-soft);
  }

  .recipe-name {
    font-size: 0.82rem;
    font-weight: 700;
  }

  .recipe-desc,
  .empty-state {
    color: var(--inv-text-muted);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  .tag {
    margin-left: 0.35rem;
    color: var(--inv-warning);
    font-size: 0.62rem;
  }

  .cost-list {
    gap: 0.3rem;
  }

  .cost-item {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface);
    padding: 0.3rem 0.45rem;
    font-size: 0.7rem;
  }

  .cost-item.met {
    color: var(--inv-good);
  }

  .cost-item.missing {
    color: var(--inv-danger);
  }

  .panel-btn {
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius-sm);
    padding: 0.42rem;
    background: transparent;
    color: var(--inv-text);
    cursor: pointer;
  }

  .panel-btn.enabled {
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
  }

  .panel-btn.disabled {
    cursor: not-allowed;
    color: var(--inv-text-muted);
    opacity: 0.55;
  }
</style>
