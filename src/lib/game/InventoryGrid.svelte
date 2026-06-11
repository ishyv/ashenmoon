<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { rpgState, ITEM_METADATA, setRpgState } from "./rpg-state.svelte";
import { triggerQuestEvent } from "./quests.svelte";
import { playCraftSound } from "./audio-synthesis";
import { canConsume, consumeItem, getConsumeVerb } from "./consume-actions";
import { CRAFT_RECIPES, type CraftRecipe } from "$lib/rpg/crafting/recipes";
import { canCraft as canCraftRecipe } from "$lib/rpg/crafting/crafting-system";
import { inspect as inspectKnowledge } from "./knowledge.svelte";
import type { KnowledgeProperty } from "$lib/rpg/knowledge/item-knowledge";

// lowercase per design law; shown in the inspect panel's field notes.
const KNOWLEDGE_LABELS: Record<KnowledgeProperty, string> = {
  edible: "edible",
  thirst_value: "quenches thirst",
  toxicity: "can sicken you",
  flammable: "flammable",
  perishable: "perishable",
  heat_sensitive: "heat-sensitive",
  boilable: "boilable",
};

let { engine, onClose } = $props<{ engine: any; onClose: () => void }>();

let activeTab = $state("stash"); // "stash" | "crafting" | "building"
let hoveredItem = $state<string | null>(null);

// Crafting recipes are owned by the pure rpg layer (single source of truth);
// see src/lib/rpg/crafting/. The UI only renders them and previews craftability.
const recipes = CRAFT_RECIPES;

const buildRecipes = [
  {
    id: "wall",
    name: "Outpost Wall",
    description: "A solid stone barrier to block movement. Places 1x1 wall.",
    costs: [
      { itemId: "stone", name: "Stone", required: 4 }
    ]
  },
  {
    id: "house1",
    name: "Outpost House",
    description: "A safe, sturdier shelter. Boosts stamina recovery speed by +50% nearby. Places 2x2 house.",
    costs: [
      { itemId: "oak_plank", name: "Oak Planks", required: 15 },
      { itemId: "stone_block", name: "Stone Blocks", required: 10 }
    ]
  },
  {
    id: "tower",
    name: "Defense Tower",
    description: "A tall stone tower emitting light and warmth to counter the freezing cold. Places 2x2 tower.",
    costs: [
      { itemId: "stone_block", name: "Stone Blocks", required: 15 },
      { itemId: "oak_plank", name: "Oak Planks", required: 15 },
      { itemId: "iron_ingot", name: "Iron Ingots", required: 2 }
    ]
  },
  {
    id: "barracks",
    name: "Outpost Barracks",
    description: "A military outpost structure serving as a primary sanctuary. Places 2x2 barracks.",
    costs: [
      { itemId: "oak_plank", name: "Oak Planks", required: 40 },
      { itemId: "stone_block", name: "Stone Blocks", required: 30 },
      { itemId: "iron_ingot", name: "Iron Ingots", required: 10 }
    ]
  }
];

function getMaterialQty(itemId: string): number {
  if (!rpgState.inventory) return 0;
  const slot = rpgState.inventory.slots[itemId];
  if (!slot) return 0;
  return "qty" in slot ? (slot.qty ?? 0) : 0;
}

function canCraft(recipe: CraftRecipe): boolean {
  if (!rpgState.inventory) return false;
  const isNear = engine ? engine.isNearCampfire() : false;
  return canCraftRecipe(rpgState.inventory.slots, recipe.id, { isNearCampfire: isNear });
}

function canBuild(recipe: typeof buildRecipes[0]): boolean {
  return recipe.costs.every(c => getMaterialQty(c.itemId) >= c.required);
}

