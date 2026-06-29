<script lang="ts">
import { onDestroy, onMount } from "svelte";
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { devFlags } from "$lib/state/dev-flags.svelte";
import { getItemDef, traitOf } from "$lib/domain/items";
import { playSound } from "$lib/audio/audio-engine";
import { type CraftRecipe } from "$lib/domain/crafting/recipes";
import { canCraft as canCraftRecipe } from "$lib/domain/crafting/crafting-system";
import { inspect as inspectKnowledge } from "$lib/state/rpg/knowledge.svelte";
import { allRecipeList, recipeKnowledge, recipeKnown } from "$lib/state/rpg/crafting.svelte";
import { buildOptionsFromInventory } from "$lib/domain/building-options";
import {
  canEquipFromInventory,
  resolveInventoryItemActions,
  resolvePrimaryInventoryAction,
  type InventoryItemActionView,
} from "$lib/domain/inventory-item-action";
import type { RpgInventorySlot } from "$lib/domain/rpg-types";
import { canConsume, consumeItem, getConsumeVerb } from "$lib/state/rpg/consume-actions";
import ItemGrid from "./inventory/ItemGrid.svelte";
import ItemInspectPanel from "./inventory/ItemInspectPanel.svelte";
import CraftingPanel from "./inventory/CraftingPanel.svelte";
import BuildingPanel from "./inventory/BuildingPanel.svelte";
import type { BuildRecipeView, InventoryEngine, InventoryItemView, InventoryTab } from "./inventory/types";
import {
  INVENTORY_FILTERS,
  countInventoryFilters,
  filterInventoryItems,
  type InventoryFilterId,
} from "./inventory/inventory-filters";
import { Apple, Boxes, Hammer, Package, ScrollText, Shield } from "lucide-svelte";

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
let decayProgress = $state<Record<string, number>>({});
let decayInterval: ReturnType<typeof setInterval> | undefined;
let activeItemFilter = $state<InventoryFilterId>("all");

type GearLoadoutSlot = "helmet" | "chest" | "shield" | "pants" | "boots" | "ring" | "necklace";

const allRecipes = $derived(allRecipeList());
const inspectNotes = $derived(selectedItem ? inspectKnowledge(selectedItem) : null);
const stashLimit = $derived(gameState.rpg.profile?.stashSize ?? 20);

