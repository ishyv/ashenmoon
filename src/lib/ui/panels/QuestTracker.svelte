<script lang="ts">
import GamePanel from "$lib/ui/elements/GamePanel.svelte";
import { activeQuests } from "$lib/domain/quests.svelte";

const currentQuest = $derived(() => {
  const questId = activeQuests.currentQuestId;
  if (!questId || questId === "completed_all") return null;
  return activeQuests.quests[questId] || null;
});
</script>

{#if currentQuest()}
  {@const quest = currentQuest()!}
  <GamePanel id="quest_tracker" title={quest.title} width="280px">
    <div class="quest-tracker-body">
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
  </GamePanel>
{/if}

<style>
  .quest-tracker-body {
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    font-family: 'Cardo', serif;
    color: #f2ede4;
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
