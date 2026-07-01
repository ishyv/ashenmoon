<script lang="ts">
/**
 * TopHudActions.svelte
 * Extracted top-right navigation bar. Scenario button is gated by
 * showScenarioTools so it stays hidden during normal play.
 */
let {
  showInventory,
  inventoryTab,
  showScenarioTools,
  activeScenario,
  showEquipment,
  showQuests,
  isFullscreen,
  onSkills,
  onInventory,
  onCrafting,
  onEquipment,
  onQuests,
  onSettings,
  onScenario,
  onToggleFullscreen,
}: {
  showInventory: boolean;
  inventoryTab: "stash" | "crafting" | "building";
  showScenarioTools: boolean;
  activeScenario: boolean;
  showEquipment: boolean;
  showQuests: boolean;
  isFullscreen: boolean;
  onSkills: () => void;
  onInventory: () => void;
  onCrafting: () => void;
  onEquipment: () => void;
  onQuests: () => void;
  onSettings: () => void;
  onScenario: () => void;
  onToggleFullscreen: () => void;
} = $props();
</script>

<div class="top-bar">
  <button class="settings-trigger-btn" onclick={onSkills} title="skills [C]">
    skills
  </button>
  <button
    class="settings-trigger-btn"
    class:active-scenario={showEquipment}
    onclick={onEquipment}
    title="gear [I]"
  >
    gear
  </button>
  <button
    class="settings-trigger-btn"
    class:active-scenario={showInventory && inventoryTab === "stash"}
    onclick={onInventory}
    title="stash [Tab]"
  >
    stash
  </button>
  <button
    class="settings-trigger-btn"
    class:active-scenario={showInventory && inventoryTab === "crafting"}
    onclick={onCrafting}
    title="craft [G]"
  >
    craft
  </button>
  <button
    class="settings-trigger-btn"
    class:active-scenario={showQuests}
    onclick={onQuests}
    title="quests [Q]"
  >
    quests
  </button>
  <button class="settings-trigger-btn" onclick={onSettings} title="settings">
    settings
  </button>
  <button
    class="settings-trigger-btn"
    onclick={onToggleFullscreen}
    title={isFullscreen ? 'exit fullscreen [F11]' : 'fullscreen [F11]'}
  >
    {isFullscreen ? 'windowed' : 'fullscreen'}
  </button>
  {#if showScenarioTools}
    <button
      class="settings-trigger-btn"
      class:active-scenario={activeScenario}
      onclick={onScenario}
      title="Scenario tools"
    >
      scenario
    </button>
  {/if}
</div>

<style>
  .top-bar {
    position: absolute;
    top: 1.1rem;
    right: 1.1rem;
    display: flex;
    gap: 0.5rem;
    z-index: 10;
  }

  .settings-trigger-btn {
    background: rgba(18, 14, 12, 0.72);
    border: 1px solid rgba(255, 220, 120, 0.25);
    border-radius: 4px;
    padding: 0.4rem 0.8rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    color: rgba(255, 220, 120, 0.9);
    cursor: pointer;
    backdrop-filter: blur(2px);
    transition: all 0.12s;
  }

  .settings-trigger-btn:hover,
  .settings-trigger-btn.active-scenario {
    background: rgba(255, 220, 120, 0.15);
    border-color: rgba(255, 220, 120, 0.75);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.15);
    color: var(--color-text, white);
  }
</style>
