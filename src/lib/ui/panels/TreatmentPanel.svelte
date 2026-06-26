<script lang="ts">
/**
 * TreatmentPanel.svelte
 * Project Zomboid-style medical interface allowing the player to select body parts,
 * inspect wounds, and apply known medical treatments using inventory items.
 */
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { woundState, treatActiveWound } from "$lib/state/rpg/wounds.svelte";
import { statusState } from "$lib/state/rpg/status-effects.svelte";
import { getItemQty, hasItem } from "$lib/state/rpg/inventory-api";
import { recipeKnown } from "$lib/state/rpg/crafting.svelte";
import { emitPlayerFeedback } from "$lib/ui/player-feedback.svelte";
import { playSound } from "$lib/audio/audio-engine";
import { STATUS_DEFINITIONS, StatusId } from "$lib/domain/systems/status-types";
import { type WoundState, type TreatmentId } from "$lib/domain/injury/wounds";

let { onClose }: { onClose: () => void } = $props();

const bodyParts = ["head", "left_arm", "right_arm", "core", "left_leg", "right_leg"];
const bodyPartLabels: Record<string, string> = {
  head: "Head",
  core: "Torso",
  left_arm: "Left Arm",
  right_arm: "Right Arm",
  left_leg: "Left Leg",
  right_leg: "Right Leg",
};

// State for active selections
let selectedPart = $state<string | null>(null);

function getWoundLocationRaw(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bodyParts[Math.abs(hash) % bodyParts.length] ?? "core";
}

function getWoundLocation(id: string): string {
  return bodyPartLabels[getWoundLocationRaw(id)] ?? "Torso";
}

// Derived lists
const activeWounds = $derived(woundState.active);
const activeStatuses = $derived(statusState.active);

// Filtered wounds
const displayWounds = $derived(
  selectedPart
    ? activeWounds.filter((w) => getWoundLocationRaw(w.id) === selectedPart)
    : activeWounds
);

// Returns true if a body part has any active wounds
function hasWounds(part: string): boolean {
  return activeWounds.some((w) => getWoundLocationRaw(w.id) === part);
}

// Count wounds on a part
function getWoundCount(part: string): number {
  return activeWounds.filter((w) => getWoundLocationRaw(w.id) === part).length;
}

// Treatment configs mapping items and recipes
interface TreatmentConfig {
  name: string;
  desc: string;
  items: { id: string; name: string }[];
  recipes: string[];
}

const TREATMENT_DETAILS: Record<TreatmentId, TreatmentConfig> = {
  clean_binding: {
    name: "Clean Binding",
    desc: "Stops bleeding for minor cuts. Reduces infection risk.",
    items: [
      { id: "clean_bandage", name: "Clean Bandage" },
      { id: "crude_dressing", name: "Crude Dressing" },
    ],
    recipes: ["clean_bandage", "moss_dressing"],
  },
  herbal_poultice: {
    name: "Herbal Poultice",
    desc: "Soothes skin. Significantly reduces infection risk.",
    items: [
      { id: "herb_poultice", name: "Herb Poultice" },
      { id: "yarrow_poultice", name: "Yarrow Poultice" },
    ],
    recipes: ["herb_poultice", "yarrow_poultice"],
  },
  boiled_water_wash: {
    name: "Clean Water Wash",
    desc: "Cleanses the wound. Greatly lowers infection risk.",
    items: [
      { id: "boiled_water", name: "Boiled Water" },
      { id: "clean_water", name: "Clean Water" },
    ],
    recipes: ["boiled_water"],
  },
  sealing_paste: {
    name: "Sealing Paste",
    desc: "Stops bleeding immediately. Can lock in existing infections.",
    items: [{ id: "ash_paste", name: "Ash Paste" }],
    recipes: ["ash_paste"],
  },
};

// Check if player knows a treatment (has item OR knows recipe)
function knowsTreatment(treatment: TreatmentId): boolean {
  const config = TREATMENT_DETAILS[treatment];
  const hasKnownRecipe = config.recipes.some((r) => recipeKnown(r));
  const hasItemInPocket = config.items.some((i) => getItemQty(i.id) > 0);
  return hasKnownRecipe || hasItemInPocket;
}

// Check which items are available for a treatment
function getAvailableItem(treatment: TreatmentId): string | null {
  const config = TREATMENT_DETAILS[treatment];
  for (const item of config.items) {
    if (getItemQty(item.id) >= 1) return item.id;
  }
  return null;
}

