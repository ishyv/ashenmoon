<script lang="ts">
import { onDestroy, onMount } from "svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { localRpgCommands } from "$lib/state/persistence/rpg-commands";
import { getItemDef, traitOf } from "$lib/domain/items";
import { triggerQuestEvent } from "$lib/domain/quests.svelte";
import { playSound } from "$lib/audio/audio-engine";
import type { CraftRecipe } from "$lib/domain/crafting/recipes";
import { canCraft as canCraftRecipe } from "$lib/domain/crafting/crafting-system";
import { matchExperiment } from "$lib/domain/crafting/experimental";
import { inspect as inspectKnowledge } from "$lib/domain/knowledge.svelte";
import { knownRecipeList, learnRecipe } from "$lib/domain/crafting.svelte";
import { BUILDING_SPECS } from "$lib/domain/building-specs";
import type { RpgInventorySlot } from "$lib/domain/rpg-types";
import ItemGrid from "./inventory/ItemGrid.svelte";
import ItemInspectPanel from "./inventory/ItemInspectPanel.svelte";
import CraftingPanel from "./inventory/CraftingPanel.svelte";
import BuildingPanel from "./inventory/BuildingPanel.svelte";
import type { BuildRecipeView, InventoryEngine, InventoryItemView, InventoryTab } from "./inventory/types";

let { engine, onClose } = $props<{ engine: InventoryEngine | null; onClose: () => void }>();

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

const buildRecipes: BuildRecipeView[] = [
  "storage_pile",
  "drying_rack",
  "primitive_work_surface",
].map((id) => {
  const spec = BUILDING_SPECS[id];
  return {
    id,
    name: spec.displayName,
    description: spec.description,
    costs: Object.entries(spec.cost ?? {}).map(([itemId, required]) => ({
      itemId,
      name: getItemDef(itemId)?.name.toLowerCase() ?? itemId,
      required,
    })),
  };
});

function slotQty(slot: RpgInventorySlot | undefined): number {
  if (!slot) return 0;
  if ("qty" in slot) return slot.qty ?? 0;
  return slot.instances.length;
}

function getMaterialQty(itemId: string): number {
  const slot = gameState.rpg.inventory?.slots[itemId];
  return slot && "qty" in slot ? (slot.qty ?? 0) : 0;
}

function getStashUsage(): number {
  return Object.values(gameState.rpg.inventory?.slots ?? {}).reduce((sum, slot) => sum + slotQty(slot), 0);
}

function canCraft(recipe: CraftRecipe): boolean {
  if (!gameState.rpg.inventory) return false;
  return canCraftRecipe(gameState.rpg.inventory.slots, recipe.id, {
    isNearCampfire: engine?.isNearCampfire() ?? false,
  });
}

function canBuild(recipe: BuildRecipeView): boolean {
  return recipe.costs.every((cost) => getMaterialQty(cost.itemId) >= cost.required);
}

async function craftItem(recipe: CraftRecipe): Promise<void> {
  if (!canCraft(recipe)) return;
  try {
    applyRpgState(localRpgCommands.craft(recipe.id, { isNearCampfire: engine?.isNearCampfire() ?? false }));
  } catch (err) {
    console.error("crafting error:", err instanceof Error ? err.message : String(err));
    return;
  }

  playSound("craft");
  learnRecipe(recipe.id);
  triggerQuestEvent("craft", recipe.id);
}

function startBuildPlacement(recipe: BuildRecipeView): void {
  if (!canBuild(recipe)) return;
  engine?.startBuildingPlacement(recipe.id, () => {}, onClose);
  onClose();
}

function experimentQty(itemId: string): number {
  return experimentInputs[itemId] ?? 0;
}

function addExperimentIngredient(itemId: string): void {
  const current = experimentQty(itemId);
  if (current >= getMaterialQty(itemId)) return;
  experimentInputs = { ...experimentInputs, [itemId]: current + 1 };
  experimentMessage = "";
}

