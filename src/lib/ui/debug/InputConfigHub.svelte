<script lang="ts">
/**
 * Input Abstraction & Control Configuration Hub.
 * Renders an overlay allowing dynamic remapping of action keybinds.
 * Prevents conflicts (mapping the same key to multiple actions) and
 * persists layout state to localStorage.
 */
import { onMount } from "svelte";
import { uiPreferences, saveUiPreferences } from "$lib/state/runtime-ui-state.svelte";

// Action keys type
export type ActionId = "MOVE_UP" | "MOVE_DOWN" | "MOVE_LEFT" | "MOVE_RIGHT" | "HARVEST" | "CONSOLE" | "SPRINT";

export interface Bindings {
  [key: string]: string[];
  MOVE_UP: string[];
  MOVE_DOWN: string[];
  MOVE_LEFT: string[];
  MOVE_RIGHT: string[];
  HARVEST: string[];
  CONSOLE: string[];
  SPRINT: string[];
}

export const DEFAULT_BINDINGS: Bindings = {
  MOVE_UP: ["w", "arrowup"],
  MOVE_DOWN: ["s", "arrowdown"],
  MOVE_LEFT: ["a", "arrowleft"],
  MOVE_RIGHT: ["d", "arrowright"],
  HARVEST: ["e"],
  CONSOLE: ["/"],
  SPRINT: ["shift"],
};

// Friendly labels for the UI
const ACTION_LABELS: Record<ActionId, string> = {
  MOVE_UP: "Move Up",
  MOVE_DOWN: "Move Down",
  MOVE_LEFT: "Move Left",
  MOVE_RIGHT: "Move Right",
  HARVEST: "Harvest / Interact",
  CONSOLE: "Toggle Console",
  SPRINT: "Sprint",
};

// Props defined with Svelte 5 runes
let {
  onClose,
  onUpdate
}: {
  onClose: () => void;
  onUpdate: (bindings: Bindings) => void;
} = $props();

// Component states
let bindings = $state<Bindings>({ ...DEFAULT_BINDINGS });
let activeRebind = $state<{ action: ActionId; slotIndex: number } | null>(null);
let errorMessage = $state<string | null>(null);
let errorTimer: ReturnType<typeof setTimeout> | null = null;

onMount(() => {
  loadBindings();
});

/** Loads current input configuration from localStorage. */
function loadBindings(): void {
  try {
    const data = localStorage.getItem("ashenmoor_input_bindings");
    if (data) {
      const parsed = JSON.parse(data);
      // Basic structure validation
      if (parsed && typeof parsed === "object") {
        bindings = {
          MOVE_UP: Array.isArray(parsed.MOVE_UP) ? parsed.MOVE_UP : [...DEFAULT_BINDINGS.MOVE_UP],
          MOVE_DOWN: Array.isArray(parsed.MOVE_DOWN) ? parsed.MOVE_DOWN : [...DEFAULT_BINDINGS.MOVE_DOWN],
          MOVE_LEFT: Array.isArray(parsed.MOVE_LEFT) ? parsed.MOVE_LEFT : [...DEFAULT_BINDINGS.MOVE_LEFT],
          MOVE_RIGHT: Array.isArray(parsed.MOVE_RIGHT) ? parsed.MOVE_RIGHT : [...DEFAULT_BINDINGS.MOVE_RIGHT],
          HARVEST: Array.isArray(parsed.HARVEST) ? parsed.HARVEST : [...DEFAULT_BINDINGS.HARVEST],
          CONSOLE: Array.isArray(parsed.CONSOLE) ? parsed.CONSOLE : [...DEFAULT_BINDINGS.CONSOLE],
          SPRINT: Array.isArray(parsed.SPRINT) ? parsed.SPRINT : [...DEFAULT_BINDINGS.SPRINT],
        };
        onUpdate(bindings);
        return;
      }
    }
  } catch (e) {
    console.error("Failed to load custom bindings:", e);
  }
  bindings = { ...DEFAULT_BINDINGS };
  onUpdate(bindings);
}

