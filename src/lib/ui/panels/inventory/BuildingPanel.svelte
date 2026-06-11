<script lang="ts">
import type { BuildRecipeView } from "./types";

let {
  recipes,
  getMaterialQty,
  canBuild,
  startBuildPlacement,
}: {
  recipes: BuildRecipeView[];
  getMaterialQty: (itemId: string) => number;
  canBuild: (recipe: BuildRecipeView) => boolean;
  startBuildPlacement: (recipe: BuildRecipeView) => void;
} = $props();
</script>

<div class="panel-scroll">
  <div class="panel-list">
    {#each recipes as recipe}
      <div class="recipe-card">
        <div>
          <div class="recipe-name">{recipe.name.toLowerCase()}</div>
          <div class="recipe-desc">{recipe.description}</div>
        </div>

        <div class="cost-list">
          {#each recipe.costs as cost}
            {@const current = getMaterialQty(cost.itemId)}
            {@const hasEnough = current >= cost.required}
            <div class="cost-item {hasEnough ? 'met' : 'missing'}">
              <span>{cost.name}</span>
              <span>{current} / {cost.required}</span>
            </div>
          {/each}
        </div>

        <button class="panel-btn {canBuild(recipe) ? 'enabled' : 'disabled'}" disabled={!canBuild(recipe)} onclick={() => startBuildPlacement(recipe)}>
          place {recipe.name.toLowerCase()}
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

  .recipe-desc {
    color: var(--inv-text-muted);
    font-size: 0.7rem;
    line-height: 1.35;
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

