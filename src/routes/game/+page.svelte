<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { GameEngine, type HudState } from "$lib/core/engine";
import type { Entity } from "$lib/core/ecs/ecs-miniplex";
import type { WorldContextMenuTarget, ActiveStationCraftStatus } from "$lib/core/types";
import { isWorldContextMenuOutOfRange } from "$lib/core/input/world-context-menu";
import { registerDevRuntime } from "$lib/ui/debug/dev-commands";
import DevConsole from "$lib/ui/debug/DevConsole.svelte";
import SpectatorOverlay from "$lib/ui/debug/SpectatorOverlay.svelte";
import { devConsole } from "$lib/ui/debug/dev-console";
import GameHud from "$lib/ui/hud/GameHud.svelte";
import SettingsMenu, { type Bindings } from "$lib/ui/panels/SettingsMenu.svelte";
import EquipmentPanel from "$lib/ui/panels/EquipmentPanel.svelte";
import InventoryGrid from "$lib/ui/panels/InventoryGrid.svelte";
import EnvironmentGauge from "$lib/ui/hud/EnvironmentGauge.svelte";
import ConditionPanel from "$lib/ui/hud/ConditionPanel.svelte";
import ToastLog from "$lib/ui/hud/ToastLog.svelte";
import SkillHotbar from "$lib/ui/elements/SkillHotbar.svelte";
import ItemHotbar from "$lib/ui/hud/ItemHotbar.svelte";
import SkillTreePanel from "$lib/ui/panels/SkillTreePanel.svelte";
import DialogueBox from "$lib/ui/elements/DialogueBox.svelte";
import QuestTracker from "$lib/ui/panels/QuestTracker.svelte";
import IntroOverlay from "$lib/ui/elements/IntroOverlay.svelte";
import { activeEnvironment } from "$lib/state/environment-state.svelte";
import { uiPreferences, loadUiPreferences } from "$lib/state/runtime-ui-state.svelte";
import { applyRpgState } from "$lib/state/rpg-actions.svelte";
import { gameState, loadGameState } from "$lib/state/game-state.svelte";
import { dispatchRpgCommand } from "$lib/state/rpg-controller.svelte";
import { overlayStack, OverlayId } from "$lib/state/overlay-stack.svelte";
import { menuController, type MenuControllerItem } from "$lib/state/menu-controller.svelte";
import { dialogueState, activeQuests } from "$lib/state/rpg/quests.svelte";
import CarcassPanel from "$lib/ui/panels/CarcassPanel.svelte";
import ScenarioPanel from "$lib/ui/panels/ScenarioPanel.svelte";
import TreatmentPanel from "$lib/ui/panels/TreatmentPanel.svelte";
import ConstructionOverlay from "$lib/ui/elements/ConstructionOverlay.svelte";
import { StorageKeys } from "$lib/domain/game-events";
import { uiInputController } from "$lib/core/input/input-controller.svelte";
import { loadPanelPositions } from "$lib/state/panel-positions.svelte";
import TopHudActions from "$lib/ui/hud/TopHudActions.svelte";
import { getStationDefinition, type StationId } from "$lib/domain/stations";
import { stationMenuOptions, DESTROY_CATEGORY, type StationMenuOption } from "$lib/domain/interaction-wheel";
import StationMenu from "$lib/ui/elements/StationMenu.svelte";

let shellEl    = $state<HTMLDivElement | null>(null);
let containerEl = $state<HTMLDivElement | null>(null);
let engine     = $state<GameEngine | null>(null);
let isFullscreen = $state(false);
let notify     = $state<string | null>(null);
let coords     = $state<{ gx: number; gy: number } | null>(null);
let lookAt     = $state<string | null>(null);
// Panel visibility is authoritative in the overlay stack; derive from it so
// that Escape always closes the right panel regardless of open order.
const showSettings  = $derived(overlayStack.has(OverlayId.Settings));
const showInventory = $derived(overlayStack.has(OverlayId.Inventory));
const showSkills    = $derived(overlayStack.has(OverlayId.Skills));
const showScenario  = $derived(overlayStack.has(OverlayId.Scenario));
const showCarcass   = $derived(overlayStack.has(OverlayId.Carcass));
const showMedicine  = $derived(overlayStack.has(OverlayId.Medicine));
const showConstruction = $derived(overlayStack.has(OverlayId.Construction));
const showEquipment = $derived(overlayStack.has(OverlayId.Equipment));
const showQuests    = $derived(overlayStack.has(OverlayId.Quests));
let activeScenarioId = $state<string | null>(null);
const showDevHud = $derived(activeScenarioId !== null);
let activeStationEntity = $state<Entity | null>(null);
let carcassPanelTargetId = $state<string | null>(null);
let contextMenu   = $state<WorldContextMenuTarget | null>(null);

