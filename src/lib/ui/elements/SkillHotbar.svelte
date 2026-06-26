<script lang="ts">
/**
 * SkillHotbar.svelte
 * Displays the active skill slots (Evade, Focused Gathering, Fell Sweep) with
 * glowing circular icons and radial cooldown clock overlays.
 */
import { gameState } from "$lib/state/game-state.svelte";
import { cooldownsState } from "$lib/state/runtime-ui-state.svelte";
import { stamina } from "$lib/state/rpg/stamina.svelte";

const evadeCooldown = $derived(cooldownsState.evade);
const evadeMax = $derived(cooldownsState.evadeMax);
const fgCooldown = $derived(cooldownsState.focusedGather);
const fgMax = $derived(cooldownsState.focusedGatherMax);
const fsCooldown = $derived(cooldownsState.fellSweep);
const fsMax = $derived(cooldownsState.fellSweepMax);
const fsCharge = $derived(cooldownsState.fellSweepCharge);
const dtCooldown = $derived(cooldownsState.drivingThrust);
const dtMax = $derived(cooldownsState.drivingThrustMax);

// Compute percentages (100 is fully on cooldown, 0 is fully off cooldown)
const evadePercent = $derived(evadeCooldown > 0 ? (evadeCooldown / evadeMax) * 100 : 0);
const fgPercent = $derived(fgCooldown > 0 ? (fgCooldown / fgMax) * 100 : 0);
const fsPercent = $derived(fsCooldown > 0 ? (fsCooldown / fsMax) * 100 : 0);
const dtPercent = $derived(dtCooldown > 0 ? (dtCooldown / dtMax) * 100 : 0);

// Stamina checks (focused gathering's cheapest tier costs 10).
const hasEvadeStam = $derived(stamina.current >= 25);
const hasFgStam = $derived(stamina.current >= 10);
const hasFsStam = $derived(stamina.current >= 20);
const hasDtStam = $derived(stamina.current >= 12);
const combatSkillLevel = $derived((gameState.rpg.skills as typeof gameState.rpg.skills & { combat?: { level: number } } | null)?.combat?.level ?? 1);
const hasMeaningfulSkillContext = $derived(
  evadeCooldown > 0 || fgCooldown > 0 || fsCooldown > 0 || fsCharge > 0 || dtCooldown > 0 || combatSkillLevel > 1,
);
</script>

{#if hasMeaningfulSkillContext}
<div class="hotbar-container">
  <!-- Evade Skill Icon -->
  <div class="skill-slot" class:on-cooldown={evadeCooldown > 0} class:out-of-stamina={!hasEvadeStam}>
    <!-- SVG Circular Radial Cooldown Overlay -->
    {#if evadeCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - evadePercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{evadeCooldown.toFixed(1)}s</div>
    {/if}
    
    <div class="skill-icon evade-bg">ev</div>
    <div class="skill-key">SHIFT</div>
    <div class="tooltip">
      <div class="title">Evade (Lvl {gameState.rpg.skills?.evade?.level ?? 1})</div>
      <div class="desc">Perform a quick dash in your movement direction. Grant invulnerability frames if neutral-dashing.</div>
      <div class="cost">Cost: 25 Stamina</div>
    </div>
  </div>

  <!-- Focused Gathering Skill Icon -->
  <div class="skill-slot" class:on-cooldown={fgCooldown > 0} class:out-of-stamina={!hasFgStam}>
    <!-- SVG Circular Radial Cooldown Overlay -->
    {#if fgCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - fgPercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{fgCooldown.toFixed(1)}s</div>
    {/if}

    <div class="skill-icon fg-bg">fg</div>
    <div class="skill-key">F</div>
    <div class="tooltip">
      <div class="title">focused gathering</div>
      <div class="desc">press f on a large source to commit it and break it open by hand. click the targets in order and on time. read it well and you profit, botch it and you waste the source.</div>
      <div class="cost">cost / cooldown scale with node difficulty</div>
    </div>
  </div>

  <div class="skill-slot" class:on-cooldown={dtCooldown > 0} class:out-of-stamina={!hasDtStam}>
    {#if dtCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - dtPercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{dtCooldown.toFixed(1)}s</div>
    {/if}

    <div class="skill-icon dt-bg">dt</div>
    <div class="skill-key">SWIPE</div>
    <div class="tooltip">
      <div class="title">Driving Thrust (Lvl {combatSkillLevel})</div>
      <div class="desc">Short-swipe left-click to lunge in the swipe direction and punch through enemies in a line.</div>
      <div class="cost">Cost: 18 Stamina / {dtMax.toFixed(1)}s cooldown</div>
    </div>
  </div>

  <!-- Fell Sweep Skill Icon -->
  <div class="skill-slot" class:on-cooldown={fsCooldown > 0} class:out-of-stamina={!hasFsStam} class:charging={fsCharge > 0}>
    {#if fsCooldown > 0}
      <svg class="cooldown-overlay" viewBox="0 0 36 36">
        <path
          class="cooldown-progress"
          stroke-dasharray="100, 100"
          stroke-dashoffset={100 - fsPercent}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div class="cooldown-time">{fsCooldown.toFixed(1)}s</div>
    {:else if fsCharge > 0}
      <svg class="cooldown-overlay charge-overlay" viewBox="0 0 36 36">
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

  /* SVG Cooldown Swipe Overlay */
  .cooldown-overlay {
    position: absolute;
    inset: -1.5px;
    width: calc(100% + 3px);
    height: calc(100% + 3px);
    transform: rotate(-90deg);
    pointer-events: none;
    z-index: 2;
  }

  .cooldown-progress {
    fill: rgba(0, 0, 0, 0.65);
    stroke: rgba(255, 170, 0, 0.8);
    stroke-width: 1.5px;
    stroke-linecap: round;
  }

  .cooldown-time {
    position: absolute;
    z-index: 3;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    font-weight: bold;
    color: var(--color-text, white);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 1), 0 0 6px rgba(255, 170, 0, 0.8);
    pointer-events: none;
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