/** Saves configuration state to localStorage and notifies the engine. */
function saveBindings(): void {
  try {
    localStorage.setItem("ashenmoor_input_bindings", JSON.stringify(bindings));
    onUpdate(bindings);
  } catch (e) {
    console.error("Failed to save custom bindings:", e);
  }
}

/** Triggers a short flashing error message. */
function showError(msg: string): void {
  errorMessage = msg;
  if (errorTimer) clearTimeout(errorTimer);
  errorTimer = setTimeout(() => {
    errorMessage = null;
  }, 2500);
}

/** Initiates binding mode for an action slot. */
function startRebind(action: ActionId, slotIndex: number): void {
  activeRebind = { action, slotIndex };
  errorMessage = null;
}

/**
 * Handles window-level keydown events during rebinding mode.
 * Evaluates bindings and detects key conflicts.
 */
function handleKeyDown(e: KeyboardEvent): void {
  if (!activeRebind) return;

  e.preventDefault();
  e.stopPropagation();

  const keyName = e.key.toLowerCase();
  
  // Allow Escape to cancel the rebind session
  if (keyName === "escape") {
    activeRebind = null;
    return;
  }

  // Conflict Detection: check if the key is already assigned to another action
  let conflictAction: ActionId | null = null;
  let conflictSlotIndex = -1;

  for (const act of Object.keys(bindings) as ActionId[]) {
    const slots = bindings[act];
    for (let i = 0; i < slots.length; i++) {
      // Ignore checks against the exact slot we are currently editing
      if (act === activeRebind.action && i === activeRebind.slotIndex) {
        continue;
      }
      if (slots[i]?.toLowerCase() === keyName) {
        conflictAction = act;
        conflictSlotIndex = i;
        break;
      }
    }
    if (conflictAction) break;
  }

  if (conflictAction) {
    showError(`Conflict: Key "${e.key}" is already bound to "${ACTION_LABELS[conflictAction]}".`);
    activeRebind = null;
    return;
  }

  // Update the slot with the new key bind
  const currentSlots = [...bindings[activeRebind.action]];
  // Pad array if needed
  while (currentSlots.length <= activeRebind.slotIndex) {
    currentSlots.push("");
  }
  currentSlots[activeRebind.slotIndex] = keyName;
  bindings[activeRebind.action] = currentSlots;

  activeRebind = null;
  saveBindings();
}

/** Reset bindings state back to initial defaults. */
function resetToDefaults(): void {
  bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS)); // deep copy
  errorMessage = null;
  activeRebind = null;
  saveBindings();
}

/** Clears a specific binding slot. */
function clearSlot(action: ActionId, slotIndex: number): void {
  const currentSlots = [...bindings[action]];
  if (slotIndex < currentSlots.length) {
    currentSlots[slotIndex] = "";
    bindings[action] = currentSlots;
    saveBindings();
  }
  activeRebind = null;
  errorMessage = null;
}
</script>

<svelte:window onkeydown={activeRebind ? handleKeyDown : undefined} />

