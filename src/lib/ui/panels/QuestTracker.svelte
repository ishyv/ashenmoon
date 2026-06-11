<script lang="ts">
import { activeQuests } from "$lib/domain/quests.svelte";

let isOpen = $state(true);

const currentQuest = $derived(() => {
  const questId = activeQuests.currentQuestId;
  if (!questId || questId === "completed_all") return null;
  return activeQuests.quests[questId] || null;
});
</script>

{#if currentQuest()}
  {@const quest = currentQuest()!}
  <div class="quest-tracker {isOpen ? 'expanded' : 'collapsed'}">
    <button class="header-toggle" onclick={() => (isOpen = !isOpen)}>
      <span class="quest-title-text">{quest.title}</span>
      <span class="arrow">{isOpen ? "▲" : "▼"}</span>
    </button>

    {#if isOpen}
      <div class="quest-body">
        <p class="quest-desc">{quest.description}</p>
        
        <div class="divider"></div>
        
        <ul class="objectives-list">
          {#each quest.objectives as obj}
            <li class="objective-item {obj.completed ? 'completed' : ''}">
              <span class="bullet">✦</span>
              <span class="objective-label">{obj.label}</span>
              <span class="objective-progress">({obj.current}/{obj.target})</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
{/if}

<style>
.quest-tracker {
  position: fixed;
  top: 5rem;
  left: 1.1rem;
  width: 280px;
  background: rgba(14, 11, 9, 0.82);
  border: 1px solid rgba(255, 220, 120, 0.12);
  border-radius: 6px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  z-index: 95;
  pointer-events: auto;
  font-family: 'Cardo', serif;
  color: #f2ede4;
  overflow: hidden;
  transition: max-height 0.25s ease-out;
}

.quest-tracker.collapsed {
  max-height: 38px;
}

.quest-tracker.expanded {
  max-height: 400px;
}

.header-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 220, 120, 0.04);
  border: none;
  border-bottom: 1px solid rgba(255, 220, 120, 0.08);
  padding: 0.6rem 0.8rem;
  color: #ffdc78;
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  text-align: left;
}

.header-toggle:hover {
  background: rgba(255, 220, 120, 0.08);
}

.quest-title-text {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  max-width: 220px;
}

.arrow {
  font-size: 0.6rem;
  color: rgba(255, 220, 120, 0.5);
}

.quest-body {
  padding: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.quest-desc {
  font-size: 0.85rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  line-height: 1.4;
}

.divider {
  height: 1px;
  background: rgba(255, 220, 120, 0.06);
}

.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.objective-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.82rem;
  line-height: 1.4;
}

.objective-item.completed {
  color: rgba(255, 255, 255, 0.35);
  text-decoration: line-through;
}

.bullet {
  color: #ea580c; /* Amber bullet */
  font-size: 0.75rem;
  margin-top: 0.1rem;
}

.objective-item.completed .bullet {
  color: rgba(255, 255, 255, 0.2);
}

.objective-label {
  flex: 1;
}

.objective-progress {
  font-size: 0.75rem;
  color: #ffdc78;
  margin-left: 0.3rem;
}

.objective-item.completed .objective-progress {
  color: rgba(255, 255, 255, 0.25);
}
</style>