interface StationMenuState {
  entityId: string;
  name: string;
  screenX: number;
  screenY: number;
  gx: number;
  gy: number;
  options: readonly StationMenuOption[];
}
let stationMenu = $state<StationMenuState | null>(null);
/** One entry per currently-busy station — stations run independently, see engine.getActiveStationCraftStatuses. */
let activeCraftStatuses = $state<ActiveStationCraftStatus[]>([]);
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
let envInterval: ReturnType<typeof setInterval> | null = null;
let uiUnsubs: (() => void)[] = [];

function onHudUpdate(s: HudState) {
  coords = { gx: s.gx, gy: s.gy };
  lookAt = s.lookAt;
}

function showNotify(msg: string) {
  notify = msg;
  if (notifyTimer) clearTimeout(notifyTimer);
  notifyTimer = setTimeout(() => (notify = null), 2500);
}

function handleInteract(target: Entity) {
  if (target.interactable) showNotify(target.interactable.name);
}

function handleContextMenu(target: WorldContextMenuTarget) {
  contextMenu = target;
  // Synchronous mount — must happen before any keydown fires so the gate is live
  // immediately. An $effect would defer to the next microtask, creating a window
  // where arrow keys still reach the game.
  const items: MenuControllerItem[] = [];
  if (target.action && target.action !== "destroy") {
    items.push({
      label: target.action === "gather" ? "harvest" : target.action,
      action: () => { engine?.triggerInteract(); closeContextMenu(); },
    });
  }
  if (target.buildingId) {
    const bid = target.buildingId;
    items.push({
      label: "destroy",
      role: "danger",
      action: () => { engine?.destroyBuilding(bid); closeContextMenu(); },
    });
  }
  items.push({ label: "close", role: "close", action: closeContextMenu });
  menuController.mount(items);
}

function closeContextMenu() {
  contextMenu = null;
  menuController.clear();
}

/**
 * The affordable crafting/process/refuel options for a station, plus a
 * "destroy" option folded in when the station is also a player-placed
 * building — right-click and E both converge on this, so destroying a
 * built campfire stays reachable now that it opens the ring in one hop
 * instead of the old two-item text context menu.
 */
function buildStationMenuOptions(stationId: StationId, buildingId: string | undefined): readonly StationMenuOption[] {
  const slots = gameState.rpg.inventory?.slots ?? {};
  const ctx = stationId === "campfire"
    ? { isNearCampfire: true }
    : { isNearCampfire: false, stationId, availableStations: [stationId] };
  const options = stationMenuOptions(stationId, slots, ctx);
  if (!buildingId) return options;
  return [...options, { id: "destroy", kind: "destroy", label: "destroy", category: DESTROY_CATEGORY }];
}

/**
 * If `target` has a finished craft waiting, collects it directly — matching
 * the instant, no-menu "pickup" feel (per the roadmap's own scope note) —
 * and returns true so the caller skips opening the menu entirely.
 */
function collectIfReady(target: Entity): boolean {
  if (!engine) return false;
  const status = activeCraftStatuses.find((s) => s.stationEntityId === target.id);
  if (!status?.readyForPickup) return false;
  engine.collectCraftProcess(target.id);
  return true;
}

/**
 * Opens the anchored station quick-menu (StationMenu.svelte) — a ring of
 * icon medallions replacing the old full-screen StationPanel checklist and,
 * before that, the plain text context-menu list. Shows only currently-
 * affordable options, positioned at the station via engine.worldToScreen.
 * Both E (via onStationInteract) and right-click (engine.ts redirects
 * station right-clicks into onStationInteract too) call this same function.
 */
