<script lang="ts">
/**
 * SkillHotbar.svelte
 * Displays the active skill slots (Evade, Focused Gathering, Driving Thrust, Fell Sweep).
 * Cooldown state is shown by desaturating the slot with CSS grayscale; color bleeding back
 * signals recovery. The container participates in the shared HUD fade system.
 */
import { gameState } from "$lib/state/game-state.svelte";
import { cooldownsState } from "$lib/state/runtime-ui-state.svelte";
import { stamina } from "$lib/state/rpg/stamina.svelte";
import { hudActivity } from "$lib/state/hud-activity.svelte";
import { play } from "$lib/audio/audio-engine";

const evadeCooldown = $derived(cooldownsState.evade);
const fgCooldown = $derived(cooldownsState.focusedGather);
const fsCooldown = $derived(cooldownsState.fellSweep);
const fsCharge = $derived(cooldownsState.fellSweepCharge);
const dtCooldown = $derived(cooldownsState.drivingThrust);
const dtMax = $derived(cooldownsState.drivingThrustMax);

// Stamina checks (focused gathering's cheapest tier costs 10).
const hasEvadeStam = $derived(stamina.current >= 25);
const hasFgStam = $derived(stamina.current >= 10);
const hasFsStam = $derived(stamina.current >= 20);
const hasDtStam = $derived(stamina.current >= 12);
const combatSkillLevel = $derived((gameState.rpg.skills as typeof gameState.rpg.skills & { combat?: { level: number } } | null)?.combat?.level ?? 1);
const hasMeaningfulSkillContext = $derived(
  evadeCooldown > 0 || fgCooldown > 0 || fsCooldown > 0 || fsCharge > 0 || dtCooldown > 0 || combatSkillLevel > 1,
);

// HUD fade integration
let hudOpacity = $state(hudActivity.restOpacity);
$effect(() => {
  const id = setInterval(() => {
    hudOpacity = hudActivity.isActive ? hudActivity.activeOpacity : hudActivity.restOpacity;
  }, 100);
  return () => clearInterval(id);
});

// Brief gold-border pulse state; set true for 300ms when a cooldown expires.
let evadeReady = $state(false);
let fgReady = $state(false);
let fsReady = $state(false);
let dtReady = $state(false);

// Detect transitions from active cooldown → 0 to trigger pulse and ready sound.
let prevEvade = 0, prevFg = 0, prevFs = 0, prevDt = 0;
$effect(() => {
  const ce = evadeCooldown, cf = fgCooldown, cs = fsCooldown, cd = dtCooldown;
  if (prevEvade > 0 && ce === 0) { evadeReady = true; play("skill.ready"); setTimeout(() => { evadeReady = false; }, 300); }
  if (prevFg > 0 && cf === 0) { fgReady = true; play("skill.ready"); setTimeout(() => { fgReady = false; }, 300); }
  if (prevFs > 0 && cs === 0) { fsReady = true; play("skill.ready"); setTimeout(() => { fsReady = false; }, 300); }
  if (prevDt > 0 && cd === 0) { dtReady = true; play("skill.ready"); setTimeout(() => { dtReady = false; }, 300); }
  prevEvade = ce; prevFg = cf; prevFs = cs; prevDt = cd;
});
</script>