async function craftItem(recipe: typeof recipes[0]) {
  if (!canCraft(recipe)) return;
  const isNear = engine ? engine.isNearCampfire() : false;
  try {
    const res = await fetch("/api/rpg/craft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: recipe.id, isNearCampfire: isNear })
    });
    if (res.ok) {
      const newState = await res.json();
      setRpgState(newState);
      playCraftSound();
      triggerQuestEvent("craft", recipe.id);
    } else {
      const err = await res.json();
      console.error("Crafting error:", err.error);
    }
  } catch (err) {
    console.error("Failed to craft:", err);
  }
}

function startBuildPlacement(recipe: typeof buildRecipes[0]) {
  if (!canBuild(recipe)) return;
  engine?.startBuildingPlacement(
    recipe.id,
    () => {},
    () => {
      onClose();
    }
  );
  onClose();
}


let selectedItem = $state<string | null>(null);
// Knowledge inspect view-model for the selected item (known vs unknown facts).
const inspectNotes = $derived(selectedItem ? inspectKnowledge(selectedItem) : null);
let decayProgress = $state<Record<string, number>>({});
let decayInterval: any;

function getStashUsage(): number {
  if (!rpgState.inventory) return 0;
  return Object.values(rpgState.inventory.slots).reduce((sum, slot) => {
    if ("qty" in slot) return sum + (slot.qty ?? 0);
    if ("instances" in slot) return sum + (slot.instances?.length ?? 0);
    return sum;
  }, 0);
}