function openStationMenu(target: Entity) {
  if (!engine || !target.position) return;
  const stationId: StationId | null =
    target.station?.stationId ?? (target.id === "campfire" ? "campfire" : null);
  if (!stationId) return;

  const busyHere = activeCraftStatuses.some((s) => s.stationEntityId === target.id);
  const buildingId = gameState.rpg.profile?.buildings?.some((b) => b.id === target.id) ? target.id : undefined;
  const options = busyHere ? [] : buildStationMenuOptions(stationId, buildingId);
  if (!busyHere && options.length === 0) {
    showNotify("nothing to do here right now.");
    return;
  }

  const stationName = getStationDefinition(stationId)?.name ?? "station";
  const fuelSuffix = target.campfire?.isLit
    ? `, ${Math.round((target.campfire.fuelRemainingMs / (target.campfire.fuelCapacityMs ?? target.campfire.fuelRemainingMs)) * 100)}% fuel`
    : "";

  const screen = engine.worldToScreen(target.position.x + 32, target.position.y + 16);
  stationMenu = {
    entityId: target.id,
    name: `${stationName}${fuelSuffix}`,
    screenX: screen.x,
    screenY: screen.y,
    gx: Math.floor((target.position.x + 32) / 64),
    gy: Math.floor((target.position.y + 32) / 64),
    options,
  };
}

function selectStationMenuOption(option: StationMenuOption) {
  if (!stationMenu || !engine) return;
  const entityId = stationMenu.entityId;
  if (option.kind === "process") {
    engine.startStationProcess(entityId, option.id);
  } else if (option.kind === "recipe") {
    engine.startCraftProcess(option.id);
  } else if (option.kind === "refuel") {
    void engine.refuelCampfire(entityId);
  } else if (option.kind === "destroy") {
    engine.destroyBuilding(entityId);
  }
  closeStationMenu();
}

function cancelActiveStationCraft() {
  if (!engine || !stationMenu) return;
  const status = activeCraftStatuses.find((s) => s.stationEntityId === stationMenu!.entityId);
  if (!status) return;
  if (status.walkAwaySafe) {
    engine.cancelCraftProcess(status.stationEntityId);
  } else {
    engine.cancelStationProcess(status.stationEntityId);
  }
}

function closeStationMenu() {
  stationMenu = null;
  menuController.clear();
}

function toggleSkills() {
  showSkills ? overlayStack.close(OverlayId.Skills) : overlayStack.push(OverlayId.Skills);
}

function toggleEquipment() {
  showEquipment ? overlayStack.close(OverlayId.Equipment) : overlayStack.push(OverlayId.Equipment);
}

function toggleQuests() {
  showQuests ? overlayStack.close(OverlayId.Quests) : overlayStack.push(OverlayId.Quests);
}

let inventoryTab = $state<"stash" | "crafting" | "building">("stash");

function toggleInventory() {
  if (showInventory && inventoryTab === "stash") {
    overlayStack.close(OverlayId.Inventory);
    if (uiPreferences.equipOnlyWithStash) overlayStack.close(OverlayId.Equipment);
  } else {
    inventoryTab = "stash";
    if (!showInventory) overlayStack.push(OverlayId.Inventory);
  }
}

function toggleCrafting() {
  if (showInventory && inventoryTab === "crafting") {
    overlayStack.close(OverlayId.Inventory);
  } else {
    inventoryTab = "crafting";
    if (!showInventory) overlayStack.push(OverlayId.Inventory);
  }
}

function toggleSettings() {
  showSettings ? overlayStack.close(OverlayId.Settings) : overlayStack.push(OverlayId.Settings);
}

function toggleScenario() {
  showScenario ? overlayStack.close(OverlayId.Scenario) : overlayStack.push(OverlayId.Scenario);
}


// --- Dialogue â†” stack sync -----------------------------------------------
// DialogueBox owns its open state in dialogueState.activeNpc (domain module).
// These two effects bridge it into the overlay stack so Escape works correctly.

