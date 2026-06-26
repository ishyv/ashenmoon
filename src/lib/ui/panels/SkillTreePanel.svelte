<script lang="ts">
/**
 * SkillTreePanel.svelte
 * Field-journal presentation for current skill progression.
 *
 * WHY: The Skills menu is expected to grow into a larger RPG progression system,
 * so this panel keeps current formulas intact while presenting them through a
 * data-shaped view model instead of one-off markup blocks.
 */
import { gameState } from "$lib/state/game-state.svelte";

let { onClose } = $props<{ onClose: () => void }>();

const skills = $derived(gameState.rpg.skills);

function getXpPercent(xp: number, nextXp: number): number {
  if (nextXp <= 0) return 0;
  return Math.min(100, Math.max(0, (xp / nextXp) * 100));
}

type SkillNodeView = {
  id: string;
  family: "gathering" | "combat";
  label: string;
  sigil: string;
  level: number;
  xp: number;
  nextXp: number;
  kind: "passive" | "active";
  summary: string;
  effects: string[];
  tone: "forest" | "stone" | "cold" | "blood";
};

const skillNodes = $derived.by<SkillNodeView[]>(() => {
  if (!skills) return [];

  const lumberjackingBonus = (skills.lumberjacking.level - 1) * 5;
  const lumberjackingCrit = (skills.lumberjacking.level - 1) * 3;
  const miningBonus = (skills.mining.level - 1) * 5;
  const miningCrit = (skills.mining.level - 1) * 3;
  const evadeCooldown = Math.max(0.5, 1.0 - (skills.evade.level - 1) * 0.05);
  const kiteLevel = skills.kiteCombo?.level ?? 1;
  const kiteRangeBonus = 4 + 1.5 * kiteLevel;
  const kiteDamageBonus = 5 + 2 * kiteLevel;

  const nodes: SkillNodeView[] = [
    {
      id: "lumberjacking",
      family: "gathering",
      label: "Lumberjacking",
      sigil: "AX",
      level: skills.lumberjacking.level,
      xp: skills.lumberjacking.xp,
      nextXp: skills.lumberjacking.nextXp,
      kind: "passive",
      summary: "Cleaner chops, fewer wasted edges, better odds at useful timber.",
      effects: [`Tool decay rate -${lumberjackingBonus}%`, `Critical harvest chance +${lumberjackingCrit}%`],
      tone: "forest",
    },
    {
      id: "mining",
      family: "gathering",
      label: "Mining",
      sigil: "MN",
      level: skills.mining.level,
      xp: skills.mining.xp,
      nextXp: skills.mining.nextXp,
      kind: "passive",
      summary: "Better stone sense and cleaner strikes against hard resources.",
      effects: [`Tool decay rate -${miningBonus}%`, `Critical harvest chance +${miningCrit}%`],
      tone: "stone",
    },
    {
      id: "evade",
      family: "combat",
      label: "Evade",
      sigil: "EV",
      level: skills.evade.level,
      xp: skills.evade.xp,
      nextXp: skills.evade.nextXp,
      kind: "active",
      summary: "A short, desperate burst of movement when teeth get too close.",
      effects: [`Cooldown ${evadeCooldown.toFixed(2)}s`, "Base cooldown 1.0s"],
      tone: "cold",
    },
  ];

  if (skills.kiteCombo) {
    nodes.push({
      id: "kiteCombo",
      family: "combat",
      label: "Kite Specialization",
      sigil: "KT",
      level: skills.kiteCombo.level,
      xp: skills.kiteCombo.xp,
      nextXp: skills.kiteCombo.nextXp,
      kind: "active",
      summary: "Keep pressure while staying just outside the worst of it.",
      effects: [`Range per stack +${kiteRangeBonus.toFixed(1)}%`, `Damage per stack +${kiteDamageBonus.toFixed(1)}%`],
      tone: "blood",
    });
  }

  return nodes;
});

const gatheringNodes = $derived(skillNodes.filter((node) => node.family === "gathering"));
const combatNodes = $derived(skillNodes.filter((node) => node.family === "combat"));
const selectedNode = $derived(skillNodes[0]);
</script>

<div
  class="modal-backdrop"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
  onkeydown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