const buildRecipes = $derived<BuildRecipeView[]>(
  [
    ...buildOptionsFromInventory((gameState.rpg.inventory?.slots ?? {}) as Record<string, RpgInventorySlot>)
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
    {
      id: "house1",
      sourceItemId: "",
      available: Math.floor(getMaterialQty("stick") / 2),
      name: "outpost house",
      description: "a blueprint for a multi-stage outpost house.",
      costs: [{ itemId: "stick", name: "Stick", required: 2 }],
    },
    {
      id: "tower",
      sourceItemId: "",
      available: Math.floor(getMaterialQty("stick") / 2),
      name: "tower",
      description: "a blueprint for a multi-stage watchtower.",
      costs: [{ itemId: "stick", name: "Stick", required: 2 }],
    }
  ]
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

function gearSlotForItem(itemId: string): GearLoadoutSlot | null {
  const def = getItemDef(itemId);
  const wearable = def ? traitOf(def, "wearable") : undefined;
  if (!wearable) return null;
  if (wearable.slot === "head") return "helmet";
  if (wearable.slot === "body") return "chest";
  if (wearable.slot === "feet") return "boots";
  if (wearable.slot === "hands") return "shield";
  return null;
}

async function equipTool(itemId: string) {
  try {
    const def = getItemDef(itemId);
    if (!def) return;

    if (canEquipFromInventory(def)) {
      const result = await dispatchRpgCommand({ type: "equipTool", itemId });
      if (!result.ok) throw new Error(result.error);
      playSound("ui.inventory.equip", { conditions: { itemType: def.category } });
      selectedItem = null;
      return;
    }

    const wearable = traitOf(def, "wearable");
    if (wearable) {
      const slotKey = gearSlotForItem(itemId);

      if (slotKey) {
        const result = await dispatchRpgCommand({ type: "equipGear", itemId, slot: slotKey });
        if (!result.ok) throw new Error(result.error);
        playSound("ui.inventory.equip", { conditions: { itemType: def.category } });
        selectedItem = null;
      }
    }
  } catch (err) {
    console.error("equip error:", err instanceof Error ? err.message : String(err));
  }
}

async function unequipItem(itemId: string) {
  try {
    const def = getItemDef(itemId);
    if (!def) return;

    if (canEquipFromInventory(def)) {
      const result = await dispatchRpgCommand({ type: "equipTool", itemId: null });
      if (!result.ok) throw new Error(result.error);
      playSound("ui.inventory.equip", { conditions: { itemType: def.category } });
      selectedItem = null;
      return;
    }

    const slot = gearSlotForItem(itemId);
    if (!slot) return;
    const result = await dispatchRpgCommand({ type: "equipGear", itemId: null, slot });
    if (!result.ok) throw new Error(result.error);
    playSound("ui.inventory.equip", { conditions: { itemType: def.category } });
    selectedItem = null;
  } catch (err) {
    console.error("unequip error:", err instanceof Error ? err.message : String(err));
  }
}

async function handleDblClickItem(itemId: string) {
  const def = getItemDef(itemId);
  if (!def) return;

  const actions = inventoryActionsFor(itemId, def);
  const action = resolvePrimaryInventoryAction(actions);
  if (!action) return;

  if (action.id === "place" && action.placeKind === "building" && action.buildableId) {
    engine?.startBuildingPlacement(action.buildableId, () => {}, onClose, itemId);
    selectedItem = null;
    onClose();
  } else if (action.id === "place") {
    engine?.startItemPlacement(itemId, () => {}, () => {});
    selectedItem = null;
    onClose();
  } else if (action.id === "equip") {
    await equipTool(itemId);
  } else if (action.id === "unequip") {
    await unequipItem(itemId);
  } else if (action.id === "consume" && getConsumeVerb(itemId) && canConsume(itemId)) {
    consumeItem(itemId);
    selectedItem = null;
  } else if (action.id === "study") {
    await studyBlueprint(itemId);
  }
}

function inventoryActionsFor(itemId: string, def = getItemDef(itemId)): readonly InventoryItemActionView[] {
  const blueprint = def ? traitOf(def, "blueprint") : undefined;
  return resolveInventoryItemActions({
    def,
    itemId,
    isEquipped: isEquipped(itemId),
    consumeVerb: getConsumeVerb(itemId),
    canConsume: canConsume(itemId),
    blueprintKnown: blueprint ? recipeKnown(blueprint.recipeId) : false,
  });
}

function startPlacementForItem(itemId: string): void {
  const placeAction = inventoryActionsFor(itemId).find((action) => action.id === "place" && action.enabled);
  if (placeAction?.placeKind === "building" && placeAction.buildableId) {
    engine?.startBuildingPlacement(placeAction.buildableId, () => {}, onClose, itemId);
  } else {
    engine?.startItemPlacement(itemId, () => {}, () => {});
  }
  selectedItem = null;
  onClose();
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

const itemFilterCounts = $derived(countInventoryFilters(itemsList, getItemDef));
const filteredItemsList = $derived<InventoryItemView[]>(
  filterInventoryItems(itemsList, activeItemFilter, searchQuery, getItemDef)
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
  } catch (err) {
    console.error("craft error:", err instanceof Error ? err.message : String(err));
  }
}

function startBuildPlacement(recipe: BuildRecipeView): void {
  if (!canBuild(recipe)) return;
  engine?.startBuildingPlacement(recipe.id, () => {}, onClose, recipe.sourceItemId);
}

async function studyBlueprint(itemId: string): Promise<void> {
  try {
    const result = await dispatchRpgCommand({ type: "studyBlueprint", itemId });
    if (!result.ok) throw new Error(result.error);
    selectedItem = null;
    playSound("craft");
  } catch (err) {
    console.error("study error:", err instanceof Error ? err.message : String(err));
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
        onUnequip={unequipItem}
        onPlace={startPlacementForItem}
        onStudy={studyBlueprint}
      />
    </GamePanel>
  {/if}

  <GamePanel id="inventory" title="stash & assembly" width={activeTab === "crafting" ? "46rem" : "22rem"} onClose={onClose}>
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
          <div class="filter-toolbar" aria-label="stash filters">
            {#each INVENTORY_FILTERS as filter (filter.id)}
              {@const count = itemFilterCounts[filter.id]}
              <button
                type="button"
                class="filter-btn"
                class:active={activeItemFilter === filter.id}
                disabled={filter.id !== "all" && count === 0}
                aria-label="{filter.ariaLabel}, {count} item{count === 1 ? '' : 's'}"
                title="{filter.label}: {count}"
                onclick={() => (activeItemFilter = filter.id)}
              >
                {#if filter.id === "all"}
                  <Package size={13} aria-hidden="true" />
                {:else if filter.id === "consumable"}
                  <Apple size={13} aria-hidden="true" />
                {:else if filter.id === "equipment"}
                  <Shield size={13} aria-hidden="true" />
                {:else if filter.id === "materials"}
                  <Boxes size={13} aria-hidden="true" />
                {:else if filter.id === "structures"}
                  <Hammer size={13} aria-hidden="true" />
                {:else}
                  <ScrollText size={13} aria-hidden="true" />
                {/if}
                <span>{filter.label}</span>
                <span class="filter-count">{count}</span>
              </button>
            {/each}
          </div>
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
          onDblClick={handleDblClickItem}
        />
      {:else if activeTab === "crafting"}
        <CraftingPanel
          {allRecipes}
          knownRecipeIds={recipeKnowledge.known}
          items={itemsList}
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
    padding: 0.45rem var(--inv-space) 0.65rem;
    border-bottom: 1px solid var(--inv-border-muted);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .filter-toolbar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .filter-btn {
    min-width: 0;
    height: 1.8rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.35rem;
    border: 1px solid var(--inv-border-muted);
    border-radius: var(--inv-radius-sm);
    background: var(--inv-surface-soft);
    color: var(--inv-text-muted);
    font-family: "Cinzel", serif;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.12s, color 0.12s, background 0.12s;
  }

  .filter-btn:hover:not(:disabled),
  .filter-btn.active {
    border-color: var(--inv-accent);
    background: var(--inv-accent-dim);
    color: var(--inv-accent);
  }

  .filter-btn:disabled {
    cursor: not-allowed;
    opacity: 0.36;
  }

  .filter-count {
    min-width: 1ch;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.55rem;
    color: var(--inv-text-muted);
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