// When dialogue opens via NPC interaction, push it onto the stack.
// When it closes via its own button, remove it from the stack.
$effect(() => {
  if (dialogueState.activeNpc) overlayStack.push(OverlayId.Dialogue);
  else                         overlayStack.close(OverlayId.Dialogue);
});

// When Escape pops Dialogue off the stack, honour it by closing the dialogue.
$effect(() => {
  if (!overlayStack.has(OverlayId.Dialogue) && dialogueState.activeNpc) {
    dialogueState.activeNpc = null;
  }
});

// --- Construction Panel ↔ stack sync ---------------------------------------
$effect(() => {
  const hasConstruction = overlayStack.has(OverlayId.Construction);
  if (!hasConstruction && activeStationEntity) {
    activeStationEntity = null;
  }
});

// --- Carcass Panel ↔ stack sync ------------------------------------------
$effect(() => {
  const hasCarcass = overlayStack.has(OverlayId.Carcass);
  console.log("[DEBUG SVELTE EFFECT] Carcass Stack sync:", {
    hasCarcass,
    carcassPanelTargetId
  });
  if (!hasCarcass && carcassPanelTargetId) {
    console.log("[DEBUG SVELTE EFFECT] Clearing carcassPanelTargetId");
    carcassPanelTargetId = null;
  }
});

// --- Equipment Panel ↔ inventory sync preference --------------------------
// One-directional: stash opening pulls gear open, but stash closing does NOT
// force-close gear. Gear can be toggled independently at all times.
$effect(() => {
  if (uiPreferences.equipOnlyWithStash && showInventory) {
    overlayStack.push(OverlayId.Equipment);
  }
});

// --- Quest Tracker ↔ quest state change sync ------------------------------
let lastQuestId = $state<string | null>(null);
$effect(() => {
  const current = activeQuests.currentQuestId;
  if (current && current !== "completed_all" && current !== lastQuestId) {
    lastQuestId = current;
    overlayStack.push(OverlayId.Quests);
  }
});

// Auto-close the construction overlay if player walks too far
$effect(() => {
  if (activeStationEntity && coords) {
    const px = Math.floor((activeStationEntity.position!.x + 32) / 64);
    const py = Math.floor((activeStationEntity.position!.y + 32) / 64);
    const dx = coords.gx - px;
    const dy = coords.gy - py;
    if (Math.hypot(dx, dy) > 4.5) {
      overlayStack.close(OverlayId.Construction);
      activeStationEntity = null;
    }
  }
});

$effect(() => {
  if (!contextMenu || !coords) return;
  if (isWorldContextMenuOutOfRange(coords, contextMenu)) {
    closeContextMenu();
  }
});

// Auto-close the station quick-menu if player walks too far
$effect(() => {
  if (!stationMenu || !coords) return;
  const dx = coords.gx - stationMenu.gx;
  const dy = coords.gy - stationMenu.gy;
  if (Math.hypot(dx, dy) > 4.5) {
    closeStationMenu();
  }
});

