<script lang="ts">
import { onMount } from "svelte";
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { stationProcessVerb, STATION_PROCESSES } from "$lib/domain/systems/station-process";
import { getItemDef } from "$lib/domain/items";
import { getFuelSummary } from "$lib/domain/camp/fuel";
import { getItemQty } from "$lib/state/rpg/inventory-api";
import { getStationDefinition } from "$lib/domain/stations";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { StationProcessRuntime } from "$lib/domain/systems/station-process";

interface StationPanelEngine {
  interactionResource: { activeProcess: StationProcessRuntime | null };
  startStationProcess(entityId: string, processId: string): void;
  refuelCampfire(entityId: string): void;
  cancelStationProcess(): void;
}

let {
  entity,
  engine,
  onClose,
  onOpenCrafting,
}: {
  entity: Entity;
  engine: StationPanelEngine | null;
  onClose: () => void;
  onOpenCrafting?: () => void;
} = $props();

const stationId = $derived(
  entity.station?.stationId ?? (entity.id === "campfire" ? "campfire" : null)
);

const stationTitle = $derived(
  stationId ? (getStationDefinition(stationId)?.name ?? "Station") : "Station"
);

let activeProc = $state<StationProcessRuntime | null>(null);

onMount(() => {
  if (!engine) return;
  activeProc = engine.interactionResource.activeProcess;
  const interval = setInterval(() => {
    activeProc = engine.interactionResource.activeProcess;
  }, 100);
  return () => clearInterval(interval);
});

const processes = $derived(
  STATION_PROCESSES.filter((p) => p.stationId === stationId)
);
const activeProcForEntity = $derived(
  activeProc?.targetEntityId === entity.id ? activeProc : null
);

function getOwnedQty(itemId: string): number {
  return getItemQty(itemId);
}

// Check if player has all ingredients for a process
function hasIngredients(procInputs: Record<string, number>): boolean {
  return Object.entries(procInputs).every(([itemId, qty]) => getOwnedQty(itemId) >= qty);
}

function startProcess(processId: string) {
  engine?.startStationProcess(entity.id, processId);
}

function refuelCampfire() {
  engine?.refuelCampfire(entity.id);
}

function cancelProcess() {
  engine?.cancelStationProcess();
}
</script>