function removeExperimentIngredient(itemId: string): void {
  const nextQty = experimentQty(itemId) - 1;
  const next = { ...experimentInputs };
  if (nextQty <= 0) delete next[itemId];
  else next[itemId] = nextQty;
  experimentInputs = next;
}

function clearExperiment(): void {
  experimentInputs = {};
  experimentMessage = "";
}

async function runExperiment(): Promise<void> {
  if (Object.keys(experimentInputs).length === 0) {
    experimentMessage = "add ingredients first.";
    return;
  }

  const { recipe, partial } = matchExperiment(experimentInputs);
  if (!recipe) {
    experimentMessage = partial.length > 0 ? "something is close, but the mix is wrong." : "nothing useful happens.";
    return;
  }

  if (!canCraft(recipe)) {
    experimentMessage = recipe.requiresCampfire ? "this needs campfire heat." : "you do not have enough material.";
    return;
  }

  await craftItem(recipe);
  experimentInputs = {};
  experimentMessage = `learned ${recipe.name.toLowerCase()}.`;
}

async function equipTool(itemId: string): Promise<void> {
  if (getItemDef(itemId)?.category !== "tool") return;
  try {
    applyRpgState(localRpgCommands.equipTool(itemId));
  } catch (err) {
    console.error("equip error:", err instanceof Error ? err.message : String(err));
  }
}

function isEquipped(itemId: string): boolean {
  const weapon = gameState.rpg.profile?.loadout?.weapon;
  if (!weapon) return false;
  return typeof weapon === "string" ? weapon === itemId : weapon.itemId === itemId;
}

const itemsList = $derived<InventoryItemView[]>(
  Object.entries(gameState.rpg.inventory?.slots ?? {})
    .map(([itemId, slot]) => ({ itemId, qty: slotQty(slot) }))
    .filter((item) => item.qty > 0),
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
</script>

<div class="inventory-container">
  {#if selectedItem}
    <ItemInspectPanel
      itemId={selectedItem}
      {inspectNotes}
      {decayProgress}
      {isEquipped}
      onClose={() => (selectedItem = null)}
      onEquip={equipTool}
    />
  {/if}

  <section class="panel-overlay" aria-label="inventory">
    <header class="panel-header">
      <nav class="tab-header" aria-label="inventory tabs">
        <button class:active={activeTab === "stash"} onclick={() => (activeTab = "stash")}>stash</button>
        <button class:active={activeTab === "crafting"} onclick={() => (activeTab = "crafting")}>craft</button>
        <button class:active={activeTab === "building"} onclick={() => (activeTab = "building")}>build</button>
      </nav>
      <button class="close-btn" onclick={onClose} aria-label="close inventory">x</button>
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
      <ItemGrid
        items={itemsList}
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
        {addExperimentIngredient}
        {removeExperimentIngredient}
        {runExperiment}
        {clearExperiment}
        {canCraft}
        {craftItem}
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
    width: min(22rem, calc(100vw - 2rem));
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--inv-border);
    border-radius: var(--inv-radius);
    background: var(--inv-surface);
    box-shadow: 0 1rem 2rem var(--inv-shadow);
    color: var(--inv-text);
    overflow: hidden;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem var(--inv-space);
    border-bottom: 1px solid var(--inv-border-muted);
  }

  .tab-header {
    display: flex;
    gap: 0.75rem;
  }

  .tab-header button,
  .close-btn {
    border: 0;
    background: transparent;
    color: var(--inv-text-muted);
    font: inherit;
    cursor: pointer;
  }

  .tab-header button.active {
    color: var(--inv-accent);
  }

  .close-btn {
    font-size: 0.9rem;
  }

  .stash-usage {
    padding: 0.65rem var(--inv-space);
    border-bottom: 1px solid var(--inv-border-muted);
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
    font-size: 0.78rem;
    font-weight: 700;
  }

  .tooltip-desc,
  .tooltip-empty {
    color: var(--inv-text-muted);
    font-size: 0.68rem;
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