>
  <div class="modal-card skill-ledger-card" role="presentation">
    <div class="modal-header">
      <div>
        <p class="eyebrow">Survivor Ledger</p>
        <h2>Learned Ways</h2>
      </div>
      <button class="close-btn" onclick={(e) => { e.preventDefault(); onClose(); }} aria-label="Close Skills">×</button>
    </div>

    <div class="modal-body skill-ledger-body">
      {#if !skills}
        <div class="loading-state">
          <span class="spinner" aria-hidden="true"></span>
          Reading damp pages...
        </div>
      {:else}
        <div class="ledger-layout">
          <aside class="family-rail" aria-label="Skill families">
            <div class="family-card active">
              <span class="family-mark">GR</span>
              <div>
                <strong>Gathering</strong>
                <span>{gatheringNodes.length} known</span>
              </div>
            </div>
            <div class="family-card active">
              <span class="family-mark">CB</span>
              <div>
                <strong>Combat</strong>
                <span>{combatNodes.length} known</span>
              </div>
            </div>
            <div class="family-card sealed">
              <span class="family-mark">??</span>
              <div>
                <strong>Unwritten</strong>
                <span>future paths</span>
              </div>
            </div>
          </aside>

          <section class="progression-board" aria-label="Current skill progression">
            <div class="board-section">
              <h3>Gathering Passives</h3>
              {#each gatheringNodes as node (node.id)}
                <article class="skill-node {node.tone}" data-skill-id={node.id}>
                  <div class="node-sigil">{node.sigil}</div>
                  <div class="node-content">
                    <div class="node-title-row">
                      <div>
                        <h4>{node.label}</h4>
                        <p>{node.summary}</p>
                      </div>
                      <span class="level-chip">Lvl {node.level}</span>
                    </div>
                    <div class="xp-bar-container" aria-label={`${node.label} experience`}>
                      <div class="xp-fill" style={`width: ${getXpPercent(node.xp, node.nextXp)}%`}></div>
                      <div class="xp-text">{node.xp} / {node.nextXp} XP</div>
                    </div>
                    <div class="effect-list">
                      {#each node.effects as effect}
                        <span>{effect}</span>
                      {/each}
                    </div>
                  </div>
                </article>
              {/each}
            </div>

            <div class="board-section">
              <h3>Active Abilities</h3>
              {#each combatNodes as node (node.id)}
                <article class="skill-node {node.tone}" data-skill-id={node.id}>
                  <div class="node-sigil">{node.sigil}</div>
                  <div class="node-content">
                    <div class="node-title-row">
                      <div>
                        <h4>{node.label}</h4>
                        <p>{node.summary}</p>
                      </div>
                      <span class="level-chip">Lvl {node.level}</span>
                    </div>
                    <div class="xp-bar-container" aria-label={`${node.label} experience`}>
                      <div class="xp-fill" style={`width: ${getXpPercent(node.xp, node.nextXp)}%`}></div>
                      <div class="xp-text">{node.xp} / {node.nextXp} XP</div>
                    </div>
                    <div class="effect-list">
                      {#each node.effects as effect}
                        <span>{effect}</span>
                      {/each}
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          </section>

          <aside class="node-inspector" aria-label="Skill details">
            <p class="inspector-label">Selected note</p>
            {#if selectedNode}
              <h3>{selectedNode.label}</h3>
              <p>{selectedNode.summary}</p>
              <ul>
                {#each selectedNode.effects as effect}
                  <li>{effect}</li>
                {/each}
              </ul>
              <div class="inspector-footer">Deeper branches can attach here without changing the saved skill state.</div>
            {/if}
          </aside>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(8, 6, 5, 0.76);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-card {
    width: min(94vw, 1040px);
    max-height: 88vh;
    background:
      radial-gradient(circle at 20% 0%, rgba(90, 56, 36, 0.18), transparent 32%),
      linear-gradient(180deg, rgba(28, 22, 17, 0.98), rgba(12, 10, 8, 0.98));
    border: 1px solid rgba(217, 194, 142, 0.3);
    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.78), inset 0 0 0 1px rgba(8, 7, 6, 0.85);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: scaleIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(217, 194, 142, 0.16);
    background: rgba(8, 7, 6, 0.42);
  }

  .eyebrow {
    margin: 0 0 0.15rem;
    font: 0.62rem "IBM Plex Mono", monospace;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(217, 194, 142, 0.62);
  }

  .modal-header h2 {
    margin: 0;
    font: 700 1.18rem Georgia, "Times New Roman", serif;
    color: #d9c28e;
    letter-spacing: 0.03em;
  }

  .close-btn {
    background: rgba(8, 7, 6, 0.7);
    border: 1px solid rgba(217, 194, 142, 0.18);
    color: rgba(217, 194, 142, 0.72);
    cursor: pointer;
    font-size: 1.5rem;
    line-height: 1;
    min-width: 2.4rem;
    min-height: 2.4rem;
  }

  .close-btn:hover {
    color: #d9c28e;
    border-color: rgba(217, 194, 142, 0.42);
  }

  .skill-ledger-body {
    padding: 1rem;
    overflow: auto;
  }

  .loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.65rem;
    font: 0.85rem "IBM Plex Mono", monospace;
    color: rgba(217, 194, 142, 0.7);
    padding: 3rem 0;
  }

  .spinner {
    width: 0.85rem;
    height: 0.85rem;
    border: 2px solid rgba(217, 194, 142, 0.18);
    border-top-color: rgba(217, 194, 142, 0.8);
    border-radius: 50%;
    animation: rotate 1.5s linear infinite;
  }

  .ledger-layout {
    display: grid;
    grid-template-columns: 180px minmax(360px, 1fr) 230px;
    gap: 1rem;
    align-items: stretch;
  }

  .family-rail,
  .progression-board,
  .node-inspector {
    background: rgba(8, 7, 6, 0.28);
    border: 1px solid rgba(217, 194, 142, 0.14);
    box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.28);
  }

  .family-rail {
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .family-card {
    display: grid;
    grid-template-columns: 2.1rem 1fr;
    gap: 0.55rem;
    align-items: center;
    padding: 0.65rem;
    border: 1px solid rgba(217, 194, 142, 0.13);
    background: rgba(22, 19, 16, 0.76);
  }

  .family-card strong {
    display: block;
    color: #d9c28e;
    font-size: 0.78rem;
  }

  .family-card span:not(.family-mark) {
    display: block;
    color: rgba(170, 160, 145, 0.7);
    font: 0.62rem "IBM Plex Mono", monospace;
    text-transform: uppercase;
  }

  .family-card.sealed {
    opacity: 0.55;
    border-style: dashed;
  }

  .family-mark,
  .node-sigil {
    display: grid;
    place-items: center;
    border: 2px solid #080706;
    background: #34251a;
    color: #d9c28e;
    box-shadow: 0 3px 0 rgba(0, 0, 0, 0.55);
    font: 700 0.68rem "IBM Plex Mono", monospace;
  }

  .family-mark {
    width: 2rem;
    height: 2rem;
  }

  .progression-board {
    padding: 0.75rem;
    display: grid;
    gap: 0.85rem;
  }

  .board-section h3,
  .node-inspector h3 {
    margin: 0 0 0.6rem;
    font: 700 0.82rem "IBM Plex Mono", monospace;
    color: rgba(217, 194, 142, 0.86);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .skill-node {
    display: grid;
    grid-template-columns: 3rem 1fr;
    gap: 0.75rem;
    padding: 0.75rem;
    margin-bottom: 0.65rem;
    background: linear-gradient(180deg, rgba(36, 28, 21, 0.86), rgba(20, 16, 12, 0.9));
    border: 1px solid rgba(217, 194, 142, 0.13);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.32);
  }

  .skill-node:hover {
    border-color: rgba(217, 194, 142, 0.32);
  }

  .node-sigil {
    width: 2.8rem;
    height: 2.8rem;
    align-self: start;
  }

  .skill-node.forest .node-sigil { background: #263326; color: #d9c28e; }
  .skill-node.stone .node-sigil { background: #34322d; color: #d9c28e; }
  .skill-node.cold .node-sigil { background: #17242a; color: #87a9ad; }
  .skill-node.blood .node-sigil { background: #34251a; color: #c54f2f; }

  .node-title-row {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: start;
  }

  .node-title-row h4 {
    margin: 0;
    color: #f0dfad;
    font-size: 0.95rem;
  }

  .node-title-row p,
  .node-inspector p {
    margin: 0.15rem 0 0.55rem;
    color: rgba(222, 210, 188, 0.68);
    font-size: 0.74rem;
    line-height: 1.35;
  }

  .level-chip {
    flex: none;
    padding: 0.2rem 0.45rem;
    border: 1px solid rgba(217, 194, 142, 0.22);
    color: #d9c28e;
    background: rgba(8, 7, 6, 0.5);
    font: 700 0.62rem "IBM Plex Mono", monospace;
  }

  .xp-bar-container {
    position: relative;
    height: 0.78rem;
    margin: 0.35rem 0 0.5rem;
    background: rgba(0, 0, 0, 0.72);
    border: 1px solid rgba(217, 194, 142, 0.12);
    overflow: hidden;
  }

  .xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #58613c, #d9c28e);
    box-shadow: 0 0 10px rgba(217, 194, 142, 0.16);
    transition: width 0.3s ease-out;
  }

  .xp-text {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    color: rgba(255, 248, 220, 0.86);
    font: 700 0.56rem "IBM Plex Mono", monospace;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  }

  .effect-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }

  .effect-list span,
  .node-inspector li {
    color: rgba(217, 194, 142, 0.78);
    font: 0.62rem "IBM Plex Mono", monospace;
  }

  .effect-list span {
    padding: 0.18rem 0.4rem;
    border: 1px solid rgba(217, 194, 142, 0.12);
    background: rgba(8, 7, 6, 0.42);
  }

  .node-inspector {
    padding: 0.85rem;
  }

  .inspector-label {
    margin: 0 0 0.4rem !important;
    font: 0.6rem "IBM Plex Mono", monospace !important;
    color: rgba(170, 160, 145, 0.62) !important;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .node-inspector ul {
    margin: 0.5rem 0 0;
    padding-left: 1rem;
  }

  .inspector-footer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px dashed rgba(217, 194, 142, 0.18);
    color: rgba(170, 160, 145, 0.68);
    font-size: 0.7rem;
    line-height: 1.35;
  }

  @media (max-width: 900px) {
    .ledger-layout {
      grid-template-columns: 1fr;
    }

    .family-rail {
      flex-direction: row;
      overflow-x: auto;
    }

    .family-card {
      min-width: 150px;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes scaleIn {
    from { transform: scale(0.96); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  @keyframes rotate {
    to { transform: rotate(360deg); }
  }
</style>