function handleBindingsUpdate(newBindings: Bindings) {
  engine?.updateBindings(newBindings);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    shellEl?.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

function onFullscreenChange() {
  isFullscreen = !!document.fullscreenElement;
}

function enterFullscreenOnce() {
  shellEl?.requestFullscreen().catch(() => {});
  shellEl?.removeEventListener('pointerdown', enterFullscreenOnce);
}

onMount(async () => {
  loadUiPreferences();
  loadGameState();
  loadPanelPositions();
  if (!containerEl) return;
  const hasSave = typeof window !== "undefined" && window.localStorage && window.localStorage.getItem(StorageKeys.rpg);
  const scenarioParam = new URLSearchParams(window.location.search).get("scenario") ?? (hasSave ? "normal" : "alpha_start");
  activeScenarioId = scenarioParam === "normal" ? null : scenarioParam;
  engine = new GameEngine({
    container: containerEl,
    onInteract: handleInteract,
    onHudUpdate,
    onContextMenu: handleContextMenu,
    ...(activeScenarioId ? { scenarioId: activeScenarioId } : {}),
    onStationInteract: (target) => {
      if (target.building && target.building.stage < 5) {
        activeStationEntity = target;
        overlayStack.push(OverlayId.Construction);
        return;
      }
      if (collectIfReady(target)) return;
      openStationMenu(target);
    },
    onOpenCarcassPanel: (id) => {
      console.log("[DEBUG SVELTE] onOpenCarcassPanel called with id:", id);
      carcassPanelTargetId = id;
      overlayStack.push(OverlayId.Carcass);
    },
    onActiveCraftUpdate: (statuses) => {
      activeCraftStatuses = statuses;
    },
  });
  await engine.init();
  if (!activeQuests.currentQuestId) {
    activeQuests.currentQuestId = "lost_in_woods";
  }
  registerDevRuntime(engine);

  // Register all UI keyboard bindings through the controller. Unsubscribed in onDestroy.
  let lastEscapeTime = 0;
  uiUnsubs = [
    uiInputController.register({
      action: 'menu_up', keys: ['arrowup'], layer: 'menu',
      handler: (e) => { if (!menuController.active) return false; menuController.moveUp(); e.preventDefault(); return true; },
    }),
    uiInputController.register({
      action: 'menu_down', keys: ['arrowdown'], layer: 'menu',
      handler: (e) => { if (!menuController.active) return false; menuController.moveDown(); e.preventDefault(); return true; },
    }),
    uiInputController.register({
      action: 'menu_select', keys: ['arrowright', 'enter'], layer: 'menu',
      handler: (e) => { if (!menuController.active) return false; menuController.activateFocused(); e.preventDefault(); return true; },
    }),
    uiInputController.register({
      action: 'menu_back', keys: ['arrowleft', 'backspace'], layer: 'menu',
      handler: (e) => { if (!menuController.active) return false; closeContextMenu(); e.preventDefault(); return true; },
    }),
    uiInputController.register({
      action: 'menu_danger', keys: ['shift', 'delete'], layer: 'menu',
      handler: (e) => {
        if (!menuController.active) return false;
        // WHY: original code used e.code === "ShiftRight" to block LeftShift from triggering danger
        if (e.code !== 'ShiftRight' && e.key !== 'Delete') return false;
        menuController.activateByRole('danger');
        e.preventDefault();
        return true;
      },
    }),
    uiInputController.register({
      action: 'close_panel', keys: ['escape'], layer: 'overlay',
      handler: (e) => {
        // Let InputResource handle escape during building/item placement
        if (engine?.isInPlacementMode()) return false;
        if (contextMenu) { closeContextMenu(); e.preventDefault(); return true; }
        if (stationMenu) { closeStationMenu(); e.preventDefault(); return true; }
        if (overlayStack.isEmpty) return false;
        const now = performance.now();
        if (now - lastEscapeTime < 300) {
          overlayStack.clear();
        } else {
          overlayStack.popTop();
        }
        e.preventDefault();
        lastEscapeTime = now;
        return true;
      },
    }),
    uiInputController.register({
      action: 'toggle_inventory', keys: ['tab'], layer: 'game',
      handler: (e) => { e.preventDefault(); toggleInventory(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_crafting', keys: ['g'], layer: 'game',
      handler: () => { toggleCrafting(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_skills', keys: ['c'], layer: 'game',
      handler: () => { toggleSkills(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_equipment', keys: ['i'], layer: 'game',
      handler: () => { toggleEquipment(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_quests', keys: ['q'], layer: 'game',
      handler: () => { toggleQuests(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_env_inspector', keys: ['f8'], layer: 'game',
      handler: (e) => { engine?.toggleEnvironmentInspector(); e.preventDefault(); return true; },
    }),
    uiInputController.register({
      action: 'toggle_fullscreen', keys: ['f11'], layer: 'game',
      handler: (e) => { e.preventDefault(); toggleFullscreen(); return true; },
    }),
  ];

  // Cross-validate UI keys against game InputResource bindings now that all
  // registrations are live. Logs (does not throw) on overlap.
  uiInputController.validateAgainst(engine.inputResource.bindings);

  document.addEventListener('fullscreenchange', onFullscreenChange);
  if (uiPreferences.autoFullscreen) {
    shellEl?.addEventListener('pointerdown', enterFullscreenOnce);
  }

  // Start 5-second backend env tick loop
  envInterval = setInterval(async () => {
    if (!coords) return;
    try {
      const result = await dispatchRpgCommand({
        type: "environmentTick",
        environment: {
          temperature: activeEnvironment.temperature,
          humidity: activeEnvironment.humidity,
          toxins: activeEnvironment.toxins,
        },
      });
      if (!result.ok) throw new Error(result.error);
      const payload = result.data;
      if (payload.mutated) {
        applyRpgState(payload.playerState);
          
        for (const rx of payload.reactions) {
          let msg = "";
          let color = 0xffe0a0;
          let pColor = 0xffa500;
          let pType: "smoke" | "bubble" | "sizzle" = "smoke";

          if (rx.event === "ignited") {
            msg = `${rx.itemId} burned into ${rx.resultItemId}.`;
            color = 0xff5555;
            pColor = 0xff3300;
            pType = "smoke";
          } else if (rx.event === "melted") {
            msg = `${rx.itemId} melted into ${rx.resultItemId}.`;
            color = 0x55aaff;
            pColor = 0x3388ff;
            pType = "bubble";
          } else if (rx.event === "rotted") {
            msg = `${rx.itemId} decayed into ${rx.resultItemId}.`;
            color = 0xaaaaaa;
            pColor = 0x777777;
            pType = "sizzle";
          }

          if (rx.equippedSlot) {
            msg = `equipped ${rx.equippedSlot} (${rx.itemId}) ${rx.event}; added ${rx.resultItemId} to stash.`;
          }

          engine?.spawnEnvFloatingText(msg, color);
          engine?.spawnEnvParticles(pColor, 15, pType);
          showNotify(msg);
        }
      }
    } catch (err) {
      console.error("Failed to run environment tick:", err);
    }
  }, 5000);
});

onDestroy(() => {
  if (envInterval) clearInterval(envInterval);
  engine?.destroy();
  for (const unsub of uiUnsubs) unsub();
  if (typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  }
  shellEl?.removeEventListener('pointerdown', enterFullscreenOnce);
});
</script>

<svelte:head>
  <title>Ashenmoon — Camp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cardo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window
  onmousedown={(e) => {
    const clickTarget = e.target as HTMLElement;
    if (contextMenu && !clickTarget.closest('.ctx-menu')) closeContextMenu();
    if (stationMenu && !clickTarget.closest('.station-menu')) closeStationMenu();
  }}
  onkeydown={uiInputController.dispatch}
  onclick={(e) => { if (e.shiftKey) e.preventDefault(); }}
/>

<div class="shell" bind:this={shellEl}>
  <div bind:this={containerEl} class="canvas-mount"></div>
  <div class="vignette"></div>

  <!-- Top-Right Settings Gear Button -->
  <TopHudActions
    {showInventory}
    {inventoryTab}
    showScenarioTools={showDevHud}
    activeScenario={activeScenarioId !== null}
    showEquipment={showEquipment}
    showQuests={showQuests}
    onSkills={toggleSkills}
    onInventory={toggleInventory}
    onCrafting={toggleCrafting}
    onEquipment={toggleEquipment}
    onQuests={toggleQuests}
    onSettings={toggleSettings}
    onScenario={toggleScenario}
    {isFullscreen}
    onToggleFullscreen={toggleFullscreen}
  />

  {#if activeScenarioId}
    <div class="scenario-badge">scenario: {activeScenarioId}</div>
  {/if}

  <div class="hud-corner">
    {#if lookAt}
      <div class="look-at focused-hint">
        <span class="look-icon">◈</span>
        <kbd>E</kbd>
        <span>{lookAt}</span>
      </div>
    {:else}
      <div class="legend subtle-hint">
        <kbd>WASD</kbd> move
        <span class="sep">·</span>
        <kbd>Tab</kbd> stash
      </div>
    {/if}
    {#if coords}
      <div class="coords">{coords.gx}, {coords.gy}</div>
    {/if}
  </div>

  <div class="left-panels-container">
    {#if showEquipment}
      <EquipmentPanel onClose={() => overlayStack.close(OverlayId.Equipment)} />
    {/if}
    {#if showQuests}
      <QuestTracker onClose={() => overlayStack.close(OverlayId.Quests)} />
    {/if}
  </div>

  {#if showInventory}
    <InventoryGrid engine={engine} initialTab={inventoryTab} onClose={() => overlayStack.close(OverlayId.Inventory)} />
  {/if}

  {#if showConstruction && activeStationEntity}
    <ConstructionOverlay
      entity={activeStationEntity}
      {engine}
      onClose={() => {
        overlayStack.close(OverlayId.Construction);
        activeStationEntity = null;
      }}
    />
  {/if}

  {#if showCarcass && carcassPanelTargetId}
    <CarcassPanel
      targetId={carcassPanelTargetId}
      {engine}
      onClose={() => {
        overlayStack.close(OverlayId.Carcass);
        carcassPanelTargetId = null;
      }}
    />
  {/if}

  <EnvironmentGauge />
  <ConditionPanel />
  <ToastLog />

  <div class="bottom-hud-stack">
    {#if notify}
      <div class="notify" role="status">{notify}</div>
    {/if}
    <SkillHotbar />
    <ItemHotbar />
    <GameHud />
  </div>

  <SpectatorOverlay />
  <DevConsole />

  {#if showSettings}
    <SettingsMenu
      onClose={() => overlayStack.close(OverlayId.Settings)}
      onUpdate={handleBindingsUpdate}
    />
  {/if}

  {#if showSkills}
    <SkillTreePanel onClose={() => overlayStack.close(OverlayId.Skills)} />
  {/if}

  {#if showMedicine}
    <TreatmentPanel onClose={() => overlayStack.close(OverlayId.Medicine)} />
  {/if}

  {#if contextMenu}
    {@const hasAction = !!(contextMenu.action && contextMenu.action !== "destroy")}
    {@const hasDestroy = !!contextMenu.buildingId}
    {@const actionRi = 0}
    {@const destroyRi = hasAction ? 1 : 0}
    {@const closeRi = (hasAction ? 1 : 0) + (hasDestroy ? 1 : 0)}
    <div
      class="ctx-menu"
      style="left:{contextMenu.screenX}px; top:{contextMenu.screenY}px"
      role="menu"
    >
      <div class="ctx-header">{contextMenu.name}</div>
      {#if hasAction}
        <button
          class="ctx-item"
          class:ctx-focused={actionRi === menuController.focusedIndex}
          role="menuitem"
          onclick={() => { engine?.triggerInteract(); closeContextMenu(); }}
        >
          {contextMenu.action === "gather" ? "harvest" : contextMenu.action}
        </button>
      {/if}
      {#if hasDestroy}
        <button
          class="ctx-item ctx-danger"
          class:ctx-focused={destroyRi === menuController.focusedIndex}
          role="menuitem"
          onclick={() => { engine?.destroyBuilding(contextMenu!.buildingId!); closeContextMenu(); }}
        >
          destroy
        </button>
      {/if}
      <button
        class="ctx-item ctx-close"
        class:ctx-focused={closeRi === menuController.focusedIndex}
        role="menuitem"
        onclick={closeContextMenu}
      >close</button>
    </div>
  {/if}

  {#if stationMenu}
    {@const stationMenuEntityId = stationMenu.entityId}
    <StationMenu
      options={stationMenu.options}
      anchorScreen={{ x: stationMenu.screenX, y: stationMenu.screenY }}
      stationName={stationMenu.name}
      busyStatus={activeCraftStatuses.find((s) => s.stationEntityId === stationMenuEntityId) ?? null}
      onSelect={selectStationMenuOption}
      onClose={closeStationMenu}
      onCancelBusy={cancelActiveStationCraft}
    />
  {/if}

  {#if showScenario}
    <ScenarioPanel
      {engine}
      {activeScenarioId}
      onClose={() => overlayStack.close(OverlayId.Scenario)}
    />
  {/if}

  <DialogueBox />
  <IntroOverlay />
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: var(--color-world-soil, CanvasText);
  }

  .shell {
    position: fixed;
    inset: 0;
  }

  .vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(circle at center, rgba(0, 0, 0, 0) 35%, rgba(10, 8, 16, 0.45) 100%);
    z-index: 5;
  }

  .canvas-mount {
    width: 100%;
    height: 100%;
  }

  .canvas-mount :global(canvas) {
    display: block;
    /* PixiJS resizeTo handles the pixel dimensions; CSS just positions it. */
    position: absolute;
    inset: 0;
  }

  /* Bottom-left HUD â€” stacks look-at, coords, legend top-to-bottom */
  .hud-corner {
    position: absolute;
    bottom: 1.1rem;
    left: 1.1rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    pointer-events: none;
    user-select: none;
    font-family: "IBM Plex Mono", monospace;
  }

  .look-at {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: rgba(255, 220, 120, 0.9);
    background: rgba(8, 7, 6, 0.42);
    border: 1px solid rgba(255, 220, 120, 0.22);
    border-radius: 4px;
    padding: 0.22rem 0.4rem;
  }

  .look-icon {
    opacity: 0.7;
    font-size: 0.7rem;
  }

  .coords {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 0.03em;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(8, 7, 6, 0.42);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 0.2rem 0.35rem;
  }

  .subtle-hint {
    opacity: 0.55;
  }

  .focused-hint {
    color: rgba(255, 220, 120, 0.9);
  }

  kbd {
    background: rgba(255, 255, 255, 0.07);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 3px;
    padding: 1px 5px;
    color: rgba(255, 255, 255, 0.55);
    font-family: inherit;
    font-size: 0.68rem;
  }

  .look-at kbd {
    color: rgba(255, 220, 120, 0.8);
    border-color: rgba(255, 220, 120, 0.25);
    background: rgba(255, 220, 120, 0.08);
  }

  .sep { opacity: 0.2; }

  .bottom-hud-stack {
    position: fixed;
    bottom: 1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    z-index: 90;
    pointer-events: none;
    user-select: none;
  }

  .notify {
    background: rgba(0, 0, 0, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: 0.35rem 0.9rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    color: rgba(255, 255, 255, 0.82);
    pointer-events: auto;
    animation: pop 0.12s ease;
  }

  @keyframes pop {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ctx-menu {
    position: fixed;
    z-index: 200;
    min-width: 9rem;
    background: rgba(12, 10, 8, 0.92);
    border: 1px solid rgba(255, 220, 120, 0.3);
    border-radius: 3px;
    padding: 0.2rem 0;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    backdrop-filter: blur(4px);
    animation: pop 0.08s ease;
    user-select: none;
  }

  .ctx-header {
    padding: 0.3rem 0.75rem 0.25rem;
    color: rgba(255, 220, 120, 0.7);
    font-size: 0.68rem;
    letter-spacing: 0.06em;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    margin-bottom: 0.15rem;
  }

  .ctx-item {
    display: block;
    width: 100%;
    padding: 0.3rem 0.75rem;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.75);
    font-family: inherit;
    font-size: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.08s;
  }

  .ctx-item:hover,
  .ctx-item.ctx-focused {
    background: rgba(255, 220, 120, 0.1);
    color: rgba(255, 255, 255, 0.95);
  }

  .ctx-close {
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    margin-top: 0.15rem;
    color: rgba(255, 255, 255, 0.35);
  }

  .ctx-danger {
    color: var(--color-danger, tomato);
  }

  .ctx-danger:hover {
    background: rgba(220, 80, 60, 0.12);
    color: var(--color-danger, tomato);
  }

  .scenario-badge {
    position: absolute;
    top: 3.7rem;
    right: 1.1rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    color: rgba(255, 220, 120, 0.55);
    letter-spacing: 0.04em;
    pointer-events: none;
    user-select: none;
    z-index: 10;
  }

  .left-panels-container {
    position: fixed;
    top: 5rem;
    left: 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    z-index: 90;
    pointer-events: none;
  }

  .left-panels-container :global(.game-panel-wrapper),
  :global(.inventory-container) :global(.game-panel-wrapper) {
    position: relative !important;
  }
</style>