<div
  class="modal-backdrop"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="modal-card"
    role="presentation"
  >
    <div class="modal-header">
      <h2>control configuration</h2>
      <button class="close-btn" onclick={(e) => { e.preventDefault(); onClose(); }} aria-label="Close Settings">×</button>
    </div>

    <div class="modal-body">
      <p class="description">
        Configure your custom action keys. Click any keybinding block to rebind. Press <kbd>Esc</kbd> to cancel.
      </p>

      {#if errorMessage}
        <div class="error-banner" role="alert">
          <span class="warning-icon">⚠</span> {errorMessage}
        </div>
      {/if}

      <div class="bindings-list">
        {#each Object.keys(bindings) as actId}
          {@const action = actId as ActionId}
          {@const key1 = bindings[action][0] || ""}
          {@const key2 = bindings[action][1] || ""}
          <div class="binding-row">
            <div class="action-info">
              <span class="action-name">{ACTION_LABELS[action]}</span>
            </div>
            <div class="binding-slots">
              <!-- Slot 1 (Primary) -->
              <button
                class="key-btn"
                class:active={activeRebind?.action === action && activeRebind.slotIndex === 0}
                onclick={() => startRebind(action, 0)}
              >
                {#if activeRebind?.action === action && activeRebind.slotIndex === 0}
                  press key...
                {:else if key1}
                  {key1.toUpperCase()}
                {:else}
                  (unbound)
                {/if}
              </button>

              <!-- Slot 2 (Secondary) -->
              <div class="slot-container mx-2">
                <button
                  class="key-btn secondary mx-2 text-xl"
                  class:active={activeRebind?.action === action && activeRebind.slotIndex === 1}
                  onclick={() => startRebind(action, 1)}
                >
                  {#if activeRebind?.action === action && activeRebind.slotIndex === 1}
                    press key...
                  {:else if key2}
                    {key2.toUpperCase()}
                  {:else}
                    (unbound)
                  {/if}
                </button>
                {#if key2 || key1}
                  <button
                    class="clear-slot-btn"
                    onclick={() => clearSlot(action, key2 ? 1 : 0)}
                    title="Clear keybind"
                  >
                    ×
                  </button>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>

      <div class="ui-preferences-section">
        <h3 class="section-title">🖥️ UI Preferences</h3>
        
        <label class="preference-row">
          <div class="preference-info">
            <span class="preference-name">Minimalist HUD</span>
            <span class="preference-desc">Hide health & stamina bars when they are fully restored (100%)</span>
          </div>
          <input type="checkbox" bind:checked={uiPreferences.minimalHud} onchange={saveUiPreferences} />
        </label>

        <label class="preference-row">
          <div class="preference-info">
            <span class="preference-name">Dynamic Environment Gauge</span>
            <span class="preference-desc">Hide the environmental status gauge when conditions are completely neutral</span>
          </div>
          <input type="checkbox" bind:checked={uiPreferences.dynamicEnvironment} onchange={saveUiPreferences} />
        </label>

        <label class="preference-row">
          <div class="preference-info">
            <span class="preference-name">Link Equipment to Stash</span>
            <span class="preference-desc">Only display the gear loadout panel when the backpack stash is open</span>
          </div>
          <input type="checkbox" bind:checked={uiPreferences.equipOnlyWithStash} onchange={saveUiPreferences} />
        </label>
      </div>
    </div>

    <div class="modal-footer">
      <button class="reset-btn" onclick={resetToDefaults}>Reset to Defaults</button>
      <button class="done-btn" onclick={onClose}>Done</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8, 6, 5, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-card {
    background: rgba(18, 14, 12, 0.94);
    border: 1px solid rgba(255, 220, 120, 0.18);
    border-radius: 8px;
    width: 90%;
    max-width: 520px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.3rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.2);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.05rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 600;
    color: rgba(255, 220, 120, 0.95);
    letter-spacing: 0.02em;
  }

  .close-btn {
    position: relative;
    background: transparent;
    border: none;
    font-size: 1.6rem;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    line-height: 1;
    padding: 0.5rem; /* Expand the click hitbox for accessibility */
    margin: -0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: color 0.12s;
    z-index: 10;
  }

  .close-btn:hover {
    color: rgba(255, 220, 120, 0.9);
  }

  .modal-body {
    padding: 1.3rem;
    overflow-y: auto;
  }

  .description {
    margin: 0 0 1.2rem 0;
    font-size: 0.76rem;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.45);
    font-family: inherit;
  }

  kbd {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 3px;
    padding: 0px 4px;
    font-family: monospace;
    font-size: 0.72rem;
    color: rgba(255, 220, 120, 0.8);
  }

  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(240, 90, 90, 0.12);
    border: 1px solid rgba(240, 90, 90, 0.35);
    border-radius: 4px;
    padding: 0.55rem 0.8rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    color: rgba(255, 140, 140, 0.95);
    margin-bottom: 1.1rem;
    animation: flash 0.2s ease-out;
  }

  .warning-icon {
    font-size: 0.85rem;
  }

  .bindings-list {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .binding-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.7rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    transition: background-color 0.12s;
  }

  .binding-row:hover {
    background: rgba(255, 255, 255, 0.035);
  }

  .action-info {
    display: flex;
    flex-direction: column;
  }

  .action-name {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.8rem;
    font-weight: 550;
    color: rgba(255, 255, 255, 0.8);
  }

  .binding-slots {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .slot-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .key-btn {
    min-width: 100px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.72);
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    padding: 0.4rem 0.5rem;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
  }

  .key-btn:hover {
    background: rgba(255, 220, 120, 0.08);
    border-color: rgba(255, 220, 120, 0.4);
    color: rgba(255, 220, 120, 0.95);
  }

  .key-btn.active {
    background: rgba(255, 220, 120, 0.15);
    border-color: rgba(255, 220, 120, 0.9);
    color: rgba(255, 220, 120, 1);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.25);
    animation: pulse 1.2s infinite;
  }

  .key-btn.secondary {
    color: rgba(255, 255, 255, 0.45);
    border-color: rgba(255, 255, 255, 0.08);
  }

  .clear-slot-btn {
    position: absolute;
    right: -14px;
    background: transparent;
    border: none;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    transition: color 0.1s;
  }

  .clear-slot-btn:hover {
    color: rgba(240, 90, 90, 0.75);
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 1.3rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(0, 0, 0, 0.15);
  }

  .reset-btn {
    background: transparent;
    border: 1px solid rgba(240, 90, 90, 0.25);
    border-radius: 4px;
    color: rgba(240, 90, 90, 0.75);
    font-family: inherit;
    font-size: 0.72rem;
    padding: 0.45rem 0.8rem;
    cursor: pointer;
    transition: all 0.12s;
  }

  .reset-btn:hover {
    background: rgba(240, 90, 90, 0.08);
    border-color: rgba(240, 90, 90, 0.5);
    color: rgba(240, 90, 90, 0.95);
  }

  .done-btn {
    background: rgba(255, 220, 120, 0.1);
    border: 1px solid rgba(255, 220, 120, 0.4);
    border-radius: 4px;
    color: rgba(255, 220, 120, 0.95);
    font-family: inherit;
    font-weight: 550;
    font-size: 0.75rem;
    padding: 0.45rem 1.2rem;
    cursor: pointer;
    transition: all 0.12s;
  }

  .done-btn:hover {
    background: rgba(255, 220, 120, 0.18);
    border-color: rgba(255, 220, 120, 0.8);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.15);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes pulse {
    0% { opacity: 0.85; }
    50% { opacity: 1; }
    100% { opacity: 0.85; }
  }

  @keyframes flash {
    0% { transform: translateY(-2px); }
    100% { transform: translateY(0); }
  }

  /* UI Preferences Section styling */
  .ui-preferences-section {
    margin-top: 1.5rem;
    padding-top: 1.2rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
  }

  .section-title {
    margin: 0 0 0.4rem 0;
    font-size: 0.9rem;
    font-family: "IBM Plex Mono", monospace;
    font-weight: 600;
    color: rgba(255, 220, 120, 0.95);
    letter-spacing: 0.02em;
  }

  .preference-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.8rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.03);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.12s;
  }

  .preference-row:hover {
    background: rgba(255, 255, 255, 0.035);
  }

  .preference-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    max-width: 80%;
  }

  .preference-name {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    font-weight: 550;
    color: rgba(255, 255, 255, 0.85);
  }

  .preference-desc {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.3;
  }

  /* Custom styling for checkbox */
  .preference-row input[type="checkbox"] {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1px solid rgba(255, 220, 120, 0.4);
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    position: relative;
    transition: all 0.12s;
  }

  .preference-row input[type="checkbox"]:checked {
    background: rgba(255, 220, 120, 0.2);
    border-color: rgba(255, 220, 120, 0.85);
  }

  .preference-row input[type="checkbox"]:checked::after {
    content: "✓";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -52%);
    font-size: 0.65rem;
    color: rgba(255, 220, 120, 0.95);
    font-weight: bold;
  }
</style>
