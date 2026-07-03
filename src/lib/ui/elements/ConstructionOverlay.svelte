<script lang="ts">
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { getBuildingSpec } from "$lib/domain/building-specs";
import { getItemDef } from "$lib/domain/items";
import { getItemQty } from "$lib/state/rpg/inventory-api";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";

let {
  entity,
  engine,
  onClose,
}: {
  entity: Entity;
  engine: {
    startBuildingChannel(buildingId: string, nextStage: number, cost: Record<string, number>): void;
  } | null;
  onClose: () => void;
} = $props();

const buildingId = $derived(entity?.id ?? "");
const buildingType = $derived(entity?.building?.type ?? "");
const currentStage = $derived(entity?.building?.stage ?? 0);

const spec = $derived(getBuildingSpec(buildingType));
const nextStage = $derived(currentStage + 1);
const progressPercent = $derived(Math.round((currentStage / 5) * 100));

const nextStageSpec = $derived(
  spec.constructionStages?.find((s) => s.stage === nextStage) ?? null
);

function getOwnedQty(itemId: string): number {
  return getItemQty(itemId);
}

const meetsRequirements = $derived(
  nextStageSpec
    ? Object.entries(nextStageSpec.cost).every(([itemId, qty]) => getOwnedQty(itemId) >= qty)
    : false
);

async function applyMaterials() {
  const currentNextStageSpec = nextStageSpec;
  const currentBuildingId = buildingId;
  const currentNextStage = nextStage;

  if (!currentNextStageSpec || !meetsRequirements) return;

  onClose();
  engine?.startBuildingChannel(currentBuildingId, currentNextStage, currentNextStageSpec.cost);
}
</script>

<GamePanel id="construction-panel" title="Construction Site" width="24rem" {onClose}>
  <div class="construction-container">
    {#if spec && nextStageSpec}
      <div class="build-info">
        <h3 class="build-name">{spec.displayName.toLowerCase()}</h3>
        <p class="build-desc">{spec.description}</p>

        <div class="completion-progress">
          <div class="progress-header">
            <span>Overall Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: {progressPercent}%"></div>
          </div>
        </div>
        
        <div class="stages-progress">
          <h4 class="section-title">construction plan</h4>
          <div class="stages-list">
            {#each spec.constructionStages ?? [] as s}
              {@const isCurrent = s.stage === nextStage}
              {@const isCompleted = s.stage <= currentStage}
              <div class="stage-row" class:completed={isCompleted} class:active={isCurrent}>
                <span class="stage-num">{s.stage}</span>
                <span class="stage-desc">{s.name.toLowerCase()}</span>
                {#if isCompleted}
                  <span class="stage-status-text">completed</span>
                {:else if isCurrent}
                  <span class="stage-status-text">active</span>
                {:else}
                  <span class="stage-status-text">locked</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>

        <p class="guide-tip">
          Gather the required materials in your inventory, then click below to advance construction.
        </p>
      </div>

      <div class="cost-section">
        <h4 class="section-title">required materials</h4>
        <div class="materials-list">
          {#each Object.entries(nextStageSpec.cost) as [itemId, reqQty]}
            {@const owned = getOwnedQty(itemId)}
            {@const met = owned >= reqQty}
            <div class="material-row" class:met={met}>
              <span class="check-icon">{met ? "✓" : "○"}</span>
              <span class="material-name">{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
              <span class="material-qty">{owned} / {reqQty}</span>
            </div>
          {/each}
        </div>
      </div>

      <button 
        class="build-btn" 
        class:enabled={meetsRequirements} 
        disabled={!meetsRequirements}
        onclick={applyMaterials}
      >
        {#if meetsRequirements}
          construct next stage
        {:else}
          missing materials
        {/if}
      </button>
    {:else}
      <p class="build-complete-msg">construction completed.</p>
    {/if}
  </div>
</GamePanel>

<style>
  .construction-container {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    font-family: "IBM Plex Mono", monospace;
    color: var(--inv-text, white);
  }

  .build-info {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .build-name {
    font-family: "Cinzel", serif;
    font-size: 1.1rem;
    font-weight: bold;
    color: var(--inv-accent, #ffdc78);
    text-transform: uppercase;
    margin: 0;
  }

  .build-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.8rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.6));
    margin: 0;
    line-height: 1.4;
  }



  .section-title {
    font-family: "Cinzel", serif;
    font-size: 0.68rem;
    font-weight: bold;
    color: var(--inv-accent, #ffdc78);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 0.5rem 0;
    opacity: 0.8;
  }

  .materials-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.02);
  }

  .material-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.74rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
  }

  .material-row.met {
    color: var(--inv-text, white);
  }

  .check-icon {
    font-size: 0.76rem;
    color: var(--inv-danger, tomato);
  }

  .material-row.met .check-icon {
    color: var(--inv-good, lightgreen);
  }

  .material-name {
    flex: 1;
  }

  .material-qty {
    font-family: monospace;
  }

  .build-btn {
    width: 100%;
    border: 1px solid var(--inv-border-muted, rgba(255, 255, 255, 0.1));
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
    font-family: "Cinzel", serif;
    font-size: 0.8rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.6rem;
    border-radius: 4px;
    cursor: not-allowed;
    transition: all 0.12s;
  }

  .build-btn.enabled {
    border-color: var(--inv-accent, #ffdc78);
    background: rgba(255, 220, 120, 0.06);
    color: var(--inv-accent, #ffdc78);
    cursor: pointer;
  }

  .build-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.18);
    color: white;
  }

  .build-complete-msg {
    text-align: center;
    font-family: "Cardo", serif;
    font-style: italic;
    color: var(--inv-good, lightgreen);
    margin: 1rem 0;
  }

  .stages-progress {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-top: 0.5rem;
  }

  .stages-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .stage-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    font-size: 0.72rem;
    opacity: 0.45;
    padding: 0.15rem 0.3rem;
    border-radius: 2px;
    transition: all 0.15s;
  }

  .stage-row.completed {
    opacity: 0.7;
    color: var(--inv-good, lightgreen);
    text-decoration: line-through;
  }

  .stage-row.active {
    opacity: 1;
    color: var(--inv-accent, #ffdc78);
    background: rgba(255, 220, 120, 0.05);
    font-weight: bold;
    border-left: 2px solid var(--inv-accent, #ffdc78);
    padding-left: calc(0.3rem - 2px);
  }

  .stage-num {
    font-family: monospace;
    opacity: 0.6;
  }

  .stage-desc {
    flex: 1;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .stage-status-text {
    font-size: 0.64rem;
    text-transform: uppercase;
    opacity: 0.8;
  }

  .guide-tip {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.72rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
    margin: 0.2rem 0;
    line-height: 1.35;
  }

  .completion-progress {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 0.5rem;
    margin-top: 0.5rem;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.72rem;
    font-weight: bold;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.6));
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .progress-bar-bg {
    width: 100%;
    height: 6px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--inv-accent, #ffdc78);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
</style>