// Treat action dispatcher
function applyTreatment(wound: WoundState, treatment: TreatmentId) {
  const itemCostId = getAvailableItem(treatment);
  if (!itemCostId) {
    emitPlayerFeedback("Missing required medical items.", "warning");
    return;
  }

  const result = treatActiveWound(wound.id, treatment, itemCostId);
  if (result.success) {
    playSound("consume");
    emitPlayerFeedback(result.feedback, "good");
  } else {
    emitPlayerFeedback(result.feedback, "warning");
  }
}
</script>

<GamePanel id="medicine-panel" title="Medical Diagnostics" width="32rem" {onClose}>
  <div class="treatment-grid">
    
    <!-- LEFT COLUMN: Body paper doll silhouette -->
    <div class="doll-column">
      <div class="column-header">Anatomy Scan</div>
      <div class="doll-box">
        <svg viewBox="0 0 32 64" class="doll-svg" aria-label="Interactive body doll for selecting limbs">
          <!-- Head -->
          <ellipse
            cx="16"
            cy="10"
            rx="6"
            ry="6.5"
            class="part head"
            class:selected={selectedPart === "head"}
            class:wounded={hasWounds("head")}
            onclick={() => selectedPart = selectedPart === "head" ? null : "head"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "head" ? null : "head"; }}
            role="button"
            tabindex="0"
            aria-label="Head"
          />
          <!-- Torso / Core -->
          <rect
            x="10"
            y="16"
            width="12"
            height="22"
            rx="2"
            class="part core"
            class:selected={selectedPart === "core"}
            class:wounded={hasWounds("core")}
            onclick={() => selectedPart = selectedPart === "core" ? null : "core"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "core" ? null : "core"; }}
            role="button"
            tabindex="0"
            aria-label="Torso"
          />
          <!-- Left Arm -->
          <rect
            x="5"
            y="16"
            width="5"
            height="16"
            rx="2"
            class="part left-arm"
            class:selected={selectedPart === "left_arm"}
            class:wounded={hasWounds("left_arm")}
            onclick={() => selectedPart = selectedPart === "left_arm" ? null : "left_arm"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "left_arm" ? null : "left_arm"; }}
            role="button"
            tabindex="0"
            aria-label="Left Arm"
          />
          <!-- Right Arm -->
          <rect
            x="22"
            y="16"
            width="5"
            height="16"
            rx="2"
            class="part right-arm"
            class:selected={selectedPart === "right_arm"}
            class:wounded={hasWounds("right_arm")}
            onclick={() => selectedPart = selectedPart === "right_arm" ? null : "right_arm"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "right_arm" ? null : "right_arm"; }}
            role="button"
            tabindex="0"
            aria-label="Right Arm"
          />
          <!-- Left Leg -->
          <rect
            x="11"
            y="38"
            width="4"
            height="18"
            rx="2"
            class="part left-leg"
            class:selected={selectedPart === "left_leg"}
            class:wounded={hasWounds("left_leg")}
            onclick={() => selectedPart = selectedPart === "left_leg" ? null : "left_leg"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "left_leg" ? null : "left_leg"; }}
            role="button"
            tabindex="0"
            aria-label="Left Leg"
          />
          <!-- Right Leg -->
          <rect
            x="17"
            y="38"
            width="4"
            height="18"
            rx="2"
            class="part right-leg"
            class:selected={selectedPart === "right_leg"}
            class:wounded={hasWounds("right_leg")}
            onclick={() => selectedPart = selectedPart === "right_leg" ? null : "right_leg"}
            onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") selectedPart = selectedPart === "right_leg" ? null : "right_leg"; }}
            role="button"
            tabindex="0"
            aria-label="Right Leg"
          />
        </svg>

        <!-- Wound tags overlays -->
        {#each bodyParts as part}
          {#if hasWounds(part)}
            <div class="wound-badge {part}">{getWoundCount(part)}</div>
          {/if}
        {/each}
      </div>

      <div class="part-select-hint">
        {#if selectedPart}
          Viewing: <span class="selected-text">{bodyPartLabels[selectedPart]}</span>
          <button class="clear-btn" onclick={() => selectedPart = null}>Show All</button>
        {:else}
          Click a body part to isolate injuries
        {/if}
      </div>
    </div>

    <!-- RIGHT COLUMN: Wound treatment diagnostics -->
    <div class="diagnostics-column">
      <div class="column-header">Trauma Feed</div>
      <div class="diagnostics-scroll">
        {#if activeWounds.length === 0}
          <!-- Reassuring screen if healthy -->
          <div class="healthy-screen">
            <div class="heart-pulse">❤️</div>
            <div class="status-msg">No physical trauma detected.</div>
            <div class="sub-msg">All vital organs are functioning within nominal parameters.</div>

            <!-- Environmental recovery advice -->
            {#if activeStatuses.length > 0}
              <div class="advice-box">
                <div class="advice-header">Systemic Conditions Detected:</div>
                <div class="advice-list">
                  {#each activeStatuses as status}
                    {@const def = STATUS_DEFINITIONS[status.id]}
                    {#if def}
                      <div class="advice-item">
                        <span class="icon">{def.icon || "🩹"}</span>
                        <div class="info">
                          <span class="label">{def.label || status.id}</span>
                          <span class="cure-hint">
                            {#if status.id === "starving"}
                              Eat cooked meat, dried fruit, or broth to replenish energy.
                            {:else if status.id === "exhaustion"}
                              Drink clean/boiled water, or rest to recover stamina.
                            {:else if status.id === "sickness"}
                              Drink Bitter Tonic, Tannin Brew, or rest.
                            {:else if status.id === "wet" || status.id === "soaked"}
                              Dry off quickly by standing close to a campfire.
                            {:else}
                              Condition will decay naturally over time.
                            {/if}
                          </span>
                        </div>
                      </div>
                    {/if}
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {:else if displayWounds.length === 0}
          <!-- If filtering and no wounds on this limb -->
          <div class="healthy-screen minor">
            <div class="status-msg">No injuries detected here.</div>
            <button class="clear-btn mt-2" onclick={() => selectedPart = null}>Return to All</button>
          </div>
        {:else}
          <!-- Active wounds list -->
          <div class="wounds-list">
            {#each displayWounds as wound (wound.id)}
              <div class="wound-card">
                <!-- Wound header description -->
                <div class="wound-card-header">
                  <div class="wound-title">
                    <span class="limb">{getWoundLocation(wound.id)}</span>
                    <span class="severity {wound.severity}">{wound.severity.replace("_", " ")}</span>
                  </div>
                  <div class="badges">
                    {#if wound.bleeding}
                      <span class="badge bleeding">🩸 Bleeding</span>
                    {/if}
                    {#if wound.infected}
                      <span class="badge infected">🤢 Infected</span>
                    {/if}
                  </div>
                </div>

                <!-- Treatments applied status -->
                {#if wound.treatedWith.length > 0}
                  <div class="applied-treatments">
                    <span class="sub-label">Covered with:</span>
                    <div class="chips">
                      {#each wound.treatedWith as treat}
                        <span class="chip">🩹 {TREATMENT_DETAILS[treat]?.name || treat}</span>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Treatment application panel -->
                <div class="treatment-actions">
                  <div class="sub-label">Apply Treatment:</div>
                  <div class="treatment-options">
                    {#each Object.keys(TREATMENT_DETAILS) as key}
                      {@const treatId = key as TreatmentId}
                      {@const detail = TREATMENT_DETAILS[treatId]}
                      {@const hasWoundTreatment = wound.treatedWith.includes(treatId)}
                      
                      {#if !hasWoundTreatment}
                        <div class="option-row">
                          {#if knowsTreatment(treatId)}
                            <!-- Treatment is known -->
                            <div class="treat-info">
                              <span class="treat-name">{detail.name}</span>
                              <span class="treat-desc">{detail.desc}</span>
                              <!-- Required item status -->
                              <div class="requirements">
                                Requires:
                                {#each detail.items as item, index}
                                  {@const qty = getItemQty(item.id)}
                                  <span class="req-item" class:available={qty >= 1} class:missing={qty < 1}>
                                    {item.name} ({qty}){#if index < detail.items.length - 1}, {/if}
                                  </span>
                                {/each}
                              </div>
                            </div>
                            
                            {@const availId = getAvailableItem(treatId)}
                            <button
                              class="apply-btn"
                              disabled={!availId}
                              onclick={() => applyTreatment(wound, treatId)}
                            >
                              Apply
                            </button>
                          {:else}
                            <!-- Locked treatment (player lacks knowledge) -->
                            <div class="locked-treat">
                              <span class="treat-name">???</span>
                              <span class="locked-hint">Acquire appropriate medicine or discover recipes to identify this treatment.</span>
                            </div>
                            <button class="apply-btn locked" disabled>Locked</button>
                          {/if}
                        </div>
                      {/if}
                    {/each}
                  </div>
                </div>

              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  </div>
</GamePanel>

<style>
  .treatment-grid {
    display: grid;
    grid-template-columns: 10.5rem 1fr;
    gap: 1.1rem;
    height: 380px;
    padding: 0.2rem 0;
  }

  .column-header {
    font-family: Georgia, serif;
    font-size: 0.8rem;
    font-weight: bold;
    color: #d9c28e;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid rgba(185, 155, 98, 0.2);
    padding-bottom: 0.35rem;
    margin-bottom: 0.6rem;
  }

  /* Left doll section */
  .doll-column {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .doll-box {
    position: relative;
    width: 100%;
    height: 250px;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0.5rem;
  }

  .doll-svg {
    height: 100%;
    max-width: 100%;
  }

  .part {
    fill: rgba(30, 26, 24, 0.7);
    stroke: rgba(185, 155, 98, 0.2);
    stroke-width: 1.2;
    cursor: pointer;
    transition: fill 0.2s, stroke 0.2s, filter 0.2s;
  }

  .part:hover {
    fill: rgba(185, 155, 98, 0.15);
    stroke: rgba(185, 155, 98, 0.6);
  }

  .part.wounded {
    fill: rgba(239, 68, 68, 0.25);
    stroke: rgba(239, 68, 68, 0.65);
    animation: glow-pulse 2s infinite alternate;
  }

  .part.wounded:hover {
    fill: rgba(239, 68, 68, 0.4);
    stroke: #ef4444;
  }

  .part.selected {
    stroke: #d9c28e;
    stroke-width: 1.8;
    filter: drop-shadow(0 0 3px rgba(185, 155, 98, 0.4));
  }

  @keyframes glow-pulse {
    from { fill: rgba(239, 68, 68, 0.15); }
    to { fill: rgba(239, 68, 68, 0.35); }
  }

  .part-select-hint {
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    color: var(--text-soft);
    margin-top: 0.5rem;
    text-align: center;
    width: 100%;
  }

  .selected-text {
    color: #d9c28e;
    font-weight: bold;
  }

  .clear-btn {
    background: rgba(185, 155, 98, 0.1);
    border: 1px solid rgba(185, 155, 98, 0.3);
    color: #d9c28e;
    font-family: var(--font-mono, monospace);
    font-size: 0.58rem;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 0.25rem;
    transition: background 0.2s;
  }

  .clear-btn:hover {
    background: rgba(185, 155, 98, 0.2);
  }

  /* Wound overlays badges */
  .wound-badge {
    position: absolute;
    background: #ef4444;
    color: #fff;
    font-family: var(--font-mono, monospace);
    font-size: 0.58rem;
    font-weight: bold;
    padding: 1px 4px;
    border-radius: 999px;
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .wound-badge.head      { top: 12%; left: 54%; }
  .wound-badge.core      { top: 38%; left: 54%; }
  .wound-badge.left-arm  { top: 25%; left: 24%; }
  .wound-badge.right-arm { top: 25%; left: 70%; }
  .wound-badge.left-leg  { top: 70%; left: 32%; }
  .wound-badge.right-leg { top: 70%; left: 62%; }

  /* Right trauma feed column */
  .diagnostics-column {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .diagnostics-scroll {
    flex: 1;
    overflow-y: auto;
    padding-right: 0.3rem;
  }

  /* Healthy panel screen */
  .healthy-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    padding: 1.5rem 0.5rem;
  }

  .healthy-screen.minor {
    height: 200px;
    justify-content: center;
  }

  .heart-pulse {
    font-size: 2.2rem;
    animation: beat 1.4s infinite;
    filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.4));
    margin-bottom: 0.8rem;
  }

  @keyframes beat {
    0%, 100% { transform: scale(1); }
    30%      { transform: scale(1.15); }
    45%      { transform: scale(1.05); }
    60%      { transform: scale(1.15); }
  }

  .status-msg {
    font-family: Georgia, serif;
    font-size: 0.85rem;
    color: #e2e8f0;
    margin-bottom: 0.25rem;
  }

  .sub-msg {
    font-family: var(--font-mono, monospace);
    font-size: 0.6rem;
    color: var(--text-soft);
  }

  .advice-box {
    margin-top: 1.4rem;
    width: 100%;
    background: rgba(185, 155, 98, 0.04);
    border: 1px solid rgba(185, 155, 98, 0.12);
    border-radius: 4px;
    padding: 0.6rem;
    text-align: left;
  }

  .advice-box {
    margin-top: 1.4rem;
    width: 100%;
    background: rgba(185, 155, 98, 0.04);
    border: 1px solid rgba(185, 155, 98, 0.12);
    border-radius: 4px;
    padding: 0.6rem;
    text-align: left;
  }

  .advice-header {
    font-family: Georgia, serif;
    font-size: 0.72rem;
    font-weight: bold;
    color: #d9c28e;
    margin-bottom: 0.45rem;
  }

  .advice-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .advice-item {
    display: flex;
    gap: 0.5rem;
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
  }

  .advice-item .icon {
    font-size: 0.8rem;
  }

  .advice-item .info {
    display: flex;
    flex-direction: column;
  }

  .advice-item .label {
    color: #e2e8f0;
    font-weight: bold;
    text-transform: uppercase;
  }

  .advice-item .cure-hint {
    color: var(--text-soft);
    margin-top: 0.05rem;
  }

  /* Wounds list */
  .wounds-list {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .wound-card {
    background: rgba(22, 18, 16, 0.65);
    border: 1px solid rgba(185, 155, 98, 0.16);
    border-radius: 4px;
    padding: 0.6rem 0.8rem;
  }

  .wound-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.45rem;
  }

  .wound-title {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-family: Georgia, serif;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .wound-title .limb {
    color: #e2e8f0;
  }

  .wound-title .severity {
    font-size: 0.62rem;
    text-transform: uppercase;
    font-family: var(--font-mono, monospace);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .severity.scratch { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.25); }
  .severity.cut { background: rgba(249, 115, 22, 0.15); color: #fb923c; border: 1px solid rgba(249, 115, 22, 0.25); }
  .severity.deep_cut { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); }
  .severity.bite_wound { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25); }

  .badges {
    display: flex;
    gap: 0.35rem;
  }

  .badge {
    font-family: var(--font-mono, monospace);
    font-size: 0.58rem;
    font-weight: bold;
    padding: 1px 5px;
    border-radius: 3px;
  }

  .badge.bleeding {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.25);
    animation: bleeding-pulse 1.2s infinite alternate;
  }

  .badge.infected {
    background: rgba(16, 185, 129, 0.12);
    color: #a7f3d0;
    border: 1px solid rgba(16, 185, 129, 0.25);
  }

  @keyframes bleeding-pulse {
    from { box-shadow: 0 0 2px rgba(239, 68, 68, 0.1); }
    to { box-shadow: 0 0 6px rgba(239, 68, 68, 0.3); }
  }

  .sub-label {
    font-family: Georgia, serif;
    font-size: 0.68rem;
    font-style: italic;
    color: #d9c28e;
    margin-bottom: 0.25rem;
    display: block;
  }

  .applied-treatments {
    margin-bottom: 0.6rem;
    background: rgba(0, 0, 0, 0.15);
    padding: 0.3rem 0.5rem;
    border-radius: 3px;
  }

  .applied-treatments .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .applied-treatments .chip {
    font-family: var(--font-mono, monospace);
    font-size: 0.62rem;
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 5px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .treatment-actions {
    border-top: 1px dashed rgba(185, 155, 98, 0.15);
    padding-top: 0.5rem;
  }

  .treatment-options {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }

  .option-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    padding: 0.4rem 0.5rem;
    gap: 0.5rem;
  }

  .treat-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .treat-name {
    font-family: Georgia, serif;
    font-size: 0.72rem;
    font-weight: bold;
    color: #e2e8f0;
  }

  .treat-desc {
    font-family: var(--font-mono, monospace);
    font-size: 0.56rem;
    color: var(--text-soft);
    line-height: 1.1;
    margin-bottom: 0.15rem;
  }

  .requirements {
    font-family: var(--font-mono, monospace);
    font-size: 0.54rem;
    color: var(--text-soft);
  }

  .req-item {
    font-weight: bold;
  }

  .req-item.available {
    color: #34d399;
  }

  .req-item.missing {
    color: #f87171;
  }

  .apply-btn {
    background: rgba(185, 155, 98, 0.15);
    border: 1px solid rgba(185, 155, 98, 0.45);
    color: #d9c28e;
    font-family: var(--font-mono, monospace);
    font-size: 0.65rem;
    font-weight: bold;
    padding: 0.2rem 0.6rem;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .apply-btn:hover:not(:disabled) {
    background: rgba(185, 155, 98, 0.35);
    border-color: #d9c28e;
    color: #fff;
  }

  .apply-btn:disabled {
    background: rgba(255, 255, 255, 0.02);
    border-color: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.2);
    cursor: not-allowed;
  }

  .locked-treat {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .locked-hint {
    font-family: var(--font-mono, monospace);
    font-size: 0.55rem;
    color: rgba(255, 255, 255, 0.2);
    font-style: italic;
  }

  .apply-btn.locked {
    background: rgba(0, 0, 0, 0.15);
    border: 1px dashed rgba(255, 255, 255, 0.1);
  }
</style>
