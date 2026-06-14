<script lang="ts">
import { onMount } from "svelte";
import { world } from "$lib/core/ecs/ecs-miniplex";
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { M3_CARCASS_DEFINITIONS, resolveCarcassToolQuality } from "$lib/domain/animals/carcass-processing";
import { getEquippedWeaponId, getItemQty } from "$lib/state/rpg/inventory-api";
import { getItemDef } from "$lib/domain/items";
import type { WorldActionOption } from "$lib/domain/world-actions";

interface CarcassPanelEngine {
  getWorldActionOptions(targetId: string): WorldActionOption[];
  executeWorldAction(action: WorldActionOption): void;
}

let {
  targetId,
  engine,
  onClose,
}: {
  targetId: string;
  engine: CarcassPanelEngine | null;
  onClose: () => void;
} = $props();

const entity = $derived(world.entities.find((e) => e.id === targetId));
const carcass = $derived(entity?.carcass);
const def = $derived(carcass ? M3_CARCASS_DEFINITIONS[carcass.speciesId] : null);

const processActions = $derived(
  (engine ? engine.getWorldActionOptions(targetId) : []).filter(
    (a) => a.executeIntent.kind === "carcass.process",
  ),
);

let ageSec = $state(0);

onMount(() => {
  ageSec = entity?.carcass?.ageSec ?? 0;
  const interval = setInterval(() => {
    ageSec = entity?.carcass?.ageSec ?? ageSec;
  }, 1000);
  return () => clearInterval(interval);
});

const toolQuality = $derived(
  resolveCarcassToolQuality({
    equippedItemId: getEquippedWeaponId(),
    hasSharpFlint: getItemQty("flint_shard") > 0 || getItemQty("bone_shard") > 0,
  }),
);

const toolLabel = $derived(
  toolQuality === "improved_knife"
    ? "improved knife"
    : toolQuality === "crude_knife"
      ? "crude knife"
      : toolQuality === "sharp_flint"
        ? "sharp flint"
        : "bare hands",
);

const remainingSec = $derived(
  def ? Math.max(0, def.freshDurationSec + def.spoilingDurationSec - ageSec) : 0,
);

const stateLabel = $derived(
  carcass?.state === "spoiling"
    ? "spoiling"
    : carcass?.state === "partially_processed"
      ? "partly processed"
      : carcass?.state === "rotten"
        ? "rotten"
        : "fresh",
);

function formatTime(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function yieldsFor(action: WorldActionOption): string {
  const actionId = action.executeIntent.payload?.["action"];
  if (typeof actionId !== "string" || !def || actionId === "inspect") return "";
  const key = actionId as keyof typeof def.actions;
  const yields = def.actions[key]?.yields ?? [];
  return yields
    .map((y) => `+${y.qty} ${getItemDef(y.itemId)?.name.toLowerCase() ?? y.itemId}`)
    .join(", ");
}

function selectAction(action: WorldActionOption) {
  engine?.executeWorldAction(action);
  onClose();
}
</script>

<GamePanel id="carcass-panel" title={def?.displayName ?? "carcass"} width="22rem" {onClose}>
  <div class="carcass-panel">
    <div class="carcass-meta">
      <span class="state-tag" class:spoiling={carcass?.state === "spoiling"} class:rotten={carcass?.state === "rotten"}>
        {stateLabel}
      </span>
      <span class="spoil-timer">{formatTime(remainingSec)}</span>
    </div>
    <div class="tool-row">tool / {toolLabel}</div>

    {#if processActions.length === 0}
      <p class="empty-note">nothing useful remains.</p>
    {:else}
      <ul class="action-list">
        {#each processActions as action}
          <li>
            <button class="action-row" onclick={() => selectAction(action)}>
              <span class="action-label">{action.label}</span>
              <span class="action-meta">
                <span class="action-yields">{yieldsFor(action)}</span>
                {#if action.durationSec}
                  <span class="action-dur">{action.durationSec}s</span>
                {/if}
              </span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</GamePanel>

<style>
  .carcass-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem 0;
  }

  .carcass-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.25rem;
  }

  .state-tag {
    font-size: var(--reg-label-size, 0.78rem);
    letter-spacing: 0.04em;
    color: var(--signal);
    text-transform: uppercase;
  }
  .state-tag.spoiling { color: var(--accent); }
  .state-tag.rotten   { color: var(--text-soft); }

  .spoil-timer {
    font-size: var(--reg-label-size, 0.78rem);
    color: var(--text-soft);
    margin-left: auto;
  }

  .tool-row {
    font-size: var(--reg-label-size, 0.78rem);
    color: var(--text-soft);
    padding: 0 0.25rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.4rem;
  }

  .action-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .action-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--line);
    cursor: pointer;
    text-align: left;
    color: var(--text);
    font-size: var(--reg-body-size, 0.9rem);
  }

  .action-row:hover {
    background: var(--bg-elev);
  }

  .action-label {
    flex: 1;
  }

  .action-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  .action-yields {
    font-size: var(--reg-label-size, 0.78rem);
    color: var(--accent);
  }

  .action-dur {
    font-size: var(--reg-label-size, 0.78rem);
    color: var(--text-soft);
    min-width: 2.5rem;
    text-align: right;
  }

  .empty-note {
    font-size: var(--reg-body-size, 0.9rem);
    color: var(--text-soft);
    padding: 0.25rem 0.5rem;
    margin: 0;
  }
</style>
