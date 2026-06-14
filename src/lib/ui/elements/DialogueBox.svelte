<script lang="ts">
import { activeQuests, dialogueState } from "$lib/state/rpg/quests.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { devGiveItem } from "$lib/state/dev-rpg-actions";
import { playSound } from "$lib/audio/audio-engine";
import { learnRecipe } from "$lib/state/rpg/crafting.svelte";
import { vaneDialogueScript } from "$lib/domain/definitions/vane-dialogue";
import type { DialogueScript, DialogueChoice } from "$lib/domain/definitions/dialogue-types";
import { isObjectiveMatch } from "$lib/domain/quests/quest-system";
import { GameEvent } from "$lib/domain/game-events";

// Registry of dialogue scripts mapped by NPC ID
const SCRIPTS: Record<string, DialogueScript> = {
  [vaneDialogueScript.npcId]: vaneDialogueScript,
};

// Registry of NPC meta info for styling
const NPC_INFO: Record<string, { icon: string; title: string }> = {
  npc_vane: { icon: "🧑‍✈️", title: "Camp Commander" },
};

let textToShow = $state("");
let currentText = "";
let typeInterval: ReturnType<typeof setInterval> | null = null;

// Derive the active script from the active NPC ID
const activeScript = $derived(
  dialogueState.activeNpc ? SCRIPTS[dialogueState.activeNpc.id] : null
);

// Form the dialogue context reactively
const dialogueContext = $derived.by(() => {
  return {
    currentQuestId: activeQuests.currentQuestId,
    canClaimReward: (questId: string, talkObjectiveId: string) => {
      const quest = activeQuests.quests[questId];
      if (!quest) return false;
      return (
        quest.objectives
          .filter((o) => o.id !== talkObjectiveId)
          .every((o) => o.completed) && !quest.rewardClaimed
      );
    },
  };
});

// Resolve the current node reactively
const currentNode = $derived(
  activeScript && dialogueContext
    ? activeScript.getActiveNode(dialogueContext)
    : null
);

// Reactively start typewriter effect when currentNode changes
$effect(() => {
  const rawText = currentNode?.text;
  if (rawText) {
    if (rawText !== currentText) {
      currentText = rawText;
      textToShow = "";
      if (typeInterval) clearInterval(typeInterval);
      
      let i = 0;
      typeInterval = setInterval(() => {
        if (rawText && i < rawText.length) {
          textToShow += rawText[i];
          i++;
        } else {
          if (typeInterval) clearInterval(typeInterval);
        }
      }, 15);
    }
  } else {
    currentText = "";
    textToShow = "";
    if (typeInterval) clearInterval(typeInterval);
  }
});

/**
 * Scans player inventory/loadout to retrospectively update objective progress
 * for newly accepted quests.
 */
function runRetrospectiveCheck(questId: string) {
  const quest = activeQuests.quests[questId];
  if (!quest) return;

  const slots = gameState.rpg.inventory?.slots || {};
  const equippedWeapon = gameState.rpg.profile?.loadout?.weapon;
  const equippedWeaponId = equippedWeapon
    ? (typeof equippedWeapon === "string" ? equippedWeapon : equippedWeapon.itemId)
    : null;

  for (const obj of quest.objectives) {
    if (obj.completed) continue;

    let matchCount = 0;

    // Check inventory slots for matches
    for (const [itemId, slot] of Object.entries(slots)) {
      if (!slot || !("qty" in slot)) continue;
      if (
        isObjectiveMatch(obj.id, GameEvent.Pickup, itemId) ||
        isObjectiveMatch(obj.id, GameEvent.Craft, itemId)
      ) {
        matchCount += slot.qty;
      }
    }

    // Check equipped loadout for matches
    if (equippedWeaponId) {
      if (
        isObjectiveMatch(obj.id, GameEvent.Pickup, equippedWeaponId) ||
        isObjectiveMatch(obj.id, GameEvent.Craft, equippedWeaponId)
      ) {
        matchCount += 1;
      }
    }

    if (matchCount > 0) {
      obj.current = Math.min(obj.target, obj.current + matchCount);
      if (obj.current >= obj.target) {
        obj.completed = true;
      }
    }
  }
}