async function equipTool(itemId: string) {
  const meta = ITEM_METADATA[itemId];
  if (meta?.category !== "tool") return;

  try {
    const res = await fetch("/api/rpg/equip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
    if (res.ok) {
      const newState = await res.json();
      setRpgState(newState);
    } else {
      const err = await res.json();
      console.error("Equip error:", err.error);
    }
  } catch (err) {
    console.error("Failed to equip:", err);
  }
}

function isEquipped(itemId: string): boolean {
  const weapon = rpgState.profile?.loadout?.weapon;
  if (!weapon) return false;
  if (typeof weapon === "string") return weapon === itemId;
  return weapon.itemId === itemId;
}

const itemsList = $derived(() => {
  if (!rpgState.inventory) return [];
  return Object.entries(rpgState.inventory.slots)
    .map(([itemId, slot]) => {
      const qty = "qty" in slot ? slot.qty : (slot as any).instances?.length ?? 0;
      return { itemId, qty };
    })
    .filter((item) => item.qty > 0);
});

// Seed and tick decay progress locally for UI responsiveness
$effect(() => {
  const list = itemsList();
  for (const item of list) {
    const meta = ITEM_METADATA[item.itemId];
    if (meta?.decayable && decayProgress[item.itemId] === undefined) {
      // Seed with random freshness between 50% and 90%
      decayProgress[item.itemId] = 50 + Math.random() * 40;
    }
  }
});

onMount(() => {
  decayInterval = setInterval(() => {
    for (const [itemId, progress] of Object.entries(decayProgress)) {
      const meta = ITEM_METADATA[itemId];
      if (meta?.decayable) {
        const rate = 100 / meta.decayable.lifespanSec;
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
  <!-- Interactive Item Inspect Panel -->
  {#if selectedItem && ITEM_METADATA[selectedItem]}
    {@const meta = ITEM_METADATA[selectedItem]}
    <div class="inspect-panel {meta.rarity}">
      <button class="close-inspect-btn" onclick={() => (selectedItem = null)}>×</button>
      
      <div class="inspect-header">
        <div class="inspect-visual {meta.rarity}">
          {#if meta.iconUrl}
            <img src={meta.iconUrl} alt={meta.name} class="item-icon-img" onerror={(e) => {
              const img = e.currentTarget as HTMLImageElement;
              img.style.display = 'none';
              const fallback = img.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'inline';
            }} />
          {/if}
          <span style={meta.iconUrl ? "display:none" : ""}>
            {#if meta.category === "tool"}
              ⛏️
            {:else if meta.category === "timber"}
              🪵
            {:else if meta.category === "mineral"}
              💎
            {:else if meta.category === "herb"}
              🌿
            {:else}
              📦
            {/if}
          </span>
        </div>
        <div class="inspect-title-block">
          <div class="inspect-name">{meta.name}</div>
          <span class="badge {meta.rarity}">{meta.rarity}</span>
        </div>
      </div>

      <div class="inspect-body">
        <div class="inspect-description">
          <em>"{meta.description}"</em>
        </div>

        <div class="inspect-divider"></div>

        <div class="inspect-section">
          <span class="section-heading">PHYSICAL TRAITS</span>
          <div class="traits-grid">
            <div class="trait-box">
              <span class="trait-lbl">Category</span>
              <span class="trait-val">{meta.category}</span>
            </div>
            <div class="trait-box">
              <span class="trait-lbl">Rarity</span>
              <span class="trait-val rarity-txt">{meta.rarity}</span>
            </div>
          </div>
        </div>

        <div class="inspect-section">
          <span class="section-heading">ENVIRONMENTAL BEHAVIORS</span>
          <div class="behavior-pills">
            {#if meta.flammable}
              <div class="behavior-pill hot">
                <span class="pill-icon">🔥</span>
                <div class="pill-info">
                  <span class="pill-title">Flammable</span>
                  <span class="pill-desc">Ignites at {meta.flammable.ignitionTemp}°C &rarr; {meta.flammable.transformsInto}</span>
                </div>
              </div>
            {/if}

            {#if meta.temperatureSensitive}
              <div class="behavior-pill warning">
                <span class="pill-icon">❄️</span>
                <div class="pill-info">
                  <span class="pill-title">Temp-Sensitive</span>
                  <span class="pill-desc">Range: {meta.temperatureSensitive.minSafeTemp}°C to {meta.temperatureSensitive.maxSafeTemp}°C</span>
                </div>
              </div>
            {/if}

            {#if meta.decayable}
              <div class="behavior-pill decay">
                <span class="pill-icon">⏱️</span>
                <div class="pill-info">
                  <span class="pill-title">Organic Decay</span>
                  <span class="pill-desc">Freshness: {Math.round(decayProgress[selectedItem] ?? 100)}% &rarr; {meta.decayable.transformsInto}</span>
                </div>
              </div>
            {/if}

            {#if !meta.flammable && !meta.temperatureSensitive && !meta.decayable}
              <div class="behavior-pill stable">
                <span class="pill-icon">🛡️</span>
                <div class="pill-info">
                  <span class="pill-title">Stable Item</span>
                  <span class="pill-desc">Inert to environment triggers & decay.</span>
                </div>
              </div>
            {/if}
          </div>
        </div>

        {#if inspectNotes && (inspectNotes.known.length > 0 || inspectNotes.unknown.length > 0)}
          <div class="field-notes">
            <span class="notes-title">field notes</span>
            <div class="notes-list">
              {#each inspectNotes.known as prop}
                <span class="note known">{KNOWLEDGE_LABELS[prop]}</span>
              {/each}
              {#each inspectNotes.unknown as _unknown}
                <span class="note unknown">? ? ?</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if meta.category === "tool"}
          <div class="inspect-actions">
            {#if isEquipped(selectedItem!)}
              <button class="inspect-btn disabled" disabled>✓ Equipped</button>
            {:else}
              <button class="inspect-btn active" onclick={() => equipTool(selectedItem!)}>⚡ Equip Tool</button>
            {/if}
          </div>
        {/if}

        {#if getConsumeVerb(selectedItem!)}
          <div class="inspect-actions">
            <button
              class="inspect-btn {canConsume(selectedItem!) ? 'active' : 'disabled'}"
              disabled={!canConsume(selectedItem!)}
              onclick={() => consumeItem(selectedItem!)}
            >
              {getConsumeVerb(selectedItem!) === "drink" ? "💧 Drink" : "🍖 Eat"}
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Stash Grid Panel -->
  <div class="panel-overlay">
    <div class="panel-header">
      <div class="tab-header">
        <button class="tab-btn {activeTab === 'stash' ? 'active' : ''}" onclick={() => activeTab = 'stash'}>🎒 Stash</button>
        <button class="tab-btn {activeTab === 'crafting' ? 'active' : ''}" onclick={() => activeTab = 'crafting'}>🔨 Crafting</button>
        <button class="tab-btn {activeTab === 'building' ? 'active' : ''}" onclick={() => activeTab = 'building'}>🏢 Build</button>
      </div>
      <button class="close-btn" onclick={(e) => { e.preventDefault(); onClose(); }}>×</button>
    </div>

    {#if activeTab === "stash"}
      <div class="stash-usage">
        <div class="bar-labels">
          <span>Storage Capacity</span>
          <span>{getStashUsage()} / {rpgState.profile?.stashSize ?? 20}</span>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill"
            style="width: {Math.min(100, (getStashUsage() / (rpgState.profile?.stashSize ?? 20)) * 100)}%"
          ></div>
        </div>
      </div>

      <div class="grid-scroll">
        {#if itemsList().length === 0}
          <div class="empty-state">No items gathered yet. Go cut some trees or mine ores!</div>
        {:else}
          <div class="grid">
            {#each itemsList() as { itemId, qty }}
              {@const meta = ITEM_METADATA[itemId]}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class="item-cell {meta?.rarity ?? 'common'} {selectedItem === itemId ? 'selected' : ''} {isEquipped(itemId) ? 'equipped' : ''}"
                onmouseenter={() => (hoveredItem = itemId)}
                onmouseleave={() => (hoveredItem = null)}
                onclick={() => (selectedItem = itemId)}
              >
                <div class="item-visual">
                  {#if meta?.iconUrl}
                    <img src={meta.iconUrl} alt={meta?.name} class="item-icon-img" onerror={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = 'none';
                      const fallback = img.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'inline';
                    }} />
                  {/if}
                  <span style={meta?.iconUrl ? "display:none" : ""}>
                    {#if meta?.category === "tool"}
                      ⛏️
                    {:else if meta?.category === "timber"}
                      🪵
                    {:else if meta?.category === "mineral"}
                      💎
                    {:else if meta?.category === "herb"}
                      🌿
                    {:else}
                      📦
                    {/if}
                  </span>
                </div>
                {#if qty > 1}
                  <div class="qty-badge">{qty}</div>
                {/if}
                {#if isEquipped(itemId)}
                  <span class="equipped-tag">E</span>
                {/if}

                <!-- Local decay progress bar overlay -->
                {#if meta?.decayable && decayProgress[itemId] !== undefined}
                  <div class="decay-bar">
                    <div
                      class="decay-fill {decayProgress[itemId] < 20 ? 'critical' : decayProgress[itemId] < 50 ? 'warning' : 'fresh'}"
                      style="width: {decayProgress[itemId]}%"
                    ></div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if activeTab === "crafting"}
      <!-- Crafting Tab Panel -->
      <div class="crafting-scroll">
        <div class="crafting-list">
          {#each recipes as recipe}
            <div class="recipe-card">
              <div class="recipe-header">
                <span class="recipe-icon">🛠️</span>
                <div class="recipe-details">
                  <div class="recipe-name">
                    {recipe.name}
                    {#if recipe.requiresCampfire}
                      <span class="campfire-tag">🔥 Campfire</span>
                    {/if}
                  </div>
                  <div class="recipe-desc">{recipe.description}</div>
                </div>
              </div>
              
              <div class="recipe-costs">
                {#each recipe.costs as cost}
                  {@const current = getMaterialQty(cost.itemId)}
                  {@const hasEnough = current >= cost.required}
                  <div class="cost-item {hasEnough ? 'met' : 'insufficient'}">
                    <span class="cost-status">{hasEnough ? '✓' : '✗'}</span>
                    <span class="cost-name">{cost.name}</span>
                    <span class="cost-qty">{current} / {cost.required}</span>
                  </div>
                {/each}
              </div>

              {#if recipe.requiresCampfire && !(engine?.isNearCampfire())}
                <div class="proximity-warning">⚠️ Requires Campfire Heat to Smelt</div>
              {/if}

              <button 
                class="craft-btn {canCraft(recipe) ? 'enabled' : 'disabled'}"
                disabled={!canCraft(recipe)}
                onclick={() => craftItem(recipe)}
              >
                🔨 Craft {recipe.name}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {:else if activeTab === "building"}
      <!-- Building Tab Panel -->
      <div class="crafting-scroll">
        <div class="crafting-list">
          {#each buildRecipes as recipe}
            <div class="recipe-card">
              <div class="recipe-header">
                <span class="recipe-icon">🏢</span>
                <div class="recipe-details">
                  <div class="recipe-name">{recipe.name}</div>
                  <div class="recipe-desc">{recipe.description}</div>
                </div>
              </div>
              
              <div class="recipe-costs">
                {#each recipe.costs as cost}
                  {@const current = getMaterialQty(cost.itemId)}
                  {@const hasEnough = current >= cost.required}
                  <div class="cost-item {hasEnough ? 'met' : 'insufficient'}">
                    <span class="cost-status">{hasEnough ? '✓' : '✗'}</span>
                    <span class="cost-name">{cost.name}</span>
                    <span class="cost-qty">{current} / {cost.required}</span>
                  </div>
                {/each}
              </div>

              <button 
                class="craft-btn {canBuild(recipe) ? 'enabled' : 'disabled'}"
                disabled={!canBuild(recipe)}
                onclick={() => startBuildPlacement(recipe)}
              >
                🏗️ Place {recipe.name}
              </button>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Quick Hover Tooltip -->
    <div class="tooltip-container">
      {#if hoveredItem && ITEM_METADATA[hoveredItem]}
        {@const meta = ITEM_METADATA[hoveredItem]}
        <div class="tooltip {meta.rarity}">
          <div class="tooltip-name">{meta.name}</div>
          <div class="tooltip-row">
            <span class="badge {meta.rarity}">{meta.rarity}</span>
            <span class="category">{meta.category}</span>
          </div>
          <div class="tooltip-desc">{meta.description}</div>
          <div class="tooltip-action">⚡ Click to Inspect details</div>
        </div>
      {:else}
        <div class="tooltip-empty">Hover over an item for details</div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Side-by-side flex layout container */
  .inventory-container {
    position: fixed;
    top: 5rem;
    right: 1.1rem;
    display: flex;
    gap: 1rem;
    z-index: 100;
    max-height: calc(100vh - 7rem);
    pointer-events: none;
  }

  .panel-overlay, .inspect-panel {
    pointer-events: auto;
  }

  /* Glassmorphic Inspect Panel */
  .inspect-panel {
    width: 290px;
    background: rgba(14, 11, 9, 0.9);
    border: 1px solid rgba(255, 220, 120, 0.15);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    padding: 1.2rem;
    color: #f0f0f0;
    font-family: "IBM Plex Mono", monospace;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    position: relative;
    animation: slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slide-in {
    from { transform: translateX(20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  .close-inspect-btn {
    position: absolute;
    top: 0.6rem;
    right: 0.8rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 1.2rem;
    cursor: pointer;
    transition: color 0.12s;
  }
  .close-inspect-btn:hover {
    color: rgba(239, 68, 68, 0.9);
  }

  .inspect-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .inspect-visual {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.8rem;
    user-select: none;
    box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.05);
  }

  /* Glow effects in inspect icon */
  .inspect-visual.uncommon { border-color: rgba(50, 205, 50, 0.4); background: radial-gradient(circle, rgba(50, 205, 50, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%); }
  .inspect-visual.rare { border-color: rgba(30, 144, 255, 0.4); background: radial-gradient(circle, rgba(30, 144, 255, 0.15) 0%, rgba(255, 255, 255, 0.02) 100%); }
  .inspect-visual.legendary { border-color: rgba(168, 85, 247, 0.4); background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(255, 255, 255, 0.02) 100%); }

  .inspect-title-block {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .inspect-name {
    font-size: 0.9rem;
    font-weight: bold;
    color: #ffffff;
    letter-spacing: 0.02em;
  }

  .inspect-body {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    flex: 1;
    overflow-y: auto;
  }

  .inspect-description {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.7);
    line-height: 1.4;
  }

  .inspect-divider {
    height: 1px;
    background: rgba(255, 220, 120, 0.1);
  }

  .inspect-section {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .section-heading {
    font-size: 0.58rem;
    color: rgba(255, 220, 120, 0.6);
    font-weight: bold;
    letter-spacing: 0.08em;
  }

  .traits-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .trait-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 0.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .trait-lbl {
    font-size: 0.52rem;
    color: rgba(255, 255, 255, 0.4);
  }

  .trait-val {
    font-size: 0.65rem;
    color: #ffffff;
    font-weight: 500;
  }

  .inspect-panel.uncommon .rarity-txt { color: #32cd32; }
  .inspect-panel.rare .rarity-txt { color: #1e90ff; }
  .inspect-panel.legendary .rarity-txt { color: #a855f7; }

  /* Behavior pills list */
  .behavior-pills {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .behavior-pill {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 6px;
    padding: 0.45rem;
    border: 1px solid transparent;
  }

  .behavior-pill.hot { border-color: rgba(239, 68, 68, 0.15); background: rgba(239, 68, 68, 0.03); }
  .behavior-pill.warning { border-color: rgba(245, 158, 11, 0.15); background: rgba(245, 158, 11, 0.03); }
  .behavior-pill.decay { border-color: rgba(16, 185, 129, 0.15); background: rgba(16, 185, 129, 0.03); }
  .behavior-pill.stable { border-color: rgba(255, 255, 255, 0.08); }

  .pill-icon {
    font-size: 0.9rem;
    line-height: 1;
    margin-top: 0.1rem;
  }

  .pill-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .pill-title {
    font-size: 0.6rem;
    font-weight: bold;
    color: #ffffff;
  }

  .pill-desc {
    font-size: 0.52rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.3;
  }

  .inspect-actions {
    margin-top: 0.5rem;
  }

  .field-notes {
    margin-top: 0.5rem;
  }
  .notes-title {
    font-size: 0.78rem;
    letter-spacing: 0.04em;
    opacity: 0.55;
  }
  .notes-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.3rem;
  }
  .note {
    font-size: 0.78rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid currentColor;
    border-radius: var(--radius-sm, 2px);
  }
  .note.known {
    opacity: 0.92;
  }
  .note.unknown {
    opacity: 0.38;
    letter-spacing: 0.12em;
  }

  .inspect-btn {
    width: 100%;
    border-radius: 4px;
    border: 1px solid;
    padding: 0.45rem;
    font-size: 0.65rem;
    font-family: inherit;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.12s;
  }

  .inspect-btn.active {
    background: rgba(255, 220, 120, 0.1);
    border-color: rgba(255, 220, 120, 0.5);
    color: rgba(255, 220, 120, 0.95);
  }

  .inspect-btn.active:hover {
    background: rgba(255, 220, 120, 0.2);
    border-color: rgba(255, 220, 120, 0.85);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.15);
  }

  .inspect-btn.disabled {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.35);
    cursor: default;
  }

  /* Main Stash Overlay */
  .panel-overlay {
    width: 310px;
    background: rgba(18, 14, 12, 0.85);
    border: 1px solid rgba(255, 220, 120, 0.15);
    border-radius: 8px;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    font-family: "IBM Plex Mono", monospace;
    color: #f0f0f0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid rgba(255, 220, 120, 0.1);
  }

  .header-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 220, 120, 0.95);
    letter-spacing: 0.05em;
  }

  .close-btn {
    position: relative;
    background: transparent;
    border: none;
    font-size: 1.8rem;
    color: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    line-height: 1;
    padding: 0.5rem; /* Expand the click hitbox for accessibility */
    margin: -0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.1s;
    z-index: 10;
  }

  .close-btn:hover {
    color: rgba(255, 220, 120, 0.9);
  }

  .stash-usage {
    padding: 0.6rem 1rem 0.8rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .bar-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 0.3rem;
  }

  .progress-track {
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: rgba(255, 220, 120, 0.75);
    border-radius: 2px;
  }

  .grid-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    min-height: 120px;
    max-height: 320px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }

  .empty-state {
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    padding: 2rem 0;
    line-height: 1.4;
  }

  /* High fidelity grid item cells */
  .item-cell {
    position: relative;
    aspect-ratio: 1;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.15s ease;
    overflow: hidden; /* For shimmer sweeps */
  }

  .item-cell:hover {
    background: rgba(255, 220, 120, 0.04);
    border-color: rgba(255, 220, 120, 0.35);
    box-shadow: 0 0 10px rgba(255, 220, 120, 0.05);
  }

  .item-cell.selected {
    border-color: rgba(255, 220, 120, 0.8);
    background: rgba(255, 220, 120, 0.07);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.1);
  }

  .item-cell.equipped {
    border-color: rgba(255, 220, 120, 0.9) !important;
    background: rgba(255, 220, 120, 0.08);
  }

  .item-visual {
    font-size: 1.25rem;
    user-select: none;
    z-index: 2;
  }

  .qty-badge {
    position: absolute;
    bottom: 4px;
    right: 5px;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.8);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.95);
    font-weight: bold;
    z-index: 3;
  }

  .equipped-tag {
    position: absolute;
    top: 2px;
    left: 4px;
    font-size: 0.52rem;
    color: rgba(255, 220, 120, 0.9);
    font-weight: bold;
    background: rgba(18, 14, 12, 0.85);
    padding: 0 3px;
    border-radius: 2px;
    border: 1px solid rgba(255, 220, 120, 0.3);
    z-index: 3;
  }

  /* Decay progress bar directly on the slot */
  .decay-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: rgba(255, 255, 255, 0.15);
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
    overflow: hidden;
    z-index: 3;
  }

  .decay-fill {
    height: 100%;
    transition: width 1s linear;
  }
  .decay-fill.fresh { background: #10b981; }
  .decay-fill.warning { background: #f59e0b; }
  .decay-fill.critical { background: #ef4444; }

  /* Premium glowing radial gradients and borders per rarity */
  .item-cell.uncommon {
    border-color: rgba(50, 205, 50, 0.2);
    background: radial-gradient(circle, rgba(50, 205, 50, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  }
  .item-cell.uncommon:hover, .item-cell.uncommon.selected {
    border-color: rgba(50, 205, 50, 0.45);
  }

  .item-cell.rare {
    border-color: rgba(30, 144, 255, 0.2);
    background: radial-gradient(circle, rgba(30, 144, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  }
  .item-cell.rare:hover, .item-cell.rare.selected {
    border-color: rgba(30, 144, 255, 0.45);
    box-shadow: 0 0 10px rgba(30, 144, 255, 0.1);
  }

  .item-cell.legendary {
    border-color: rgba(168, 85, 247, 0.25);
    background: radial-gradient(circle, rgba(168, 85, 247, 0.07) 0%, rgba(255, 255, 255, 0.02) 100%);
  }
  .item-cell.legendary:hover, .item-cell.legendary.selected {
    border-color: rgba(168, 85, 247, 0.55);
    box-shadow: 0 0 12px rgba(168, 85, 247, 0.18);
  }

  /* Periodic Glint Shimmer Sweeps for Rare/Legendary items */
  .item-cell.rare::after, .item-cell.legendary::after {
    content: '';
    position: absolute;
    top: 0;
    left: -150%;
    width: 60%;
    height: 100%;
    background: linear-gradient(
      to right,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.12) 50%,
      rgba(255, 255, 255, 0) 100%
    );
    transform: skewX(-20deg);
    animation: glint-sweep 7s infinite ease-in-out;
    z-index: 1;
  }

  @keyframes glint-sweep {
    0% { left: -150%; }
    12% { left: 150%; }
    100% { left: 150%; }
  }

  /* Tooltip box styling */
  .tooltip-container {
    background: rgba(12, 9, 8, 0.95);
    border-top: 1px solid rgba(255, 220, 120, 0.1);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    padding: 0.8rem 1rem;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .tooltip-empty {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.2);
    text-align: center;
  }

  .tooltip {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .tooltip-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #ffffff;
  }

  .tooltip-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .badge {
    font-size: 0.52rem;
    padding: 1px 4px;
    border-radius: 2px;
    text-transform: uppercase;
    font-weight: bold;
    border: 1px solid;
  }

  .badge.common { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.6); }
  .badge.uncommon { background: rgba(50, 205, 50, 0.08); border-color: rgba(50, 205, 50, 0.3); color: rgb(50, 205, 50); }
  .badge.rare { background: rgba(30, 144, 255, 0.08); border-color: rgba(30, 144, 255, 0.3); color: rgb(30, 144, 255); }
  .badge.legendary { background: rgba(147, 112, 219, 0.08); border-color: rgba(147, 112, 219, 0.3); color: rgb(186, 85, 211); }

  .category {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.3);
  }

  .tooltip-desc {
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.65);
    line-height: 1.4;
    margin-top: 0.2rem;
  }

  .tooltip-action {
    font-size: 0.58rem;
    color: rgba(255, 220, 120, 0.8);
    margin-top: 0.3rem;
    letter-spacing: 0.02em;
  }

  .tab-header {
    display: flex;
    gap: 1rem;
  }

  .tab-btn {
    background: none;
    border: none;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0.3rem 0;
    border-bottom: 2px solid transparent;
    transition: all 0.15s ease-in-out;
  }

  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.85);
  }

  .tab-btn.active {
    color: #ffdc78;
    border-bottom-color: #ffdc78;
  }

  .crafting-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    min-height: 120px;
    max-height: 320px;
  }

  .crafting-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .recipe-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .recipe-header {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
  }

  .recipe-icon {
    font-size: 1.1rem;
    margin-top: 0.1rem;
  }

  .recipe-details {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .recipe-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: #ffffff;
  }

  .recipe-desc {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.3;
  }

  .recipe-costs {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    background: rgba(0, 0, 0, 0.2);
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
  }

  .cost-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.68rem;
  }

  .cost-item.met {
    color: rgba(74, 222, 128, 0.8);
  }

  .cost-item.insufficient {
    color: rgba(248, 113, 113, 0.8);
  }

  .cost-status {
    font-size: 0.7rem;
    font-weight: bold;
  }

  .cost-name {
    flex: 1;
    color: rgba(255, 255, 255, 0.7);
  }

  .cost-qty {
    font-weight: 500;
  }

  .craft-btn {
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.4rem;
    border: 1px solid;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease-in-out;
    text-align: center;
  }

  .craft-btn.enabled {
    background: rgba(255, 220, 120, 0.08);
    border-color: rgba(255, 220, 120, 0.3);
    color: #ffdc78;
  }

  .craft-btn.enabled:hover {
    background: rgba(255, 220, 120, 0.2);
    border-color: #ffdc78;
  }

  .craft-btn.disabled {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.25);
    cursor: not-allowed;
  }

  .campfire-tag {
    background: rgba(234, 88, 12, 0.15);
    border: 1px solid rgba(234, 88, 12, 0.4);
    color: #f97316;
    font-size: 0.52rem;
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 0.4rem;
    text-transform: uppercase;
    font-weight: bold;
    display: inline-block;
    vertical-align: middle;
  }

  .proximity-warning {
    color: #facc15;
    font-size: 0.62rem;
    text-align: center;
    background: rgba(234, 179, 8, 0.08);
    border: 1px dashed rgba(234, 179, 8, 0.3);
    padding: 0.3rem;
    border-radius: 4px;
    margin-top: 0.2rem;
  }

  .item-icon-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
