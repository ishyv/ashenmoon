<script lang="ts">
import { onDestroy, onMount } from "svelte";
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { getItemDef, traitOf } from "$lib/domain/items";
import { triggerQuestEvent } from "$lib/state/rpg/quests.svelte";
import { playSound } from "$lib/audio/audio-engine";
import { type CraftRecipe, CRAFT_RECIPES } from "$lib/domain/crafting/recipes";
import { canCraft as canCraftRecipe } from "$lib/domain/crafting/crafting-system";
import { getExperimentHint, matchExperiment } from "$lib/domain/crafting/experimental";
import { inspect as inspectKnowledge } from "$lib/state/rpg/knowledge.svelte";
import { knownRecipeList, learnRecipe } from "$lib/state/rpg/crafting.svelte";
import { buildOptionsFromInventory } from "$lib/domain/building-options";
import type { RpgInventorySlot } from "$lib/domain/rpg-types";
import ItemGrid from "./inventory/ItemGrid.svelte";
import ItemInspectPanel from "./inventory/ItemInspectPanel.svelte";
import CraftingPanel from "./inventory/CraftingPanel.svelte";
import BuildingPanel from "./inventory/BuildingPanel.svelte";
import type { BuildRecipeView, InventoryEngine, InventoryItemView, InventoryTab } from "./inventory/types";

let { 
  engine, 
  initialTab = "stash", 
  onClose 
}: { 
  engine: InventoryEngine | null; 
  initialTab?: InventoryTab; 
  onClose: () => void 
} = $props();

let activeTab = $state<InventoryTab>("stash");
let hoveredItem = $state<string | null>(null);
let selectedItem = $state<string | null>(null);
let experimentInputs = $state<Record<string, number>>({});
let experimentMessage = $state("");
let decayProgress = $state<Record<string, number>>({});
let decayInterval: ReturnType<typeof setInterval> | undefined;

const recipes = $derived(knownRecipeList());
const inspectNotes = $derived(selectedItem ? inspectKnowledge(selectedItem) : null);
const stashLimit = $derived(gameState.rpg.profile?.stashSize ?? 20);

const buildRecipes = $derived<BuildRecipeView[]>(
  buildOptionsFromInventory((gameState.rpg.inventory?.slots ?? {}) as Record<string, RpgInventorySlot>)
    .map((option) => ({
      id: option.buildableId,
      sourceItemId: option.sourceItemId,
      available: option.available,
      name: option.name,
      description: option.description,
      costs: [{
        itemId: option.sourceItemId,
        name: option.sourceItemName,
        required: 1,
      }],
    })),
);

$effect(() => {
  activeTab = initialTab;
});

function getStashUsage(): number {
  let count = 0;
  const slots = (gameState.rpg.inventory?.slots ?? {}) as Record<string, RpgInventorySlot>;
  for (const slot of Object.values(slots)) {
    if (slot && "qty" in slot) {
      count += slot.qty;
    } else if (slot && "instances" in slot) {
      count += slot.instances.length;
    }
  }
  return count;
}

function getMaterialQty(itemId: string): number {
  const slot = gameState.rpg.inventory?.slots[itemId];
  if (!slot) return 0;
  return "qty" in slot ? slot.qty : slot.instances.length;
}

function slotQty(slot: RpgInventorySlot): number {
  return "qty" in slot ? slot.qty : slot.instances.length;
}

async function equipTool(itemId: string) {
  try {
    const def = getItemDef(itemId);
    if (!def) return;

    if (def.category === "tool") {
      const result = await dispatchRpgCommand({ type: "equipTool", itemId });
      if (!result.ok) throw new Error(result.error);
      playSound("pickup");
      return;
    }

    const wearable = traitOf(def, "wearable");
    if (wearable) {
      let slotKey: "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace" | null = null;
      if (wearable.slot === "head") slotKey = "helmet";
      else if (wearable.slot === "body") slotKey = "chest";
      else if (wearable.slot === "feet") slotKey = "boots";
      else if (wearable.slot === "hands") slotKey = "shield";

      if (slotKey) {
        const result = await dispatchRpgCommand({ type: "equipGear", itemId, slot: slotKey });
        if (!result.ok) throw new Error(result.error);
        playSound("pickup");
      }
    }
  } catch (err) {
    console.error("equip error:", err instanceof Error ? err.message : String(err));
  }
}

