<script lang="ts">
import { activeQuests, dialogueState } from "$lib/domain/quests.svelte";
import { gameState } from "$lib/state/game-state.svelte";
import { devGiveItem } from "$lib/state/dev-rpg-actions";
import { playSound } from "$lib/audio/audio-engine";
import { learnRecipe } from "$lib/domain/crafting.svelte";

// Typings
interface Objective {
  id: string;
  label: string;
  current: number;
  target: number;
  completed: boolean;
}

let textToShow = $state("");
let currentText = "";
let typeInterval: ReturnType<typeof setInterval> | null = null;

// Determine current dialog state based on active quests
function getDialogText(): string {
  if (!activeQuests.currentQuestId) {
    return "scout... the wagon is gone and the woods are not feeling generous. find a stick, a flint shard, and grass fiber. i will show you the flint axe recipe.";
  }

  if (activeQuests.currentQuestId === "scavenger_tools") {
    const quest = activeQuests.quests.scavenger_tools;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      return "Incredible work! That Flint Axe will serve us well. Here, take this Copper Ingot from our salvaged stash. We must secure our camp next. We need to gather real timber from the oak trees and keep this fire burning bright.";
    }
    return "still missing pieces? you need one stick, one flint shard, and one grass fiber. open the stash, craft the flint axe, then equip it.";
  }

  if (activeQuests.currentQuestId === "securing_perimeter") {
    const quest = activeQuests.quests.securing_perimeter;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_2")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      return "The campfire burns hot and bright, scout. You have proven yourself a true survivor of Ashenmoor. Next, we must establish our perimeter. Craft three Stone Blocks from raw Stone in the Crafting menu, and place three Stone Walls (shacks) around the camp. Here is an Iron Ingot for your efforts.";
    }
    return "Our fire is dying, and the shadow of the blight grows cold. Equip your Flint Axe, harvest an Oak Tree for thick wood logs, and refuel the campfire (requires 5x Oak Wood). Report back once the camp is secured.";
  }

  if (activeQuests.currentQuestId === "outpost_foundations") {
    const quest = activeQuests.quests.outpost_foundations;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_3")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      return "Excellent blockades, scout! These walls will hold back the blighted shadow. I've salvaged a Copper Axe from the ruins for you—this will make cutting down trees far easier. Next, we need real shelter and warmth.";
    }
    return "We need a perimeter, scout. Open your Crafting tab, refine raw Stone into three Stone Blocks, and then use the Build tab to place three Stone Walls around our camp.";
  }

  if (activeQuests.currentQuestId === "outpost_sanctuary") {
    const quest = activeQuests.quests.outpost_sanctuary;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_4")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      return "Incredible! The camp is now a true sanctuary, scout. With this shelter and light, we have carved a permanent outpost in the Ashenmoor blighted lands. Take this Copper Pickaxe. You've earned it. Rest well, we have survived.";
    }
    return "We need a warm sanctuary and a watchtower. Use refined planks and blocks to build an Outpost House and a Defense Tower. Remember, to smelt copper, iron, or silver ingots, you must stand near the Campfire's heat!";
  }

  return "Rest well, scout. Ashenmoor is a harsh country, but together, we have built a sanctuary.";
}

