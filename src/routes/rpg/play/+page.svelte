<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { GameEngine, type HudState } from "$lib/game/engine";
import type { Entity } from "$lib/game/ecs-miniplex";
import { registerDevCommands } from "$lib/game/dev-commands";
import DevConsole from "$lib/game/DevConsole.svelte";
import GameHud from "$lib/game/GameHud.svelte";
import InputConfigHub, { type Bindings } from "$lib/game/InputConfigHub.svelte";
import EquipmentPanel from "$lib/game/EquipmentPanel.svelte";
import InventoryGrid from "$lib/game/InventoryGrid.svelte";
import EnvironmentGauge from "$lib/game/EnvironmentGauge.svelte";
import SkillHotbar from "$lib/game/SkillHotbar.svelte";
import SkillTreePanel from "$lib/game/SkillTreePanel.svelte";
import DialogueBox from "$lib/game/DialogueBox.svelte";
import QuestTracker from "$lib/game/QuestTracker.svelte";
import IntroOverlay from "$lib/game/IntroOverlay.svelte";
import { setRpgState, activeEnvironment, uiPreferences, loadUiPreferences, setEnvironment } from "$lib/game/rpg-state.svelte";

let { data } = $props();

let containerEl = $state<HTMLDivElement | null>(null);
let engine     = $state<GameEngine | null>(null);
let notify     = $state<string | null>(null);
let coords     = $state<{ gx: number; gy: number } | null>(null);
let lookAt     = $state<string | null>(null);
let showSettings = $state(false);
let showInventory = $state(false);
let showSkills    = $state(false);
let contextMenu   = $state<{ name: string; action: string; x: number; y: number } | null>(null);
let notifyTimer: ReturnType<typeof setTimeout> | null = null;
let envInterval: ReturnType<typeof setInterval> | null = null;

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

function handleContextMenu(name: string, action: string, screenX: number, screenY: number) {
  contextMenu = { name, action, x: screenX, y: screenY };
}

function closeContextMenu() {
  contextMenu = null;
}

function handleBindingsUpdate(newBindings: Bindings) {
  engine?.updateBindings(newBindings);
}

/** Computes ambient environment factors based on player coordinates and biome. */
function getAmbientEnvironment(gx: number, gy: number) {
  if (engine) {
    return engine.getAmbientEnvironment(gx, gy);
  }
  return { temperature: 22, humidity: 45, toxins: 0 };
}

$effect(() => {
  if (coords) {
    const env = getAmbientEnvironment(coords.gx, coords.gy);
    setEnvironment(env);
  }
});