function isEquipped(itemId: string): boolean {
  const loadout = gameState.rpg.profile?.loadout;
  if (!loadout) return false;
  for (const slot of Object.values(loadout)) {
    if (!slot) continue;
    if (typeof slot === "string") {
      if (slot === itemId) return true;
    } else if (slot.itemId === itemId) {
      return true;
    }
  }
  return false;
}

const itemsList = $derived<InventoryItemView[]>(
  Object.entries((gameState.rpg.inventory?.slots ?? {}) as Record<string, RpgInventorySlot>)
    .map(([itemId, slot]) => ({ itemId, qty: slotQty(slot) }))
    .filter((item) => item.qty > 0),
);

let searchQuery = $state("");

const filteredItemsList = $derived<InventoryItemView[]>(
  itemsList.filter((item) => {
    const def = getItemDef(item.itemId);
    if (!def) return false;
    return def.name.toLowerCase().includes(searchQuery.toLowerCase());
  })
);

$effect(() => {
  for (const item of itemsList) {
    if (traitOf(getItemDef(item.itemId), "decayable") && decayProgress[item.itemId] === undefined) {
      decayProgress[item.itemId] = 50 + Math.random() * 40;
    }
  }
});

onMount(() => {
  decayInterval = setInterval(() => {
    for (const [itemId, progress] of Object.entries(decayProgress)) {
      const decayable = traitOf(getItemDef(itemId), "decayable");
      if (decayable) {
        const rate = 100 / decayable.lifespanSec;
        decayProgress[itemId] = Math.max(0, progress - rate);
      }
    }
  }, 1000);
});

onDestroy(() => {
  if (decayInterval) clearInterval(decayInterval);
});

function addExperimentIngredient(itemId: string) {
  const current = experimentInputs[itemId] ?? 0;
  const invQty = getMaterialQty(itemId);
  if (current < invQty) {
    experimentInputs[itemId] = current + 1;
    playSound("pickup");
  }
}

function removeExperimentIngredient(itemId: string) {
  const current = experimentInputs[itemId] ?? 0;
  if (current > 1) {
    experimentInputs[itemId] = current - 1;
  } else {
    delete experimentInputs[itemId];
  }
  playSound("pickup");
}

function experimentQty(itemId: string): number {
  return experimentInputs[itemId] ?? 0;
}

function clearExperiment() {
  experimentInputs = {};
  experimentMessage = "";
  playSound("pickup");
}

function canCraft(recipe: CraftRecipe): boolean {
  if (!gameState.rpg.inventory) return false;
  return canCraftRecipe(gameState.rpg.inventory.slots, recipe.id, {
    isNearCampfire: engine?.isNearCampfire() ?? false,
    availableStations: engine?.nearbyStationIds?.() ?? [],
  });
}

function canBuild(recipe: BuildRecipeView): boolean {
  return devFlags.freeBuildingEnabled || recipe.available > 0;
}

async function craftItem(recipe: CraftRecipe): Promise<void> {
  if (!canCraft(recipe)) return;
  try {
    const result = await dispatchRpgCommand({ type: "craft", recipeId: recipe.id, context: {
      isNearCampfire: engine?.isNearCampfire() ?? false,
      availableStations: engine?.nearbyStationIds?.() ?? [],
    }});
    if (!result.ok) throw new Error(result.error);
    playSound("craft");
    
    // Clear items in mix if we successfully crafted something
    experimentInputs = {};
    
    learnRecipe(recipe.id);
    triggerQuestEvent("craft", recipe.id);
  } catch (err) {
    console.error("craft error:", err instanceof Error ? err.message : String(err));
  }
}

function startBuildPlacement(recipe: BuildRecipeView): void {
  if (!canBuild(recipe)) return;
  engine?.startBuildingPlacement(recipe.id, () => {}, onClose, recipe.sourceItemId);
}

