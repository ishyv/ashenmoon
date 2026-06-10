<script lang="ts">
/**
 * SkillTreePanel.svelte
 * Renders a glassmorphic visual skill progression dashboard, displaying levels,
 * XP progress bars, and passive/active unlock trees for Lumberjacking, Mining,
 * Evade, and Super-Gathering.
 */
import { fade } from "svelte/transition";
import { rpgState } from "./rpg-state.svelte";

let props = $props<{ onClose: () => void }>();

const onClose = () => props.onClose();

const skills = $derived(rpgState.skills);

// Helper to calculate XP percentages
function getXpPercent(xp: number, nextXp: number): number {
  if (nextXp <= 0) return 0;
  return Math.min(100, Math.max(0, (xp / nextXp) * 100));
}

// Tooltip/bonus calculations
const lumberjackingBonus = $derived(skills ? (skills.lumberjacking.level - 1) * 5 : 0);
const lumberjackingCrit = $derived(skills ? (skills.lumberjacking.level - 1) * 3 : 0);
const miningBonus = $derived(skills ? (skills.mining.level - 1) * 5 : 0);
const miningCrit = $derived(skills ? (skills.mining.level - 1) * 3 : 0);

const evadeCooldown = $derived(skills ? Math.max(0.5, 1.0 - (skills.evade.level - 1) * 0.05) : 1.0);
const sgCost = $derived(skills ? Math.max(15, 35 - (skills.superGather.level - 1) * 2) : 35);
const sgCooldown = $derived(skills ? Math.max(0.5, 2.0 - (skills.superGather.level - 1) * 0.15) : 2.0);
</script>