onMount(async () => {
  loadUiPreferences();
  if (data.playerState) {
    setRpgState(data.playerState);
  }
  if (!containerEl) return;
  engine = new GameEngine({
    container: containerEl,
    onInteract: handleInteract,
    onHudUpdate,
    onContextMenu: handleContextMenu,
  });
  await engine.init();
  registerDevCommands(engine);

  // Start 5-second backend env tick loop
  envInterval = setInterval(async () => {
    if (!coords) return;
    try {
      const res = await fetch("/api/rpg/environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: activeEnvironment.temperature,
          humidity: activeEnvironment.humidity,
          toxins: activeEnvironment.toxins,
        }),
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.mutated) {
          setRpgState(payload.playerState);
          
          for (const rx of payload.reactions) {
            let msg = "";
            let color = 0xffe0a0;
            let pColor = 0xffa500;
            let pType: "smoke" | "bubble" | "sizzle" = "smoke";

            if (rx.event === "ignited") {
              msg = `🔥 ${rx.itemId} burned into ${rx.resultItemId}!`;
              color = 0xff5555;
              pColor = 0xff3300;
              pType = "smoke";
            } else if (rx.event === "melted") {
              msg = `💧 ${rx.itemId} melted into ${rx.resultItemId}!`;
              color = 0x55aaff;
              pColor = 0x3388ff;
              pType = "bubble";
            } else if (rx.event === "rotted") {
              msg = `⏱️ ${rx.itemId} decayed into ${rx.resultItemId}!`;
              color = 0xaaaaaa;
              pColor = 0x777777;
              pType = "sizzle";
            }

            if (rx.equippedSlot) {
              msg = `⚠️ Equipped ${rx.equippedSlot} (${rx.itemId}) ${rx.event}! Added ${rx.resultItemId} to stash.`;
            }

            engine?.spawnEnvFloatingText(msg, color);
            engine?.spawnEnvParticles(pColor, 15, pType);
            showNotify(msg);
          }
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
});
</script>

<svelte:head>
  <title>Ashenmoor — Camp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cardo:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window on:mousedown={(e) => { if (contextMenu && !(e.target as HTMLElement).closest('.ctx-menu')) closeContextMenu(); }} />

<div class="shell">
  <div bind:this={containerEl} class="canvas-mount"></div>

  <!-- Top-Right Settings Gear Button -->
  <div class="top-bar">
    <button class="settings-trigger-btn" onclick={() => (showSkills = !showSkills)} title="Open Skill Progression">
      🎒 Skills
    </button>
    <button class="settings-trigger-btn" onclick={() => (showInventory = !showInventory)} title="Open Stash Inventory">
      🎒 Stash
    </button>
    <button class="settings-trigger-btn" onclick={() => (showSettings = true)} title="Configure Controls">
      ⚙ Controls
    </button>
  </div>

  <div class="hud-corner">
    {#if lookAt}
      <div class="look-at">
        <span class="look-icon">◈</span> {lookAt} <kbd>E</kbd>
      </div>
    {/if}
    {#if coords}
      <div class="coords">{coords.gx}, {coords.gy}</div>
    {/if}
    <div class="legend">
      <kbd>WASD</kbd> move
      <span class="sep">·</span>
      <kbd>E</kbd> harvest
      <span class="sep">·</span>
      <kbd>/</kbd> console
      <span class="sep">·</span>
      <span>scroll zoom</span>
    </div>
  </div>

  {#if !uiPreferences.equipOnlyWithStash || showInventory}
    <EquipmentPanel />
  {/if}

  {#if showInventory}
    <InventoryGrid engine={engine} onClose={() => (showInventory = false)} />
  {/if}

  <EnvironmentGauge />

  <div class="bottom-hud-stack">
    {#if notify}
      <div class="notify" role="status">{notify}</div>
    {/if}
    <SkillHotbar />
    <GameHud />
  </div>

  <DevConsole />

  {#if showSettings}
    <InputConfigHub
      onClose={() => (showSettings = false)}
      onUpdate={handleBindingsUpdate}
    />
  {/if}

  {#if showSkills}
    <SkillTreePanel onClose={() => (showSkills = false)} />
  {/if}

  {#if contextMenu}
    <div
      class="ctx-menu"
      style="left:{contextMenu.x}px; top:{contextMenu.y}px"
      role="menu"
    >
      <div class="ctx-header">{contextMenu.name}</div>
      <button class="ctx-item" role="menuitem" onclick={() => { engine?.triggerInteract(); closeContextMenu(); }}>
        {contextMenu.action === "gather" ? "harvest" : contextMenu.action}
      </button>
      <button class="ctx-item" role="menuitem" onclick={closeContextMenu}>inspect</button>
      <button class="ctx-item ctx-close" role="menuitem" onclick={closeContextMenu}>close</button>
    </div>
  {/if}

  <DialogueBox />
  <QuestTracker />
  <IntroOverlay />
</div>

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #3d2c1a;
  }

  .shell {
    position: fixed;
    inset: 0;
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

  /* Bottom-left HUD — stacks look-at, coords, legend top-to-bottom */
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
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.25);
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

  /* Top bar for configuration hubs */
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

  .settings-trigger-btn:hover {
    background: rgba(255, 220, 120, 0.15);
    border-color: rgba(255, 220, 120, 0.75);
    box-shadow: 0 0 8px rgba(255, 220, 120, 0.15);
    color: #ffffff;
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

  .ctx-item:hover {
    background: rgba(255, 220, 120, 0.1);
    color: rgba(255, 255, 255, 0.95);
  }

  .ctx-close {
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    margin-top: 0.15rem;
    color: rgba(255, 255, 255, 0.35);
  }
</style>