async function runExperiment() {
  const count = Object.keys(experimentInputs).length;
  if (count === 0) {
    experimentMessage = "add ingredients first.";
    return;
  }

  try {
    const result = await dispatchRpgCommand({
      type: "experiment",
      inputs: experimentInputs,
      context: {
        isNearCampfire: engine?.isNearCampfire() ?? false,
        availableStations: engine?.nearbyStationIds?.() ?? [],
      },
    });

    if (result.ok) {
      const sync = result.data;
      if (sync.success) {
        playSound("craft");
        experimentInputs = {};
        const recipe = CRAFT_RECIPES.find((r) => r.id === sync.recipeId);
        const name = recipe ? recipe.name.toLowerCase() : "new pattern";
        experimentMessage = `learned ${name}.`;
        if (sync.recipeId) {
          learnRecipe(sync.recipeId);
          triggerQuestEvent("craft", sync.recipeId);
        }
      } else {
        playSound("node.deplete");
        const { partial } = matchExperiment(experimentInputs);
        experimentMessage = getExperimentHint(experimentInputs, partial);
      }
    } else {
      playSound("node.deplete");
      if (result.error === "requires_campfire") {
        experimentMessage = "this needs campfire heat.";
      } else if (result.error === "insufficient_materials") {
        experimentMessage = "you do not have enough material.";
      } else {
        experimentMessage = result.error;
      }
    }
  } catch (err) {
    console.error("experiment error:", err);
  }
}
</script>