function handleChoiceClick(choice: DialogueChoice) {
  const action = choice.action;
  if (!action) {
    closeDialog();
    return;
  }

  if (action.type === "accept_quest") {
    if (action.nextQuestId) {
      activeQuests.currentQuestId = action.nextQuestId;
    }
    if (action.learnRecipeId) {
      learnRecipe(action.learnRecipeId);
    }
    if (action.questId) {
      runRetrospectiveCheck(action.questId);
    }
    playSound("pickup");
    closeDialog();
  } else if (action.type === "claim_reward") {
    if (action.questId) {
      const quest = activeQuests.quests[action.questId];
      if (quest) {
        quest.completed = true;
        quest.rewardClaimed = true;
        if (action.talkObjectiveId) {
          const talkObj = quest.objectives.find((o) => o.id === action.talkObjectiveId);
          if (talkObj) talkObj.completed = true;
        }
      }
    }
    if (action.rewardItemId && action.rewardQty) {
      devGiveItem(action.rewardItemId, action.rewardQty);
    }
    playSound("craft");
    if (action.nextQuestId) {
      activeQuests.currentQuestId = action.nextQuestId;
    }
    closeDialog();
  } else {
    closeDialog();
  }
}

function closeDialog() {
  dialogueState.activeNpc = null;
  if (typeInterval) clearInterval(typeInterval);
}
</script>

{#if dialogueState.activeNpc}
  <div class="dialogue-backdrop">
    <div class="dialogue-box">
      <div class="npc-header">
        <span class="npc-icon">{NPC_INFO[dialogueState.activeNpc.id]?.icon || "👤"}</span>
        <span class="npc-name">{dialogueState.activeNpc.name}</span>
        <span class="npc-title">{NPC_INFO[dialogueState.activeNpc.id]?.title || "NPC"}</span>
      </div>

      <div class="dialogue-content">
        <p class="dialogue-text">{textToShow}</p>
      </div>

      <div class="dialogue-actions">
        {#if currentNode}
          {#each currentNode.choices as choice}
            <button
              class="action-btn {choice.action?.type === 'claim_reward' ? 'reward' : (choice.action?.type === 'accept_quest' ? 'accept' : 'close')}"
              onclick={() => handleChoiceClick(choice)}
            >
              {choice.text}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}


<style>
.dialogue-backdrop {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 650px;
  z-index: 200;
  pointer-events: auto;
  display: flex;
  justify-content: center;
}

.dialogue-box {
  width: 100%;
  background: rgba(14, 11, 9, 0.92);
  border: 1px solid rgba(255, 220, 120, 0.18);
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 220, 120, 0.05);
  backdrop-filter: blur(8px);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.npc-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border-bottom: 1px solid rgba(255, 220, 120, 0.1);
  padding-bottom: 0.5rem;
}

.npc-icon {
  font-size: 1.3rem;
}

.npc-name {
  font-family: 'Cinzel', serif;
  font-size: 1.15rem;
  color: #ffdc78;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.npc-title {
  font-family: 'Cardo', serif;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-left: 0.5rem;
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding-left: 0.5rem;
}

.dialogue-content {
  min-height: 80px;
  display: flex;
  align-items: flex-start;
}

.dialogue-text {
  font-family: 'Cardo', serif;
  font-size: 1.05rem;
  line-height: 1.5;
  color: #f2ede4;
  margin: 0;
  white-space: pre-wrap;
}

.dialogue-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
}

.action-btn {
  font-family: 'Cinzel', serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.5rem 1.2rem;
  border: 1px solid rgba(255, 220, 120, 0.3);
  border-radius: 4px;
  background: rgba(255, 220, 120, 0.08);
  color: #ffdc78;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  letter-spacing: 0.06em;
}

.action-btn:hover {
  background: rgba(255, 220, 120, 0.22);
  border-color: #ffdc78;
  box-shadow: 0 0 10px rgba(255, 220, 120, 0.15);
}

.action-btn.accept {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.action-btn.accept:hover {
  background: rgba(34, 197, 94, 0.25);
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.15);
}

.action-btn.reward {
  background: rgba(234, 179, 8, 0.12);
  border-color: rgba(234, 179, 8, 0.4);
  color: #facc15;
}

.action-btn.reward:hover {
  background: rgba(234, 179, 8, 0.25);
  border-color: #facc15;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.15);
}

.action-btn.close {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
}

.action-btn.close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
</style>