<div
  class="modal-backdrop"
  onclick={onClose}
  onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div
    class="modal-card skill-tree-card"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    role="presentation"
  >
    <div class="modal-header">
      <h2>📜 Skill Progression & Tree</h2>
      <button class="close-btn" onclick={onClose} aria-label="Close Skills">×</button>
    </div>

    <div class="modal-body skill-tree-body">
      {#if !skills}
        <div class="loading-state">
          <span class="spinner">🌀</span> Loading skills state...
        </div>
      {:else}
        <div class="tree-layout">
          <!-- Left Column: Passive Skills -->
          <div class="column passives-section">
            <h3 class="column-title">🌳 Gathering Passives</h3>
            
            <!-- Lumberjacking -->
            <div class="skill-card">
              <div class="card-header">
                <span class="skill-icon-big">🪓</span>
                <div class="skill-info">
                  <div class="skill-name">Lumberjacking</div>
                  <div class="skill-level">Lvl {skills.lumberjacking.level}</div>
                </div>
              </div>
              
              <div class="xp-bar-container">
                <div class="xp-fill lumber-fill" style="width: {getXpPercent(skills.lumberjacking.xp, skills.lumberjacking.nextXp)}%"></div>
                <div class="xp-text">{skills.lumberjacking.xp} / {skills.lumberjacking.nextXp} XP</div>
              </div>

              <div class="skill-bonuses">
                <div class="bonus-item">⚡ Tool Decay Rate: <span class="benefit">-{lumberjackingBonus}%</span></div>
                <div class="bonus-item">⭐ Critical Harvest Chance: <span class="benefit">+{lumberjackingCrit}%</span></div>
              </div>
            </div>

            <!-- Mining -->
            <div class="skill-card">
              <div class="card-header">
                <span class="skill-icon-big">⛏️</span>
                <div class="skill-info">
                  <div class="skill-name">Mining</div>
                  <div class="skill-level">Lvl {skills.mining.level}</div>
                </div>
              </div>
              
              <div class="xp-bar-container">
                <div class="xp-fill mining-fill" style="width: {getXpPercent(skills.mining.xp, skills.mining.nextXp)}%"></div>
                <div class="xp-text">{skills.mining.xp} / {skills.mining.nextXp} XP</div>
              </div>

              <div class="skill-bonuses">
                <div class="bonus-item">⚡ Tool Decay Rate: <span class="benefit">-{miningBonus}%</span></div>
                <div class="bonus-item">⭐ Critical Harvest Chance: <span class="benefit">+{miningCrit}%</span></div>
              </div>
            </div>
          </div>

          <!-- Vertical Divider -->
          <div class="tree-divider"></div>

          <!-- Right Column: Active Skills Tree -->
          <div class="column actives-section">
            <h3 class="column-title">🏃 Active Abilities</h3>
            
            <div class="ability-tree-nodes">
              <!-- Evade/Dash Node -->
              <div class="tree-node border-cyan">
                <div class="node-icon bg-cyan">💨</div>
                <div class="node-details">
                  <div class="node-name color-cyan">Evade (Dash)</div>
                  <div class="node-level">Level {skills.evade.level}</div>
                  <div class="node-stats">
                    Cooldown: <span class="benefit">{evadeCooldown.toFixed(2)}s</span> <span class="muted">(Base: 1.0s)</span>
                  </div>
                  <div class="xp-bar-container mini-bar">
                    <div class="xp-fill evade-fill" style="width: {getXpPercent(skills.evade.xp, skills.evade.nextXp)}%"></div>
                  </div>
                  <div class="xp-text mini-text">{skills.evade.xp}/{skills.evade.nextXp} XP</div>
                </div>
              </div>

              <!-- Connecting Line -->
              <div class="tree-line">
                <div class="line-glow"></div>
              </div>

              <!-- Super-Gather Node -->
              <div class="tree-node border-orange">
                <div class="node-icon bg-orange">💥</div>
                <div class="node-details">
                  <div class="node-name color-orange">Super-Gather</div>
                  <div class="node-level">Level {skills.superGather.level}</div>
                  <div class="node-stats">
                    Stamina: <span class="benefit">{sgCost}</span> | Cooldown: <span class="benefit">{sgCooldown.toFixed(2)}s</span>
                  </div>
                  <div class="xp-bar-container mini-bar">
                    <div class="xp-fill sg-fill" style="width: {getXpPercent(skills.superGather.xp, skills.superGather.nextXp)}%"></div>
                  </div>
                  <div class="xp-text mini-text">{skills.superGather.xp}/{skills.superGather.nextXp} XP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
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
    max-width: 780px;
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
    background: transparent;
    border: none;
    font-size: 1.6rem;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    line-height: 1;
    padding: 0;
    transition: color 0.12s;
  }

  .close-btn:hover {
    color: rgba(255, 220, 120, 0.9);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .skill-tree-card {
    max-width: 780px !important;
    border: 1px solid rgba(255, 170, 0, 0.22) !important;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(255, 170, 0, 0.04) !important;
  }

  .skill-tree-body {
    padding: 1.5rem !important;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.6);
    padding: 3rem 0;
  }

  .spinner {
    display: inline-block;
    animation: rotate 1.5s linear infinite;
  }

  @keyframes rotate {
    to { transform: rotate(360deg); }
  }

  .tree-layout {
    display: flex;
    gap: 1.5rem;
  }

  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .column-title {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.85rem;
    font-weight: bold;
    color: rgba(255, 220, 120, 0.82);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: 0 0 0.2rem 0;
    border-bottom: 1px dashed rgba(255, 220, 120, 0.15);
    padding-bottom: 0.35rem;
  }

  .tree-divider {
    width: 1px;
    background: linear-gradient(180deg, rgba(255,220,120,0.15), rgba(255,220,120,0.02));
  }

  /* Skill Card (Left Column) */
  .skill-card {
    background: rgba(30, 24, 20, 0.6);
    border: 1px solid rgba(255, 220, 120, 0.08);
    border-radius: 6px;
    padding: 0.85rem 1rem;
    transition: all 0.15s ease;
  }

  .skill-card:hover {
    border-color: rgba(255, 170, 0, 0.25);
    background: rgba(30, 24, 20, 0.8);
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.6rem;
  }

  .skill-icon-big {
    font-size: 1.8rem;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
  }

  .skill-info {
    display: flex;
    flex-direction: column;
  }

  .skill-name {
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: bold;
    font-size: 0.95rem;
    color: #ffffff;
  }

  .skill-level {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.72rem;
    color: #ffa500;
    font-weight: bold;
  }

  /* XP Progress bar */
  .xp-bar-container {
    position: relative;
    height: 16px;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 0.6rem;
  }

  .xp-fill {
    height: 100%;
    border-radius: 8px;
    transition: width 0.3s ease-out;
  }

  .lumber-fill {
    background: linear-gradient(90deg, #2e6930, #55aa58);
    box-shadow: 0 0 6px rgba(85, 170, 88, 0.4);
  }

  .mining-fill {
    background: linear-gradient(90deg, #8c6a2c, #cca355);
    box-shadow: 0 0 6px rgba(204, 163, 85, 0.4);
  }

  .evade-fill {
    background: linear-gradient(90deg, #2c688c, #559ec8);
    box-shadow: 0 0 4px rgba(85, 158, 200, 0.4);
  }

  .sg-fill {
    background: linear-gradient(90deg, #a65b1c, #e68d45);
    box-shadow: 0 0 4px rgba(230, 141, 69, 0.4);
  }

  .xp-text {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.62rem;
    font-weight: bold;
    color: rgba(255, 255, 255, 0.85);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .skill-bonuses {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-top: 0.2rem;
  }

  .bonus-item {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .benefit {
    color: #55ff55;
    font-weight: bold;
  }

  /* Active Skills tree (Right Column) */
  .ability-tree-nodes {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding-top: 0.5rem;
  }

  .tree-node {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    width: 90%;
    background: rgba(30, 24, 20, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
    transition: all 0.15s ease;
  }

  .border-cyan { border-color: rgba(0, 170, 255, 0.18) !important; }
  .border-orange { border-color: rgba(255, 120, 0, 0.18) !important; }

  .tree-node:hover {
    background: rgba(30, 24, 20, 0.8);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.35);
  }

  .tree-node:hover.border-cyan { border-color: rgba(0, 170, 255, 0.45) !important; }
  .tree-node:hover.border-orange { border-color: rgba(255, 120, 0, 0.45) !important; }

  .node-icon {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.4rem;
    user-select: none;
    box-shadow: 0 2px 5px rgba(0,0,0,0.6);
  }

  .bg-cyan {
    background: rgba(0, 170, 255, 0.15);
    border: 1px solid rgba(0, 170, 255, 0.4);
  }

  .bg-orange {
    background: rgba(255, 120, 0, 0.15);
    border: 1px solid rgba(255, 120, 0, 0.4);
  }

  .node-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .node-name {
    font-family: system-ui, -apple-system, sans-serif;
    font-weight: bold;
    font-size: 0.85rem;
  }

  .color-cyan { color: #55c8ff; }
  .color-orange { color: #ff9d55; }

  .node-level {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 0.2rem;
  }

  .node-stats {
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.72);
    margin-bottom: 0.4rem;
  }

  .muted {
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.35);
  }

  .mini-bar {
    height: 8px !important;
    margin-bottom: 0.15rem !important;
  }

  .mini-text {
    font-size: 0.55rem !important;
    text-align: right;
    color: rgba(255,255,255,0.4);
  }

  /* Connecting tree line */
  .tree-line {
    position: relative;
    height: 30px;
    width: 2px;
    background: rgba(255, 255, 255, 0.1);
  }

  .line-glow {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, #55aaff, #ffa500);
    opacity: 0.3;
  }
</style>
