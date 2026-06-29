<script lang="ts">
  import type { GameEngine } from "$lib/core/engine";
  import { SCENARIO_REGISTRY } from "$lib/domain/scenarios";
  import { GATHERABLE_DEFINITIONS } from "$lib/domain/gathering/gatherables";
  import { equipTool } from "$lib/state/rpg-controller.svelte";
  import { getEquippedWeaponId } from "$lib/state/rpg/inventory-api";
  import { debugConfig } from "$lib/state/runtime-ui-state.svelte";
  import { CollisionFootprints, type CollisionFootprint } from "$lib/domain/collision";

  let {
    engine,
    activeScenarioId,
    onClose,
  }: {
    engine: GameEngine | null;
    activeScenarioId: string | null;
    onClose: () => void;
  } = $props();

  const scenarios = $derived(Object.values(SCENARIO_REGISTRY));
  const gatherableEntries = $derived(
    Object.entries(GATHERABLE_DEFINITIONS).map(([id, def]) => ({ id, name: def.displayName }))
  );

  const PLACER_OFFSETS: [number, number][] = [
    [2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [-2, 0], [-3, 0], [0, 2], [0, -2],
  ];

  // The player has a single weapon slot, so combat and gatherable checks both
  // ride this quick swap surface in scenario mode.
  const TOOLS: { label: string; itemId: string | null }[] = [
    { label: "knife", itemId: "crude_knife" },
    { label: "spear", itemId: "wooden_spear" },
    { label: "🪓 axe", itemId: "stone_axe" },
    { label: "⛏️ pickaxe", itemId: "stone_pickaxe" },
    { label: "✋ bare", itemId: null },
  ];
  const equippedToolId = $derived(getEquippedWeaponId());
  let collisionTarget = $state("stone_node");
  let collisionFootprint = $state<CollisionFootprint>({ ...CollisionFootprints.rock });

  function loadScenario(id: string) {
    window.location.href = `/game?scenario=${id}`;
  }

  function returnToNormal() {
    window.location.href = "/game";
  }

  function placeGatherable(gatherableId: string) {
    if (!engine) return;
    const g = engine.devPlayerGrid();
    for (const [dx, dy] of PLACER_OFFSETS) {
      const result = engine.devSpawn(gatherableId, g.gx + dx, g.gy + dy);
      if (!result.startsWith("cell occupied") && !result.startsWith("out of bounds") && !result.startsWith("unknown")) break;
    }
  }

  function loadCollisionTarget(id: string) {
    collisionTarget = id;
    const def = GATHERABLE_DEFINITIONS[id];
    collisionFootprint = { ...(def?.collision?.footprint ?? CollisionFootprints.rock) };
  }

  function setCollisionOverlay(enabled: boolean) {
    engine?.setCollisionOverlayVisible(enabled);
  }

  function applyCollisionFootprint() {
    engine?.setCollisionFootprintOverride(collisionTarget, collisionFootprint);
  }

  function resetCollisionFootprint() {
    engine?.clearCollisionFootprintOverride(collisionTarget);
    loadCollisionTarget(collisionTarget);
  }
</script>

<div class="scenario-panel">
  <div class="panel-header">
    <span class="panel-title">scenarios</span>
    <button class="close-btn" onclick={onClose}>×</button>
  </div>

  <div class="panel-body">
    <div class="section-label">load scenario</div>

    {#each scenarios as sc}
      <div class="sc-card" class:active={activeScenarioId === sc.id}>
        <div class="sc-name">{sc.name}</div>
        <div class="sc-desc">{sc.description}</div>
        <button class="sc-btn" onclick={() => loadScenario(sc.id)}>
          {activeScenarioId === sc.id ? "reload" : "load"}
        </button>
      </div>
    {/each}

    {#if activeScenarioId}
      <button class="sc-btn sc-btn-dim" onclick={returnToNormal}>back to normal world</button>
    {/if}

    {#if activeScenarioId && engine}
      <div class="divider"></div>
      <div class="section-label">equipped tool</div>

      <div class="tool-toggle">
        {#each TOOLS as t}
          <button
            class="toggle-btn"
            class:on={equippedToolId === t.itemId}
            onclick={() => void equipTool(t.itemId)}
          >
            {t.label}
          </button>
        {/each}
      </div>

      <div class="divider"></div>
      <div class="section-label">runtime tools</div>

      <div class="tool-row">
        <button class="tool-btn" onclick={() => engine!.respawnAllNodes()}>
          respawn all nodes
        </button>
        <button class="tool-btn" onclick={() => engine!.devClearEnemies()}>
          clear enemies
        </button>
        <button class="tool-btn" onclick={() => {
          const g = engine!.devPlayerGrid();
          engine!.devSpawnEnemy(g.gx + 2, g.gy);
        }}>
          spawn enemy nearby
        </button>
      </div>

      <div class="divider"></div>
      <div class="section-label">collision tools</div>

      <div class="tool-toggle">
        <button
          class="toggle-btn"
          class:on={debugConfig.showCollision}
          onclick={() => setCollisionOverlay(!debugConfig.showCollision)}
        >
          overlay {debugConfig.showCollision ? "on" : "off"}
        </button>
      </div>

      <select class="collision-select" bind:value={collisionTarget} onchange={() => loadCollisionTarget(collisionTarget)}>
        {#each gatherableEntries as { id, name }}
          <option value={id}>{name.toLowerCase()}</option>
        {/each}
      </select>

      <div class="footprint-grid">
        <label>min x<input type="number" min="0" max="1" step="0.01" bind:value={collisionFootprint.minX} /></label>
        <label>max x<input type="number" min="0" max="1" step="0.01" bind:value={collisionFootprint.maxX} /></label>
        <label>min y<input type="number" min="0" max="1" step="0.01" bind:value={collisionFootprint.minY} /></label>
        <label>max y<input type="number" min="0" max="1" step="0.01" bind:value={collisionFootprint.maxY} /></label>
      </div>

      <div class="tool-row">
        <button class="tool-btn" onclick={applyCollisionFootprint}>apply footprint</button>
        <button class="tool-btn" onclick={resetCollisionFootprint}>reset footprint</button>
      </div>

      <div class="divider"></div>
      <div class="section-label">place gatherable</div>

      <div class="placer-grid">
        {#each gatherableEntries as { id, name }}
          <button class="placer-btn" title={id} onclick={() => placeGatherable(id)}>
            {name.toLowerCase()}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .scenario-panel {
    position: absolute;
    top: 4rem;
    right: 1.1rem;
    width: 280px;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    background: rgba(18, 14, 12, 0.92);
    border: 1px solid rgba(255, 220, 120, 0.18);
    backdrop-filter: blur(6px);
    z-index: 25;
    pointer-events: auto;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid rgba(255, 220, 120, 0.12);
  }

  .panel-title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    color: rgba(255, 220, 120, 0.9);
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 220, 120, 0.55);
    font-size: 1rem;
    cursor: pointer;
    padding: 0 0.2rem;
    line-height: 1;
  }

  .close-btn:hover {
    color: rgba(255, 220, 120, 0.9);
  }

  .panel-body {
    padding: 0.6rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .section-label {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    color: rgba(255, 220, 120, 0.45);
    text-transform: uppercase;
    margin-top: 0.2rem;
  }

  .sc-card {
    border: 1px solid rgba(255, 220, 120, 0.1);
    padding: 0.5rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .sc-card.active {
    border-color: rgba(255, 220, 120, 0.35);
    background: rgba(255, 220, 120, 0.04);
  }

  .sc-name {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85);
  }

  .sc-desc {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.35;
  }

  .sc-btn {
    align-self: flex-start;
    margin-top: 0.2rem;
    background: rgba(255, 220, 120, 0.1);
    border: 1px solid rgba(255, 220, 120, 0.3);
    color: rgba(255, 220, 120, 0.85);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.68rem;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    letter-spacing: 0.03em;
  }

  .sc-btn:hover {
    background: rgba(255, 220, 120, 0.18);
  }

  .sc-btn-dim {
    color: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.15);
    background: none;
    font-size: 0.65rem;
  }

  .divider {
    height: 1px;
    background: rgba(255, 220, 120, 0.1);
    margin: 0.3rem 0;
  }

  .tool-toggle {
    display: flex;
    gap: 0.25rem;
  }

  .toggle-btn {
    flex: 1;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.55);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    padding: 0.28rem 0.3rem;
    cursor: pointer;
    letter-spacing: 0.02em;
  }

  .toggle-btn:hover {
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.85);
  }

  .toggle-btn.on {
    border-color: rgba(255, 220, 120, 0.5);
    background: rgba(255, 220, 120, 0.12);
    color: rgba(255, 220, 120, 0.9);
  }

  .tool-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .tool-btn {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.7);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.68rem;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    text-align: left;
    letter-spacing: 0.02em;
  }

  .tool-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  .placer-grid {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .collision-select {
    width: 100%;
    background: rgba(10, 8, 7, 0.72);
    border: 1px solid rgba(255, 220, 120, 0.16);
    color: rgba(255, 255, 255, 0.72);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    padding: 0.25rem 0.35rem;
  }

  .footprint-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.3rem;
  }

  .footprint-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: rgba(255, 255, 255, 0.45);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.58rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .footprint-grid input {
    min-width: 0;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.78);
    font-family: inherit;
    font-size: 0.65rem;
    padding: 0.22rem 0.3rem;
  }

  .placer-btn {
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.5);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    text-align: left;
  }

  .placer-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);
    border-color: rgba(255, 220, 120, 0.2);
  }
</style>