<div class="inventory-container">
  {#if selectedItem}
    <GamePanel id="inspect" title="inspect" onClose={() => (selectedItem = null)}>
      <ItemInspectPanel
        itemId={selectedItem}
        {inspectNotes}
        {decayProgress}
        {isEquipped}
        onClose={() => (selectedItem = null)}
        onEquip={equipTool}
        onPlace={(itemId) => {
          selectedItem = null;
          engine?.startItemPlacement(itemId, () => {}, () => {});
        }}
      />
    </GamePanel>
  {/if}

  <GamePanel id="inventory" title="stash & assembly" width={activeTab === "crafting" ? "42rem" : "22rem"} onClose={onClose}>
    <section class="panel-overlay" aria-label="inventory">
      <header class="panel-tab-bar">
        <nav class="tab-header" aria-label="inventory tabs">
          <button class:active={activeTab === "stash"} onclick={() => (activeTab = "stash")}>stash</button>
          <button class:active={activeTab === "crafting"} onclick={() => (activeTab = "crafting")}>craft</button>
          <button class:active={activeTab === "building"} onclick={() => (activeTab = "building")}>build</button>
        </nav>
      </header>

      {#if activeTab === "stash"}
        <div class="stash-usage">
          <div class="bar-labels">
            <span>storage</span>
            <span>{getStashUsage()} / {stashLimit}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: {Math.min(100, (getStashUsage() / stashLimit) * 100)}%"></div>
          </div>
        </div>
        <div class="search-container">
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="filter stash by name..."
            class="search-input"
          />
        </div>
        <ItemGrid
          items={filteredItemsList}
          {selectedItem}
          {decayProgress}
          {isEquipped}
          onSelect={(itemId) => (selectedItem = itemId)}
          onHover={(itemId) => (hoveredItem = itemId)}
        />
      {:else if activeTab === "crafting"}
        <CraftingPanel
          recipes={recipes}
          items={itemsList}
          {experimentInputs}
          {experimentMessage}
          {experimentQty}
          addExperimentIngredient={addExperimentIngredient}
          removeExperimentIngredient={removeExperimentIngredient}
          {runExperiment}
          {clearExperiment}
          {canCraft}
          {craftItem}
          isNearCampfire={() => engine?.isNearCampfire() ?? false}
        />
      {:else}
        <BuildingPanel
          recipes={buildRecipes}
          {getMaterialQty}
          {canBuild}
          {startBuildPlacement}
        />
      {/if}

      <footer class="tooltip-container">
        {#if hoveredItem && getItemDef(hoveredItem)}
          {@const meta = getItemDef(hoveredItem)!}
          <div class="tooltip-name">{meta.name.toLowerCase()}</div>
          <div class="tooltip-desc">{meta.description}</div>
        {:else}
          <div class="tooltip-empty">hover an item</div>
        {/if}
      </footer>
    </section>
  </GamePanel>
</div>

<style>
  .inventory-container {
    --inv-surface: color-mix(in srgb, var(--color-bg, black) 86%, transparent);
    --inv-surface-soft: color-mix(in srgb, var(--color-bg-soft, black) 82%, transparent);
    --inv-border: color-mix(in srgb, var(--color-accent, white) 40%, transparent);
    --inv-border-muted: color-mix(in srgb, var(--color-text, white) 14%, transparent);
    --inv-accent: var(--color-accent, wheat);
    --inv-accent-dim: color-mix(in srgb, var(--color-accent, wheat) 16%, transparent);
    --inv-text: var(--color-text, white);
    --inv-text-muted: color-mix(in srgb, var(--color-text, white) 48%, transparent);
    --inv-good: var(--color-success, lightgreen);
    --inv-danger: var(--color-danger, tomato);
    --inv-warning: var(--color-warning, gold);
    --inv-shadow: color-mix(in srgb, black 70%, transparent);
    --inv-radius: 6px;
    --inv-radius-sm: 4px;
    --inv-space: 1rem;
    --inv-space-lg: 1.1rem;

    position: fixed;
    top: 5rem;
    right: 1.1rem;
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    z-index: 100;
    max-height: calc(100vh - 7rem);
    pointer-events: none;
    font-family: "IBM Plex Mono", monospace;
  }

  .panel-overlay {
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .panel-tab-bar {
    display: flex;
    align-items: center;
    padding: 0.6rem var(--inv-space) 0.5rem;
    border-bottom: 1px solid var(--inv-border-muted);
    background: rgba(255, 220, 120, 0.01);
  }

  .tab-header {
    display: flex;
    gap: 0.75rem;
  }

  .tab-header button {
    border: 0;
    background: transparent;
    color: var(--inv-text-muted);
    font-family: "Cinzel", serif;
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    font-weight: 600;
    cursor: pointer;
    text-transform: uppercase;
    transition: color 0.1s;
    padding: 0.2rem 0;
  }

  .tab-header button.active {
    color: var(--inv-accent);
    border-bottom: 2px solid var(--inv-accent);
  }

  .stash-usage {
    padding: 0.65rem var(--inv-space);
    border-bottom: 1px solid var(--inv-border-muted);
  }

  .search-container {
    padding: 0.35rem var(--inv-space) 0.65rem;
    border-bottom: 1px solid var(--inv-border-muted);
  }

  .search-input {
    width: 100%;
    background: var(--inv-surface-soft);
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    color: var(--inv-text);
    font-family: inherit;
    font-size: 0.75rem;
    padding: 0.35rem 0.5rem;
    outline: none;
    transition: border-color 0.1s;
  }

  .search-input:focus {
    border-color: var(--inv-border);
  }

  .bar-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.3rem;
    color: var(--inv-text-muted);
    font-size: 0.68rem;
  }

  .progress-track {
    height: 4px;
    overflow: hidden;
    border-radius: 2px;
    background: var(--inv-border-muted);
  }

  .progress-fill {
    height: 100%;
    background: var(--inv-accent);
  }

  .tooltip-container {
    min-height: 4.5rem;
    padding: 0.75rem var(--inv-space);
    border-top: 1px solid var(--inv-border-muted);
    background: var(--inv-surface-soft);
  }

  .tooltip-name {
    margin-bottom: 0.25rem;
    font-family: "Cinzel", serif;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--inv-accent);
    letter-spacing: 0.03em;
  }

  .tooltip-desc,
  .tooltip-empty {
    color: var(--inv-text-muted);
    font-family: "Cardo", serif;
    font-style: italic;
    font-size: 0.78rem;
    line-height: 1.35;
  }

  @media (max-width: 760px) {
    .inventory-container {
      inset: 4.5rem 0.75rem auto;
      flex-direction: column;
      align-items: flex-end;
    }
  }
</style>