<GamePanel id="station-panel" title={stationTitle} width="24rem" {onClose}>
  <div class="station-container">
    
    <!-- Active Process Progress -->
    {#if activeProcForEntity}
      {@const originalProc = STATION_PROCESSES.find(p => p.outputItemId === activeProcForEntity.outputItemId && p.stationId === activeProcForEntity.stationId)}
      {@const totalDuration = originalProc?.durationSec ?? 10}
      {@const progressPercent = Math.max(0, Math.min(100, ((totalDuration - activeProcForEntity.remainingSec) / totalDuration) * 100))}
      
      <section class="active-process-section">
        <h4 class="section-title">active process</h4>
        <div class="active-process-card">
          <div class="process-info">
            <span class="process-name">
              {stationProcessVerb(activeProcForEntity.processType)} {getItemDef(activeProcForEntity.outputItemId)?.name.toLowerCase() ?? activeProcForEntity.outputItemId}
            </span>
            <span class="process-timer">{activeProcForEntity.remainingSec.toFixed(1)}s</span>
          </div>
          
          <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: {progressPercent}%"></div>
          </div>
          
          <button class="cancel-btn" onclick={cancelProcess}>
            cancel process
          </button>
        </div>
      </section>
    {/if}

    <!-- Station Action Options -->
    <section class="actions-section">
      <h4 class="section-title">available options</h4>
      <div class="actions-list">
        
        <!-- Campfire specific crafting and refueling -->
        {#if stationId === "campfire"}
          <!-- Open Crafting Panel -->
          {#if onOpenCrafting}
            <button class="station-btn craft-panel-btn" onclick={onOpenCrafting}>
              <span class="btn-label">Open Recipe Crafting & Assembly</span>
              <span class="btn-desc">craft tools and smelt metals</span>
            </button>
          {/if}

          <!-- Refuel Campfire -->
          {@const fuelSummary = getFuelSummary({
            firewood_bundle: getOwnedQty("firewood_bundle"),
            wood: getOwnedQty("wood"),
            branch: getOwnedQty("branch"),
            stick: getOwnedQty("stick"),
          })}
          <button 
            class="station-btn refuel-btn" 
            class:enabled={fuelSummary.canRefuel}
            disabled={!fuelSummary.canRefuel}
            onclick={refuelCampfire}
          >
            <div class="btn-content-row">
              <span class="btn-label">Refuel Campfire</span>
              <span class="btn-cost" class:missing={!fuelSummary.canRefuel}>
                {fuelSummary.totalPieces} fuel pieces
              </span>
            </div>
            <span class="btn-desc">extends campfire heat radius</span>
          </button>
        {/if}

        <!-- General Refining Processes -->
        {#each processes as proc}
          {@const outputDef = getItemDef(proc.outputItemId)}
          {@const meetsReqs = hasIngredients(proc.inputs)}
          {@const canStart = meetsReqs && (!activeProc || activeProc.targetEntityId !== entity.id)}
          
          <div class="process-option-card" class:disabled={!meetsReqs}>
            <div class="process-option-header">
              <span class="process-option-title">
                {outputDef?.name.toLowerCase() ?? proc.outputItemId}
              </span>
              <span class="process-option-duration">{proc.durationSec}s</span>
            </div>
            
            <p class="process-option-desc">
              {outputDef?.description ?? "refine raw material."}
            </p>

            <!-- Ingredients Checklist -->
            <div class="ingredients-list">
              {#each Object.entries(proc.inputs) as [itemId, reqQty]}
                {@const owned = getOwnedQty(itemId)}
                {@const met = owned >= reqQty}
                <div class="ingredient-row" class:met={met}>
                  <span class="check-icon">{met ? "✓" : "○"}</span>
                  <span class="ing-name">{getItemDef(itemId)?.name.toLowerCase() ?? itemId}</span>
                  <span class="ing-qty">{owned} / {reqQty}</span>
                </div>
              {/each}
            </div>

            <button 
              class="start-process-btn" 
              class:enabled={canStart}
              disabled={!canStart}
              onclick={() => startProcess(proc.id)}
            >
              {#if activeProc && activeProc.targetEntityId === entity.id}
                station busy
              {:else if meetsReqs}
                process
              {:else}
                missing ingredients
              {/if}
            </button>
          </div>
        {/each}

      </div>
    </section>

  </div>
</GamePanel>

<style>
  .station-container {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    max-height: 28rem;
    overflow-y: auto;
    font-family: "IBM Plex Mono", monospace;
    color: var(--inv-text, white);
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

  /* Active Process Card */
  .active-process-card {
    background: rgba(255, 220, 120, 0.03);
    border: 1px solid rgba(255, 220, 120, 0.15);
    border-radius: 4px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .process-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.76rem;
  }

  .process-name {
    font-weight: bold;
    color: var(--inv-accent, #ffdc78);
  }

  .process-timer {
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
  }

  .progress-bar-container {
    height: 6px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: #ff6432;
    box-shadow: 0 0 8px #ff6432;
    transition: width 0.1s linear;
  }

  .cancel-btn {
    border: 1px solid rgba(244, 67, 54, 0.3);
    background: rgba(244, 67, 54, 0.08);
    color: #ff5555;
    font-size: 0.72rem;
    font-family: inherit;
    text-transform: uppercase;
    font-weight: bold;
    padding: 0.35rem;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .cancel-btn:hover {
    background: rgba(244, 67, 54, 0.22);
    border-color: #ff5555;
  }

  /* Actions Section */
  .actions-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .station-btn {
    width: 100%;
    border: 1px solid var(--inv-border-muted, rgba(255, 255, 255, 0.1));
    background: rgba(255, 255, 255, 0.02);
    border-radius: 4px;
    padding: 0.6rem 0.8rem;
    color: var(--inv-text, white);
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    transition: all 0.12s;
  }

  .craft-panel-btn {
    border-color: rgba(255, 220, 120, 0.2);
    background: rgba(255, 220, 120, 0.04);
  }

  .craft-panel-btn:hover {
    border-color: var(--inv-accent, #ffdc78);
    background: rgba(255, 220, 120, 0.12);
  }

  .refuel-btn {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .refuel-btn.enabled {
    border-color: rgba(255, 100, 50, 0.25);
    background: rgba(255, 100, 50, 0.04);
    opacity: 1;
    cursor: pointer;
  }

  .refuel-btn.enabled:hover {
    border-color: #ff6432;
    background: rgba(255, 100, 50, 0.12);
  }

  .btn-content-row {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .btn-label {
    font-size: 0.78rem;
    font-weight: 600;
  }

  .refuel-btn.enabled .btn-label {
    color: #ff6432;
  }

  .btn-cost {
    font-size: 0.74rem;
    color: var(--inv-good, lightgreen);
  }

  .btn-cost.missing {
    color: var(--inv-danger, tomato);
  }

  .btn-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.72rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
  }

  /* Process Option Card */
  .process-option-card {
    background: rgba(20, 16, 14, 0.5);
    border: 1px solid var(--inv-border-muted, rgba(255, 255, 255, 0.1));
    border-radius: 4px;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transition: border-color 0.12s;
  }

  .process-option-card.disabled {
    opacity: 0.75;
  }

  .process-option-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .process-option-title {
    font-family: "Cinzel", serif;
    font-size: 0.8rem;
    font-weight: bold;
    color: var(--inv-text, white);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .process-option-card:not(.disabled) .process-option-title {
    color: var(--inv-accent, #ffdc78);
  }

  .process-option-duration {
    font-size: 0.72rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
  }

  .process-option-desc {
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
    margin: 0;
    line-height: 1.3;
  }

  .ingredients-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.15);
    padding: 0.4rem 0.6rem;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.02);
  }

  .ingredient-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
  }

  .ingredient-row.met {
    color: var(--inv-text, white);
  }

  .check-icon {
    font-size: 0.74rem;
    color: var(--inv-danger, tomato);
  }

  .ingredient-row.met .check-icon {
    color: var(--inv-good, lightgreen);
  }

  .ing-name {
    flex: 1;
  }

  .ing-qty {
    font-family: monospace;
  }

  .start-process-btn {
    width: 100%;
    border: 1px solid var(--inv-border-muted, rgba(255, 255, 255, 0.1));
    background: rgba(255, 255, 255, 0.02);
    color: var(--inv-text-muted, rgba(255, 255, 255, 0.5));
    font-family: "Cinzel", serif;
    font-size: 0.76rem;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.5rem;
    border-radius: 3px;
    cursor: not-allowed;
    transition: all 0.12s;
  }

  .start-process-btn.enabled {
    border-color: var(--inv-accent, #ffdc78);
    background: rgba(255, 220, 120, 0.06);
    color: var(--inv-accent, #ffdc78);
    cursor: pointer;
  }

  .start-process-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.18);
    color: white;
  }
</style>