{#if hasMeaningfulSkillContext}
<div
  class="hotbar-container"
  style="opacity: {hudOpacity}; transition: opacity {hudActivity.isActive ? hudActivity.revealMs : hudActivity.fadeMs}ms ease;"
>
  <!-- Evade Skill Icon -->
  <div
    class="skill-slot"
    class:slot--ready={evadeReady}
    class:out-of-stamina={!hasEvadeStam}
    style="filter: grayscale({evadeCooldown > 0 ? 1 : 0}); transition: filter {evadeCooldown > 0 ? '0s' : '0.5s ease'}, border-color 0.15s ease, box-shadow 0.15s ease;"
  >
    <div class="skill-icon evade-bg">ev</div>
    <div class="skill-key">SHIFT</div>
    <div class="tooltip">
      <div class="title">Evade (Lvl {gameState.rpg.skills?.evade?.level ?? 1})</div>
      <div class="desc">Perform a quick dash in your movement direction. Grant invulnerability frames if neutral-dashing.</div>
      <div class="cost">Cost: 25 Stamina</div>
    </div>
  </div>

  <!-- Focused Gathering Skill Icon -->
  <div
    class="skill-slot"
    class:slot--ready={fgReady}
    class:out-of-stamina={!hasFgStam}
    style="filter: grayscale({fgCooldown > 0 ? 1 : 0}); transition: filter {fgCooldown > 0 ? '0s' : '0.5s ease'}, border-color 0.15s ease, box-shadow 0.15s ease;"
  >
    <div class="skill-icon fg-bg">fg</div>
    <div class="skill-key">F</div>
    <div class="tooltip">
      <div class="title">focused gathering</div>
      <div class="desc">press f on a large source to commit it and break it open by hand. click the targets in order and on time. read it well and you profit, botch it and you waste the source.</div>
      <div class="cost">cost / cooldown scale with node difficulty</div>
    </div>
  </div>

  <!-- Driving Thrust Skill Icon -->
  <div
    class="skill-slot"
    class:slot--ready={dtReady}
    class:out-of-stamina={!hasDtStam}
    style="filter: grayscale({dtCooldown > 0 ? 1 : 0}); transition: filter {dtCooldown > 0 ? '0s' : '0.5s ease'}, border-color 0.15s ease, box-shadow 0.15s ease;"
  >
    <div class="skill-icon dt-bg">dt</div>
    <div class="skill-key">SWIPE</div>
    <div class="tooltip">
      <div class="title">Driving Thrust (Lvl {combatSkillLevel})</div>
      <div class="desc">Short-swipe left-click to lunge in the swipe direction and punch through enemies in a line.</div>
      <div class="cost">Cost: 18 Stamina / {dtMax.toFixed(1)}s cooldown</div>
    </div>
  </div>

  <!-- Fell Sweep Skill Icon — charge ring SVG kept -->
  <div
    class="skill-slot"
    class:slot--ready={fsReady}
    class:out-of-stamina={!hasFsStam}
    class:charging={fsCharge > 0}
    style="filter: grayscale({fsCooldown > 0 ? 1 : 0}); transition: filter {fsCooldown > 0 ? '0s' : '0.5s ease'}, border-color 0.15s ease, box-shadow 0.15s ease;"
  >
    {#if fsCharge > 0}
      <svg class="charge-overlay" viewBox="0 0 36 36">
        <path
          class="charge-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - fsCharge * 100}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
    {/if}

    <div class="skill-icon fs-bg">fs</div>
    <div class="skill-key">HOLD</div>
    <div class="tooltip">
      <div class="title">Fell Sweep (Lvl {gameState.rpg.skills?.fellSweep?.level ?? 1})</div>
      <div class="desc">Hold left-click and release to sweep. Any hold lands a blow. A longer hold widens the arc and extends reach up to 30%. Release early for a quick weaker strike.</div>
      <div class="cost">Cost: {Math.max(10, 20 - ((gameState.rpg.skills?.fellSweep?.level ?? 1) - 1))} Stamina / {Math.max(4, 8 - ((gameState.rpg.skills?.fellSweep?.level ?? 1) - 1) * 0.4).toFixed(1)}s cooldown</div>
    </div>
  </div>
</div>
{/if}

<style>
  .hotbar-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    pointer-events: auto; /* enable tooltip hover */
    background: rgba(18, 14, 12, 0.45);
    border: 1px solid rgba(255, 220, 120, 0.08);
    border-radius: 40px;
    padding: 0.4rem 1rem;
    backdrop-filter: blur(4px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .skill-slot {
    position: relative;
    width: 48px;
    height: 48px;
    background: rgba(30, 24, 20, 0.85);
    border: 1.5px solid rgba(255, 170, 0, 0.35);
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: default;
    transition: all 0.15s ease;
    box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
  }

  .skill-slot:hover {
    border-color: rgba(255, 170, 0, 0.85);
    box-shadow: 0 0 10px rgba(255, 170, 0, 0.25), inset 0 0 6px rgba(0,0,0,0.6);
  }

  /* Tooltip logic */
  .skill-slot:hover .tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  /* Brief gold border pulse when a cooldown expires */
  .slot--ready {
    animation: slot-ready-pulse 0.3s ease-out;
  }

  @keyframes slot-ready-pulse {
    0% {
      border-color: var(--accent);
      box-shadow: 0 0 12px var(--accent), inset 0 0 4px rgba(0, 0, 0, 0.4);
    }
    100% {
      border-color: color-mix(in srgb, var(--accent) 35%, transparent);
      box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.8);
    }
  }

  .skill-icon {
    font-size: 1.35rem;
    user-select: none;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
    transition: transform 0.15s ease;
  }

  .skill-slot:hover .skill-icon {
    transform: scale(1.1);
  }

  .evade-bg {
    color: var(--color-cold, skyblue);
  }

  .fg-bg {
    color: var(--color-warning, gold);
  }

  .fs-bg {
    color: #ff7733;
  }

  .dt-bg {
    color: #bef264;
  }

  .charging {
    border-color: rgba(255, 120, 40, 0.8);
    animation: charge-pulse 0.55s ease-in-out infinite;
  }

  @keyframes charge-pulse {
    0%, 100% {
      box-shadow: 0 0 8px rgba(255, 100, 20, 0.4), inset 0 0 6px rgba(0, 0, 0, 0.6);
    }
    50% {
      box-shadow: 0 0 22px rgba(255, 100, 20, 0.75), 0 0 8px rgba(255, 160, 60, 0.4), inset 0 0 3px rgba(0, 0, 0, 0.3);
    }
  }

  .charge-overlay {
    position: absolute;
    inset: -1.5px;
    width: calc(100% + 3px);
    height: calc(100% + 3px);
    transform: rotate(-90deg);
    pointer-events: none;
    z-index: 2;
  }

  .charge-progress {
    fill: none;
    stroke: rgba(255, 100, 20, 0.85);
    stroke-width: 2px;
    stroke-linecap: round;
  }

  /* Hotkey labels underneath slot */
  .skill-key {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(18, 14, 12, 0.95);
    border: 1px solid rgba(255, 220, 120, 0.3);
    border-radius: 3px;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.58rem;
    font-weight: bold;
    color: rgba(255, 220, 120, 0.95);
    padding: 0 4px;
    letter-spacing: 0.05em;
    pointer-events: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  /* Out of stamina warning */
  .out-of-stamina .skill-icon {
    opacity: 0.4;
    filter: grayscale(1) drop-shadow(none);
  }

  .out-of-stamina {
    border-color: rgba(255, 85, 85, 0.35);
  }

  /* Tooltip styles */
  .tooltip {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    width: 220px;
    background: rgba(18, 14, 12, 0.95);
    border: 1px solid rgba(255, 220, 120, 0.25);
    border-radius: 6px;
    padding: 0.6rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 170, 0, 0.05);
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 100;
    pointer-events: none;
    text-align: left;
    backdrop-filter: blur(8px);
  }

  .tooltip::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: rgba(18, 14, 12, 0.95) transparent transparent transparent;
  }

  .tooltip .title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.78rem;
    font-weight: bold;
    color: var(--color-warning, gold);
    margin-bottom: 0.25rem;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .tooltip .desc {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.72);
    line-height: 1.35;
    margin-bottom: 0.4rem;
  }

  .tooltip .cost {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    color: var(--color-cold, skyblue);
    font-weight: bold;
  }
</style>