// Reactively start typewriter effect when active NPC or quest state changes
$effect(() => {
  if (dialogueState.activeNpc) {
    const rawText = getDialogText();
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

function handleAction() {
  if (!activeQuests.currentQuestId) {
    // Accept scavenger_tools quest
    activeQuests.currentQuestId = "scavenger_tools";
    learnRecipe("flint_axe");
    
    // Retrospective check of inventory items
    const slots = gameState.rpg.inventory?.slots;
    const stickQty = slots && slots.stick && "qty" in slots.stick ? slots.stick.qty : 0;
    const flintQty = slots && slots.flint_shard && "qty" in slots.flint_shard ? slots.flint_shard.qty : 0;
    const fiberQty = slots && slots.grass_fiber && "qty" in slots.grass_fiber ? slots.grass_fiber.qty : 0;
    
    const equippedWeapon = gameState.rpg.profile?.loadout?.weapon;
    const hasAxeEquipped = equippedWeapon && (typeof equippedWeapon === "string" ? equippedWeapon === "flint_axe" : equippedWeapon.itemId === "flint_axe");
    const axeQty = (slots && slots.flint_axe && "qty" in slots.flint_axe ? slots.flint_axe.qty : 0) + (hasAxeEquipped ? 1 : 0);
    
    const quest = activeQuests.quests.scavenger_tools;
    const stickObj = quest.objectives.find((o) => o.id === "gather_stick");
    if (stickObj) {
      stickObj.current = Math.min(stickObj.target, stickQty);
      if (stickObj.current >= stickObj.target) stickObj.completed = true;
    }
    const flintObj = quest.objectives.find((o) => o.id === "gather_flint");
    if (flintObj) {
      flintObj.current = Math.min(flintObj.target, flintQty);
      if (flintObj.current >= flintObj.target) flintObj.completed = true;
    }
    const fiberObj = quest.objectives.find((o) => o.id === "gather_fiber");
    if (fiberObj) {
      fiberObj.current = Math.min(fiberObj.target, fiberQty);
      if (fiberObj.current >= fiberObj.target) fiberObj.completed = true;
    }
    const axeObj = quest.objectives.find((o) => o.id === "craft_axe");
    if (axeObj) {
      axeObj.current = Math.min(axeObj.target, axeQty);
      if (axeObj.current >= axeObj.target) axeObj.completed = true;
    }

    playSound("pickup");
    closeDialog();
  } else if (activeQuests.currentQuestId === "scavenger_tools") {
    const quest = activeQuests.quests.scavenger_tools;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      // Claim reward & transition
      quest.completed = true;
      quest.rewardClaimed = true;
      // Complete talk objective
      const talkObj = quest.objectives.find((o) => o.id === "talk_vane");
      if (talkObj) talkObj.completed = true;

      // Give reward
      devGiveItem("copper_ingot", 1);
      playSound("craft");

      // Unlock next quest
      activeQuests.currentQuestId = "securing_perimeter";
    }
    closeDialog();
  } else if (activeQuests.currentQuestId === "securing_perimeter") {
    const quest = activeQuests.quests.securing_perimeter;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_2")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      // Claim reward & transition
      quest.completed = true;
      quest.rewardClaimed = true;
      const talkObj = quest.objectives.find((o) => o.id === "talk_vane_2");
      if (talkObj) talkObj.completed = true;

      // Give reward
      devGiveItem("iron_ingot", 1);
      playSound("craft");

      // Unlock next quest: foundations
      activeQuests.currentQuestId = "outpost_foundations";
    }
    closeDialog();
  } else if (activeQuests.currentQuestId === "outpost_foundations") {
    const quest = activeQuests.quests.outpost_foundations;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_3")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      quest.completed = true;
      quest.rewardClaimed = true;
      const talkObj = quest.objectives.find((o) => o.id === "talk_vane_3");
      if (talkObj) talkObj.completed = true;

      // Reward Copper Axe
      devGiveItem("copper_axe", 1);
      playSound("craft");

      activeQuests.currentQuestId = "outpost_sanctuary";
    }
    closeDialog();
  } else if (activeQuests.currentQuestId === "outpost_sanctuary") {
    const quest = activeQuests.quests.outpost_sanctuary;
    const allDoneExceptTalk = quest.objectives
      .filter((o) => o.id !== "talk_vane_4")
      .every((o) => o.completed);

    if (allDoneExceptTalk) {
      quest.completed = true;
      quest.rewardClaimed = true;
      const talkObj = quest.objectives.find((o) => o.id === "talk_vane_4");
      if (talkObj) talkObj.completed = true;

      // Reward Copper Pickaxe
      devGiveItem("copper_pickaxe", 1);
      playSound("craft");

      activeQuests.currentQuestId = "completed_all";
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
        <span class="npc-icon">🧑‍✈️</span>
        <span class="npc-name">{dialogueState.activeNpc.name}</span>
        <span class="npc-title">Camp Commander</span>
      </div>

      <div class="dialogue-content">
        <p class="dialogue-text">{textToShow}</p>
      </div>

      <div class="dialogue-actions">
        {#if !activeQuests.currentQuestId}
          <button class="action-btn accept" onclick={handleAction}>
            Accept Quest: Scavenger's Tools
          </button>
        {:else if activeQuests.currentQuestId === "scavenger_tools" && activeQuests.quests.scavenger_tools.objectives.filter(o => o.id !== "talk_vane").every(o => o.completed) && !activeQuests.quests.scavenger_tools.rewardClaimed}
          <button class="action-btn reward" onclick={handleAction}>
            ✓ Claim Reward (1x Copper Ingot)
          </button>
        {:else if activeQuests.currentQuestId === "securing_perimeter" && activeQuests.quests.securing_perimeter.objectives.filter(o => o.id !== "talk_vane_2").every(o => o.completed) && !activeQuests.quests.securing_perimeter.rewardClaimed}
          <button class="action-btn reward" onclick={handleAction}>
            ✓ Claim Reward (1x Iron Ingot)
          </button>
        {:else if activeQuests.currentQuestId === "outpost_foundations" && activeQuests.quests.outpost_foundations.objectives.filter(o => o.id !== "talk_vane_3").every(o => o.completed) && !activeQuests.quests.outpost_foundations.rewardClaimed}
          <button class="action-btn reward" onclick={handleAction}>
            ✓ Claim Reward (1x Copper Axe)
          </button>
        {:else if activeQuests.currentQuestId === "outpost_sanctuary" && activeQuests.quests.outpost_sanctuary.objectives.filter(o => o.id !== "talk_vane_4").every(o => o.completed) && !activeQuests.quests.outpost_sanctuary.rewardClaimed}
          <button class="action-btn reward" onclick={handleAction}>
            ✓ Claim Reward (1x Copper Pickaxe)
          </button>
        {/if}
        <button class="action-btn close" onclick={closeDialog}>
          Leave
        </button>
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
